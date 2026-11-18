import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { and, asc, desc, eq, isNull, or, sql } from 'drizzle-orm';
import express, { type NextFunction, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import {
  DATA_REFERENCE_DATE,
  type AlumniAvailability,
  type PartnerType,
  type Role,
} from './server/data.ts';
import {
  buildOtpAuthUri,
  decryptTotpSecret,
  encryptTotpSecret,
  generateQrDataUrl,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  verifyTotpCode,
} from './server/totp.ts';
import { db, pool } from './src/db/index.ts';
import {
  alumniProfiles,
  alumniSkills,
  annualReports,
  auditLogs,
  consentRecords,
  contactMessages,
  courseModules,
  impactEvents,
  impactStories,
  interestSubmissions,
  learnerProfiles,
  learnerProgress,
  locations,
  newsletterSubscriptions,
  notifications,
  partners,
  passwordResetTokens,
  pathways,
  platformSettings,
  teamMembers,
  uploadedFiles,
  users,
  yearlyImpacts,
} from './src/db/schema.ts';
import { ensureSeeded } from './src/db/seed.ts';
import { adminAuth } from './src/lib/firebase-admin.ts';
import { runAiSearch, runVisitorChat, type ChatTurn } from './src/lib/gemini.ts';
import { createRateLimiter } from './src/lib/rateLimit.ts';

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const AUTH_SECRET_KEY = process.env.AUTH_SECRET_KEY || crypto.randomBytes(32).toString('hex');
const ACCESS_TOKEN_MINUTES = Number(process.env.ACCESS_TOKEN_MINUTES || '10080');
const SESSION_TOKEN_MINUTES = 720;
const FRESH_AUTH_WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000;
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB

type AssuranceLevel = 'aal1' | 'aal2';
type DbUser = typeof users.$inferSelect;
type DbAlumni = typeof alumniProfiles.$inferSelect;

interface AuthTokenClaims {
  sub: string;
  role: Role;
  aal: AssuranceLevel;
  scope?: 'session' | 'mfa_setup' | 'mfa_challenge';
  auth_time: number;
  reauthenticated_at?: number;
  remember_me?: boolean;
}

interface AuthedRequest extends Request {
  authUser?: DbUser;
  authClaims?: AuthTokenClaims;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PATHWAY_RE = /^P(?:[1-9]|1[01])$/;
const VALID_ROLES = new Set<Role>([
  'learner',
  'alumni',
  'employer',
  'partner',
  'donor',
  'admin',
  'user',
]);
const VALID_PARTNER_TYPES = new Set<PartnerType>(['Employer', 'Donor', 'Client', 'Training partner']);
const ALLOWED_AVAILABILITIES = new Set<AlumniAvailability>([
  'Available for freelance work',
  'Available part-time',
  'Open to full-time roles',
  'Open to work',
  'Freelancing',
  'Employed',
  'Available for projects',
]);

const TOPIC_ROUTING: Record<string, { role: string; mailbox: string }> = {
  'Training and programmes': {
    role: 'Programmes Manager',
    mailbox: 'programmes@konexio-africa.invalid',
  },
  'Partnerships, funding, hiring': {
    role: 'Partnerships Lead',
    mailbox: 'partnerships@konexio-africa.invalid',
  },
  'Alumni community': {
    role: 'Alumni Community Manager',
    mailbox: 'alumni@konexio-africa.invalid',
  },
  'Website or technical problem': {
    role: 'EdTech Product Manager',
    mailbox: 'edtech@konexio-africa.invalid',
  },
  'Press and general': {
    role: 'Country Director',
    mailbox: 'director@konexio-africa.invalid',
  },
};

function cleanOptionalText(val: unknown): string | null {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  return trimmed ? trimmed : null;
}

function cleanStringList(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return Array.from(
    new Set(
      val
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 30),
    ),
  );
}

function createBusinessId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim().slice(0, 64);
  }
  return (req.ip || '').slice(0, 64);
}

function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const local = parts[0];
  return `${local.charAt(0) || '*'}***@${parts[1]}`;
}

function isSafeHttpUrl(raw: string | null): boolean {
  if (!raw) return true;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function validateFileSignature(mimeType: string, buffer: Buffer): boolean {
  if (buffer.length < 4 || buffer.length > MAX_UPLOAD_BYTES) return false;
  if (mimeType === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }
  if (mimeType === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === 'image/webp') {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  if (mimeType === 'application/pdf') {
    return buffer.subarray(0, 4).toString('ascii') === '%PDF';
  }
  return false;
}

function createAccessToken(
  user: DbUser,
  options?: {
    aal?: AssuranceLevel;
    rememberMe?: boolean;
    reauthenticatedAt?: number;
  },
): string {
  const nowMs = Date.now();
  const rememberMe = options?.rememberMe ?? true;
  const ttlMinutes = rememberMe ? ACCESS_TOKEN_MINUTES : SESSION_TOKEN_MINUTES;
  const claims: AuthTokenClaims = {
    sub: String(user.id),
    role: (user.role as Role) ?? 'learner',
    aal: options?.aal ?? 'aal1',
    scope: 'session',
    auth_time: nowMs,
    reauthenticated_at: options?.reauthenticatedAt ?? nowMs,
    remember_me: rememberMe,
  };
  return jwt.sign(claims, AUTH_SECRET_KEY, {
    algorithm: 'HS256',
    expiresIn: ttlMinutes * 60,
  });
}

function createMfaPendingToken(
  user: DbUser,
  scope: 'mfa_setup' | 'mfa_challenge',
  rememberMe = true,
): string {
  const claims: AuthTokenClaims = {
    sub: String(user.id),
    role: (user.role as Role) ?? 'learner',
    aal: 'aal1',
    scope,
    auth_time: Date.now(),
    remember_me: rememberMe,
  };
  return jwt.sign(claims, AUTH_SECRET_KEY, {
    algorithm: 'HS256',
    expiresIn: 600,
  });
}

function serializeUser(user: DbUser, claims?: AuthTokenClaims) {
  return {
    id: user.id,
    first_name: user.firstName,
    second_name: user.secondName,
    email: user.email,
    has_organisation: user.hasOrganisation,
    role: user.role as Role,
    pathway_code: user.pathwayCode,
    country: user.country,
    linked_business_id: user.linkedBusinessId,
    totp_enabled: user.mfaEnabled,
    mfa_required: user.role === 'admin',
    aal: claims?.aal ?? (user.mfaEnabled ? 'aal2' : 'aal1'),
    reauthenticated_at: claims?.reauthenticated_at ?? claims?.auth_time ?? null,
  };
}

function serializePublicAlumnus(record: DbAlumni, pathwayNameLookup?: Map<string, string>) {
  const showMedia = Boolean(record.consentToShowPhoto);
  const pathwayName =
    pathwayNameLookup?.get(record.pathwayCode) ?? record.pathwayName ?? record.pathwayCode;
  const resolvedPhoto =
    showMedia && record.photoFile
      ? record.photoFile
      : showMedia && record.portfolioImage
        ? record.portfolioImage
        : null;

  return {
    business_id: record.businessId,
    first_name: record.firstName,
    last_name: record.lastName,
    initials: `${record.firstName.charAt(0)}${record.lastName.charAt(0)}`.toUpperCase(),
    city: record.city || null,
    country: record.country || null,
    pathway_code: record.pathwayCode,
    pathway_name: pathwayName,
    short_bio: record.shortBio || null,
    skills: record.skills ?? [],
    languages: record.languages ?? [],
    availability: record.availability,
    portfolio_title: record.portfolioTitle || null,
    portfolio_url: record.portfolioUrl || null,
    portfolio_image: resolvedPhoto,
    profile_link: record.personalWebsite || record.linkedinUrl || null,
    personal_website: record.personalWebsite || null,
    linkedin_url: record.linkedinUrl || null,
    consent_to_show_photo: showMedia,
    has_video: showMedia ? record.hasVideo : false,
  };
}

async function computeImpactSummaryFromDb() {
  try {
    const [locRows, partnerSetting] = await Promise.all([
      db.select().from(locations).orderBy(asc(locations.businessId)),
      db.select().from(platformSettings).where(eq(platformSettings.key, 'employer_partners_count')),
    ]);

    const learners_trained = locRows.reduce((sum, l) => sum + l.learnersTrained, 0);
    const graduates = locRows.reduce((sum, l) => sum + l.graduates, 0);
    const employed_or_freelancing = locRows.reduce((sum, l) => sum + l.employedOrFreelancing, 0);
    const cohorts_completed = locRows.reduce((sum, l) => sum + l.cohortsCompleted, 0);
    const weightedWomen = locRows.reduce((sum, l) => sum + l.learnersTrained * l.womenPct, 0);
    const women_pct = learners_trained > 0 ? Math.round(weightedWomen / learners_trained) : 0;
    const employment_rate_pct =
      graduates > 0 ? Math.round((employed_or_freelancing / graduates) * 100) : 0;
    const employer_partners = Number(partnerSetting[0]?.value ?? 34);

    return {
      learners_trained,
      graduates,
      employed_or_freelancing,
      employment_rate_pct,
      countries: locRows.length,
      cohorts_completed,
      women_pct,
      employer_partners,
      as_of: DATA_REFERENCE_DATE,
      data_label: 'Konexio Africa Digi Pass (Demonstration Dataset)',
    };
  } catch (error) {
    console.error('Failed computing impact summary:', error);
    throw new Error('Failed to load impact summary', { cause: error });
  }
}

async function recordAuditLog(params: {
  actorUserId?: number | null;
  actorEmail?: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}) {
  try {
    await db.insert(auditLogs).values({
      actorUserId: params.actorUserId ?? null,
      actorEmail: params.actorEmail ?? 'system',
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      details: params.details ?? {},
      ipAddress: params.ipAddress ?? '',
    });
  } catch (error) {
    console.error('Audit log insert failed:', error);
  }
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7).trim() || null;
}

async function verifyBearerClaims(
  token: string,
): Promise<{ user: DbUser; claims: AuthTokenClaims } | null> {
  const payload = jwt.verify(token, AUTH_SECRET_KEY) as Partial<AuthTokenClaims>;
  const userId = Number(payload.sub);
  if (!Number.isFinite(userId)) return null;
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.archivedAt)));
  if (!user || !user.isActive) return null;

  return {
    user,
    claims: {
      sub: String(user.id),
      role: user.role as Role,
      aal: payload.aal === 'aal2' ? 'aal2' : 'aal1',
      scope: payload.scope ?? 'session',
      auth_time: Number(payload.auth_time || 0),
      reauthenticated_at: Number(payload.reauthenticated_at || payload.auth_time || 0),
      remember_me: payload.remember_me ?? true,
    },
  };
}

async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ detail: 'Bearer token required' });
  }
  try {
    const verified = await verifyBearerClaims(token);
    if (!verified) {
      return res.status(401).json({ detail: 'User session is invalid or inactive' });
    }
    if (verified.claims.scope === 'mfa_setup' || verified.claims.scope === 'mfa_challenge') {
      return res.status(401).json({
        detail: 'Complete two-factor authentication before accessing this resource',
        code: 'MFA_REQUIRED',
      });
    }
    req.authUser = verified.user;
    req.authClaims = verified.claims;
    return next();
  } catch {
    return res.status(401).json({ detail: 'Invalid or expired access token' });
  }
}

async function requireMfaOrSessionAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ detail: 'Authentication token required' });
  }
  try {
    const verified = await verifyBearerClaims(token);
    if (!verified) {
      return res.status(401).json({ detail: 'User no longer exists' });
    }
    req.authUser = verified.user;
    req.authClaims = verified.claims;
    return next();
  } catch {
    return res.status(401).json({ detail: 'Invalid or expired token' });
  }
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  return requireAuth(req, res, () => {
    if (req.authUser?.role !== 'admin') {
      return res.status(403).json({ detail: 'Administrator permissions required' });
    }
    if (!req.authUser.mfaEnabled || req.authClaims?.aal !== 'aal2') {
      return res.status(403).json({
        detail: 'Administrator accounts require verified two-factor authentication (AAL2)',
        code: 'AAL2_REQUIRED',
      });
    }
    return next();
  });
}

function isFreshAuthentication(req: AuthedRequest): boolean {
  const lastVerifiedAt = req.authClaims?.reauthenticated_at ?? req.authClaims?.auth_time ?? 0;
  return Date.now() - lastVerifiedAt <= FRESH_AUTH_WINDOW_MS;
}

async function consumeTotpOrRecovery(user: DbUser, codeInput: string): Promise<boolean> {
  const trimmed = codeInput.trim();
  if (!trimmed || !user.mfaSecretEncrypted) return false;

  if (/^\d{6}$/.test(trimmed.replace(/\s+/g, ''))) {
    const secret = decryptTotpSecret(user.mfaSecretEncrypted, AUTH_SECRET_KEY);
    const check = verifyTotpCode(secret, trimmed, {
      lastUsedStep: user.mfaLastUsedStep,
    });
    if (check.valid && check.step !== null) {
      await db
        .update(users)
        .set({ mfaLastUsedStep: check.step, updatedAt: new Date() })
        .where(eq(users.id, user.id));
      user.mfaLastUsedStep = check.step;
      return true;
    }
    return false;
  }

  const candidateHash = hashRecoveryCode(trimmed, AUTH_SECRET_KEY);
  const existingCodes = user.mfaRecoveryCodesHash ?? [];
  const idx = existingCodes.indexOf(candidateHash);
  if (idx !== -1) {
    const nextCodes = [...existingCodes];
    nextCodes.splice(idx, 1);
    await db
      .update(users)
      .set({ mfaRecoveryCodesHash: nextCodes, updatedAt: new Date() })
      .where(eq(users.id, user.id));
    user.mfaRecoveryCodesHash = nextCodes;
    return true;
  }
  return false;
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);

  // Security headers
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  app.use(express.json({ limit: '4mb' }));
  app.use(
    '/assets/aistudio',
    express.static(path.resolve(process.cwd(), 'public/assets/aistudio')),
  );

  const authLimiter = createRateLimiter({
    name: 'auth',
    windowMs: 5 * 60 * 1000,
    maxRequests: 30,
    message: 'Too many authentication attempts. Please wait a few minutes before trying again.',
  });
  const formLimiter = createRateLimiter({
    name: 'forms',
    windowMs: 5 * 60 * 1000,
    maxRequests: 25,
    message: 'Too many form submissions. Please wait a moment before submitting again.',
  });
  const aiLimiter = createRateLimiter({
    name: 'ai',
    windowMs: 5 * 60 * 1000,
    maxRequests: 25,
    message: 'AI assistant rate limit reached. Please wait a minute before asking again.',
  });

  // Lazy idempotent DB seed on first API/auth traffic (never probes DB at module import)
  const withSeededDb = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      await ensureSeeded();
      return next();
    } catch (error) {
      console.error('Database initialization middleware error:', error);
      return res.status(503).json({
        detail: 'Database service is temporarily unavailable. Please try again shortly.',
      });
    }
  };

  app.use(['/api', '/auth', '/contact', '/alumni/register', '/partners/register'], withSeededDb);

  // Health routes
  app.get(['/health', '/api/health'], async (_req: Request, res: Response) => {
    try {
      await pool.query('SELECT 1');
      res.json({ name: 'Konexio Connect 360', status: 'good!', database: 'ready' });
    } catch {
      res.status(503).json({ name: 'Konexio Connect 360', status: 'degraded', database: 'unavailable' });
    }
  });

  app.post('/api/visitor', (req: Request, res: Response) => {
    const webhookUrl = process.env.VISITOR_WEBHOOK_URL;
    const timestamp =
      typeof req.body?.timestamp === 'string' ? req.body.timestamp : new Date().toISOString();

    if (webhookUrl && isSafeHttpUrl(webhookUrl)) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp,
          new_visitor: Boolean(req.body?.new_visitor ?? true),
        }),
        signal: AbortSignal.timeout(3000),
      }).catch(() => {
        /* non-blocking optional webhook */
      });
    }

    res.json({ ok: true, recorded_at: timestamp });
  });

  // Public Impact, Programmes, Alumni, Team, Partners & Reports APIs
  app.get('/api/impact/summary', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = await computeImpactSummaryFromDb();
      return res.json(summary);
    } catch (err) {
      return next(err);
    }
  });

  app.get('/api/impact/locations', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const locRows = await db.select().from(locations).orderBy(asc(locations.businessId));
      return res.json({
        as_of: DATA_REFERENCE_DATE,
        data_label: 'Konexio Africa Digi Pass (Demonstration Dataset)',
        locations: locRows.map((loc) => ({
          business_id: loc.businessId,
          city: loc.city,
          country: loc.country,
          latitude: loc.latitude,
          longitude: loc.longitude,
          learners_trained: loc.learnersTrained,
          graduates: loc.graduates,
          employed_or_freelancing: loc.employedOrFreelancing,
          employment_rate_pct:
            loc.graduates > 0 ? Math.round((loc.employedOrFreelancing / loc.graduates) * 100) : 0,
          women_pct: loc.womenPct,
          cohorts_completed: loc.cohortsCompleted,
        })),
      });
    } catch (err) {
      return next(err);
    }
  });

  app.get('/api/impact/pathways', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const pwRows = await db
        .select()
        .from(pathways)
        .where(eq(pathways.isActive, true))
        .orderBy(asc(pathways.id));
      return res.json({
        as_of: DATA_REFERENCE_DATE,
        data_label: 'Konexio Africa Digi Pass (Demonstration Dataset)',
        pathways: pwRows.map((pw) => ({
          code: pw.code,
          name: pw.name,
          description: pw.summary,
          status: pw.status as 'Available' | 'Completed',
          learners_enrolled: pw.learnersCount,
          completed: pw.completedCount,
          freelancing_active: pw.freelancingActive,
          avg_days_to_first_gig: pw.avgDaysToFirstGig,
        })),
      });
    } catch (err) {
      return next(err);
    }
  });

  app.get('/api/impact/years', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const yrRows = await db.select().from(yearlyImpacts).orderBy(asc(yearlyImpacts.year));
      return res.json({
        as_of: DATA_REFERENCE_DATE,
        data_label: 'Konexio Africa Digi Pass (Demonstration Dataset)',
        years: yrRows.map((yr) => ({
          year: yr.year,
          is_ytd: yr.isYtd,
          learners_trained: yr.learnersTrained,
          graduates: yr.graduates,
          employed_or_freelancing_pct: yr.employmentRatePct,
          women_pct: yr.womenPct,
          countries_active: yr.countriesActive,
          cohorts_completed: yr.cohortsCompleted,
          employer_partners_cumulative: yr.employerPartnersCumulative,
          note: yr.note,
        })),
      });
    } catch (err) {
      return next(err);
    }
  });

  app.get('/api/reports', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const [repRows, storyRows] = await Promise.all([
        db.select().from(annualReports).orderBy(asc(annualReports.year)),
        db.select().from(impactStories).where(eq(impactStories.isPublished, true)).orderBy(asc(impactStories.id)),
      ]);
      return res.json({
        as_of: DATA_REFERENCE_DATE,
        data_label: 'Konexio Africa Digi Pass (Sample Reports & Stories)',
        reports: repRows.map((r) => ({
          year: r.year,
          title: r.title,
          vision_statement: r.visionStatement,
          director_message: r.directorMessage,
          highlights: r.highlights,
          pdf_url: r.publicUrl,
          learners_trained: r.learnersTrained,
          graduates: r.graduates,
          graduation_rate_pct: r.graduationRatePct,
          employed_or_freelancing_pct: r.employedOrFreelancingPct,
          women_pct: r.womenPct,
          countries: r.countries,
          cohorts: r.cohorts,
          employer_partners: r.employerPartners,
          is_sample: r.isSample,
        })),
        stories: storyRows.map((s) => ({
          id: s.businessId,
          title: s.title,
          city: s.location,
          quote: s.quote,
          attribution: s.attribution,
          highlight: s.highlight ?? undefined,
          is_sample: s.isSample,
        })),
      });
    } catch (err) {
      return next(err);
    }
  });

  app.get('/api/programmes', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const [modRows, pwRows] = await Promise.all([
        db
          .select()
          .from(courseModules)
          .where(eq(courseModules.isActive, true))
          .orderBy(asc(courseModules.sortOrder)),
        db
          .select()
          .from(pathways)
          .where(eq(pathways.isActive, true))
          .orderBy(asc(pathways.id)),
      ]);
      return res.json({
        as_of: DATA_REFERENCE_DATE,
        data_label: 'Konexio Africa Digi Pass',
        modules: modRows.map((m) => ({
          part: m.part,
          code: m.code,
          title: m.title,
          duration: m.duration,
          submodules: m.submodules,
        })),
        pathways: pwRows.map((pw) => ({
          code: pw.code,
          name: pw.name,
          description: pw.summary,
          status: pw.status as 'Available' | 'Completed',
          learners_enrolled: pw.learnersCount,
          completed: pw.completedCount,
          freelancing_active: pw.freelancingActive,
          avg_days_to_first_gig: pw.avgDaysToFirstGig,
        })),
      });
    } catch (err) {
      return next(err);
    }
  });

  app.get('/api/alumni', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pathway = typeof req.query.pathway === 'string' ? req.query.pathway.trim() : '';
      const country = typeof req.query.country === 'string' ? req.query.country.trim().toLowerCase() : '';
      const availability =
        typeof req.query.availability === 'string' ? req.query.availability.trim().toLowerCase() : '';
      const skill = typeof req.query.skill === 'string' ? req.query.skill.trim().toLowerCase() : '';
      const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';

      const [rows, pwRows] = await Promise.all([
        db
          .select()
          .from(alumniProfiles)
          .where(
            and(
              eq(alumniProfiles.consentToPublish, true),
              eq(alumniProfiles.isActive, true),
              isNull(alumniProfiles.archivedAt),
            ),
          )
          .orderBy(asc(alumniProfiles.businessId)),
        db.select({ code: pathways.code, name: pathways.name }).from(pathways),
      ]);

      const pathwayNameLookup = new Map(pwRows.map((p) => [p.code, p.name]));

      const filtered = rows
        .filter((a) => (!pathway ? true : a.pathwayCode === pathway))
        .filter((a) => (!country ? true : a.country.toLowerCase() === country))
        .filter((a) => (!availability ? true : a.availability.toLowerCase() === availability))
        .filter((a) => (!skill ? true : (a.skills ?? []).some((s) => s.toLowerCase().includes(skill))))
        .filter((a) => {
          if (!q) return true;
          const pathwayName = pathwayNameLookup.get(a.pathwayCode) ?? a.pathwayName;
          const haystack = [
            a.firstName,
            a.lastName,
            a.city,
            a.country,
            a.pathwayCode,
            pathwayName,
            a.shortBio,
            ...(a.skills ?? []),
            ...(a.languages ?? []),
          ]
            .join(' ')
            .toLowerCase();
          return haystack.includes(q);
        })
        .map((r) => serializePublicAlumnus(r, pathwayNameLookup));

      const countries = Array.from(
        new Set(rows.map((a) => a.country).filter(Boolean)),
      ).sort();

      return res.json({
        total: filtered.length,
        countries,
        alumni: filtered,
      });
    } catch (err) {
      return next(err);
    }
  });

  app.get('/api/alumni/:businessId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businessId = String(req.params.businessId || '').toUpperCase();
      const [record] = await db
        .select()
        .from(alumniProfiles)
        .where(
          and(
            eq(alumniProfiles.businessId, businessId),
            eq(alumniProfiles.consentToPublish, true),
            eq(alumniProfiles.isActive, true),
            isNull(alumniProfiles.archivedAt),
          ),
        );

      if (!record) {
        return res.status(404).json({ detail: 'Alumni profile not found' });
      }

      const [relatedRows, pwRows] = await Promise.all([
        db
          .select()
          .from(alumniProfiles)
          .where(
            and(
              eq(alumniProfiles.pathwayCode, record.pathwayCode),
              eq(alumniProfiles.consentToPublish, true),
              eq(alumniProfiles.isActive, true),
              isNull(alumniProfiles.archivedAt),
            ),
          )
          .orderBy(asc(alumniProfiles.businessId)),
        db.select({ code: pathways.code, name: pathways.name }).from(pathways),
      ]);

      const pathwayNameLookup = new Map(pwRows.map((p) => [p.code, p.name]));
      const related = relatedRows
        .filter((r) => r.businessId !== record.businessId)
        .slice(0, 3)
        .map((r) => serializePublicAlumnus(r, pathwayNameLookup));

      return res.json({
        profile: serializePublicAlumnus(record, pathwayNameLookup),
        related,
      });
    } catch (err) {
      return next(err);
    }
  });

  app.get('/api/team', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await db
        .select({
          businessId: teamMembers.businessId,
          firstName: teamMembers.firstName,
          lastName: teamMembers.lastName,
          roleTitle: teamMembers.roleTitle,
          bio: teamMembers.bio,
          linkedinUrl: teamMembers.linkedinUrl,
          contactTopic: teamMembers.contactTopic,
          displayEmailPublicly: teamMembers.displayEmailPublicly,
        })
        .from(teamMembers)
        .where(eq(teamMembers.isActive, true))
        .orderBy(asc(teamMembers.sortOrder));

      return res.json({
        team: rows.map((member) => ({
          business_id: member.businessId,
          first_name: member.firstName,
          last_name: member.lastName,
          initials: `${member.firstName.charAt(0)}${member.lastName.charAt(0)}`.toUpperCase(),
          job_title: member.roleTitle,
          short_bio: member.bio,
          linkedin_url: member.linkedinUrl || null,
          contact_topic: member.contactTopic,
          display_email_publicly: false,
        })),
      });
    } catch (err) {
      return next(err);
    }
  });

  app.get('/api/partners', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await db
        .select({
          businessId: partners.businessId,
          organisation: partners.organisation,
          type: partners.type,
          country: partners.country,
          description: partners.description,
          website: partners.website,
          logoKey: partners.logoKey,
        })
        .from(partners)
        .where(and(eq(partners.showOnSite, true), isNull(partners.archivedAt)))
        .orderBy(asc(partners.businessId));

      return res.json({
        partners: rows.map((p) => ({
          business_id: p.businessId,
          organisation: p.organisation,
          type: p.type,
          country: p.country || null,
          description: p.description || null,
          website: p.website || null,
          logo_key: p.logoKey || null,
        })),
      });
    } catch (err) {
      return next(err);
    }
  });

  // AI Search & Public Visitor Chatbot (strictly grounded on public DB data)
  app.post('/api/search/ai', aiLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
      if (!query || query.length > 240) {
        return res.status(422).json({ detail: 'Enter a search query between 1 and 240 characters.' });
      }
      const result = await runAiSearch(query);
      return res.json(result);
    } catch (err) {
      return next(err);
    }
  });

  app.post('/api/chat', aiLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
      if (!message || message.length > 600) {
        return res.status(422).json({ detail: 'Message must be between 1 and 600 characters.' });
      }
      const rawHistory = Array.isArray(req.body?.history) ? req.body.history : [];
      const history: ChatTurn[] = rawHistory
        .filter(
          (item: unknown): item is { role: 'user' | 'assistant'; content: string } =>
            Boolean(item) &&
            typeof item === 'object' &&
            ((item as { role?: unknown }).role === 'user' ||
              (item as { role?: unknown }).role === 'assistant') &&
            typeof (item as { content?: unknown }).content === 'string',
        )
        .slice(-8)
        .map((item: ChatTurn) => ({
          role: item.role,
          content: item.content.trim().slice(0, 600),
        }));

      const result = await runVisitorChat(message, history);
      return res.json(result);
    } catch (err) {
      return next(err);
    }
  });

  // Express Interest submission (PostgreSQL + consent ledger + notifications)
  app.post('/api/interest', formLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body ?? {};
      const full_name = typeof body.full_name === 'string' ? body.full_name.trim() : '';
      const organisation = cleanOptionalText(body.organisation) ?? '';
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const visitor_type = body.visitor_type as 'Employer' | 'Client' | 'Donor';
      const interest_type = body.interest_type as 'alumni' | 'pathway' | 'general';
      const interest_value = cleanOptionalText(body.interest_value);
      const message = typeof body.message === 'string' ? body.message.trim() : '';
      const consent_to_be_contacted = Boolean(body.consent_to_be_contacted);
      const honeypot = cleanOptionalText(body.website_url);

      if (!full_name || full_name.length > 140) {
        return res.status(422).json({ detail: 'Full name is required.' });
      }
      if (!EMAIL_RE.test(email)) {
        return res.status(422).json({ detail: 'A valid email address is required.' });
      }
      if (!['Employer', 'Client', 'Donor'].includes(visitor_type)) {
        return res.status(422).json({ detail: 'Select Employer, Client, or Donor.' });
      }
      if (!['alumni', 'pathway', 'general'].includes(interest_type)) {
        return res.status(422).json({ detail: 'Select an interest category.' });
      }
      if (interest_type === 'alumni' && !interest_value) {
        return res.status(422).json({ detail: 'Select a public alumnus.' });
      }
      if (interest_type === 'pathway' && (!interest_value || !PATHWAY_RE.test(interest_value))) {
        return res.status(422).json({ detail: 'Select a valid programme pathway.' });
      }
      if (!message || message.length > 1500) {
        return res.status(422).json({ detail: 'Message is required (maximum 1,500 characters).' });
      }

      const reference_id = createBusinessId('SUB');

      // Honeypot protection: do not persist spam payloads
      if (honeypot) {
        return res.status(201).json({
          reference_id,
          status: 'received',
          expected_response_time: '3 working days',
          message: 'Thank you. Your enquiry has been received.',
        });
      }

      await db.transaction(async (tx) => {
        let routingMode = 'team_triage';
        let targetAlumniIds: string[] = [];
        let targetAlumniNames: string[] = [];
        let targetAlumniUsers: number[] = [];
        let recipientMasked = 'partnerships@konexio-africa.invalid';
        let status: 'routed' | 'flagged_no_consent' = 'routed';

        if (!consent_to_be_contacted) {
          status = 'flagged_no_consent';
          routingMode = 'team_triage';
        } else if (interest_type === 'alumni' && interest_value) {
          const [target] = await tx
            .select()
            .from(alumniProfiles)
            .where(
              and(
                eq(alumniProfiles.businessId, interest_value.toUpperCase()),
                eq(alumniProfiles.consentToPublish, true),
                eq(alumniProfiles.isActive, true),
                isNull(alumniProfiles.archivedAt),
              ),
            );
          if (target) {
            routingMode = 'direct_alumni';
            targetAlumniIds = [target.businessId];
            targetAlumniNames = [`${target.firstName} ${target.lastName}`];
            if (target.userId) targetAlumniUsers = [target.userId];
            if (target.privateNotificationEmail) {
              recipientMasked = maskEmail(target.privateNotificationEmail);
            }
          }
        } else if (interest_type === 'pathway' && interest_value) {
          const matches = await tx
            .select()
            .from(alumniProfiles)
            .where(
              and(
                eq(alumniProfiles.pathwayCode, interest_value),
                eq(alumniProfiles.consentToPublish, true),
                eq(alumniProfiles.isActive, true),
                isNull(alumniProfiles.archivedAt),
              ),
            );
          routingMode = 'pathway_match';
          targetAlumniIds = matches.map((m) => m.businessId);
          targetAlumniNames = matches.slice(0, 3).map((m) => `${m.firstName} ${m.lastName}`);
          targetAlumniUsers = matches
            .map((m) => m.userId)
            .filter((uid): uid is number => typeof uid === 'number');
        }

        await tx.insert(interestSubmissions).values({
          referenceId: reference_id,
          submissionType: interest_type,
          visitorType: visitor_type,
          routingMode,
          targetAlumniBusinessId: targetAlumniIds.join(',') || interest_value || null,
          targetAlumniName: targetAlumniNames.join(', ') || null,
          recipientEmailMasked: recipientMasked,
          senderName: full_name,
          senderEmail: email,
          senderOrganisation: organisation,
          pathwayCode: interest_type === 'pathway' && interest_value ? interest_value : '',
          message,
          privacyConsent: consent_to_be_contacted,
          status,
        });

        await tx.insert(consentRecords).values({
          subjectEmail: email,
          subjectType: 'interest_form',
          consentScope: 'express_interest_contact',
          granted: consent_to_be_contacted,
          source: 'get_involved_form',
          notes: `Submission ${reference_id} (${visitor_type} / ${interest_type})`,
        });

        // Create dashboard notifications for matched alumni + admin team
        for (const alumUserId of targetAlumniUsers) {
          await tx.insert(notifications).values({
            userId: alumUserId,
            targetRole: 'alumni',
            category: 'inquiry',
            title: `New ${visitor_type} enquiry (${reference_id})`,
            body: `${organisation || full_name} submitted an enquiry matching your profile.`,
            linkPath: '/dashboard',
          });
        }

        await tx.insert(notifications).values({
          targetRole: 'admin',
          category: 'submission',
          title: `Express Interest ${reference_id} (${status})`,
          body: `${full_name}${organisation ? ` · ${organisation}` : ''} (${visitor_type})`,
          linkPath: '/admin',
        });
      });

      return res.status(201).json({
        reference_id,
        status: 'received',
        expected_response_time: '3 working days',
        message:
          visitor_type === 'Donor'
            ? 'Thank you. Your enquiry has been logged for our Partnerships Lead, along with our latest annual impact overview.'
            : 'Thank you. Your enquiry has been received and routed securely to our team.',
      });
    } catch (err) {
      return next(err);
    }
  });

  // Newsletter subscribe & unsubscribe
  app.post('/api/newsletter/subscribe', formLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body ?? {};
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const list = body.list === 'donor_partner' ? 'donor_partner' : 'alumni';
      const consent = Boolean(body.consent);
      const honeypot = cleanOptionalText(body.website_url);

      if (!EMAIL_RE.test(email)) {
        return res.status(422).json({ detail: 'Please enter a valid email address.' });
      }
      if (!consent) {
        return res.status(422).json({ detail: 'Please confirm your consent to receive updates.' });
      }

      if (!honeypot) {
        await db.transaction(async (tx) => {
          const now = new Date();
          await tx
            .insert(newsletterSubscriptions)
            .values({
              email,
              list,
              source: 'footer',
              status: 'subscribed',
              subscribedAt: now,
              unsubscribedAt: null,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: [newsletterSubscriptions.email, newsletterSubscriptions.list],
              set: {
                status: 'subscribed',
                subscribedAt: now,
                unsubscribedAt: null,
                updatedAt: now,
              },
            });

          await tx.insert(consentRecords).values({
            subjectEmail: email,
            subjectType: 'newsletter',
            consentScope: `newsletter_${list}`,
            granted: true,
            source: 'footer_subscribe',
            notes: 'Explicit opt-in confirmed',
          });
        });
      }

      return res.status(201).json({
        status: 'subscribed',
        list,
        message: 'You are subscribed to Konexio Africa updates.',
      });
    } catch (err) {
      return next(err);
    }
  });

  app.post('/api/newsletter/unsubscribe', formLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body ?? {};
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const list = body.list === 'donor_partner' ? 'donor_partner' : body.list === 'alumni' ? 'alumni' : 'all';

      if (!EMAIL_RE.test(email)) {
        return res.status(422).json({ detail: 'Please enter a valid email address.' });
      }

      const now = new Date();
      await db.transaction(async (tx) => {
        const listsToUpdate = list === 'all' ? ['alumni', 'donor_partner'] : [list];
        for (const l of listsToUpdate) {
          await tx
            .update(newsletterSubscriptions)
            .set({
              status: 'unsubscribed',
              unsubscribedAt: now,
              updatedAt: now,
            })
            .where(and(eq(newsletterSubscriptions.email, email), eq(newsletterSubscriptions.list, l)));

          await tx.insert(consentRecords).values({
            subjectEmail: email,
            subjectType: 'newsletter',
            consentScope: `newsletter_${l}`,
            granted: false,
            source: 'footer_unsubscribe',
            notes: 'User unsubscribed',
          });
        }
      });

      return res.json({
        status: 'unsubscribed',
        message: 'If that email was subscribed, it has been unsubscribed from Konexio Africa updates.',
      });
    } catch (err) {
      return next(err);
    }
  });

  // Auth routes
  app.post('/auth/register', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body ?? {};
      const first_name = typeof body.first_name === 'string' ? body.first_name.trim() : '';
      const second_name = typeof body.second_name === 'string' ? body.second_name.trim() : '';
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      const has_organisation = Boolean(body.has_organisation);

      if (body.account_type === 'admin' || body.role === 'admin') {
        return res.status(403).json({
          detail: 'Administrator accounts cannot be created through public registration',
        });
      }
      const account_type: Role =
        VALID_ROLES.has(body.account_type) && body.account_type !== 'admin'
          ? body.account_type
          : 'learner';

      if (!first_name || first_name.length > 100) {
        return res.status(422).json({ detail: 'First name is required' });
      }
      if (!second_name || second_name.length > 100) {
        return res.status(422).json({ detail: 'Last name is required' });
      }
      if (!EMAIL_RE.test(email)) {
        return res.status(422).json({ detail: 'Please enter a valid email address' });
      }
      const passwordBytes = Buffer.byteLength(password, 'utf8');
      if (password.length < 8 || passwordBytes > 72) {
        return res.status(422).json({ detail: 'Password must be between 8 and 72 characters' });
      }

      const city = cleanOptionalText(body.city);
      const country = cleanOptionalText(body.country);
      const pathway_code = cleanOptionalText(body.pathway_code);
      const learning_goal = cleanOptionalText(body.learning_goal);
      const short_bio = cleanOptionalText(body.short_bio);
      const skills = cleanStringList(body.skills);
      const languages = cleanStringList(body.languages);
      const availabilityCandidate = cleanOptionalText(body.availability) as AlumniAvailability | null;
      const availability =
        availabilityCandidate && ALLOWED_AVAILABILITIES.has(availabilityCandidate)
          ? availabilityCandidate
          : 'Open to work';
      const portfolio_title = cleanOptionalText(body.portfolio_title);
      const portfolio_url = cleanOptionalText(body.portfolio_url);
      const personal_website = cleanOptionalText(body.personal_website);
      const linkedin_url = cleanOptionalText(body.linkedin_url);
      const consent_to_publish = Boolean(body.consent_to_publish);
      const consent_to_show_photo = Boolean(body.consent_to_show_photo);
      const organisation = cleanOptionalText(body.organisation);
      const partner_type = VALID_PARTNER_TYPES.has(body.partner_type)
        ? (body.partner_type as PartnerType)
        : null;
      const description = cleanOptionalText(body.description);
      const website = cleanOptionalText(body.website);
      const phone = cleanOptionalText(body.phone);

      if (
        !isSafeHttpUrl(portfolio_url) ||
        !isSafeHttpUrl(personal_website) ||
        !isSafeHttpUrl(linkedin_url) ||
        !isSafeHttpUrl(website)
      ) {
        return res.status(422).json({ detail: 'URLs must start with http:// or https://' });
      }

      if (pathway_code && !PATHWAY_RE.test(pathway_code)) {
        return res.status(422).json({ detail: 'Invalid pathway code' });
      }

      if (account_type === 'learner') {
        if (!country || !pathway_code || !learning_goal) {
          return res
            .status(422)
            .json({ detail: 'Learners must provide country, pathway, and learning goal' });
        }
      } else if (account_type === 'alumni') {
        if (!pathway_code) {
          return res.status(422).json({ detail: 'Alumni must provide a pathway' });
        }
      } else if (
        account_type === 'employer' ||
        account_type === 'partner' ||
        account_type === 'donor'
      ) {
        if (!organisation || !country || !description) {
          return res.status(422).json({
            detail:
              'Employers, partners, and donors must provide organisation, country, and description',
          });
        }
        if (account_type === 'donor' && partner_type !== null && partner_type !== 'Donor') {
          return res
            .status(422)
            .json({ detail: 'Donor accounts must use the Donor organisation type' });
        }
        if (account_type === 'partner' && (partner_type === null || partner_type === 'Donor')) {
          return res.status(422).json({ detail: 'Select Employer, Client, or Training partner' });
        }
      }

      const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
      if (existing) {
        return res.status(409).json({ detail: 'An account with this email already exists' });
      }

      const linked_business_id =
        account_type === 'learner'
          ? createBusinessId('LRN')
          : account_type === 'alumni'
            ? createBusinessId('ALU')
            : account_type === 'employer' || account_type === 'partner' || account_type === 'donor'
              ? createBusinessId('PAR')
              : null;

      const createdUser = await db.transaction(async (tx) => {
        const [newUser] = await tx
          .insert(users)
          .values({
            uid: `local-${crypto.randomUUID()}`,
            email,
            passwordHash: bcrypt.hashSync(password, 10),
            firstName: first_name,
            secondName: second_name,
            role: account_type,
            organisation: organisation ?? '',
            hasOrganisation: has_organisation,
            pathwayCode: pathway_code,
            country,
            city,
            learningGoal: learning_goal,
            linkedBusinessId: linked_business_id,
            isActive: true,
          })
          .returning();

        if (account_type === 'learner' && country && pathway_code && learning_goal) {
          await tx.insert(learnerProfiles).values({
            userId: newUser.id,
            country,
            city: city ?? '',
            pathwayCode: pathway_code,
            learningGoal: learning_goal,
            cohortStatus: 'Active cohort · Application received',
          });
        } else if (account_type === 'alumni' && pathway_code && linked_business_id) {
          const [pwRow] = await tx
            .select({ name: pathways.name })
            .from(pathways)
            .where(eq(pathways.code, pathway_code));

          const [newAlum] = await tx
            .insert(alumniProfiles)
            .values({
              businessId: linked_business_id,
              userId: newUser.id,
              firstName: first_name,
              lastName: second_name,
              name: `${first_name} ${second_name}`,
              country: country ?? '',
              city: city ?? '',
              pathwayCode: pathway_code,
              pathwayName: pwRow?.name ?? pathway_code,
              skills,
              languages,
              availability,
              shortBio: short_bio ?? '',
              portfolioTitle: portfolio_title ?? 'Digital Skills Portfolio',
              portfolioUrl: portfolio_url ?? '',
              personalWebsite: personal_website ?? '',
              linkedinUrl: linkedin_url ?? '',
              consentToPublish: consent_to_publish,
              consentToShowPhoto: consent_to_show_photo,
              consentToBeContacted: consent_to_publish,
              consentDate: consent_to_publish ? new Date() : null,
              privateNotificationEmail: email,
              isActive: true,
            })
            .returning({ id: alumniProfiles.id });

          for (const sk of skills) {
            await tx.insert(alumniSkills).values({ alumniId: newAlum.id, skill: sk }).onConflictDoNothing();
          }

          await tx.insert(consentRecords).values({
            userId: newUser.id,
            subjectEmail: email,
            subjectType: 'alumni',
            consentScope: 'public_directory_profile',
            granted: consent_to_publish,
            source: 'account_signup',
            notes: `Initial registration consent (${linked_business_id})`,
          });
        } else if (
          (account_type === 'employer' || account_type === 'partner' || account_type === 'donor') &&
          organisation &&
          linked_business_id
        ) {
          const resolvedPartnerType =
            account_type === 'donor'
              ? 'Donor'
              : account_type === 'employer'
                ? 'Employer'
                : (partner_type ?? 'Employer');
          await tx.insert(partners).values({
            businessId: linked_business_id,
            userId: newUser.id,
            organisation,
            type: resolvedPartnerType,
            country: country ?? '',
            description: description ?? '',
            website: website ?? '',
            phone: phone ?? '',
            privateContactName: `${first_name} ${second_name}`,
            privateContactEmail: email,
            privateContactPhone: phone ?? '',
            showOnSite: false,
            approved: false,
            status: 'pending_review',
          });

          await tx.insert(notifications).values({
            targetRole: 'admin',
            category: 'partner_review',
            title: `New ${resolvedPartnerType} registration (${organisation})`,
            body: `Review and approve ${organisation} for partner site visibility.`,
            linkPath: '/admin',
          });
        }

        await tx.insert(notifications).values({
          userId: newUser.id,
          targetRole: account_type,
          category: 'welcome',
          title: 'Welcome to Konexio Connect 360',
          body: 'Your account and dashboard settings are saved in your Konexio Africa record.',
          linkPath: '/dashboard',
        });

        return newUser;
      });

      return res.status(201).json({
        access_token: createAccessToken(createdUser, { aal: 'aal1', rememberMe: true }),
        token_type: 'bearer',
        user: serializeUser(createdUser),
      });
    } catch (err) {
      return next(err);
    }
  });

  app.post('/auth/login', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body ?? {};
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      const rememberMe = body.remember_me === undefined ? true : Boolean(body.remember_me);

      if (!EMAIL_RE.test(email) || !password || Buffer.byteLength(password, 'utf8') > 72) {
        return res.status(401).json({ detail: 'Invalid email or password' });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), isNull(users.archivedAt)));

      if (!user || !user.isActive) {
        return res.status(401).json({ detail: 'Invalid email or password' });
      }

      if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
        const waitSeconds = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
        return res.status(429).json({
          detail: `Too many failed sign-in attempts. Please wait ${waitSeconds} seconds before trying again.`,
        });
      }

      if (!bcrypt.compareSync(password, user.passwordHash)) {
        const nextAttempts = user.failedLoginAttempts + 1;
        const lockedUntil =
          nextAttempts >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null;
        await db
          .update(users)
          .set({
            failedLoginAttempts: lockedUntil ? 0 : nextAttempts,
            lockedUntil,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));
        return res.status(401).json({ detail: 'Invalid email or password' });
      }

      await db
        .update(users)
        .set({ failedLoginAttempts: 0, lockedUntil: null, updatedAt: new Date() })
        .where(eq(users.id, user.id));

      if (user.role === 'admin' && !user.mfaEnabled) {
        const mfaToken = createMfaPendingToken(user, 'mfa_setup', rememberMe);
        return res.json({
          requires_2fa_setup: true,
          mfa_token: mfaToken,
          user: serializeUser(user),
        });
      }

      if (user.mfaEnabled) {
        const mfaToken = createMfaPendingToken(user, 'mfa_challenge', rememberMe);
        return res.json({
          requires_2fa: true,
          mfa_token: mfaToken,
          user: serializeUser(user),
        });
      }

      const accessToken = createAccessToken(user, { aal: 'aal1', rememberMe });
      return res.json({
        access_token: accessToken,
        token_type: 'bearer',
        user: {
          ...serializeUser(user),
          aal: 'aal1',
        },
      });
    } catch (err) {
      return next(err);
    }
  });

  // Firebase Google Sign-In verification endpoint (upserts user into PostgreSQL)
  app.post('/auth/firebase', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idToken = typeof req.body?.id_token === 'string' ? req.body.id_token.trim() : '';
      if (!idToken) {
        return res.status(400).json({ detail: 'Firebase ID token is required' });
      }

      let decoded;
      try {
        decoded = await adminAuth.verifyIdToken(idToken);
      } catch {
        return res.status(401).json({ detail: 'Invalid or expired Google sign-in token' });
      }

      const email = decoded.email?.trim().toLowerCase();
      if (!email || !decoded.email_verified) {
        return res.status(403).json({
          detail: 'A verified email address from Google is required to sign in.',
        });
      }

      const displayName = (decoded.name || email.split('@')[0] || 'Konexio Member').trim();
      const parts = displayName.split(/\s+/);
      const firstName = parts[0] || 'Konexio';
      const secondName = parts.slice(1).join(' ') || 'Member';

      let [existing] = await db
        .select()
        .from(users)
        .where(or(eq(users.firebaseUid, decoded.uid), eq(users.email, email)));

      if (existing) {
        if (!existing.isActive || existing.archivedAt) {
          return res.status(403).json({ detail: 'This account is currently inactive.' });
        }
        if (!existing.firebaseUid) {
          const [updated] = await db
            .update(users)
            .set({ firebaseUid: decoded.uid, updatedAt: new Date() })
            .where(eq(users.id, existing.id))
            .returning();
          if (updated) existing = updated;
        }
      } else {
        const randomPasswordHash = bcrypt.hashSync(crypto.randomBytes(24).toString('hex'), 10);
        const [inserted] = await db
          .insert(users)
          .values({
            uid: `firebase-${decoded.uid}`,
            firebaseUid: decoded.uid,
            email,
            passwordHash: randomPasswordHash,
            firstName,
            secondName,
            role: 'learner',
            linkedBusinessId: createBusinessId('LRN'),
            pathwayCode: 'P1',
            country: 'Kenya',
            isActive: true,
          })
          .onConflictDoUpdate({
            target: users.email,
            set: { firebaseUid: decoded.uid, updatedAt: new Date() },
          })
          .returning();
        existing = inserted;

        await db
          .insert(learnerProfiles)
          .values({
            userId: existing.id,
            country: 'Kenya',
            city: '',
            pathwayCode: 'P1',
            learningGoal: 'Joined via Google Sign-In',
            cohortStatus: 'Active cohort · Onboarding',
          })
          .onConflictDoNothing({ target: learnerProfiles.userId });
      }

      if (existing.role === 'admin' && !existing.mfaEnabled) {
        return res.json({
          requires_2fa_setup: true,
          mfa_token: createMfaPendingToken(existing, 'mfa_setup', true),
          user: serializeUser(existing),
        });
      }
      if (existing.mfaEnabled) {
        return res.json({
          requires_2fa: true,
          mfa_token: createMfaPendingToken(existing, 'mfa_challenge', true),
          user: serializeUser(existing),
        });
      }

      return res.json({
        access_token: createAccessToken(existing, { aal: 'aal1', rememberMe: true }),
        token_type: 'bearer',
        user: { ...serializeUser(existing), aal: 'aal1' },
      });
    } catch (err) {
      return next(err);
    }
  });

  app.post('/auth/2fa/enroll/start', authLimiter, requireMfaOrSessionAuth, async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.authUser!;
      if (user.mfaEnabled && req.authClaims?.aal !== 'aal2') {
        return res.status(403).json({
          detail: 'Verify your existing authenticator factor before resetting 2FA.',
        });
      }

      const secret = generateTotpSecret();
      const pendingEnc = encryptTotpSecret(secret, AUTH_SECRET_KEY);
      await db
        .update(users)
        .set({ mfaPendingSecretEncrypted: pendingEnc, updatedAt: new Date() })
        .where(eq(users.id, user.id));

      const otpauthUri = buildOtpAuthUri({
        secret,
        email: user.email,
        issuer: 'Konexio Africa',
      });
      const qrDataUrl = await generateQrDataUrl(otpauthUri);

      return res.json({
        qr_data_url: qrDataUrl,
        manual_secret: secret,
        otpauth_uri: otpauthUri,
        issuer: 'Konexio Africa',
        account: user.email,
      });
    } catch (err) {
      return next(err);
    }
  });

  app.post('/auth/2fa/enroll/verify', authLimiter, requireMfaOrSessionAuth, async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.authUser!;
      const claims = req.authClaims!;
      const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';

      if (!user.mfaPendingSecretEncrypted) {
        return res
          .status(400)
          .json({ detail: 'No pending two-factor setup found. Start enrollment first.' });
      }

      const plainSecret = decryptTotpSecret(user.mfaPendingSecretEncrypted, AUTH_SECRET_KEY);
      const verification = verifyTotpCode(plainSecret, code);
      if (!verification.valid || verification.step === null) {
        return res.status(401).json({ detail: 'Invalid 6-digit authenticator code. Please try again.' });
      }

      const recoveryCodes = generateRecoveryCodes(8);
      const hashedCodes = recoveryCodes.map((rc) => hashRecoveryCode(rc, AUTH_SECRET_KEY));

      const [updatedUser] = await db
        .update(users)
        .set({
          mfaSecretEncrypted: user.mfaPendingSecretEncrypted,
          mfaPendingSecretEncrypted: null,
          mfaEnabled: true,
          mfaLastUsedStep: verification.step,
          mfaRecoveryCodesHash: hashedCodes,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id))
        .returning();

      await recordAuditLog({
        actorUserId: user.id,
        actorEmail: user.email,
        action: 'mfa_enrolled',
        targetType: 'user',
        targetId: String(user.id),
        ipAddress: getClientIp(req),
      });

      const nowMs = Date.now();
      const accessToken = createAccessToken(updatedUser, {
        aal: 'aal2',
        rememberMe: claims.remember_me ?? true,
        reauthenticatedAt: nowMs,
      });

      return res.json({
        access_token: accessToken,
        token_type: 'bearer',
        recovery_codes: recoveryCodes,
        user: {
          ...serializeUser(updatedUser),
          aal: 'aal2',
          reauthenticated_at: nowMs,
        },
      });
    } catch (err) {
      return next(err);
    }
  });

  app.post('/auth/2fa/verify', authLimiter, requireMfaOrSessionAuth, async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.authUser!;
      const claims = req.authClaims!;
      const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';

      if (!user.mfaEnabled || !user.mfaSecretEncrypted) {
        return res
          .status(400)
          .json({ detail: 'Two-factor authentication is not enabled for this account.' });
      }

      const ok = await consumeTotpOrRecovery(user, code);
      if (!ok) {
        return res.status(401).json({ detail: 'Invalid authenticator or recovery code.' });
      }

      const nowMs = Date.now();
      const accessToken = createAccessToken(user, {
        aal: 'aal2',
        rememberMe: claims.remember_me ?? true,
        reauthenticatedAt: nowMs,
      });

      return res.json({
        access_token: accessToken,
        token_type: 'bearer',
        user: {
          ...serializeUser(user),
          aal: 'aal2',
          reauthenticated_at: nowMs,
        },
      });
    } catch (err) {
      return next(err);
    }
  });

  app.post('/auth/2fa/reauth', authLimiter, requireAuth, async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.authUser!;
      const claims = req.authClaims!;
      const password = typeof req.body?.password === 'string' ? req.body.password : '';
      const totpCode = typeof req.body?.totp_code === 'string' ? req.body.totp_code.trim() : '';

      if (user.mfaEnabled) {
        const ok = await consumeTotpOrRecovery(user, totpCode);
        if (!ok) {
          return res.status(401).json({ detail: 'Valid 6-digit authenticator code required.' });
        }
      } else if (!password || !bcrypt.compareSync(password, user.passwordHash)) {
        return res.status(401).json({ detail: 'Current password verification failed.' });
      }

      const nowMs = Date.now();
      const nextAal: AssuranceLevel = user.mfaEnabled ? 'aal2' : 'aal1';
      const accessToken = createAccessToken(user, {
        aal: nextAal,
        rememberMe: claims.remember_me ?? true,
        reauthenticatedAt: nowMs,
      });

      return res.json({
        access_token: accessToken,
        token_type: 'bearer',
        user: {
          ...serializeUser(user),
          aal: nextAal,
          reauthenticated_at: nowMs,
        },
      });
    } catch (err) {
      return next(err);
    }
  });

  app.post('/auth/2fa/disable', authLimiter, requireAuth, async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.authUser!;
      const claims = req.authClaims!;

      if (user.role === 'admin') {
        return res.status(403).json({
          detail:
            'Two-factor authentication is mandatory for administrator accounts and cannot be disabled.',
        });
      }

      const password = typeof req.body?.password === 'string' ? req.body.password : '';
      const totpCode = typeof req.body?.totp_code === 'string' ? req.body.totp_code.trim() : '';

      if (!password || !bcrypt.compareSync(password, user.passwordHash)) {
        return res.status(401).json({ detail: 'Valid current password required.' });
      }
      if (user.mfaEnabled) {
        const ok = await consumeTotpOrRecovery(user, totpCode);
        if (!ok) {
          return res
            .status(401)
            .json({ detail: 'Valid 6-digit authenticator code required to disable 2FA.' });
        }
      }

      const [updated] = await db
        .update(users)
        .set({
          mfaSecretEncrypted: null,
          mfaPendingSecretEncrypted: null,
          mfaEnabled: false,
          mfaLastUsedStep: null,
          mfaRecoveryCodesHash: [],
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id))
        .returning();

      await recordAuditLog({
        actorUserId: user.id,
        actorEmail: user.email,
        action: 'mfa_disabled',
        targetType: 'user',
        targetId: String(user.id),
        ipAddress: getClientIp(req),
      });

      const nowMs = Date.now();
      const accessToken = createAccessToken(updated, {
        aal: 'aal1',
        rememberMe: claims.remember_me ?? true,
        reauthenticatedAt: nowMs,
      });

      return res.json({
        access_token: accessToken,
        token_type: 'bearer',
        user: {
          ...serializeUser(updated),
          aal: 'aal1',
          reauthenticated_at: nowMs,
        },
      });
    } catch (err) {
      return next(err);
    }
  });

  app.get('/auth/2fa/status', requireAuth, (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    const claims = req.authClaims!;
    res.json({
      totp_enabled: user.mfaEnabled,
      mandatory_for_role: user.role === 'admin',
      aal: claims.aal,
      recovery_codes_remaining: (user.mfaRecoveryCodesHash ?? []).length,
      fresh_auth_valid: isFreshAuthentication(req),
    });
  });

  app.post('/auth/change-password', authLimiter, requireAuth, async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.authUser!;
      const currentPassword =
        typeof req.body?.current_password === 'string' ? req.body.current_password : '';
      const newPassword =
        typeof req.body?.new_password === 'string' ? req.body.new_password : '';
      const totpCode = typeof req.body?.totp_code === 'string' ? req.body.totp_code.trim() : '';

      if (!currentPassword || !bcrypt.compareSync(currentPassword, user.passwordHash)) {
        return res.status(401).json({ detail: 'Current password is incorrect.' });
      }
      if (user.mfaEnabled) {
        const ok = await consumeTotpOrRecovery(user, totpCode);
        if (!ok) {
          return res.status(401).json({
            detail: 'Valid 6-digit authenticator code required to change your password.',
          });
        }
      }
      const passwordBytes = Buffer.byteLength(newPassword, 'utf8');
      if (newPassword.length < 8 || passwordBytes > 72) {
        return res.status(422).json({ detail: 'New password must be between 8 and 72 characters.' });
      }

      await db
        .update(users)
        .set({ passwordHash: bcrypt.hashSync(newPassword, 10), updatedAt: new Date() })
        .where(eq(users.id, user.id));

      return res.json({ status: 'password_updated', message: 'Password updated successfully.' });
    } catch (err) {
      return next(err);
    }
  });

  app.post('/auth/forgot-password', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      if (!EMAIL_RE.test(email)) {
        return res.status(422).json({ detail: 'Please enter a valid email address.' });
      }

      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, email), eq(users.isActive, true)));

      if (user) {
        const resetToken = crypto.randomBytes(4).toString('hex').toUpperCase();
        const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
        await db.insert(passwordResetTokens).values({
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        });
      }

      return res.json({
        status: 'requested',
        message:
          'If an account matches that email address, a reset code has been recorded. Email delivery requires an outbound mail provider in production.',
      });
    } catch (err) {
      return next(err);
    }
  });

  app.post('/auth/reset-password', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      const resetCode =
        typeof req.body?.reset_code === 'string' ? req.body.reset_code.trim().toUpperCase() : '';
      const newPassword = typeof req.body?.new_password === 'string' ? req.body.new_password : '';

      if (!EMAIL_RE.test(email) || !resetCode) {
        return res.status(422).json({ detail: 'Email address and reset code are required.' });
      }
      const passwordBytes = Buffer.byteLength(newPassword, 'utf8');
      if (newPassword.length < 8 || passwordBytes > 72) {
        return res.status(422).json({ detail: 'New password must be between 8 and 72 characters.' });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), isNull(users.archivedAt)));
      if (!user) {
        return res.status(400).json({ detail: 'Invalid or expired password reset code.' });
      }

      const candidateHash = crypto.createHash('sha256').update(resetCode).digest('hex');
      const [tokenRow] = await db
        .select()
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.userId, user.id),
            eq(passwordResetTokens.tokenHash, candidateHash),
            isNull(passwordResetTokens.usedAt),
          ),
        );

      if (!tokenRow || tokenRow.expiresAt.getTime() < Date.now()) {
        return res.status(400).json({ detail: 'Invalid or expired password reset code.' });
      }

      await db.transaction(async (tx) => {
        await tx
          .update(users)
          .set({
            passwordHash: bcrypt.hashSync(newPassword, 10),
            failedLoginAttempts: 0,
            lockedUntil: null,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));

        await tx
          .update(passwordResetTokens)
          .set({ usedAt: new Date() })
          .where(eq(passwordResetTokens.id, tokenRow.id));
      });

      return res.json({
        status: 'reset',
        message: 'Your password has been updated. You can now sign in.',
      });
    } catch (err) {
      return next(err);
    }
  });

  app.get('/auth/me', requireAuth, (req: AuthedRequest, res: Response) => {
    res.json(serializeUser(req.authUser!, req.authClaims));
  });

  // Notifications API (per user / role)
  app.get('/api/notifications', requireAuth, async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.authUser!;
      const rows = await db
        .select()
        .from(notifications)
        .where(
          user.role === 'admin'
            ? or(eq(notifications.userId, user.id), eq(notifications.targetRole, 'admin'))
            : eq(notifications.userId, user.id),
        )
        .orderBy(desc(notifications.createdAt))
        .limit(30);

      return res.json({
        notifications: rows.map((n) => ({
          id: n.id,
          category: n.category,
          title: n.title,
          body: n.body,
          link_path: n.linkPath,
          is_read: n.isRead,
          created_at: n.createdAt.toISOString(),
        })),
      });
    } catch (err) {
      return next(err);
    }
  });

  app.patch('/api/notifications/:id/read', requireAuth, async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.authUser!;
      const notificationId = Number(req.params.id);
      if (!Number.isFinite(notificationId)) {
        return res.status(400).json({ detail: 'Invalid notification ID' });
      }
      const [row] = await db
        .select()
        .from(notifications)
        .where(eq(notifications.id, notificationId));

      if (!row) {
        return res.status(404).json({ detail: 'Notification not found' });
      }
      if (row.userId !== user.id && !(user.role === 'admin' && row.targetRole === 'admin')) {
        return res.status(403).json({ detail: 'You do not have permission to update this notification' });
      }

      await db
        .update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(eq(notifications.id, notificationId));

      return res.json({ id: notificationId, is_read: true });
    } catch (err) {
      return next(err);
    }
  });

  // Authenticated File Upload & Retrieval (persisted in PostgreSQL uploaded_files)
  app.post('/api/uploads', requireAuth, async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.authUser!;
      const body = req.body ?? {};
      const purpose =
        typeof body.purpose === 'string' &&
        ['alumni_photo', 'alumni_portfolio', 'annual_report', 'partner_logo', 'general'].includes(
          body.purpose,
        )
          ? body.purpose
          : 'general';
      const originalName =
        typeof body.filename === 'string' && body.filename.trim()
          ? body.filename.trim().replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
          : 'upload.bin';
      const mimeType = typeof body.mime_type === 'string' ? body.mime_type.trim().toLowerCase() : '';
      const rawData = typeof body.data_base64 === 'string' ? body.data_base64.trim() : '';

      const allowedMimeTypes =
        purpose === 'annual_report'
          ? ['application/pdf']
          : ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];

      if (!allowedMimeTypes.includes(mimeType)) {
        return res.status(422).json({
          detail: 'Unsupported file type. Allowed formats: PNG, JPEG, WEBP, or PDF.',
        });
      }

      const cleanBase64 = rawData.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      if (!validateFileSignature(mimeType, buffer)) {
        return res.status(422).json({
          detail: 'File signature validation failed or file exceeds the 2 MB limit.',
        });
      }

      const publicId = createBusinessId('FIL');
      const isPublic = purpose === 'annual_report' || purpose === 'partner_logo';

      const saved = await db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(uploadedFiles)
          .values({
            publicId,
            ownerUserId: user.id,
            purpose,
            originalName,
            mimeType,
            sizeBytes: buffer.length,
            dataBase64: cleanBase64,
            isPublic,
          })
          .returning();

        const fileUrl = `/api/files/${publicId}`;

        if (user.role === 'alumni' && (purpose === 'alumni_photo' || purpose === 'alumni_portfolio')) {
          const [profile] = await tx
            .select()
            .from(alumniProfiles)
            .where(
              user.linkedBusinessId
                ? eq(alumniProfiles.businessId, user.linkedBusinessId)
                : eq(alumniProfiles.userId, user.id),
            );
          if (profile) {
            await tx
              .update(uploadedFiles)
              .set({ isPublic: true })
              .where(eq(uploadedFiles.id, inserted.id));

            if (purpose === 'alumni_photo') {
              await tx
                .update(alumniProfiles)
                .set({
                  photoFile: fileUrl,
                  photoFileId: inserted.id,
                  updatedAt: new Date(),
                })
                .where(eq(alumniProfiles.id, profile.id));
            } else {
              await tx
                .update(alumniProfiles)
                .set({
                  portfolioImage: fileUrl,
                  portfolioImageId: inserted.id,
                  updatedAt: new Date(),
                })
                .where(eq(alumniProfiles.id, profile.id));
            }
          }
        }

        return { inserted, fileUrl };
      });

      return res.status(201).json({
        public_id: saved.inserted.publicId,
        url: saved.fileUrl,
        mime_type: saved.inserted.mimeType,
        size_bytes: saved.inserted.sizeBytes,
        original_name: saved.inserted.originalName,
      });
    } catch (err) {
      return next(err);
    }
  });

  app.get('/api/files/:publicId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const publicId = String(req.params.publicId || '').toUpperCase();
      const [fileRow] = await db
        .select()
        .from(uploadedFiles)
        .where(eq(uploadedFiles.publicId, publicId));

      if (!fileRow) {
        return res.status(404).json({ detail: 'File not found' });
      }

      let authorized = fileRow.isPublic;

      // For alumni photos/portfolios, verify ongoing consent unless accessed by owner or admin
      if (fileRow.purpose === 'alumni_photo' || fileRow.purpose === 'alumni_portfolio') {
        const [linkedAlum] = await db
          .select({
            consentToPublish: alumniProfiles.consentToPublish,
            consentToShowPhoto: alumniProfiles.consentToShowPhoto,
          })
          .from(alumniProfiles)
          .where(
            or(
              eq(alumniProfiles.photoFileId, fileRow.id),
              eq(alumniProfiles.portfolioImageId, fileRow.id),
            ),
          );
        if (linkedAlum) {
          authorized = linkedAlum.consentToPublish && linkedAlum.consentToShowPhoto;
        }
      }

      if (!authorized) {
        const token = extractBearerToken(req);
        if (!token) {
          return res.status(403).json({ detail: 'Access to this file is restricted' });
        }
        try {
          const verified = await verifyBearerClaims(token);
          if (
            !verified ||
            (verified.user.id !== fileRow.ownerUserId && verified.user.role !== 'admin')
          ) {
            return res.status(403).json({ detail: 'Access to this file is restricted' });
          }
        } catch {
          return res.status(401).json({ detail: 'Invalid token' });
        }
      }

      const bytes = Buffer.from(fileRow.dataBase64, 'base64');
      res.setHeader('Content-Type', fileRow.mimeType);
      res.setHeader('Content-Length', String(bytes.length));
      res.setHeader('Content-Disposition', `inline; filename="${fileRow.originalName}"`);
      res.setHeader('Cache-Control', 'private, max-age=300');
      return res.send(bytes);
    } catch (err) {
      return next(err);
    }
  });

  // Role-specific Dashboard routes
  app.get('/api/dashboard', requireAuth, async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.authUser!;
      const userNotifs = await db
        .select()
        .from(notifications)
        .where(
          user.role === 'admin'
            ? or(eq(notifications.userId, user.id), eq(notifications.targetRole, 'admin'))
            : eq(notifications.userId, user.id),
        )
        .orderBy(desc(notifications.createdAt))
        .limit(15);

      const serializedNotifs = userNotifs.map((n) => ({
        id: n.id,
        category: n.category,
        title: n.title,
        body: n.body,
        link_path: n.linkPath,
        is_read: n.isRead,
        created_at: n.createdAt.toISOString(),
      }));

      if (user.role === 'learner') {
        const [pwRows, modRows, [learnerRec], progressRows, publicAlumCount] = await Promise.all([
          db.select().from(pathways).where(eq(pathways.isActive, true)).orderBy(asc(pathways.id)),
          db.select().from(courseModules).where(eq(courseModules.isActive, true)).orderBy(asc(courseModules.sortOrder)),
          db.select().from(learnerProfiles).where(eq(learnerProfiles.userId, user.id)),
          db
            .select()
            .from(learnerProgress)
            .where(and(eq(learnerProgress.userId, user.id), eq(learnerProgress.completed, true))),
          db
            .select({ count: sql<number>`count(*)::int` })
            .from(alumniProfiles)
            .where(
              and(
                eq(alumniProfiles.pathwayCode, user.pathwayCode ?? 'P1'),
                eq(alumniProfiles.consentToPublish, true),
                eq(alumniProfiles.isActive, true),
              ),
            ),
        ]);

        const mappedPathways = pwRows.map((pw) => ({
          code: pw.code,
          name: pw.name,
          description: pw.summary,
          status: pw.status as 'Available' | 'Completed',
          learners_enrolled: pw.learnersCount,
          completed: pw.completedCount,
          freelancing_active: pw.freelancingActive,
          avg_days_to_first_gig: pw.avgDaysToFirstGig,
        }));
        const activePathway =
          mappedPathways.find((p) => p.code === (learnerRec?.pathwayCode ?? user.pathwayCode)) ??
          mappedPathways[0];

        return res.json({
          role: 'learner',
          application_id: user.linkedBusinessId ?? `LRN-${user.id}`,
          application_status: learnerRec?.cohortStatus ?? 'active_cohort',
          pathway: activePathway,
          all_pathways: mappedPathways,
          modules: modRows.map((m) => ({
            part: m.part,
            code: m.code,
            title: m.title,
            duration: m.duration,
            submodules: m.submodules,
          })),
          completed_modules: progressRows.map((p) => p.moduleCode),
          learning_goal: learnerRec?.learningGoal ?? user.learningGoal,
          location: user.city ? `${user.city}, ${user.country ?? ''}` : user.country,
          peers_in_pathway: publicAlumCount[0]?.count ?? 0,
          notifications: serializedNotifs,
        });
      }

      if (user.role === 'alumni') {
        const [profile] = await db
          .select()
          .from(alumniProfiles)
          .where(
            user.linkedBusinessId
              ? or(
                  eq(alumniProfiles.businessId, user.linkedBusinessId),
                  eq(alumniProfiles.userId, user.id),
                )
              : eq(alumniProfiles.userId, user.id),
          );

        const subs = profile
          ? await db
              .select()
              .from(interestSubmissions)
              .where(eq(interestSubmissions.status, 'routed'))
              .orderBy(desc(interestSubmissions.createdAt))
          : [];

        const matchedInquiries = profile
          ? subs
              .filter(
                (s) =>
                  (s.targetAlumniBusinessId ?? '')
                    .split(',')
                    .map((id) => id.trim())
                    .includes(profile.businessId) ||
                  (s.submissionType === 'pathway' && s.pathwayCode === profile.pathwayCode),
              )
              .map((s) => ({
                business_id: s.referenceId,
                submitted_at: s.createdAt.toISOString(),
                organisation: s.senderOrganisation || s.visitorType,
                visitor_type: s.visitorType,
                interest_type: s.submissionType,
                message: s.message,
              }))
          : [];

        return res.json({
          role: 'alumni',
          profile: profile
            ? {
                business_id: profile.businessId,
                first_name: profile.firstName,
                last_name: profile.lastName,
                city: profile.city,
                country: profile.country,
                pathway_code: profile.pathwayCode,
                short_bio: profile.shortBio,
                skills: profile.skills,
                languages: profile.languages,
                availability: profile.availability,
                portfolio_title: profile.portfolioTitle,
                portfolio_url: profile.portfolioUrl || null,
                portfolio_image: profile.portfolioImage || null,
                photo_file: profile.photoFile || null,
                personal_website: profile.personalWebsite || null,
                linkedin_url: profile.linkedinUrl || null,
                consent_to_publish: profile.consentToPublish,
                consent_to_show_photo: profile.consentToShowPhoto,
                is_active: profile.isActive,
              }
            : null,
          inquiries: matchedInquiries,
          notifications: serializedNotifs,
        });
      }

      if (user.role === 'employer') {
        const [organisation] = await db
          .select()
          .from(partners)
          .where(
            user.linkedBusinessId
              ? or(eq(partners.businessId, user.linkedBusinessId), eq(partners.userId, user.id))
              : eq(partners.userId, user.id),
          );

        const [pwRows, alumRows, subs] = await Promise.all([
          db.select().from(pathways).where(eq(pathways.isActive, true)).orderBy(asc(pathways.id)),
          db
            .select()
            .from(alumniProfiles)
            .where(
              and(
                eq(alumniProfiles.consentToPublish, true),
                eq(alumniProfiles.isActive, true),
                isNull(alumniProfiles.archivedAt),
              ),
            )
            .orderBy(asc(alumniProfiles.businessId)),
          db
            .select()
            .from(interestSubmissions)
            .orderBy(desc(interestSubmissions.createdAt))
            .limit(50),
        ]);

        const pathwayNameLookup = new Map(pwRows.map((p) => [p.code, p.name]));
        const orgName = organisation?.organisation?.toLowerCase() ?? '';
        const mySubmissions = subs
          .filter(
            (s) =>
              s.senderEmail === user.email ||
              (orgName && s.senderOrganisation.toLowerCase() === orgName),
          )
          .map((s) => ({
            business_id: s.referenceId,
            submitted_at: s.createdAt.toISOString(),
            interest_type: s.submissionType,
            interest_value: s.targetAlumniBusinessId,
            status: s.status,
            message: s.message,
          }));

        return res.json({
          role: 'employer',
          organisation: organisation
            ? {
                business_id: organisation.businessId,
                organisation: organisation.organisation,
                type: organisation.type,
                country: organisation.country,
                description: organisation.description,
                website: organisation.website || null,
                show_on_site: organisation.showOnSite,
                status: organisation.status,
              }
            : null,
          pathways: pwRows.map((pw) => ({
            code: pw.code,
            name: pw.name,
            description: pw.summary,
            status: pw.status as 'Available' | 'Completed',
            learners_enrolled: pw.learnersCount,
            completed: pw.completedCount,
            freelancing_active: pw.freelancingActive,
            avg_days_to_first_gig: pw.avgDaysToFirstGig,
          })),
          alumni: alumRows.map((r) => serializePublicAlumnus(r, pathwayNameLookup)),
          submissions: mySubmissions,
          notifications: serializedNotifs,
        });
      }

      if (user.role === 'partner' || user.role === 'donor') {
        const [organisation] = await db
          .select()
          .from(partners)
          .where(
            user.linkedBusinessId
              ? or(eq(partners.businessId, user.linkedBusinessId), eq(partners.userId, user.id))
              : eq(partners.userId, user.id),
          );

        const [subs, subPrefs, repRows, summary] = await Promise.all([
          db
            .select()
            .from(interestSubmissions)
            .where(eq(interestSubmissions.senderEmail, user.email))
            .orderBy(desc(interestSubmissions.createdAt)),
          db
            .select()
            .from(newsletterSubscriptions)
            .where(eq(newsletterSubscriptions.email, user.email)),
          db.select().from(annualReports).orderBy(asc(annualReports.year)),
          computeImpactSummaryFromDb(),
        ]);

        const donorPref = subPrefs.find((n) => n.list === 'donor_partner');
        const alumniPref = subPrefs.find((n) => n.list === 'alumni');

        return res.json({
          role: user.role,
          organisation: organisation
            ? {
                business_id: organisation.businessId,
                organisation: organisation.organisation,
                type: organisation.type,
                country: organisation.country,
                description: organisation.description,
                website: organisation.website || null,
                show_on_site: organisation.showOnSite,
                status: organisation.status,
              }
            : null,
          summary,
          submissions: subs.map((s) => ({
            business_id: s.referenceId,
            submitted_at: s.createdAt.toISOString(),
            interest_type: s.submissionType,
            interest_value: s.targetAlumniBusinessId,
            status: s.status,
            message: s.message,
          })),
          reports: repRows.map((r) => ({
            year: r.year,
            title: r.title,
            vision_statement: r.visionStatement,
            director_message: r.directorMessage,
            highlights: r.highlights,
            pdf_url: r.publicUrl,
            learners_trained: r.learnersTrained,
            graduates: r.graduates,
            graduation_rate_pct: r.graduationRatePct,
            employed_or_freelancing_pct: r.employedOrFreelancingPct,
            women_pct: r.womenPct,
            countries: r.countries,
            cohorts: r.cohorts,
            employer_partners: r.employerPartners,
          })),
          newsletter_preferences: {
            donor_partner: donorPref?.status === 'subscribed',
            alumni: alumniPref?.status === 'subscribed',
          },
          notifications: serializedNotifs,
        });
      }

      const summary = await computeImpactSummaryFromDb();
      return res.json({
        role: user.role,
        summary,
        notifications: serializedNotifs,
      });
    } catch (err) {
      return next(err);
    }
  });

  // Persist Learner Part I Module Progress (replaces localStorage)
  app.patch(
    '/api/dashboard/learner/progress',
    requireAuth,
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const user = req.authUser!;
        if (user.role !== 'learner') {
          return res.status(403).json({ detail: 'Learner account required' });
        }
        const moduleCode = typeof req.body?.module_code === 'string' ? req.body.module_code.trim() : '';
        const completed = Boolean(req.body?.completed);

        const [mod] = await db
          .select({ code: courseModules.code })
          .from(courseModules)
          .where(eq(courseModules.code, moduleCode));
        if (!mod) {
          return res.status(422).json({ detail: 'Invalid course module code' });
        }

        const now = new Date();
        await db
          .insert(learnerProgress)
          .values({
            userId: user.id,
            moduleCode,
            completed,
            completedAt: completed ? now : null,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [learnerProgress.userId, learnerProgress.moduleCode],
            set: {
              completed,
              completedAt: completed ? now : null,
              updatedAt: now,
            },
          });

        const rows = await db
          .select({ moduleCode: learnerProgress.moduleCode })
          .from(learnerProgress)
          .where(and(eq(learnerProgress.userId, user.id), eq(learnerProgress.completed, true)));

        return res.json({
          completed_modules: rows.map((r) => r.moduleCode),
        });
      } catch (err) {
        return next(err);
      }
    },
  );

  app.patch('/api/dashboard/alumni', requireAuth, async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.authUser!;
      if (user.role !== 'alumni') {
        return res.status(403).json({ detail: 'Alumni account required' });
      }
      const [profile] = await db
        .select()
        .from(alumniProfiles)
        .where(
          user.linkedBusinessId
            ? or(
                eq(alumniProfiles.businessId, user.linkedBusinessId),
                eq(alumniProfiles.userId, user.id),
              )
            : eq(alumniProfiles.userId, user.id),
        );
      if (!profile) {
        return res.status(404).json({ detail: 'Alumni profile not found' });
      }

      const body = req.body ?? {};
      const nextBio =
        typeof body.short_bio === 'string'
          ? body.short_bio.trim().slice(0, 2000)
          : profile.shortBio;
      const nextAvailability =
        typeof body.availability === 'string' &&
        ALLOWED_AVAILABILITIES.has(body.availability as AlumniAvailability)
          ? body.availability
          : profile.availability;
      const nextSkills = Array.isArray(body.skills) ? cleanStringList(body.skills) : profile.skills;
      const nextPortfolioTitle =
        typeof body.portfolio_title === 'string'
          ? body.portfolio_title.trim().slice(0, 160) || profile.portfolioTitle
          : profile.portfolioTitle;
      const nextPortfolioUrl =
        'portfolio_url' in body ? cleanOptionalText(body.portfolio_url) ?? '' : profile.portfolioUrl;
      const nextWebsite =
        'personal_website' in body
          ? cleanOptionalText(body.personal_website) ?? ''
          : profile.personalWebsite;
      const nextLinkedin =
        'linkedin_url' in body ? cleanOptionalText(body.linkedin_url) ?? '' : profile.linkedinUrl;

      if (!isSafeHttpUrl(nextPortfolioUrl) || !isSafeHttpUrl(nextWebsite) || !isSafeHttpUrl(nextLinkedin)) {
        return res.status(422).json({ detail: 'Links must use http:// or https://' });
      }

      const nextPublish =
        typeof body.consent_to_publish === 'boolean'
          ? body.consent_to_publish
          : profile.consentToPublish;
      const nextShowPhoto =
        typeof body.consent_to_show_photo === 'boolean'
          ? body.consent_to_show_photo
          : profile.consentToShowPhoto;

      const updatedProfile = await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(alumniProfiles)
          .set({
            shortBio: nextBio,
            availability: nextAvailability,
            skills: nextSkills,
            portfolioTitle: nextPortfolioTitle,
            portfolioUrl: nextPortfolioUrl,
            personalWebsite: nextWebsite,
            linkedinUrl: nextLinkedin,
            consentToPublish: nextPublish,
            consentToShowPhoto: nextShowPhoto,
            consentToBeContacted: nextPublish,
            consentDate: nextPublish ? profile.consentDate ?? new Date() : null,
            updatedAt: new Date(),
          })
          .where(eq(alumniProfiles.id, profile.id))
          .returning();

        if (Array.isArray(body.skills)) {
          await tx.delete(alumniSkills).where(eq(alumniSkills.alumniId, profile.id));
          for (const sk of nextSkills) {
            await tx.insert(alumniSkills).values({ alumniId: profile.id, skill: sk }).onConflictDoNothing();
          }
        }

        if (
          typeof body.consent_to_publish === 'boolean' &&
          body.consent_to_publish !== profile.consentToPublish
        ) {
          await tx.insert(consentRecords).values({
            userId: user.id,
            subjectEmail: user.email,
            subjectType: 'alumni',
            consentScope: 'public_directory_profile',
            granted: nextPublish,
            source: 'alumni_dashboard',
            notes: `Alumnus updated public directory consent (${profile.businessId})`,
          });
        }

        if (
          typeof body.consent_to_show_photo === 'boolean' &&
          body.consent_to_show_photo !== profile.consentToShowPhoto
        ) {
          await tx.insert(consentRecords).values({
            userId: user.id,
            subjectEmail: user.email,
            subjectType: 'alumni',
            consentScope: 'public_photo_media',
            granted: nextShowPhoto,
            source: 'alumni_dashboard',
            notes: `Alumnus updated photo display consent (${profile.businessId})`,
          });
        }

        return updated;
      });

      const pwRows = await db.select({ code: pathways.code, name: pathways.name }).from(pathways);
      const pwMap = new Map(pwRows.map((p) => [p.code, p.name]));

      return res.json({
        status: 'updated',
        profile: serializePublicAlumnus(updatedProfile, pwMap),
        consent_to_publish: updatedProfile.consentToPublish,
      });
    } catch (err) {
      return next(err);
    }
  });

  app.patch('/api/dashboard/newsletter', requireAuth, async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.authUser!;
      const body = req.body ?? {};
      const list = body.list === 'alumni' ? 'alumni' : 'donor_partner';
      const subscribed = Boolean(body.subscribed);
      const now = new Date();

      await db.transaction(async (tx) => {
        await tx
          .insert(newsletterSubscriptions)
          .values({
            email: user.email,
            list,
            source: 'dashboard',
            status: subscribed ? 'subscribed' : 'unsubscribed',
            subscribedAt: now,
            unsubscribedAt: subscribed ? null : now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [newsletterSubscriptions.email, newsletterSubscriptions.list],
            set: {
              status: subscribed ? 'subscribed' : 'unsubscribed',
              unsubscribedAt: subscribed ? null : now,
              updatedAt: now,
            },
          });

        await tx.insert(consentRecords).values({
          userId: user.id,
          subjectEmail: user.email,
          subjectType: 'newsletter',
          consentScope: `newsletter_${list}`,
          granted: subscribed,
          source: 'dashboard_toggle',
          notes: 'Updated from account dashboard',
        });
      });

      return res.json({
        list,
        status: subscribed ? 'subscribed' : 'unsubscribed',
      });
    } catch (err) {
      return next(err);
    }
  });

  // Administrator Dashboard APIs (strictly role === 'admin' + AAL2)
  app.get('/api/admin/overview', requireAdmin, async (_req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const [
        summary,
        userRows,
        alumniRows,
        partnerRows,
        submissionRows,
        contactRows,
        subscriberRows,
        eventRows,
        locationRows,
        pathwayRows,
        teamRows,
        consentRows,
        auditRows,
      ] = await Promise.all([
        computeImpactSummaryFromDb(),
        db.select().from(users).where(isNull(users.archivedAt)).orderBy(asc(users.id)),
        db.select().from(alumniProfiles).where(isNull(alumniProfiles.archivedAt)).orderBy(asc(alumniProfiles.businessId)),
        db.select().from(partners).where(isNull(partners.archivedAt)).orderBy(asc(partners.businessId)),
        db.select().from(interestSubmissions).orderBy(desc(interestSubmissions.createdAt)).limit(100),
        db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt)).limit(100),
        db.select().from(newsletterSubscriptions).orderBy(desc(newsletterSubscriptions.updatedAt)).limit(150),
        db.select().from(impactEvents).orderBy(desc(impactEvents.recordedAt)).limit(50),
        db.select().from(locations).orderBy(asc(locations.businessId)),
        db.select().from(pathways).orderBy(asc(pathways.id)),
        db.select().from(teamMembers).orderBy(asc(teamMembers.sortOrder)),
        db.select().from(consentRecords).orderBy(desc(consentRecords.createdAt)).limit(80),
        db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(80),
      ]);

      return res.json({
        summary,
        counts: {
          users: userRows.length,
          alumni_total: alumniRows.length,
          alumni_public: alumniRows.filter((a) => a.consentToPublish && a.isActive).length,
          partners_total: partnerRows.length,
          partners_pending: partnerRows.filter((p) => p.status === 'pending_review').length,
          submissions_total: submissionRows.length,
          contact_messages: contactRows.length,
          newsletter_subscribers: subscriberRows.filter((s) => s.status === 'subscribed').length,
        },
        users: userRows.map((u) => ({
          id: u.id,
          first_name: u.firstName,
          second_name: u.secondName,
          email: u.email,
          role: u.role,
          is_active: u.isActive,
          linked_business_id: u.linkedBusinessId,
        })),
        alumni: alumniRows.map((a) => ({
          business_id: a.businessId,
          first_name: a.firstName,
          last_name: a.lastName,
          city: a.city,
          country: a.country,
          pathway_code: a.pathwayCode,
          availability: a.availability,
          consent_to_publish: a.consentToPublish,
          consent_to_show_photo: a.consentToShowPhoto,
          is_active: a.isActive,
        })),
        partners: partnerRows.map((p) => ({
          business_id: p.businessId,
          organisation: p.organisation,
          type: p.type,
          country: p.country,
          show_on_site: p.showOnSite,
          status: p.status,
        })),
        submissions: submissionRows.map((s) => ({
          business_id: s.referenceId,
          submitted_at: s.createdAt.toISOString(),
          full_name: s.senderName,
          organisation: s.senderOrganisation || null,
          visitor_type: s.visitorType,
          interest_type: s.submissionType,
          interest_value: s.targetAlumniBusinessId,
          consent_to_be_contacted: s.privacyConsent,
          status: s.status,
          notified_alumni_ids: s.targetAlumniBusinessId
            ? s.targetAlumniBusinessId.split(',').map((v) => v.trim()).filter(Boolean)
            : [],
          notified_roles:
            s.routingMode === 'direct_alumni' || s.routingMode === 'pathway_match'
              ? ['Partnerships Lead', 'Alumni Community Manager']
              : ['Partnerships Lead'],
        })),
        contacts: contactRows.map((c) => ({
          id: c.id,
          reference_id: c.referenceId,
          name: c.name,
          visitor_category: c.visitorCategory,
          topic: c.topic,
          routed_to_role: c.routedToRole,
          status: c.status,
          message: c.message,
          created_at: c.createdAt.toISOString(),
        })),
        subscribers: subscriberRows.map((n) => ({
          id: n.id,
          list: n.list,
          status: n.status,
          consent_date: n.subscribedAt.toISOString(),
          consent_text_version: 'consent-text-v1',
        })),
        impact_events: eventRows.map((e) => ({
          id: e.id,
          event_id: `EVT-${e.id}`,
          metric: e.eventType,
          location_city: e.location,
          change: e.deltaLearners || e.deltaGraduates || e.employmentRatePct || 0,
          description: e.title,
          occurred_at: e.recordedAt.toISOString(),
        })),
        locations: locationRows.map((l) => ({
          business_id: l.businessId,
          city: l.city,
          country: l.country,
          latitude: l.latitude,
          longitude: l.longitude,
          learners_trained: l.learnersTrained,
          graduates: l.graduates,
          employed_or_freelancing: l.employedOrFreelancing,
          employment_rate_pct: l.employmentRatePct,
          women_pct: l.womenPct,
          cohorts_completed: l.cohortsCompleted,
        })),
        pathways: pathwayRows.map((p) => ({
          code: p.code,
          name: p.name,
          status: p.status,
          is_active: p.isActive,
          learners_enrolled: p.learnersCount,
        })),
        team: teamRows.map((t) => ({
          business_id: t.businessId,
          name: t.name,
          role_title: t.roleTitle,
          contact_topic: t.contactTopic,
          is_active: t.isActive,
        })),
        consent_records: consentRows.map((c) => ({
          id: c.id,
          subject_type: c.subjectType,
          consent_scope: c.consentScope,
          granted: c.granted,
          source: c.source,
          notes: c.notes,
          created_at: c.createdAt.toISOString(),
        })),
        audit_logs: auditRows.map((a) => ({
          id: a.id,
          actor_email: a.actorEmail,
          action: a.action,
          target_type: a.targetType,
          target_id: a.targetId,
          details: a.details,
          created_at: a.createdAt.toISOString(),
        })),
      });
    } catch (err) {
      return next(err);
    }
  });

  app.patch('/api/admin/users/:userId', requireAdmin, async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const actingAdmin = req.authUser!;
      const userId = Number(req.params.userId);
      if (!Number.isFinite(userId)) {
        return res.status(400).json({ detail: 'Invalid user ID' });
      }
      const [target] = await db.select().from(users).where(eq(users.id, userId));
      if (!target) {
        return res.status(404).json({ detail: 'User not found' });
      }

      const totpCode = typeof req.body?.totp_code === 'string' ? req.body.totp_code.trim() : '';
      if (!isFreshAuthentication(req)) {
        const ok = totpCode ? await consumeTotpOrRecovery(actingAdmin, totpCode) : false;
        if (!ok) {
          return res.status(403).json({
            detail: 'Fresh two-factor authentication required to modify account roles.',
            code: 'FRESH_AUTH_REQUIRED',
          });
        }
      }

      const nextRole = req.body?.role as Role;
      if (!VALID_ROLES.has(nextRole)) {
        return res.status(422).json({ detail: 'Invalid role' });
      }
      if (target.id === actingAdmin.id && nextRole !== 'admin') {
        return res.status(400).json({ detail: 'You cannot demote your own active administrator account.' });
      }

      await db
        .update(users)
        .set({ role: nextRole, updatedAt: new Date() })
        .where(eq(users.id, target.id));

      await recordAuditLog({
        actorUserId: actingAdmin.id,
        actorEmail: actingAdmin.email,
        action: 'admin_user_role_updated',
        targetType: 'user',
        targetId: String(target.id),
        details: { previous_role: target.role, next_role: nextRole },
        ipAddress: getClientIp(req),
      });

      return res.json({ id: target.id, role: nextRole });
    } catch (err) {
      return next(err);
    }
  });

  app.patch(
    '/api/admin/alumni/:businessId',
    requireAdmin,
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const actingAdmin = req.authUser!;
        const businessId = String(req.params.businessId || '').toUpperCase();
        const [target] = await db
          .select()
          .from(alumniProfiles)
          .where(eq(alumniProfiles.businessId, businessId));
        if (!target) {
          return res.status(404).json({ detail: 'Alumni record not found' });
        }
        const body = req.body ?? {};
        const nextPublish =
          typeof body.consent_to_publish === 'boolean'
            ? body.consent_to_publish
            : target.consentToPublish;
        const nextPhoto =
          typeof body.consent_to_show_photo === 'boolean'
            ? body.consent_to_show_photo
            : target.consentToShowPhoto;
        const nextActive =
          typeof body.is_active === 'boolean' ? body.is_active : target.isActive;

        await db.transaction(async (tx) => {
          await tx
            .update(alumniProfiles)
            .set({
              consentToPublish: nextPublish,
              consentToShowPhoto: nextPhoto,
              isActive: nextActive,
              consentDate: nextPublish ? target.consentDate ?? new Date() : null,
              updatedAt: new Date(),
            })
            .where(eq(alumniProfiles.id, target.id));

          if (typeof body.consent_to_publish === 'boolean' && nextPublish !== target.consentToPublish) {
            await tx.insert(consentRecords).values({
              userId: target.userId,
              subjectEmail: target.privateNotificationEmail || `${target.businessId}@alumni`,
              subjectType: 'alumni',
              consentScope: 'public_directory_profile',
              granted: nextPublish,
              source: 'admin_moderation',
              notes: `Moderated by ${actingAdmin.email}`,
            });
          }
        });

        await recordAuditLog({
          actorUserId: actingAdmin.id,
          actorEmail: actingAdmin.email,
          action: 'admin_alumni_moderated',
          targetType: 'alumni',
          targetId: businessId,
          details: {
            consent_to_publish: nextPublish,
            consent_to_show_photo: nextPhoto,
            is_active: nextActive,
          },
          ipAddress: getClientIp(req),
        });

        return res.json({
          business_id: businessId,
          consent_to_publish: nextPublish,
          consent_to_show_photo: nextPhoto,
          is_active: nextActive,
        });
      } catch (err) {
        return next(err);
      }
    },
  );

  app.patch(
    '/api/admin/partners/:businessId',
    requireAdmin,
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const actingAdmin = req.authUser!;
        const businessId = String(req.params.businessId || '').toUpperCase();
        const [target] = await db
          .select()
          .from(partners)
          .where(eq(partners.businessId, businessId));
        if (!target) {
          return res.status(404).json({ detail: 'Partner record not found' });
        }
        const body = req.body ?? {};
        const nextShow =
          typeof body.show_on_site === 'boolean' ? body.show_on_site : target.showOnSite;
        const nextStatus =
          typeof body.status === 'string' &&
          ['approved', 'pending_review', 'archived'].includes(body.status)
            ? body.status
            : target.status;

        await db
          .update(partners)
          .set({
            showOnSite: nextStatus === 'archived' ? false : nextShow,
            status: nextStatus,
            approved: nextStatus === 'approved',
            archivedAt: nextStatus === 'archived' ? new Date() : null,
            updatedAt: new Date(),
          })
          .where(eq(partners.id, target.id));

        await recordAuditLog({
          actorUserId: actingAdmin.id,
          actorEmail: actingAdmin.email,
          action: 'admin_partner_moderated',
          targetType: 'partner',
          targetId: businessId,
          details: { show_on_site: nextShow, status: nextStatus },
          ipAddress: getClientIp(req),
        });

        return res.json({
          business_id: businessId,
          show_on_site: nextStatus === 'archived' ? false : nextShow,
          status: nextStatus,
        });
      } catch (err) {
        return next(err);
      }
    },
  );

  app.patch(
    '/api/admin/pathways/:code',
    requireAdmin,
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const actingAdmin = req.authUser!;
        const code = String(req.params.code || '').toUpperCase();
        const [target] = await db.select().from(pathways).where(eq(pathways.code, code));
        if (!target) {
          return res.status(404).json({ detail: 'Pathway not found' });
        }
        const nextStatus =
          req.body?.status === 'Available' || req.body?.status === 'Completed'
            ? req.body.status
            : target.status;
        const nextActive =
          typeof req.body?.is_active === 'boolean' ? req.body.is_active : target.isActive;

        await db
          .update(pathways)
          .set({ status: nextStatus, isActive: nextActive, updatedAt: new Date() })
          .where(eq(pathways.id, target.id));

        await recordAuditLog({
          actorUserId: actingAdmin.id,
          actorEmail: actingAdmin.email,
          action: 'admin_pathway_updated',
          targetType: 'pathway',
          targetId: code,
          details: { status: nextStatus, is_active: nextActive },
          ipAddress: getClientIp(req),
        });

        return res.json({ code, status: nextStatus, is_active: nextActive });
      } catch (err) {
        return next(err);
      }
    },
  );

  app.post('/api/admin/impact/events', requireAdmin, async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const actingAdmin = req.authUser!;
      const body = req.body ?? {};
      const metric = body.metric as
        | 'learners_trained'
        | 'graduates'
        | 'employed_or_freelancing'
        | 'employer_partners';
      const location_city = typeof body.location_city === 'string' ? body.location_city.trim() : '';
      const change = Number(body.change);
      const description = typeof body.description === 'string' ? body.description.trim() : '';

      if (
        !['learners_trained', 'graduates', 'employed_or_freelancing', 'employer_partners'].includes(
          metric,
        )
      ) {
        return res.status(422).json({ detail: 'Invalid impact metric' });
      }
      if (!Number.isFinite(change) || change === 0 || Math.abs(change) > 500) {
        return res.status(422).json({ detail: 'Change must be a non-zero integer within +/- 500' });
      }
      if (!description) {
        return res.status(422).json({ detail: 'Description is required' });
      }

      const intChange = Math.trunc(change);

      const insertedEvent = await db.transaction(async (tx) => {
        if (metric === 'employer_partners') {
          const [setting] = await tx
            .select()
            .from(platformSettings)
            .where(eq(platformSettings.key, 'employer_partners_count'));
          const nextVal = Math.max(0, Number(setting?.value ?? 34) + intChange);
          await tx
            .insert(platformSettings)
            .values({ key: 'employer_partners_count', value: String(nextVal) })
            .onConflictDoUpdate({
              target: platformSettings.key,
              set: { value: String(nextVal), updatedAt: new Date() },
            });
        } else {
          const locRows = await tx.select().from(locations);
          const loc = locRows.find((l) => l.city.toLowerCase() === location_city.toLowerCase());
          if (!loc) {
            throw new Error('INVALID_HUB');
          }
          const nextLearners =
            metric === 'learners_trained'
              ? Math.max(0, loc.learnersTrained + intChange)
              : loc.learnersTrained;
          const nextGraduates =
            metric === 'graduates' ? Math.max(0, loc.graduates + intChange) : loc.graduates;
          const nextEmployed =
            metric === 'employed_or_freelancing'
              ? Math.max(0, loc.employedOrFreelancing + intChange)
              : loc.employedOrFreelancing;
          const nextRate =
            nextGraduates > 0 ? Math.round((nextEmployed / nextGraduates) * 100) : 0;

          await tx
            .update(locations)
            .set({
              learnersTrained: nextLearners,
              graduates: nextGraduates,
              employedOrFreelancing: nextEmployed,
              employmentRatePct: nextRate,
              updatedAt: new Date(),
            })
            .where(eq(locations.id, loc.id));
        }

        const [ev] = await tx
          .insert(impactEvents)
          .values({
            eventType: metric,
            title: description,
            location: metric === 'employer_partners' ? 'All' : location_city,
            pathway: 'All',
            deltaLearners: metric === 'learners_trained' ? intChange : 0,
            deltaGraduates: metric === 'graduates' ? intChange : 0,
            employmentRatePct: metric === 'employed_or_freelancing' ? intChange : null,
            recordedByUserId: actingAdmin.id,
          })
          .returning();

        return ev;
      }).catch((err: unknown) => {
        if (err instanceof Error && err.message === 'INVALID_HUB') {
          return null;
        }
        throw err;
      });

      if (!insertedEvent) {
        return res.status(422).json({ detail: 'Select one of the 7 active hub locations' });
      }

      await recordAuditLog({
        actorUserId: actingAdmin.id,
        actorEmail: actingAdmin.email,
        action: 'admin_impact_event_recorded',
        targetType: 'impact_event',
        targetId: `EVT-${insertedEvent.id}`,
        details: { metric, location_city, change: intChange },
        ipAddress: getClientIp(req),
      });

      const summary = await computeImpactSummaryFromDb();
      return res.status(201).json({
        event: {
          id: insertedEvent.id,
          event_id: `EVT-${insertedEvent.id}`,
          metric,
          location_city: insertedEvent.location,
          change: intChange,
          description: insertedEvent.title,
          occurred_at: insertedEvent.recordedAt.toISOString(),
        },
        summary,
      });
    } catch (err) {
      return next(err);
    }
  });

  // Contact form
  app.post('/contact', formLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body ?? {};
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
      const visitor_category =
        typeof body.visitor_category === 'string' && body.visitor_category.trim()
          ? body.visitor_category.trim()
          : 'General';
      const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
      const message = typeof body.message === 'string' ? body.message.trim() : '';
      const consent = body.consent === undefined ? true : Boolean(body.consent);
      const honeypot = cleanOptionalText(body.website_url);

      if (!name || name.length > 120) {
        return res.status(422).json({ detail: 'Name is required (max 120 characters).' });
      }
      if (!EMAIL_RE.test(email)) {
        return res.status(422).json({ detail: 'Please provide a valid email address.' });
      }
      if (phone && (phone.length < 7 || phone.length > 32)) {
        return res.status(422).json({ detail: 'Phone number must be between 7 and 32 characters.' });
      }
      if (topic.length < 2 || topic.length > 120) {
        return res.status(422).json({ detail: 'Topic must be between 2 and 120 characters.' });
      }
      if (!message || message.length > 1500) {
        return res.status(422).json({ detail: 'Message is required (max 1500 characters).' });
      }
      if (!consent) {
        return res.status(422).json({ detail: 'Please confirm your consent to process this enquiry.' });
      }

      const routeInfo = TOPIC_ROUTING[topic] ?? {
        role: 'Country Director',
        mailbox: 'director@konexio-africa.invalid',
      };

      if (!honeypot) {
        const refId = createBusinessId('MSG');
        await db.transaction(async (tx) => {
          await tx.insert(contactMessages).values({
            referenceId: refId,
            name,
            email,
            phone,
            visitorCategory: visitor_category,
            topic,
            routedToRole: routeInfo.role,
            routedMailbox: routeInfo.mailbox,
            message,
            privacyConsent: consent,
            status: 'received',
          });

          await tx.insert(consentRecords).values({
            subjectEmail: email,
            subjectType: 'contact_form',
            consentScope: 'contact_enquiry_processing',
            granted: consent,
            source: 'contact_page',
            notes: `Topic: ${topic} (${refId})`,
          });

          await tx.insert(notifications).values({
            targetRole: 'admin',
            category: 'contact',
            title: `Contact enquiry (${routeInfo.role})`,
            body: `${name} (${visitor_category}) — ${topic}`,
            linkPath: '/admin',
          });
        });
      }

      return res.status(201).json({
        status: 'received',
        routed_to_role: routeInfo.role,
      });
    } catch (err) {
      return next(err);
    }
  });

  // Standalone Alumni & Partner registration routes
  app.post('/alumni/register', formLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body ?? {};
      const first_name = typeof body.first_name === 'string' ? body.first_name.trim() : '';
      const last_name = typeof body.last_name === 'string' ? body.last_name.trim() : '';
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const pathway_code = typeof body.pathway_code === 'string' ? body.pathway_code.trim() : '';

      if (!first_name || !last_name || !EMAIL_RE.test(email) || !PATHWAY_RE.test(pathway_code)) {
        return res.status(422).json({ detail: 'Invalid alumni registration details.' });
      }

      const business_id = createBusinessId('ALU');
      const consent_to_publish = Boolean(body.consent_to_publish);
      const skills = cleanStringList(body.skills);
      const languages = cleanStringList(body.languages);
      const [pwRow] = await db
        .select({ name: pathways.name })
        .from(pathways)
        .where(eq(pathways.code, pathway_code));

      await db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(alumniProfiles)
          .values({
            businessId: business_id,
            firstName: first_name,
            lastName: last_name,
            name: `${first_name} ${last_name}`,
            privateNotificationEmail: email,
            city: cleanOptionalText(body.city) ?? '',
            country: cleanOptionalText(body.country) ?? '',
            pathwayCode: pathway_code,
            pathwayName: pwRow?.name ?? pathway_code,
            shortBio: cleanOptionalText(body.short_bio) ?? '',
            skills,
            languages,
            availability: cleanOptionalText(body.availability) ?? 'Open to work',
            portfolioTitle: cleanOptionalText(body.portfolio_title) ?? 'Digital Portfolio',
            portfolioUrl: cleanOptionalText(body.portfolio_url) ?? '',
            portfolioImage: cleanOptionalText(body.portfolio_image) ?? '',
            personalWebsite: cleanOptionalText(body.personal_website) ?? '',
            linkedinUrl: cleanOptionalText(body.linkedin_url) ?? '',
            photoFile: cleanOptionalText(body.photo_file) ?? '',
            videoFile: cleanOptionalText(body.video_file) ?? '',
            hasVideo: false,
            consentToPublish: consent_to_publish,
            consentToShowPhoto: Boolean(body.consent_to_show_photo),
            consentToBeContacted: consent_to_publish,
            consentDate: consent_to_publish ? new Date() : null,
            isActive: false,
          })
          .returning({ id: alumniProfiles.id });

        for (const sk of skills) {
          await tx.insert(alumniSkills).values({ alumniId: inserted.id, skill: sk }).onConflictDoNothing();
        }

        await tx.insert(consentRecords).values({
          subjectEmail: email,
          subjectType: 'alumni',
          consentScope: 'public_directory_profile',
          granted: consent_to_publish,
          source: 'alumni_register',
          notes: `Submitted ${business_id} for moderation`,
        });

        await tx.insert(notifications).values({
          targetRole: 'admin',
          category: 'alumni_review',
          title: `New alumni profile awaiting review (${business_id})`,
          body: `${first_name} ${last_name} · ${pathway_code}`,
          linkPath: '/admin',
        });
      });

      return res.status(201).json({ business_id, status: 'pending_review' });
    } catch (err) {
      return next(err);
    }
  });

  app.post('/partners/register', formLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body ?? {};
      const organisation = typeof body.organisation === 'string' ? body.organisation.trim() : '';
      const type = body.type as PartnerType;
      const contact_name = typeof body.contact_name === 'string' ? body.contact_name.trim() : '';
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

      if (!organisation || !VALID_PARTNER_TYPES.has(type) || !contact_name || !EMAIL_RE.test(email)) {
        return res.status(422).json({ detail: 'Invalid partner registration details.' });
      }

      const business_id = createBusinessId('PAR');
      await db.transaction(async (tx) => {
        await tx.insert(partners).values({
          businessId: business_id,
          organisation,
          type,
          country: cleanOptionalText(body.country) ?? '',
          description: cleanOptionalText(body.description) ?? '',
          website: cleanOptionalText(body.website) ?? '',
          phone: cleanOptionalText(body.phone) ?? '',
          privateContactName: contact_name,
          privateContactEmail: email,
          privateContactPhone: cleanOptionalText(body.phone) ?? '',
          showOnSite: false,
          approved: false,
          status: 'pending_review',
        });

        await tx.insert(notifications).values({
          targetRole: 'admin',
          category: 'partner_review',
          title: `Partner application pending (${organisation})`,
          body: `${type} · ${cleanOptionalText(body.country) ?? 'Regional'}`,
          linkPath: '/admin',
        });
      });

      return res.status(201).json({ business_id, status: 'pending_review' });
    } catch (err) {
      return next(err);
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'frontend/dist');
    app.use(express.static(distDir));
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (
        (req.method !== 'GET' && req.method !== 'HEAD') ||
        req.path.startsWith('/api/') ||
        req.path.startsWith('/auth/') ||
        req.path.startsWith('/assets/')
      ) {
        return next();
      }
      return res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      configFile: path.resolve(process.cwd(), 'frontend/vite.config.ts'),
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[server error]', err);
    res.status(500).json({ detail: 'Internal server error' });
  });

  app.listen(PORT, HOST, () => {
    console.log(`Konexio Connect 360 server listening on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
