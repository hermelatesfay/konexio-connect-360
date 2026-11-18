# Deployment & Operations Guide

## 1. Stack & Architecture
- **Frontend**: React 19 + TypeScript + Vite SPA built into `frontend/dist` (`npm run build`).
- **Backend**: Express 5 Node.js server (`server.ts`, started with `npm start` / `tsx server.ts`) serving both API endpoints (`/auth/*`, `/api/*`, `/health`) and the built frontend static bundle on port `3000`.
- **Database**: Managed Cloud SQL PostgreSQL (`ai-studio-32a4e203`, `europe-west2`) via `drizzle-orm` + `pg.Pool`. Runtime credentials are injected securely by the AI Studio / Cloud Run Cloud SQL connector (`SQL_*` runtime environment); never hardcode `DATABASE_URL` or database secrets in `.env` or source files.
- **Authentication**:
  - Local email/password (`bcryptjs` + HMAC-SHA256 bearer tokens) with mandatory RFC 6238 TOTP MFA (`AAL2`) + single-use recovery codes for administrators.
  - Firebase Authentication (`Google Sign-In` popup) verified server-side via `firebase-admin` against project `imposing-stone-wq7xb`.
- **Server-Side AI**: `@google/genai` (`gemini-4-hydrogen`) powering `/api/search/ai` and `/api/chat` strictly grounded in public, consent-approved PostgreSQL records.

## 2. Environment Variables
Reference `.env.example` for all supported variables:
- `PORT=3000`: HTTP port for Cloud Run / Express.
- `NODE_ENV=production`: Enables production static serving from `frontend/dist`.
- `AUTH_SECRET_KEY`: **Required in production** — strong random secret (32+ bytes) used to sign session tokens and encrypt TOTP secrets (`MFA_ENCRYPTION_KEY` optional override).
- `ACCESS_TOKEN_MINUTES=720`: Session lifetime in minutes.
- `GEMINI_API_KEY`: Server-side Google Gemini API key. If omitted, `/api/search/ai` and `/api/chat` continue returning database keyword matches while honestly reporting `ai_available: false`.
- `ALLOW_DEMO_SEED`: Defaults to seeding initial demonstration dataset (`ensureSeeded()` runs idempotently once if `pathways` is empty). Set `ALLOW_DEMO_SEED=false` in live production after initial seed or when loading real cohort data so demonstration accounts are not auto-created on an empty database.
- `VISITOR_WEBHOOK_URL`: Optional external webhook URL for non-blocking visitor notifications.

## 3. Build & Production Start
```bash
npm install
npm run build
NODE_ENV=production npm start
```

Verify server readiness:
```bash
curl -f http://localhost:3000/health
```
Expected response includes `"status": "ok"` and `"database": "ready"`.

## 4. Firebase Auth Authorized Domains
When deploying to a custom domain or new Cloud Run URL, add the exact origin hostname under **Firebase Console -> Project `imposing-stone-wq7xb` -> Authentication -> Settings -> Authorized domains** so `Google Sign-In` popups complete without `auth/unauthorized-domain`.

## 5. Safe Schema Changes
- All schema definitions live in `src/db/schema.ts` and `src/db/drizzle.config.ts`.
- Apply schema changes additively via `cloudsql-update-schema` / `drizzle-kit push`. Never run destructive table drops or truncate production tables.
