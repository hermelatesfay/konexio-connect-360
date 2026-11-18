import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import express, { type NextFunction, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import {
  ANNUAL_REPORTS,
  BASELINE_EMPLOYER_PARTNERS,
  COURSE_MODULES,
  DATA_REFERENCE_DATE,
  IMPACT_STORIES,
  INITIAL_ALUMNI,
  INITIAL_LOCATIONS,
  INITIAL_PARTNERS,
  INITIAL_TEAM,
  PATHWAYS,
  YEARLY_IMPACT,
  type AlumniAvailability,
  type LocationImpact,
  type PartnerType,
  type Role,
  type SeedAlumnus,
  type SeedPartner,
} from './server/data.ts';

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const AUTH_SECRET_KEY = process.env.AUTH_SECRET_KEY || crypto.randomBytes(32).toString('hex');
const ACCESS_TOKEN_MINUTES = Number(process.env.ACCESS_TOKEN_MINUTES || '10080');

interface UserRecord {
  id: number;
  first_name: string;
  second_name: string;
  email: string;
  password_hash: string;
  has_organisation: boolean;
  role: Role;
  linked_business_id: string | null;
  pathway_code: string | null;
  country: string | null;
  city: string | null;
  learning_goal: string | null;
  created_at: string;
}

interface LearnerProfileRecord {
  id: number;
  business_id: string;
  first_name: string;
  last_name: string;
  email: string;
  city: string | null;
  country: string;
  pathway_code: string;
  learning_goal: string;
  status: string;
  created_at: string;
}

interface AlumniRecord extends SeedAlumnus {
  id: number;
  availability: AlumniAvailability;
  photo_file: string | null;
  video_file: string | null;
  consent_date: string | null;
  created_at: string;
}

interface PartnerRecord extends SeedPartner {
  id: number;
  logo_file: string | null;
  private_contact_name: string;
  private_contact_email: string;
  private_contact_phone: string | null;
  created_at: string;
}

interface ContactMessageRecord {
  id: number;
  name: string;
  email: string;
  phone: string;
  visitor_category: string;
  topic: string;
  message: string;
  consent: boolean;
  routed_to_role: string;
  created_at: string;
}

interface InterestSubmissionRecord {
  id: number;
  business_id: string;
  submitted_at: string;
  full_name: string;
  organisation: string | null;
  email: string;
  visitor_type: 'Employer' | 'Client' | 'Donor';
  interest_type: 'alumni' | 'pathway' | 'general';
  interest_value: string | null;
  message: string;
  consent_to_be_contacted: boolean;
  status: 'routed' | 'flagged_no_consent' | 'discarded_spam';
  notified_alumni_ids: string[];
  notified_roles: string[];
}

interface NewsletterSubscriberRecord {
  id: number;
  email: string;
  list: 'alumni' | 'donor_partner';
  status: 'subscribed' | 'unsubscribed';
  consent_date: string;
  consent_text_version: string;
}

interface ImpactEventRecord {
  id: number;
  event_id: string;
  metric: 'learners_trained' | 'graduates' | 'employed_or_freelancing' | 'employer_partners';
  location_city: string;
  change: number;
  description: string;
  occurred_at: string;
}

interface AuthedRequest extends Request {
  authUser?: UserRecord;
}

// In-memory state initialized from the Konexio Africa dataset
let nextId = 1;
const usersById = new Map<number, UserRecord>();
const usersByEmail = new Map<string, UserRecord>();
const learnerProfiles: LearnerProfileRecord[] = [];
const alumniRecords: AlumniRecord[] = [];
const partnerRecords: PartnerRecord[] = [];
const contactMessages: ContactMessageRecord[] = [];
const interestSubmissions: InterestSubmissionRecord[] = [];
const newsletterSubscribers: NewsletterSubscriberRecord[] = [];
const impactEvents: ImpactEventRecord[] = [];
const locationStats: LocationImpact[] = INITIAL_LOCATIONS.map((loc) => ({ ...loc }));
let employerPartnersCount = BASELINE_EMPLOYER_PARTNERS;

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

const TOPIC_ROUTING: Record<string, string> = {
  'Training and programmes': 'Programmes Manager',
  'Partnerships, funding, hiring': 'Partnerships Lead',
  'Alumni community': 'Alumni Community Manager',
  'Website or technical problem': 'EdTech Product Manager',
  'Press and general': 'Country Director',
};

function cleanOptionalText(val: unknown): string | null {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  return trimmed ? trimmed : null;
}

function cleanStringList(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function createBusinessId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

function createAccessToken(user: UserRecord): string {
  return jwt.sign({ sub: String(user.id), role: user.role }, AUTH_SECRET_KEY, {
    algorithm: 'HS256',
    expiresIn: ACCESS_TOKEN_MINUTES * 60,
  });
}

function serializeUser(user: UserRecord) {
  return {
    id: user.id,
    first_name: user.first_name,
    second_name: user.second_name,
    email: user.email,
    has_organisation: user.has_organisation,
    role: user.role,
    pathway_code: user.pathway_code,
    country: user.country,
    linked_business_id: user.linked_business_id,
  };
}

function serializePublicAlumnus(record: AlumniRecord) {
  const pathway = PATHWAYS.find((p) => p.code === record.pathway_code);
  const showMedia = Boolean(record.consent_to_show_photo);
  return {
    business_id: record.business_id,
    first_name: record.first_name,
    last_name: record.last_name,
    initials: `${record.first_name.charAt(0)}${record.last_name.charAt(0)}`.toUpperCase(),
    city: record.city,
    country: record.country,
    pathway_code: record.pathway_code,
    pathway_name: pathway?.name ?? record.pathway_code,
    short_bio: record.short_bio,
    skills: record.skills,
    languages: record.languages,
    availability: record.availability,
    portfolio_title: record.portfolio_title,
    portfolio_url: record.portfolio_url,
    portfolio_image: showMedia ? record.portfolio_image : null,
    profile_link: record.personal_website || record.linkedin_url,
    personal_website: record.personal_website,
    linkedin_url: record.linkedin_url,
    consent_to_show_photo: showMedia,
    has_video: showMedia ? record.has_video : false,
  };
}

function computeImpactSummary() {
  const learners_trained = locationStats.reduce((sum, l) => sum + l.learners_trained, 0);
  const graduates = locationStats.reduce((sum, l) => sum + l.graduates, 0);
  const employed_or_freelancing = locationStats.reduce(
    (sum, l) => sum + l.employed_or_freelancing,
    0,
  );
  const cohorts_completed = locationStats.reduce((sum, l) => sum + l.cohorts_completed, 0);
  const weightedWomen = locationStats.reduce(
    (sum, l) => sum + l.learners_trained * l.women_pct,
    0,
  );
  const women_pct = learners_trained > 0 ? Math.round(weightedWomen / learners_trained) : 0;
  const employment_rate_pct =
    graduates > 0 ? Math.round((employed_or_freelancing / graduates) * 100) : 0;

  return {
    learners_trained,
    graduates,
    employed_or_freelancing,
    employment_rate_pct,
    countries: locationStats.length,
    cohorts_completed,
    women_pct,
    employer_partners: employerPartnersCount,
    as_of: DATA_REFERENCE_DATE,
    data_label: 'Konexio Africa Digi Pass',
  };
}

function routeExpressInterest(params: {
  visitor_type: 'Employer' | 'Client' | 'Donor';
  interest_type: 'alumni' | 'pathway' | 'general';
  interest_value: string | null;
  consent_to_be_contacted: boolean;
  honeypot: string | null;
}): {
  status: 'routed' | 'flagged_no_consent' | 'discarded_spam';
  notified_alumni_ids: string[];
  notified_roles: string[];
} {
  if (params.honeypot) {
    return { status: 'discarded_spam', notified_alumni_ids: [], notified_roles: [] };
  }
  if (!params.consent_to_be_contacted) {
    return {
      status: 'flagged_no_consent',
      notified_alumni_ids: [],
      notified_roles: ['Partnerships Lead'],
    };
  }

  const notifiedAlumni: string[] = [];
  const notifiedRoles = new Set<string>(['Partnerships Lead']);

  if (params.interest_type === 'alumni' && params.interest_value) {
    notifiedRoles.add('Alumni Community Manager');
    const target = alumniRecords.find(
      (a) => a.business_id === params.interest_value && a.is_active && a.consent_to_publish,
    );
    if (target) {
      notifiedAlumni.push(target.business_id);
    }
  } else if (params.interest_type === 'pathway' && params.interest_value) {
    notifiedRoles.add('Alumni Community Manager');
    for (const alum of alumniRecords) {
      if (alum.pathway_code === params.interest_value && alum.is_active && alum.consent_to_publish) {
        notifiedAlumni.push(alum.business_id);
      }
    }
  }

  return {
    status: 'routed',
    notified_alumni_ids: notifiedAlumni,
    notified_roles: Array.from(notifiedRoles),
  };
}

function seedInitialData() {
  const now = new Date().toISOString();

  for (const alum of INITIAL_ALUMNI) {
    alumniRecords.push({
      ...alum,
      id: nextId++,
      photo_file: null,
      video_file: alum.has_video ? 'alumni_intro.mp4' : null,
      consent_date: alum.consent_to_publish ? '2026-09-15T10:00:00Z' : null,
      created_at: now,
    });
  }

  for (const partner of INITIAL_PARTNERS) {
    partnerRecords.push({
      ...partner,
      id: nextId++,
      logo_file: partner.logo_key,
      private_contact_name: 'Partner Coordinator',
      private_contact_email: `${partner.business_id.toLowerCase()}@konexio-africa.invalid`,
      private_contact_phone: null,
      created_at: now,
    });
  }

  // Seed historical Express Interest records matching project data
  interestSubmissions.push(
    {
      id: nextId++,
      business_id: 'SUB-001',
      submitted_at: '2026-10-28T09:14:00Z',
      full_name: 'Maria Lopez',
      organisation: 'Savanna Digital Works',
      email: 'maria@savanna-digital.invalid',
      visitor_type: 'Employer',
      interest_type: 'alumni',
      interest_value: 'ALU-01',
      message: 'We would like to discuss a three-month social media contract.',
      consent_to_be_contacted: true,
      status: 'routed',
      notified_alumni_ids: ['ALU-01'],
      notified_roles: ['Partnerships Lead', 'Alumni Community Manager'],
    },
    {
      id: nextId++,
      business_id: 'SUB-003',
      submitted_at: '2026-10-29T08:41:00Z',
      full_name: 'Fatima Hassan',
      organisation: 'Coastline Commerce',
      email: 'fatima@coastline-commerce.invalid',
      visitor_type: 'Client',
      interest_type: 'pathway',
      interest_value: 'P2',
      message: 'We need a designer for packaging graphics. Who is available?',
      consent_to_be_contacted: true,
      status: 'routed',
      notified_alumni_ids: ['ALU-03'],
      notified_roles: ['Partnerships Lead', 'Alumni Community Manager'],
    },
    {
      id: nextId++,
      business_id: 'SUB-004',
      submitted_at: '2026-10-29T10:55:00Z',
      full_name: 'Ahmed Said',
      organisation: 'Lakeside BPO',
      email: 'ahmed@lakeside-bpo.invalid',
      visitor_type: 'Employer',
      interest_type: 'pathway',
      interest_value: 'P3',
      message: 'Looking for four customer support agents starting in January.',
      consent_to_be_contacted: true,
      status: 'routed',
      notified_alumni_ids: ['ALU-05', 'ALU-16'],
      notified_roles: ['Partnerships Lead', 'Alumni Community Manager'],
    },
    {
      id: nextId++,
      business_id: 'SUB-009',
      submitted_at: '2026-10-31T09:05:00Z',
      full_name: 'Tom Becker',
      organisation: 'Independent',
      email: 'tom@independent.invalid',
      visitor_type: 'Client',
      interest_type: 'alumni',
      interest_value: 'ALU-08',
      message: 'Looking for someone to build a lead list for my startup.',
      consent_to_be_contacted: false,
      status: 'flagged_no_consent',
      notified_alumni_ids: [],
      notified_roles: ['Partnerships Lead'],
    },
  );

  newsletterSubscribers.push(
    {
      id: nextId++,
      email: 'alumni.reader@konexio-africa.invalid',
      list: 'alumni',
      status: 'subscribed',
      consent_date: '2026-10-01T10:00:00Z',
      consent_text_version: 'consent-text-v1',
    },
    {
      id: nextId++,
      email: 'partner.reader@konexio-africa.invalid',
      list: 'donor_partner',
      status: 'subscribed',
      consent_date: '2026-10-05T12:30:00Z',
      consent_text_version: 'consent-text-v1',
    },
  );

  // Seeded role accounts for standard JWT testing
  const demoPassword = process.env.DEMO_ACCOUNT_PASSWORD || 'KonexioDemo2026!';
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@konexio-demo.org').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || demoPassword;

  const seedUsers: Array<Omit<UserRecord, 'id' | 'created_at' | 'password_hash'> & { password: string }> = [
    {
      first_name: 'Grace',
      second_name: 'Wanjiru',
      email: 'learner@konexio-demo.org',
      password: demoPassword,
      has_organisation: false,
      role: 'learner',
      linked_business_id: 'LRN-01',
      pathway_code: 'P1',
      country: 'Kenya',
      city: 'Nairobi',
      learning_goal: 'Complete Part I foundations and launch a portfolio in Digital Marketing.',
    },
    {
      first_name: 'Amina',
      second_name: 'Wanjiru',
      email: 'alumni@konexio-demo.org',
      password: demoPassword,
      has_organisation: false,
      role: 'alumni',
      linked_business_id: 'ALU-01',
      pathway_code: 'P1',
      country: 'Kenya',
      city: 'Nairobi',
      learning_goal: null,
    },
    {
      first_name: 'Maria',
      second_name: 'Lopez',
      email: 'employer@konexio-demo.org',
      password: demoPassword,
      has_organisation: true,
      role: 'employer',
      linked_business_id: 'PAR-01',
      pathway_code: null,
      country: 'Kenya',
      city: 'Nairobi',
      learning_goal: null,
    },
    {
      first_name: 'Kwaku',
      second_name: 'Mensah',
      email: 'partner@konexio-demo.org',
      password: demoPassword,
      has_organisation: true,
      role: 'partner',
      linked_business_id: 'PAR-02',
      pathway_code: null,
      country: 'Ghana',
      city: 'Accra',
      learning_goal: null,
    },
    {
      first_name: 'Naledi',
      second_name: 'Dube',
      email: adminEmail,
      password: adminPassword,
      has_organisation: true,
      role: 'admin',
      linked_business_id: 'TEAM-01',
      pathway_code: null,
      country: 'Kenya',
      city: 'Nairobi',
      learning_goal: null,
    },
  ];

  for (const seedUser of seedUsers) {
    const user: UserRecord = {
      id: nextId++,
      first_name: seedUser.first_name,
      second_name: seedUser.second_name,
      email: seedUser.email,
      password_hash: bcrypt.hashSync(seedUser.password, 10),
      has_organisation: seedUser.has_organisation,
      role: seedUser.role,
      linked_business_id: seedUser.linked_business_id,
      pathway_code: seedUser.pathway_code,
      country: seedUser.country,
      city: seedUser.city,
      learning_goal: seedUser.learning_goal,
      created_at: now,
    };
    usersById.set(user.id, user);
    usersByEmail.set(user.email, user);
  }
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Bearer token required' });
  }
  const token = authHeader.slice(7).trim();
  try {
    const payload = jwt.verify(token, AUTH_SECRET_KEY) as { sub?: string };
    const user = usersById.get(Number(payload.sub));
    if (!user) {
      return res.status(401).json({ detail: 'User no longer exists' });
    }
    req.authUser = user;
    return next();
  } catch {
    return res.status(401).json({ detail: 'Invalid or expired access token' });
  }
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  return requireAuth(req, res, () => {
    if (req.authUser?.role !== 'admin') {
      return res.status(403).json({ detail: 'Administrator permissions required' });
    }
    return next();
  });
}

async function startServer() {
  seedInitialData();
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use(
    '/assets/aistudio',
    express.static(path.resolve(process.cwd(), 'public/assets/aistudio')),
  );

  // Health routes
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ name: 'Konexio Connect 360', status: 'good!' });
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ name: 'Konexio Connect 360', status: 'good!' });
  });

  // Public Impact, Programmes, Alumni, Team, Partners & Reports APIs
  app.get('/api/impact/summary', (_req: Request, res: Response) => {
    res.json(computeImpactSummary());
  });

  app.get('/api/impact/locations', (_req: Request, res: Response) => {
    const locations = locationStats.map((loc) => ({
      ...loc,
      employment_rate_pct:
        loc.graduates > 0 ? Math.round((loc.employed_or_freelancing / loc.graduates) * 100) : 0,
    }));
    res.json({
      as_of: DATA_REFERENCE_DATE,
      data_label: 'Konexio Africa Digi Pass',
      locations,
    });
  });

  app.get('/api/impact/pathways', (_req: Request, res: Response) => {
    res.json({
      as_of: DATA_REFERENCE_DATE,
      data_label: 'Konexio Africa Digi Pass',
      pathways: PATHWAYS,
    });
  });

  app.get('/api/impact/years', (_req: Request, res: Response) => {
    res.json({
      as_of: DATA_REFERENCE_DATE,
      data_label: 'Konexio Africa Digi Pass',
      years: YEARLY_IMPACT,
    });
  });

  app.get('/api/reports', (_req: Request, res: Response) => {
    res.json({
      as_of: DATA_REFERENCE_DATE,
      data_label: 'Konexio Africa Digi Pass',
      reports: ANNUAL_REPORTS,
      stories: IMPACT_STORIES,
    });
  });

  app.get('/api/programmes', (_req: Request, res: Response) => {
    res.json({
      as_of: DATA_REFERENCE_DATE,
      data_label: 'Konexio Africa Digi Pass',
      modules: COURSE_MODULES,
      pathways: PATHWAYS,
    });
  });

  app.get('/api/alumni', (req: Request, res: Response) => {
    const pathway = typeof req.query.pathway === 'string' ? req.query.pathway.trim() : '';
    const country = typeof req.query.country === 'string' ? req.query.country.trim().toLowerCase() : '';
    const availability =
      typeof req.query.availability === 'string' ? req.query.availability.trim().toLowerCase() : '';
    const skill = typeof req.query.skill === 'string' ? req.query.skill.trim().toLowerCase() : '';
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';

    // Strict consent enforcement: ALU-14 (consent_to_publish = false) is NEVER included
    const publicAlumni = alumniRecords
      .filter((a) => a.consent_to_publish && a.is_active)
      .filter((a) => (!pathway ? true : a.pathway_code === pathway))
      .filter((a) => (!country ? true : (a.country ?? '').toLowerCase() === country))
      .filter((a) => (!availability ? true : a.availability.toLowerCase() === availability))
      .filter((a) =>
        !skill ? true : a.skills.some((s) => s.toLowerCase().includes(skill)),
      )
      .filter((a) => {
        if (!q) return true;
        const pathwayName = PATHWAYS.find((p) => p.code === a.pathway_code)?.name ?? '';
        const haystack = [
          a.first_name,
          a.last_name,
          a.city,
          a.country,
          a.pathway_code,
          pathwayName,
          a.short_bio,
          ...a.skills,
          ...a.languages,
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .map(serializePublicAlumnus);

    const countries = Array.from(
      new Set(
        alumniRecords
          .filter((a) => a.consent_to_publish && a.is_active && a.country)
          .map((a) => a.country as string),
      ),
    ).sort();

    res.json({
      total: publicAlumni.length,
      countries,
      alumni: publicAlumni,
    });
  });

  app.get('/api/alumni/:businessId', (req: Request, res: Response) => {
    const businessId = String(req.params.businessId || '').toUpperCase();
    const record = alumniRecords.find(
      (a) => a.business_id === businessId && a.consent_to_publish && a.is_active,
    );
    if (!record) {
      return res.status(404).json({ detail: 'Alumni profile not found' });
    }
    const related = alumniRecords
      .filter(
        (a) =>
          a.business_id !== record.business_id &&
          a.pathway_code === record.pathway_code &&
          a.consent_to_publish &&
          a.is_active,
      )
      .slice(0, 3)
      .map(serializePublicAlumnus);

    return res.json({
      profile: serializePublicAlumnus(record),
      related,
    });
  });

  app.get('/api/team', (_req: Request, res: Response) => {
    // Strictly omit role_mailbox from public responses
    const publicTeam = INITIAL_TEAM.map((member) => ({
      business_id: member.business_id,
      first_name: member.first_name,
      last_name: member.last_name,
      initials: `${member.first_name.charAt(0)}${member.last_name.charAt(0)}`.toUpperCase(),
      job_title: member.job_title,
      short_bio: member.short_bio,
      linkedin_url: member.linkedin_url,
      contact_topic: member.contact_topic,
      display_email_publicly: false,
    }));
    res.json({ team: publicTeam });
  });

  app.get('/api/partners', (_req: Request, res: Response) => {
    const publicPartners = partnerRecords
      .filter((p) => p.show_on_site)
      .map((p) => ({
        business_id: p.business_id,
        organisation: p.organisation,
        type: p.type,
        country: p.country,
        description: p.description,
        website: p.website,
        logo_key: p.logo_key,
      }));
    res.json({ partners: publicPartners });
  });

  // Express Interest submission with routing & honeypot protection
  app.post('/api/interest', (req: Request, res: Response) => {
    const body = req.body ?? {};
    const full_name = typeof body.full_name === 'string' ? body.full_name.trim() : '';
    const organisation = cleanOptionalText(body.organisation);
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

    const routing = routeExpressInterest({
      visitor_type,
      interest_type,
      interest_value,
      consent_to_be_contacted,
      honeypot,
    });

    const business_id = createBusinessId('SUB');
    interestSubmissions.unshift({
      id: nextId++,
      business_id,
      submitted_at: new Date().toISOString(),
      full_name,
      organisation,
      email,
      visitor_type,
      interest_type,
      interest_value,
      message,
      consent_to_be_contacted,
      status: routing.status,
      notified_alumni_ids: routing.notified_alumni_ids,
      notified_roles: routing.notified_roles,
    });

    return res.status(201).json({
      reference_id: business_id,
      status: 'received',
      expected_response_time: '3 working days',
      message:
        visitor_type === 'Donor'
          ? 'Thank you. Your enquiry has been logged for our Partnerships Lead, along with our latest annual impact overview.'
          : 'Thank you. Your enquiry has been received and routed securely to our team.',
    });
  });

  // Newsletter subscribe
  app.post('/api/newsletter/subscribe', (req: Request, res: Response) => {
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
      const existing = newsletterSubscribers.find((s) => s.email === email && s.list === list);
      if (existing) {
        existing.status = 'subscribed';
        existing.consent_date = new Date().toISOString();
      } else {
        newsletterSubscribers.unshift({
          id: nextId++,
          email,
          list,
          status: 'subscribed',
          consent_date: new Date().toISOString(),
          consent_text_version: 'consent-text-v1',
        });
      }
    }

    return res.status(201).json({
      status: 'subscribed',
      list,
      message: 'You are subscribed to Konexio Africa updates.',
    });
  });

  // Preserved Auth routes
  app.post('/auth/register', (req: Request, res: Response) => {
    const body = req.body ?? {};
    const first_name = typeof body.first_name === 'string' ? body.first_name.trim() : '';
    const second_name = typeof body.second_name === 'string' ? body.second_name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const has_organisation = Boolean(body.has_organisation);
    const account_type: Role =
      VALID_ROLES.has(body.account_type) && body.account_type !== 'admin'
        ? body.account_type
        : 'user';

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
    const availability =
      (cleanOptionalText(body.availability) as AlumniRecord['availability'] | null) ??
      'Open to work';
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
          detail: 'Employers, partners, and donors must provide organisation, country, and description',
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

    if (usersByEmail.has(email)) {
      return res.status(409).json({ detail: 'An account with this email already exists' });
    }

    const now = new Date().toISOString();
    let linked_business_id: string | null = null;

    if (account_type === 'learner' && country && pathway_code && learning_goal) {
      linked_business_id = createBusinessId('LRN');
      learnerProfiles.push({
        id: nextId++,
        business_id: linked_business_id,
        first_name,
        last_name: second_name,
        email,
        city,
        country,
        pathway_code,
        learning_goal,
        status: 'active_cohort',
        created_at: now,
      });
    } else if (account_type === 'alumni' && pathway_code) {
      linked_business_id = createBusinessId('ALU');
      alumniRecords.push({
        id: nextId++,
        business_id: linked_business_id,
        first_name,
        last_name: second_name,
        private_notification_email: email,
        city: city ?? '',
        country: country ?? '',
        pathway_code,
        short_bio: short_bio ?? '',
        skills,
        languages,
        availability,
        portfolio_title: portfolio_title ?? 'Digital Skills Portfolio',
        portfolio_url,
        portfolio_image: null,
        personal_website,
        linkedin_url,
        photo_file: null,
        video_file: null,
        has_video: false,
        consent_to_publish,
        consent_to_show_photo,
        consent_date: consent_to_publish ? now : null,
        is_active: true,
        created_at: now,
      });
    } else if (
      (account_type === 'employer' || account_type === 'partner' || account_type === 'donor') &&
      organisation
    ) {
      linked_business_id = createBusinessId('PAR');
      partnerRecords.push({
        id: nextId++,
        business_id: linked_business_id,
        organisation,
        type:
          account_type === 'donor'
            ? 'Donor'
            : account_type === 'employer'
              ? 'Employer'
              : (partner_type ?? 'Employer'),
        country: country ?? '',
        description: description ?? '',
        website,
        logo_key: null,
        logo_file: null,
        private_contact_name: `${first_name} ${second_name}`,
        private_contact_email: email,
        private_contact_phone: phone,
        show_on_site: false,
        status: 'pending_review',
        created_at: now,
      });
    }

    const user: UserRecord = {
      id: nextId++,
      first_name,
      second_name,
      email,
      password_hash: bcrypt.hashSync(password, 10),
      has_organisation,
      role: account_type,
      linked_business_id,
      pathway_code,
      country,
      city,
      learning_goal,
      created_at: now,
    };
    usersById.set(user.id, user);
    usersByEmail.set(email, user);

    return res.status(201).json({
      access_token: createAccessToken(user),
      token_type: 'bearer',
      user: serializeUser(user),
    });
  });

  app.post('/auth/login', (req: Request, res: Response) => {
    const body = req.body ?? {};
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!EMAIL_RE.test(email) || !password || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(401).json({ detail: 'Invalid email or password' });
    }

    const user = usersByEmail.get(email);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ detail: 'Invalid email or password' });
    }

    return res.json({
      access_token: createAccessToken(user),
      token_type: 'bearer',
      user: serializeUser(user),
    });
  });

  app.get('/auth/me', requireAuth, (req: AuthedRequest, res: Response) => {
    res.json(serializeUser(req.authUser!));
  });

  // Role-specific Dashboard routes
  app.get('/api/dashboard', requireAuth, (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;

    if (user.role === 'learner') {
      const pathway = PATHWAYS.find((p) => p.code === user.pathway_code) ?? PATHWAYS[0];
      const learnerRecord = learnerProfiles.find(
        (l) => l.business_id === user.linked_business_id || l.email === user.email,
      );
      const peersCount = alumniRecords.filter(
        (a) => a.pathway_code === pathway.code && a.consent_to_publish && a.is_active,
      ).length;
      return res.json({
        role: 'learner',
        application_id: learnerRecord?.business_id ?? user.linked_business_id ?? 'LRN-ACTIVE',
        application_status: learnerRecord?.status ?? 'active_cohort',
        pathway,
        all_pathways: PATHWAYS,
        modules: COURSE_MODULES,
        learning_goal: user.learning_goal,
        location: user.city ? `${user.city}, ${user.country ?? ''}` : user.country,
        peers_in_pathway: peersCount,
      });
    }

    if (user.role === 'alumni') {
      const profile =
        alumniRecords.find((a) => a.business_id === user.linked_business_id) ??
        alumniRecords.find((a) => a.private_notification_email === user.email) ??
        null;

      const matchedInquiries = profile
        ? interestSubmissions
            .filter(
              (s) =>
                s.status === 'routed' &&
                (s.notified_alumni_ids.includes(profile.business_id) ||
                  (s.interest_type === 'pathway' && s.interest_value === profile.pathway_code)),
            )
            .map((s) => ({
              business_id: s.business_id,
              submitted_at: s.submitted_at,
              organisation: s.organisation ?? s.visitor_type,
              visitor_type: s.visitor_type,
              interest_type: s.interest_type,
              message: s.message,
            }))
        : [];

      return res.json({
        role: 'alumni',
        profile: profile
          ? {
              business_id: profile.business_id,
              first_name: profile.first_name,
              last_name: profile.last_name,
              city: profile.city,
              country: profile.country,
              pathway_code: profile.pathway_code,
              short_bio: profile.short_bio,
              skills: profile.skills,
              languages: profile.languages,
              availability: profile.availability,
              portfolio_title: profile.portfolio_title,
              portfolio_url: profile.portfolio_url,
              personal_website: profile.personal_website,
              linkedin_url: profile.linkedin_url,
              consent_to_publish: profile.consent_to_publish,
              consent_to_show_photo: profile.consent_to_show_photo,
              is_active: profile.is_active,
            }
          : null,
        inquiries: matchedInquiries,
      });
    }

    if (user.role === 'employer') {
      const organisation =
        partnerRecords.find((p) => p.business_id === user.linked_business_id) ??
        partnerRecords.find((p) => p.private_contact_email === user.email) ??
        null;

      const orgName = organisation?.organisation?.toLowerCase() ?? '';
      const mySubmissions = interestSubmissions
        .filter(
          (s) =>
            s.email === user.email ||
            (orgName && s.organisation && s.organisation.toLowerCase() === orgName),
        )
        .map((s) => ({
          business_id: s.business_id,
          submitted_at: s.submitted_at,
          interest_type: s.interest_type,
          interest_value: s.interest_value,
          status: s.status,
          message: s.message,
        }));

      return res.json({
        role: 'employer',
        organisation: organisation
          ? {
              business_id: organisation.business_id,
              organisation: organisation.organisation,
              type: organisation.type,
              country: organisation.country,
              description: organisation.description,
              website: organisation.website,
              show_on_site: organisation.show_on_site,
              status: organisation.status,
            }
          : null,
        pathways: PATHWAYS,
        alumni: alumniRecords
          .filter((a) => a.consent_to_publish && a.is_active)
          .map(serializePublicAlumnus),
        submissions: mySubmissions,
      });
    }

    if (user.role === 'partner' || user.role === 'donor') {
      const organisation =
        partnerRecords.find((p) => p.business_id === user.linked_business_id) ??
        partnerRecords.find((p) => p.private_contact_email === user.email) ??
        null;

      const mySubmissions = interestSubmissions
        .filter((s) => s.email === user.email)
        .map((s) => ({
          business_id: s.business_id,
          submitted_at: s.submitted_at,
          interest_type: s.interest_type,
          interest_value: s.interest_value,
          status: s.status,
          message: s.message,
        }));

      const donorPref = newsletterSubscribers.find(
        (n) => n.email === user.email && n.list === 'donor_partner',
      );
      const alumniPref = newsletterSubscribers.find(
        (n) => n.email === user.email && n.list === 'alumni',
      );

      return res.json({
        role: user.role,
        organisation: organisation
          ? {
              business_id: organisation.business_id,
              organisation: organisation.organisation,
              type: organisation.type,
              country: organisation.country,
              description: organisation.description,
              website: organisation.website,
              show_on_site: organisation.show_on_site,
              status: organisation.status,
            }
          : null,
        summary: computeImpactSummary(),
        submissions: mySubmissions,
        reports: ANNUAL_REPORTS,
        newsletter_preferences: {
          donor_partner: donorPref?.status === 'subscribed',
          alumni: alumniPref?.status === 'subscribed',
        },
      });
    }

    return res.json({
      role: user.role,
      summary: computeImpactSummary(),
    });
  });

  app.patch('/api/dashboard/alumni', requireAuth, (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.role !== 'alumni') {
      return res.status(403).json({ detail: 'Alumni account required' });
    }
    const profile =
      alumniRecords.find((a) => a.business_id === user.linked_business_id) ??
      alumniRecords.find((a) => a.private_notification_email === user.email);
    if (!profile) {
      return res.status(404).json({ detail: 'Alumni profile not found' });
    }

    const body = req.body ?? {};
    if (typeof body.short_bio === 'string') {
      profile.short_bio = body.short_bio.trim().slice(0, 2000);
    }
    if (
      typeof body.availability === 'string' &&
      [
        'Available for freelance work',
        'Available part-time',
        'Open to full-time roles',
        'Open to work',
        'Freelancing',
        'Employed',
        'Available for projects',
      ].includes(body.availability)
    ) {
      profile.availability = body.availability as AlumniRecord['availability'];
    }
    if (Array.isArray(body.skills)) {
      profile.skills = cleanStringList(body.skills);
    }
    if (typeof body.portfolio_title === 'string') {
      profile.portfolio_title = body.portfolio_title.trim().slice(0, 160) || profile.portfolio_title;
    }
    if ('portfolio_url' in body) {
      profile.portfolio_url = cleanOptionalText(body.portfolio_url);
    }
    if ('personal_website' in body) {
      profile.personal_website = cleanOptionalText(body.personal_website);
    }
    if ('linkedin_url' in body) {
      profile.linkedin_url = cleanOptionalText(body.linkedin_url);
    }
    if (typeof body.consent_to_publish === 'boolean') {
      profile.consent_to_publish = body.consent_to_publish;
      profile.consent_date = body.consent_to_publish ? new Date().toISOString() : null;
    }
    if (typeof body.consent_to_show_photo === 'boolean') {
      profile.consent_to_show_photo = body.consent_to_show_photo;
    }

    return res.json({
      status: 'updated',
      profile: serializePublicAlumnus(profile),
      consent_to_publish: profile.consent_to_publish,
    });
  });

  app.patch('/api/dashboard/newsletter', requireAuth, (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    const body = req.body ?? {};
    const list = body.list === 'alumni' ? 'alumni' : 'donor_partner';
    const subscribed = Boolean(body.subscribed);
    const existing = newsletterSubscribers.find((n) => n.email === user.email && n.list === list);

    if (existing) {
      existing.status = subscribed ? 'subscribed' : 'unsubscribed';
      existing.consent_date = new Date().toISOString();
    } else if (subscribed) {
      newsletterSubscribers.unshift({
        id: nextId++,
        email: user.email,
        list,
        status: 'subscribed',
        consent_date: new Date().toISOString(),
        consent_text_version: 'consent-text-v1',
      });
    }

    return res.json({
      list,
      status: subscribed ? 'subscribed' : 'unsubscribed',
    });
  });

  // Administrator Dashboard APIs (strictly role === 'admin')
  app.get('/api/admin/overview', requireAdmin, (_req: AuthedRequest, res: Response) => {
    res.json({
      summary: computeImpactSummary(),
      counts: {
        users: usersById.size,
        alumni_total: alumniRecords.length,
        alumni_public: alumniRecords.filter((a) => a.consent_to_publish && a.is_active).length,
        partners_total: partnerRecords.length,
        partners_pending: partnerRecords.filter((p) => p.status === 'pending_review').length,
        submissions_total: interestSubmissions.length,
        contact_messages: contactMessages.length,
        newsletter_subscribers: newsletterSubscribers.filter((s) => s.status === 'subscribed')
          .length,
      },
      users: Array.from(usersById.values()).map((u) => ({
        id: u.id,
        first_name: u.first_name,
        second_name: u.second_name,
        email: u.email,
        role: u.role,
        linked_business_id: u.linked_business_id,
      })),
      alumni: alumniRecords.map((a) => ({
        business_id: a.business_id,
        first_name: a.first_name,
        last_name: a.last_name,
        city: a.city,
        country: a.country,
        pathway_code: a.pathway_code,
        availability: a.availability,
        consent_to_publish: a.consent_to_publish,
        consent_to_show_photo: a.consent_to_show_photo,
        is_active: a.is_active,
      })),
      partners: partnerRecords.map((p) => ({
        business_id: p.business_id,
        organisation: p.organisation,
        type: p.type,
        country: p.country,
        show_on_site: p.show_on_site,
        status: p.status,
      })),
      submissions: interestSubmissions.map((s) => ({
        business_id: s.business_id,
        submitted_at: s.submitted_at,
        full_name: s.full_name,
        organisation: s.organisation,
        visitor_type: s.visitor_type,
        interest_type: s.interest_type,
        interest_value: s.interest_value,
        consent_to_be_contacted: s.consent_to_be_contacted,
        status: s.status,
        notified_alumni_ids: s.notified_alumni_ids,
        notified_roles: s.notified_roles,
      })),
      contacts: contactMessages.map((c) => ({
        id: c.id,
        name: c.name,
        visitor_category: c.visitor_category,
        topic: c.topic,
        routed_to_role: c.routed_to_role,
        message: c.message,
        created_at: c.created_at,
      })),
      subscribers: newsletterSubscribers.map((n) => ({
        id: n.id,
        list: n.list,
        status: n.status,
        consent_date: n.consent_date,
        consent_text_version: n.consent_text_version,
      })),
      impact_events: impactEvents,
      locations: locationStats,
    });
  });

  app.patch('/api/admin/users/:userId', requireAdmin, (req: AuthedRequest, res: Response) => {
    const userId = Number(req.params.userId);
    const target = usersById.get(userId);
    if (!target) {
      return res.status(404).json({ detail: 'User not found' });
    }
    const nextRole = req.body?.role as Role;
    if (!VALID_ROLES.has(nextRole)) {
      return res.status(422).json({ detail: 'Invalid role' });
    }
    target.role = nextRole;
    return res.json({ id: target.id, role: target.role });
  });

  app.patch(
    '/api/admin/alumni/:businessId',
    requireAdmin,
    (req: AuthedRequest, res: Response) => {
      const businessId = String(req.params.businessId || '').toUpperCase();
      const target = alumniRecords.find((a) => a.business_id === businessId);
      if (!target) {
        return res.status(404).json({ detail: 'Alumni record not found' });
      }
      const body = req.body ?? {};
      if (typeof body.consent_to_publish === 'boolean') {
        target.consent_to_publish = body.consent_to_publish;
        target.consent_date = body.consent_to_publish ? new Date().toISOString() : null;
      }
      if (typeof body.consent_to_show_photo === 'boolean') {
        target.consent_to_show_photo = body.consent_to_show_photo;
      }
      if (typeof body.is_active === 'boolean') {
        target.is_active = body.is_active;
      }
      return res.json({
        business_id: target.business_id,
        consent_to_publish: target.consent_to_publish,
        consent_to_show_photo: target.consent_to_show_photo,
        is_active: target.is_active,
      });
    },
  );

  app.patch(
    '/api/admin/partners/:businessId',
    requireAdmin,
    (req: AuthedRequest, res: Response) => {
      const businessId = String(req.params.businessId || '').toUpperCase();
      const target = partnerRecords.find((p) => p.business_id === businessId);
      if (!target) {
        return res.status(404).json({ detail: 'Partner record not found' });
      }
      const body = req.body ?? {};
      if (typeof body.show_on_site === 'boolean') {
        target.show_on_site = body.show_on_site;
      }
      if (typeof body.status === 'string' && ['approved', 'pending_review', 'archived'].includes(body.status)) {
        target.status = body.status;
      }
      return res.json({
        business_id: target.business_id,
        show_on_site: target.show_on_site,
        status: target.status,
      });
    },
  );

  app.post('/api/admin/impact/events', requireAdmin, (req: AuthedRequest, res: Response) => {
    const body = req.body ?? {};
    const metric = body.metric as ImpactEventRecord['metric'];
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
    if (metric === 'employer_partners') {
      employerPartnersCount = Math.max(0, employerPartnersCount + intChange);
    } else {
      const loc = locationStats.find((l) => l.city.toLowerCase() === location_city.toLowerCase());
      if (!loc) {
        return res.status(422).json({ detail: 'Select one of the 7 active hub locations' });
      }
      loc[metric] = Math.max(0, loc[metric] + intChange);
    }

    const event: ImpactEventRecord = {
      id: nextId++,
      event_id: createBusinessId('EVT'),
      metric,
      location_city: metric === 'employer_partners' ? 'All' : location_city,
      change: intChange,
      description,
      occurred_at: new Date().toISOString(),
    };
    impactEvents.unshift(event);

    return res.status(201).json({
      event,
      summary: computeImpactSummary(),
    });
  });

  // Preserved & enhanced Contact route (visitor category, consent checkbox, honeypot spam filter)
  app.post('/contact', (req: Request, res: Response) => {
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

    const routed_to_role = TOPIC_ROUTING[topic] ?? 'Country Director';
    if (!honeypot) {
      contactMessages.unshift({
        id: nextId++,
        name,
        email,
        phone,
        visitor_category,
        topic,
        message,
        consent,
        routed_to_role,
        created_at: new Date().toISOString(),
      });
    }

    return res.status(201).json({
      status: 'received',
      routed_to_role,
    });
  });

  // Preserved Alumni & Partner standalone registration routes
  app.post('/alumni/register', (req: Request, res: Response) => {
    const body = req.body ?? {};
    const first_name = typeof body.first_name === 'string' ? body.first_name.trim() : '';
    const last_name = typeof body.last_name === 'string' ? body.last_name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const pathway_code = typeof body.pathway_code === 'string' ? body.pathway_code.trim() : '';

    if (!first_name || !last_name || !EMAIL_RE.test(email) || !PATHWAY_RE.test(pathway_code)) {
      return res.status(422).json({ detail: 'Invalid alumni registration details.' });
    }

    const now = new Date().toISOString();
    const business_id = createBusinessId('ALU');
    const consent_to_publish = Boolean(body.consent_to_publish);

    alumniRecords.push({
      id: nextId++,
      business_id,
      first_name,
      last_name,
      private_notification_email: email,
      city: cleanOptionalText(body.city) ?? '',
      country: cleanOptionalText(body.country) ?? '',
      pathway_code,
      short_bio: cleanOptionalText(body.short_bio) ?? '',
      skills: cleanStringList(body.skills),
      languages: cleanStringList(body.languages),
      availability:
        (cleanOptionalText(body.availability) as AlumniRecord['availability'] | null) ??
        'Open to work',
      portfolio_title: cleanOptionalText(body.portfolio_title) ?? 'Digital Portfolio',
      portfolio_url: cleanOptionalText(body.portfolio_url),
      portfolio_image: cleanOptionalText(body.portfolio_image),
      personal_website: cleanOptionalText(body.personal_website),
      linkedin_url: cleanOptionalText(body.linkedin_url),
      photo_file: cleanOptionalText(body.photo_file),
      video_file: cleanOptionalText(body.video_file),
      has_video: false,
      consent_to_publish,
      consent_to_show_photo: Boolean(body.consent_to_show_photo),
      consent_date: consent_to_publish ? now : null,
      is_active: false,
      created_at: now,
    });

    return res.status(201).json({ business_id, status: 'pending_review' });
  });

  app.post('/partners/register', (req: Request, res: Response) => {
    const body = req.body ?? {};
    const organisation = typeof body.organisation === 'string' ? body.organisation.trim() : '';
    const type = body.type as PartnerType;
    const contact_name = typeof body.contact_name === 'string' ? body.contact_name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!organisation || !VALID_PARTNER_TYPES.has(type) || !contact_name || !EMAIL_RE.test(email)) {
      return res.status(422).json({ detail: 'Invalid partner registration details.' });
    }

    const business_id = createBusinessId('PAR');
    partnerRecords.push({
      id: nextId++,
      business_id,
      organisation,
      type,
      country: cleanOptionalText(body.country) ?? '',
      description: cleanOptionalText(body.description) ?? '',
      logo_key: null,
      logo_file: cleanOptionalText(body.logo_file),
      website: cleanOptionalText(body.website),
      private_contact_name: contact_name,
      private_contact_email: email,
      private_contact_phone: cleanOptionalText(body.phone),
      show_on_site: false,
      status: 'pending_review',
      created_at: new Date().toISOString(),
    });

    return res.status(201).json({ business_id, status: 'pending_review' });
  });

  app.post('/upload', (_req: Request, res: Response) => {
    res
      .status(501)
      .json({ error: 'PDF RAG upload requires external Cohere and ChromaDB configuration' });
  });

  app.post('/query', (_req: Request, res: Response) => {
    res
      .status(501)
      .json({ error: 'RAG chatbot query requires external Cohere and ChromaDB configuration' });
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
