# Konexio Africa Digi Pass Website: Build Plan, Specification and GitHub Copilot Prompts


# NB; USE THIS COLOR CODES IN YOUR STYLE:

Color BreakdownColor NameElement(s) in LogoHEXRGBCMYK (Approx.)Deep Indigo Blue, k, n, x, o (2nd), Africa#3A3D82rgb(58, 61, 130)88%, 85%, 14%, 3%Sky Cyano (1st)#34B6E4rgb(52, 182, 228)71%, 7%, 1%, 0%Vibrant Orangee#F39223rgb(243, 146, 35)1%, 50%, 95%, 0%Crimson Rosei#E6254Ergb(230, 37, 78)4%, 95%, 64%, 0%Pure WhiteBackground#FFFFFF


# BUTTOM AND BORDER-RADIUS
All border radius should not execeed 10px by deafualt


Prepared 17 November 2026 from the four brief screenshots and the sample data zip.

**Hosting update:** the frontend goes on Vercel and the backend on Render. Section 17 lists every change and replaces Prompt 23. Where it conflicts with Sections 4, 5, 9 and 12 (Caddy, a separate ChromaDB container, Mailpit in production), Section 17 wins. Save Sections 17.1 to 17.4 into docs/SPEC.md too, and run Prompt 0b (17.5) right after Prompt 0.

**Spec and prompts are separate.** Sections 2 to 11 and 17.1 to 17.4 are the specification, the basic plan, and contain no prompts. Sections 12 and 13 and 17.5 to 17.7 are the prompts that implement it. Only the specification goes into docs/SPEC.md. Anything the spec does not mark as required is optional: stretch goals can be skipped, and every database column is nullable unless Section 6 marks it NOT NULL.

## 1. What I found and how to use this document

**The zip** holds 19 files: 12 CSV files plus 7 JSON mirrors of them (alumni, team, pathways, locations, years, live numbers, express-interest submissions). Everything is sample data. The CSVs point to image and video files (images/alumni/..., images/partners/..., images/video/sample\_alumni\_intro.mp4) that are **not in the zip**, so the build must generate credited placeholders.

**The screenshots**: the first four are the brief (10 must-haves, 2 stretch goals, ground rules). The other four are MySQL Workbench screenshots (a student table and a bob user privileges script). They have nothing to do with this website, so I ignored them. If you meant to include them, tell me why.

**How to use this document**

1. Create the repo, then save Sections 2 to 11 as docs/SPEC.md. This is the single source of truth Copilot reads.
2. Create the Copilot instruction files from Section 12.
3. Paste the prompts in Section 13 into Copilot Chat in **Agent mode**, in order, one per session. Attach docs/SPEC.md with #file:docs/SPEC.md each time.
4. After each prompt: run the app and the tests, read the diff, commit. The ground rules say your team must be able to explain and fact-check everything the AI produces, so ask Copilot to explain anything you do not understand before committing.
5. Split prompts between team members so everyone owns a part they can speak about (suggested split at the end of Section 13).

## 2. Data review: traps to design for

These are the things in the sample data that a careless build would get wrong. Each one is also a test case.

| # | Finding | Required behaviour |
| --- | --- | --- |
| 1 | ALU-14 Halima Mwinyi's consent\_to\_publish is FALSE | Never shown on the site, never indexed in ChromaDB, never notified. SUB-013 targets her, so only the Alumni Community Manager is notified for the alumni part. |
| 2 | ALU-19 Ibrahima has consent to publish but consent\_to\_show\_photo FALSE | Show the profile with a generated placeholder avatar, never the photo. |
| 3 | private\_notification\_email (alumni), role\_mailbox (team), submitter and subscriber emails | Exist only in the database and are used server-side. No public API response schema may contain them. A test must fail the build if an @ sign appears in any public response. |
| 4 | SUB-006 and SUB-011 have a honeypot\_field filled | Discard silently, return the same success response a human gets, notify nobody, log for the security lead. |
| 5 | SUB-009 has consent\_to\_be\_contacted FALSE | Do not forward to alumni. Flag to the Partnerships Lead. |
| 6 | Only 7 of 20 alumni have a video; several have no personal\_website | Photo or video is shown depending on availability. If no website, fall back to LinkedIn, and always offer a Contact this alumnus button that opens the Express Interest form pre-filled. No email is exposed. |
| 7 | Location totals equal live\_numbers.json (1,248 learners, 972 graduates, 584 employed or freelancing) and impact\_by\_year sums to 1,248 | Use as reconciliation tests: dashboard totals must equal the sum of locations. |
| 8 | live\_updates\_to\_simulate.csv has 6 events including Dakar (exists in locations) and employer\_partners with location All | After replay, expect 1,275 learners, 992 graduates, 588 employed or freelancing, 28 employer partners. |
| 9 | impact\_by\_year 2026 row is year to date (31 Oct 2026) | Label it YTD. Do not present it as an annual report. Annual reports exist for 2024 and 2025 only. |
| 10 | newsletter\_subscribers\_sample.csv has 2 unsubscribed rows (1 per list) | Seed with status. Never send to unsubscribed addresses. Keep consent\_text\_version. |
| 11 | team display\_email\_publicly is FALSE for all 8 | Contact is by form only. |
| 12 | Pathway codes P1 to P11 are consistent across alumni, impact and catalog. Part I modules are M0 to M5 | Use pathway\_code as the filter key everywhere. |
| 13 | Brief says sample or approved data only | Show a small Sample data for demonstration notice in the footer. |

## 3. Requirements traceability

| # | Brief requirement | Delivered by | Prompt |
| --- | --- | --- | --- |
| 1 | Core pages, clear navigation, fast, mobile | React app, 8 core pages plus extras, one plain style.css, mobile-first | 11 to 17 |
| 2 | HTTPS, secure hosting | Caddy auto-HTTPS, Docker, security headers | 20, 23 |
| 2 | Spam protection on forms | Honeypot, time trap, rate limit, optional Turnstile | 5, 20 |
| 2 | No public emails or phones, contact via forms | Role mailboxes server-side only, Contact and Express Interest forms | 2, 5, 7 |
| 2 | Privacy notice and consent wording for alumni data | Privacy page, consent records, consent flags enforced | 1, 17 |
| 2 | Access control for editors (strong passwords, 2FA) | Admin login, argon2, TOTP 2FA, roles | 7 |
| 3 | Impact glimpse on home, full map view, live numbers from a connected source | Impact engine, signed webhook, Sheets CSV pull, SSE, Leaflet map | 3, 4, 12, 14 |
| 4 | Alumni profiles: photo or video, bio, portfolio, link; filterable by pathway | Alumni API, directory, profile pages | 2, 15 |
| 5 | Express interest form that notifies relevant alumni, confirmation message | Routing engine, email outbox | 5, 16 |
| 6 | Application form link with strong call to action | Sticky CTA, Get Involved section, embedded form | 12, 16 |
| 7 | LinkedIn linked, with feed or share buttons | Footer and header link, share buttons, embed | 17 |
| 8 | Two newsletter sign-up flows, separate lists, sample newsletter each | Double opt-in, 2 lists, 2 HTML samples | 6, 17 |
| 9 | Annual reports with vision and metrics, downloadable and on-page | Report pages plus generated PDF | 10, 17 |
| 10 | Before and after write-up | docs/BEFORE\_AFTER.md | 24 |
| S1 | Moodle link or catalog preview | Catalog preview from CSV, login link behind a flag (confirm with Konexio first) | 13 |
| S2 | Bilingual key pages | react-i18next, English and French | 21 |
| S3 | AI search or chatbot | ChromaDB semantic search plus RAG chatbot | 8, 18 |
| S4 | Accessibility audit | axe, keyboard tests, report | 21 |
| S5 | Analytics | Privacy-friendly analytics with custom events | 21 |
| S6 | At least 3 embeds | Map, intro videos, application form, LinkedIn post, impact dashboard | 14 to 17 |

## 4. Architecture

**Stack**

| Layer | Choice |
| --- | --- |
| Frontend | React 18, Vite, TypeScript, React Router 6, TanStack Query, plain CSS in one style.css file (CSS variables, no CSS framework), react-i18next, react-leaflet (OpenStreetMap), Recharts, react-helmet-async |
| Backend | Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2 async with asyncpg, Alembic, argon2-cffi, pyotp, slowapi, aiosmtplib, httpx, structlog |
| Data | PostgreSQL 16 (source of truth), ChromaDB (derived search index, public fields only, rebuildable) |
| Infra | Docker Compose: web, api, postgres, chroma, mailpit (dev email), caddy (prod HTTPS) |
| Tests | pytest, httpx, Vitest, Testing Library, Playwright, axe-core |

**Flow**

- Visitor browser talks to Caddy, which serves the React build and proxies /api to FastAPI.
- FastAPI reads and writes PostgreSQL. Public alumni text is mirrored to ChromaDB for semantic search and the chatbot.
- Anything that must reach the outside world (emails, outbound webhooks) is first written to an **outbox table** in the same database transaction, then sent by a background worker with retries. A form submission therefore never fails because an email server is down.
- Live impact data: a source spreadsheet (Google Sheets or Airtable) triggers Make or Zapier, which POSTs a signed webhook to /api/v1/webhooks/impact. A fallback job pulls a published Sheets CSV URL every 5 minutes. Both write impact\_events. Totals are baseline plus events. The browser receives changes over Server-Sent Events (SSE) and falls back to polling.

**Key decisions**

- Postgres is the truth. ChromaDB is disposable and rebuilt by a script. It never stores emails or non-consenting alumni.
- Routing rules live in code with a pure function, route\_submission(), so they can be unit tested against the 15 sample submissions.
- One consent model for everything: consent\_records with purpose, text version, timestamp.

## 5. Repository structure

```
konexio-digipass/
  .github/
    copilot-instructions.md
    instructions/ (backend.instructions.md, frontend.instructions.md)
    workflows/ci.yml
  docs/ (SPEC.md, BEFORE_AFTER.md, CREDITS.md, SECURITY.md, ACCESSIBILITY.md, PRIVACY_NOTES.md)
  data/ (the 12 CSV files and 7 JSON files from the zip, unchanged)
  backend/
    pyproject.toml, alembic.ini, Dockerfile
    alembic/versions/
    app/
      main.py, config.py, deps.py, security.py, logging.py
      db/ (base.py, session.py, models/*.py)
      schemas/ (public and admin Pydantic models, kept in separate modules)
      api/v1/ (content.py, alumni.py, impact.py, interest.py, contact.py, newsletter.py,
               reports.py, search.py, chat.py, webhooks.py, admin.py, auth.py)
      services/ (routing.py, outbox.py, email.py, impact.py, newsletter.py, search.py,
                 chat.py, webhooks_out.py, reports_pdf.py, consent.py, spam.py)
      workers/ (outbox_worker.py, sheets_sync.py)
      templates/email/ (ack, alumni_notify, partnerships_notify, report_link, newsletter_*.html)
    scripts/ (seed.py, reindex_chroma.py, simulate_live_updates.py, create_admin.py)
    tests/
  frontend/
    package.json, vite.config.ts, tsconfig.json, Dockerfile
    public/ (images/placeholders, reports/, newsletters/)
    src/
      app/ (router.tsx, providers.tsx)
      api/ (client.ts, hooks/*.ts, types.ts)
      components/ (ui/, layout/, impact/, alumni/, forms/, chat/)
      pages/ (Home, About, Programmes, Impact, Alumni, AlumniProfile, Team, GetInvolved,
              Contact, AnnualReports, Newsletter, Privacy, NotFound, admin/*)
      i18n/ (en.json, fr.json)
      style.css (the single global stylesheet, imported once in main.tsx)
    tests/ (unit and e2e)
  docker-compose.yml, docker-compose.prod.yml, Caddyfile, .env.example, README.md
```

## 6. Database schema (PostgreSQL)

Use UUID primary keys internally and keep the business IDs (ALU-01, SUB-001, LOC-01) in a unique business\_id column so seeds are idempotent.

**Nullability.** Every column is nullable unless it is listed here as NOT NULL. NOT NULL columns: all primary keys and business\_id; pathways.name; alumni first\_name, last\_name, pathway\_code, consent\_to\_publish and consent\_to\_show\_photo (both default false); team\_members first\_name, last\_name, job\_title and display\_email\_publicly (default false); partners organisation, type and show\_on\_site (default false); locations city, country, latitude and longitude; impact\_events event\_id, occurred\_at, metric and change; interest\_submissions submitted\_at, full\_name, email, visitor\_type, interest\_type, message and status; newsletter\_subscribers email, list and status; outbox kind, payload, status and attempts; webhook\_endpoints url and secret\_hash; admin\_users email, password\_hash and role; every created\_at. Everything else may be NULL. Empty CSV cells (no personal\_website, no video\_file, no interest\_value, no honeypot\_field, an empty year note) load as NULL, never as empty strings. The API returns null for them, the TypeScript types use a null union, and the UI shows a sensible fallback instead of a blank or the word null.

| Table | Key columns |
| --- | --- |
| pathways | code (P1..P11, PK), name, sort\_order |
| alumni | id, business\_id, first\_name, last\_name, city, country, pathway\_code FK, short\_bio, skills (text\[\]), languages (text\[\]), availability, portfolio\_title, portfolio\_url, portfolio\_image, personal\_website, linkedin\_url, photo\_file, video\_file, **private\_notification\_email**, consent\_to\_publish, consent\_to\_show\_photo, consent\_date, is\_active |
| team\_members | id, business\_id, first\_name, last\_name, job\_title, short\_bio, photo\_file, linkedin\_url, **role\_mailbox**, display\_email\_publicly, sort\_order |
| partners | id, business\_id, organisation, type (Employer, Donor, Client, Training partner), country, description, logo\_file, website, show\_on\_site |
| locations | id, business\_id, city, country, latitude, longitude |
| impact\_baseline | location\_id FK, learners\_trained, graduates, employed\_or\_freelancing, women\_pct, cohorts\_completed, as\_of |
| impact\_events | id, event\_id (unique, idempotency), occurred\_at, metric (learners\_trained, graduates, employed\_or\_freelancing, employer\_partners), location\_id nullable (null means All), change, description, source (webhook, sheets, simulator, admin) |
| impact\_by\_year | year PK, learners\_trained, graduates, employed\_or\_freelancing\_pct, women\_pct, countries\_active, cohorts\_completed, employer\_partners\_cumulative, note |
| impact\_by\_pathway | pathway\_code FK, learners\_enrolled, completed, freelancing\_active, avg\_days\_to\_first\_gig |
| annual\_reports | year PK, vision\_statement, learners\_trained, graduates, graduation\_rate\_pct, employed\_or\_freelancing\_pct, women\_pct, countries, cohorts, employer\_partners, pdf\_path, published |
| course\_modules | part, code, title, submodules (text\[\]), duration |
| interest\_submissions | id, business\_id, submitted\_at, full\_name, organisation, email, visitor\_type, interest\_type (alumni, pathway, general), interest\_value, message, consent\_to\_be\_contacted, honeypot\_field, status (received, routed, discarded\_spam, flagged\_no\_consent), ip\_hash, user\_agent\_hash |
| submission\_recipients | submission\_id, recipient\_kind (alumni, alumni\_manager, partnerships\_lead, sender), alumni\_id nullable, outbox\_id |
| contact\_messages | id, name, email, topic, message, consent, honeypot\_field, created\_at, routed\_to\_team\_id |
| newsletter\_subscribers | id, email, list (alumni, donor\_partner), status (pending, subscribed, unsubscribed), consent\_date, consent\_text\_version, confirm\_token\_hash, unsubscribe\_token\_hash |
| newsletters | id, list, subject, html\_body, published\_at (sample issues) |
| consent\_records | id, subject\_type, subject\_ref, purpose, text\_version, granted, recorded\_at |
| outbox | id, kind (email, webhook), payload JSONB, status, attempts, next\_attempt\_at, last\_error, created\_at |
| webhook\_endpoints | id, name, url, secret\_hash, events text\[\], active |
| webhook\_deliveries | id, endpoint\_id, event, payload, status\_code, attempt, delivered\_at |
| admin\_users | id, email, password\_hash (argon2id), role (admin, editor, viewer), totp\_secret\_encrypted, totp\_enabled, failed\_logins, locked\_until |
| audit\_log | id, admin\_id, action, entity, entity\_id, diff JSONB, created\_at |
| security\_log | id, event (honeypot\_hit, rate\_limited, bad\_signature, login\_failed), detail, created\_at |

## 7. Business rules

### 7.1 Express Interest routing

Implement as one pure function, route\_submission(submission, alumni, team) returning recipients and a status, so it is unit tested without a database. Evaluate in this order and stop where stated.

1. **Spam**: honeypot\_field not empty, or the form was posted less than 3 seconds after it was rendered. Status discarded\_spam, write security\_log, notify nobody, send no email, and return the **same success response** a human would get. Stop.
2. **No contact consent** (consent\_to\_be\_contacted FALSE): do not forward to any alumnus. Notify the Partnerships Lead with a flag. Status flagged\_no\_consent. Continue only to step 6.
3. **interest\_type = alumni**: if that alumnus has consent\_to\_publish TRUE, notify the alumnus (private\_notification\_email) and the Alumni Community Manager. If not, notify the Alumni Community Manager only.
4. **interest\_type = pathway**: notify every active alumnus in that pathway with consent\_to\_publish TRUE, plus the Alumni Community Manager. One separate email per alumnus. Never list other recipients, and never send to alumni outside the pathway.
5. **visitor\_type**: Donor notifies the Partnerships Lead and the sender's acknowledgement includes the latest annual report link. Employer or Client notifies the Partnerships Lead in addition to any alumni notification.
6. **Every valid submission** (everything except spam): show the confirmation message on screen and send an automatic acknowledgement email saying a reply is expected within 3 working days.

All emails are written to the outbox, not sent inline.

**Expected results for the 15 sample submissions (use as the test fixture)**

| ID | Visitor, interest | Alumni notified | Alumni Community Manager | Partnerships Lead | Sender gets |
| --- | --- | --- | --- | --- | --- |
| SUB-001 | Employer, ALU-01 | ALU-01 | yes | yes | ack |
| SUB-002 | Donor, general | none | no | yes | ack plus report link |
| SUB-003 | Client, P2 | ALU-03 only (ALU-14 excluded) | yes | yes | ack |
| SUB-004 | Employer, P3 | ALU-05, ALU-16 | yes | yes | ack |
| SUB-005 | Donor, general | none | no | yes | ack plus report link |
| SUB-006 | honeypot filled | none | no | no | nothing (silent discard, logged) |
| SUB-007 | Employer, ALU-16 | ALU-16 | yes | yes | ack |
| SUB-008 | Employer, P4 | ALU-09, ALU-19 | yes | yes | ack |
| SUB-009 | Client, ALU-08, no contact consent | none | no | yes, flagged | ack |
| SUB-010 | Donor, general | none | no | yes | ack plus report link |
| SUB-011 | honeypot filled | none | no | no | nothing (silent discard, logged) |
| SUB-012 | Employer, ALU-13 | ALU-13 | yes | yes | ack |
| SUB-013 | Employer, ALU-14 (no publish consent) | none | yes | yes | ack |
| SUB-014 | Client, P9 | ALU-06 | yes | yes | ack |
| SUB-015 | Donor, general | none | no | yes | ack plus report link |

**Assumptions to confirm with Konexio**: (a) alumni who are notified receive the sender's name, organisation, email and message, because the sender consented to be contacted; (b) SUB-009 still receives a plain acknowledgement; (c) the Alumni Community Manager is not notified for general donor enquiries; (d) submissions are deleted after 12 months.

### 7.2 Live impact numbers

- Current value of a metric for a location = baseline (impact\_baseline, as of 31 Oct 2026) plus the sum of impact\_events for that metric and location. Global = sum over locations. employer\_partners events with no location are global only; the baseline for employer partners is 27 from live\_numbers.json.
- employed\_or\_freelancing\_pct is **employed\_or\_freelancing divided by graduates** (checked: Nairobi 155/242 is 64%, Kampala 93/160 is 58%). Always recompute it from counts after events. women\_pct is weighted by learners.
- Events are idempotent on event\_id. An event for an unknown city is stored with a pending\_location flag for an admin to resolve, not dropped.
- Always show an as of date and the data source.
- After replaying the 6 simulated events: learners 1,275, graduates 992, employed or freelancing 588, employer partners 28.

### 7.3 Alumni visibility

- Public only if consent\_to\_publish is TRUE and is\_active.
- Photo only if consent\_to\_show\_photo is TRUE, otherwise a generated initials avatar. The intro video is also treated as media that needs consent\_to\_show\_photo (assumption).
- Filters: pathway\_code, country, availability, skill, free text q. Pathways with no alumni still appear but show an empty state.
- Profile URL: /alumni/ALU-01 (stable) with an optional slug after it.
- Link rule: show personal\_website if present, otherwise linkedin\_url, and always a Contact this alumnus button that opens the Express Interest form with interest\_type=alumni and interest\_value pre-filled.

### 7.4 Newsletters

- Two lists with separate table rows and separate consent text: alumni and donor\_partner.
- Double opt-in: subscribe creates status pending and emails a confirm link. Confirm sets subscribed and stores consent\_date and consent\_text\_version. Every email carries a one-click unsubscribe link and a List-Unsubscribe header.
- Never email unsubscribed or pending addresses. Subscribing to one list never subscribes to the other.
- A sample issue per list is stored in newsletters and shown at /newsletter/samples/alumni and /newsletter/samples/donor-partner. Content uses only the sample data (real metrics, consented alumni).

### 7.5 Contact form routing

The visitor picks a topic and the server maps it to a team role mailbox. The mailbox is never sent to the browser.

| Topic | Goes to |
| --- | --- |
| Training and programmes | Programmes Manager |
| Partnerships, funding, hiring | Partnerships Lead |
| Alumni community | Alumni Community Manager |
| Website or technical problem | EdTech Product Manager |
| Press and general | Country Director |

### 7.6 Annual reports

Reports exist for 2024 and 2025 (annual\_report\_metrics.csv). Each shows the vision statement and the metrics in cards, a link to the same-year impact numbers, an on-page version, and a PDF generated server-side from the same data so the two never disagree. Show a clear note that 2026 is year to date.

## 8. API specification, webhooks and live data

Base path /api/v1. Errors use RFC 7807 problem+json. Lists are paginated. Public GET responses carry Cache-Control and ETag.

**Public**

| Method and path | Purpose |
| --- | --- |
| GET /health | Liveness and database check |
| GET /pathways | 11 pathways |
| GET /programmes/modules | Part I modules M0 to M5 and Part II pathways |
| GET /team | Team profiles without mailboxes |
| GET /partners | Partners where show\_on\_site is true |
| GET /alumni | List with filters pathway, country, skill, availability, q, page |
| GET /alumni/{business\_id} | One public profile (404 if no consent) |
| GET /impact/summary | Totals, as\_of, source, women\_pct, country count |
| GET /impact/locations | Per location figures with latitude and longitude |
| GET /impact/pathways | Per pathway figures |
| GET /impact/years | Yearly trend with YTD flag |
| GET /impact/stream | Server-Sent Events, event impact.updated |
| GET /reports and /reports/{year} | Annual report data |
| GET /reports/{year}/pdf | Generated PDF download |
| GET /newsletters/samples/{list} | Sample issue HTML |
| GET /search?q= | Semantic search over alumni and site content |
| POST /chat | RAG chatbot |
| GET /form-token | Signed render timestamp for the time trap |
| POST /interest | Express Interest, returns reference and expected response time |
| POST /contact | Contact form |
| POST /newsletter/subscribe, GET /newsletter/confirm, POST /newsletter/unsubscribe | Newsletter flows |

**Webhooks (machine to machine)**

| Method and path | Purpose |
| --- | --- |
| POST /webhooks/impact | One impact event from Make, Zapier or Apps Script |
| POST /webhooks/impact/batch | Up to 100 events |
| POST /webhooks/newsletter-provider | Stub for bounce and unsubscribe callbacks |

**Admin (session cookie, 2FA, role checks)**

POST /auth/login, /auth/2fa/setup, /auth/2fa/verify, /auth/logout, GET /auth/me. CRUD under /admin/alumni, /admin/team, /admin/partners. GET /admin/submissions (and detail, resend), /admin/impact/events (and manual add), /admin/newsletter/subscribers, /admin/webhooks and /admin/deliveries, /admin/security-log, /admin/audit-log, POST /admin/reindex.

**Inbound webhook contract**

- Headers: X-Konexio-Timestamp (unix seconds) and X-Konexio-Signature, which is the hex HMAC-SHA256 of timestamp, a dot, and the raw request body, keyed with WEBHOOK\_SHARED\_SECRET.
- Reject if the timestamp is more than 5 minutes old, if the signature fails a constant-time comparison (log bad\_signature), or if the body is invalid. Return 202 on accept and 200 with duplicate true for a repeated event\_id.
- Body: event\_id, timestamp, metric, location (city name or All), change (integer, may be negative for corrections), description. These columns match live\_updates\_to\_simulate.csv, so a Google Sheet or Airtable table with the same columns works directly.
- Make or Zapier scenario: trigger on new row in the sheet or table, build the JSON, compute the signature in a code step, HTTP POST to the endpoint.
- Fallback: a worker pulls IMPACT\_SHEET\_CSV\_URL (a published Google Sheet CSV) every 5 minutes and inserts any unseen rows.
- scripts/simulate\_live\_updates.py replays the 6 sample events with valid signatures at a configurable speed so you can demo live updates without Make or Zapier.

**Outbound webhooks**

- Events: submission.received, submission.routed, newsletter.subscribed, newsletter.unsubscribed, impact.updated.
- Envelope: id, type, created\_at, data. Same signature scheme with a per-endpoint secret.
- Delivered from the outbox with retries after 1 minute, 5 minutes, 30 minutes, 2 hours and 12 hours, then marked dead and shown in the admin. By default payloads contain no personal data (reference IDs only). An endpoint can be flagged include\_pii only by an admin.
- Typical uses: push a new submission to an Airtable or CRM base, post to a Slack channel, update the live sheet.

## 9. Security and privacy specification

| Control | Specification | How to verify |
| --- | --- | --- |
| HTTPS | Caddy with automatic certificates, HTTP redirects to HTTPS, HSTS 1 year | Production smoke test |
| Security headers | Content-Security-Policy (self plus the exact allow-list for OpenStreetMap tiles, YouTube-nocookie or Vimeo, the form provider, LinkedIn), X-Content-Type-Options, Referrer-Policy, Permissions-Policy, frame-ancestors | Header test in CI |
| Spam protection | Hidden honeypot field named website\_url, signed time trap, per-IP rate limits (interest 5 per hour, contact 5 per hour, newsletter 10 per hour, login 5 per 15 minutes), link-count heuristic, optional Cloudflare Turnstile switched on by environment variable | Fixture SUB-006 and SUB-011 |
| No public contact data | Separate public and admin Pydantic schemas. Mailboxes and personal emails exist only in admin schemas and the email service | Test scanning every public response for the at sign and for known mailbox values |
| Passwords | argon2id, minimum 12 characters, lockout after 5 failures, no default admin password in seeds | Unit tests |
| 2FA | TOTP required for admin and editor roles, 10 single-use recovery codes, secrets encrypted at rest | Login flow test |
| Sessions | HttpOnly, Secure, SameSite=Lax cookie, 30 minute idle timeout, CSRF token on every admin mutation | Test |
| Input and output | Pydantic validation, ORM only (no string SQL), HTML escaped in templates, email header injection guarded | Fuzz tests |
| Secrets | Only in environment variables, .env.example committed, .env ignored, secret scanning and dependency audits (pip-audit, npm audit) in CI | CI |
| Data minimisation | IP and user agent stored only as salted hashes, chat messages not stored, ChromaDB holds public fields only | Review |
| Erasure | Admin action deletes an alumnus from Postgres, the outbox and ChromaDB, and writes an audit entry | Test |
| Audit | Every admin change recorded with who, what and when | Test |

**Privacy notice and consent wording** (drafts for Konexio to approve; I am not a lawyer, and applicable laws vary by country, for example Kenya, Nigeria, Ghana, Rwanda, Senegal and the EU for French or European visitors).

- Alumni profile consent: I agree that Konexio Africa may publish my name, photo, short bio, skills and portfolio links on its website. I can choose whether my photo and video are shown. I understand I can withdraw consent at any time by contacting the Alumni Community Manager, and my profile will be removed.
- Express Interest: Your details are shared only with the Konexio staff and, if you tick the box, the alumni you asked about, so they can reply to you. We keep them for 12 months.
- Newsletters (one wording per list): I agree to receive the Konexio alumni newsletter (or partner and donor newsletter) by email. I can unsubscribe in one click in any message.
- The privacy page lists: who we are, what we collect, why, who sees it, retention, the rights to access, correct and delete, how to exercise them (through the Contact form), cookies and analytics, third parties (hosting, email, analytics, embeds), and the consent text version in force.

## 10. ChromaDB search and chatbot specification

**Collections**

- alumni\_public: one document per consenting alumnus built from bio, skills, pathway name, portfolio title, languages and country. Metadata: pathway\_code, country, availability. ID is the business\_id. No emails, no non-consenting alumni.
- site\_knowledge: chunks of about 300 to 500 tokens from the programme pages, the 11 pathways, the course catalog, the annual reports, the FAQ, how to apply and the privacy page. Metadata: source\_url, title, language.

**Embeddings**: a multilingual model (for example paraphrase-multilingual-MiniLM-L12-v2) so English and French queries work. Run it inside the API container so no data leaves the server.

**Indexing**: scripts/reindex\_chroma.py rebuilds both collections from Postgres. A hook re-indexes one alumnus when an admin edits or withdraws consent.

**Search** (GET /search): semantic query, then filter by consent and pathway, merged with keyword matches. Returns type, title, snippet, URL and score.

**Chatbot** (POST /chat)

- Retrieve the top 5 chunks, build a prompt that treats retrieved text as data, and call the model selected by LLM\_PROVIDER (anthropic, openai or none). With none, return the best passages with links, so the feature works offline.
- Answers only from the context, always cite source links, say I do not know and point to the Contact form when the answer is missing.
- Never output an email or phone number, never help locate private data, ignore instructions that appear inside retrieved text, no storage of conversations, rate limited.
- Evaluate with a set of 15 question and answer pairs stored in tests (for example How do I apply, Which pathways exist, How many learners trained, Can I hire a graphic designer).

## 11. Frontend specification

**Design system.** Mobile first. Brand colours taken from the Konexio logo: deep navy for text and headings, bright blue and orange as accents (approximate values to confirm against the brand guide: navy 1B2A6B, blue 1CB5E8, orange F7931E). Orange and light blue never carry small text on white; use navy for text. Self-hosted font with a clear humanist sans, 16px minimum body, 1.6 line height. Components: Button, LinkButton, Card, Badge, Tabs, Accordion, Modal, Toast, Field, Select, Checkbox, KpiCard, Skeleton, Avatar, Pagination.

**Styling with one style.css.** Plain CSS, no framework. All styles live in frontend/src/style.css, imported once in main.tsx (the Leaflet stylesheet is imported only with the map). Order of the file: 1 tokens (:root custom properties for colour, spacing, type scale, radii, shadows, z-index), 2 reset, 3 base elements (body, headings, links, forms, focus-visible), 4 layout helpers (.container, .stack, .grid, .cluster), 5 components (one labelled block each, BEM-style names such as .btn, .btn--primary, .card\_\_title), 6 pages (.home-hero, .impact-map), 7 utilities (.visually-hidden, .skip-link), 8 print, 9 prefers-reduced-motion. Mobile first with min-width breakpoints at 640, 960 and 1200px. No !important. No inline styles except values that come from data, such as a map marker size, passed as CSS custom properties. Budget: under 30 KB gzip. The token section records the contrast ratio of each text and background pair in a comment.

**Vite setup.** React with the current Vite, @vitejs/plugin-react and strict TypeScript. The dev server proxies /api to http://localhost:8000 so local development matches the Vercel rewrite. Only VITE\_ variables reach the browser. Route-level React.lazy splitting, with manualChunks separating react, leaflet and recharts. Output goes to dist, which Vercel serves. Fonts load through @font-face in style.css from /fonts. Images live in public/images or are imported so Vite hashes them.

**Layout.** Header with logo, the 8 core links (Home, About, Programmes, Impact, Alumni, Konexio Team, Get Involved, Contact), a language switcher, the LinkedIn icon and a persistent **Apply now** button. Footer with sitemap, newsletter links, LinkedIn, privacy link, credits link and the sample data notice. Skip link first in the tab order.

**Pages and content sources**

| Page | Sections |
| --- | --- |
| Home | Hero with Apply now and Express interest buttons; **impact glimpse** (learners trained, live, with as of date and a link to the full dashboard); how it works in 3 steps (train, build a portfolio, get connected to online work); the 11 pathways; 4 featured consenting alumni; partner logos; newsletter strip; LinkedIn block |
| About | Mission, who Konexio Africa and Digi Pass are, countries served, values. Use only facts in the data and the brief. Anything else is a clearly marked placeholder in the translation file, never invented statistics or quotes |
| Programmes | Part I accordion M0 to M5 with durations and submodules; Part II grid of P1 to P11 with enrolled, completed, freelancing and average days to first gig, each linking to alumni in that pathway; catalog preview; Moodle login link hidden behind a feature flag until Konexio confirms a public link is appropriate; Apply call to action |
| Impact | KPI cards (live), Leaflet map with circle markers sized by learners and a keyboard-accessible table of the same data, location breakdown, pathway chart, yearly trend chart marked YTD for 2026, as of date, data source, CSV download, and a stripped-down /impact/embed view designed to be embedded elsewhere |
| Alumni | Pathway, country, availability and skill filters with the filter state in the URL; cards; profile page with photo or video, bio, skills, languages, portfolio title and image and link, website or LinkedIn, availability badge, Contact this alumnus |
| Konexio Team | Cards with photo, title, bio, LinkedIn and a Contact button that opens the Contact form with the topic set. No email anywhere |
| Get Involved | Three tracks: learners (Apply, with the embedded application form and a fallback link), employers and clients, donors and partners; the Express Interest form; partners wall |
| Contact | Form only, with topic, consent and honeypot; confirmation message |
| Annual reports | List, year pages with vision statement and metrics, PDF download |
| Newsletter | Two clearly separated sign-up cards, sample issue links, confirmation and unsubscribe pages |
| Privacy | Notice, consent text versions, how to withdraw |
| Admin | Login with 2FA, tables for alumni, submissions, subscribers, impact events, webhooks, deliveries and the security log |

**Express Interest form.** Fields: full name, organisation, email, I am a (Employer, Client, Donor), I am interested in (a specific alumnus, a pathway, or general), alumni autocomplete or pathway select depending on the choice (only public alumni are offered), message (max 1,500 characters), an optional checkbox for consent to be contacted by alumni with plain explanation of what happens when unticked, hidden honeypot and form token. On success replace the form with a confirmation panel containing the reference number, what happens next, and the 3 working days response time. Errors are linked to fields and announced to screen readers.

**Embeds (at least three).** OpenStreetMap map, video player for the alumni intro videos (poster image, no autoplay, captions track), the application form iframe from VITE\_APPLICATION\_FORM\_URL, the LinkedIn post or follow block, and the impact embed view. Every embed has a title, a loading placeholder and a plain link fallback if blocked.

**Accessibility (WCAG 2.2 AA).** Landmarks, one h1 per page, visible focus, 4.5:1 text contrast, keyboard operable menus, tabs, map alternative and filters, labelled forms, alt text for every image (empty for decorative), reduced motion support, 200 percent zoom without loss, correct lang attribute when the language changes. Output docs/ACCESSIBILITY.md with the audit result and fixes.

**Performance.** Lighthouse 90 or more on all four scores on mobile. Initial JavaScript under 200 KB gzip, route-based code splitting, lazy-loaded map and charts, WebP or AVIF with srcset and explicit dimensions, no layout shift, self-hosted subset fonts, long cache lifetimes for hashed assets, a low-data friendly design (no autoplay, small posters). Test on a throttled 4G profile because many visitors are on mobile networks.

**Bilingual (stretch).** English default and French for Home, Programmes, Impact, Get Involved, Express Interest, Newsletter and Privacy, using react-i18next with lazy-loaded JSON. French strings are marked for human review. The choice is stored in the URL prefix (/fr).

**Analytics (stretch).** A cookieless, privacy-friendly tool (Umami or Plausible, self-hosted or hosted) loaded from VITE\_ANALYTICS\_URL. Custom events: apply\_click, interest\_submit, contact\_submit, newsletter\_subscribe, alumni\_contact\_click, report\_download, chatbot\_open. No personal data in event properties.

**Credits.** docs/CREDITS.md and a public /credits section list every image, icon, font, template and library with source and licence. Generated placeholder avatars and images are labelled as such.

## 12. GitHub Copilot setup

**Before the first prompt**

1. Create the repo, open it in VS Code with GitHub Copilot and Copilot Chat enabled, and switch Chat to **Agent mode**. Use the strongest model your plan offers for the backend prompts.
2. Copy the unzipped sample data into /data unchanged and save Sections 2 to 11 of this document as docs/SPEC.md.
3. Create .github/copilot-instructions.md with the text below. Copilot reads it automatically on every request.

```
# Project: Konexio Africa Digi Pass website
Read docs/SPEC.md before any task. It is the source of truth. If the spec and a request conflict, stop and ask.

## Stack
Frontend: React 18, Vite, TypeScript (strict), plain CSS in src/style.css (no Tailwind or other CSS framework), React Router, TanStack Query, react-i18next, react-leaflet, Recharts.
Backend: Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2 async, Alembic, PostgreSQL 16, ChromaDB.
Tests: pytest, Vitest, Playwright, axe-core.

## Non-negotiable rules
1. Privacy: never expose private_notification_email, role_mailbox, submitter emails or subscriber emails in any public API response, page, log line, ChromaDB document or test snapshot. Public and admin Pydantic schemas live in separate modules.
2. Consent: alumni appear publicly, in search, in ChromaDB and in notifications only when consent_to_publish is true. Photos and video only when consent_to_show_photo is true.
3. Spam: honeypot hits are discarded silently and return the same success response as a real submission.
4. Live numbers come from the database (baseline plus impact_events). Never hard-code impact figures in components or text.
5. Emails and outbound webhooks always go through the outbox table, never inline in a request.
6. Data is sample data only. Do not invent statistics, quotes, partner names or alumni. Unknown copy is a clearly marked TODO placeholder in the i18n files.
7. Secrets only from environment variables. Never commit .env.
8. Accessibility WCAG 2.2 AA: semantic HTML, labelled forms, visible focus, alt text, keyboard support.
9. Every task ends with tests written and passing, and a short explanation of what you built and why, so the team can explain it.
10. Credit every image, font, icon, template and library in docs/CREDITS.md.

## Conventions
Python: type hints everywhere, async I/O, ruff and mypy clean, services contain logic and routers stay thin.
TypeScript: no any, functional components, API calls only through src/api hooks, text only through i18n keys. CSS: every style lives in src/style.css using CSS custom properties and BEM-style class names, mobile-first min-width media queries, no CSS-in-JS, no Tailwind, no inline styles except values that come from data. Fields that the spec allows to be null are typed as a null union and need a UI fallback.
Keep functions small. Add docstrings to business-rule functions. Do not add dependencies without saying why.
```

4. Optionally add .github/instructions/backend.instructions.md with the header applyTo: backend/\*\* and the Python conventions, and frontend.instructions.md with applyTo: frontend/\*\* and the TypeScript conventions, so each side only gets its own rules.

**Working method for every prompt**

- Start a new chat session per prompt and attach docs/SPEC.md with #file:docs/SPEC.md. Add #codebase when the prompt builds on earlier code.
- If Copilot offers a plan first, read it and correct it before it writes code. Say Do not start coding until I confirm if you want that.
- Run the tests yourself, open the result in the browser, read the diff, then commit with a message naming the prompt number.
- If something is wrong, give Copilot the exact error output and the file name. Do not rewrite the original prompt.
- Ask Explain how X works in simple terms for anything you will have to present. The ground rules require you to fact-check and explain all AI output.

## 13. The prompts

Prompts 0 to 10 build the backend, 11 to 19 the frontend, 20 to 24 harden, test, deploy and document. Each prompt is self-contained enough to paste directly.

### Prompt 0: Scaffold the monorepo

```
Read #file:docs/SPEC.md sections 4 and 5. Create the monorepo exactly as in section 5.

Tasks:
1. docker-compose.yml with services: postgres:16, chroma (chromadb/chroma with a persistent volume), mailpit, api (backend Dockerfile, hot reload), web (Vite dev server). Health checks and a shared network.
2. backend/: pyproject.toml (FastAPI, uvicorn, pydantic-settings, SQLAlchemy[asyncio], asyncpg, alembic, structlog, httpx, argon2-cffi, pyotp, slowapi, aiosmtplib, jinja2, chromadb, reportlab, pytest, pytest-asyncio, ruff, mypy, pip-audit), app/main.py with a GET /api/v1/health that checks the database, app/config.py loading every setting from environment variables, JSON logging with structlog.
3. frontend/: Vite React TypeScript strict, plain CSS in a single src/style.css (no Tailwind), React Router, TanStack Query, react-i18next, ESLint, Prettier, Vitest.
4. .env.example listing every variable: DATABASE_URL, CHROMA_HOST, CHROMA_PORT, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, MAIL_FROM, SESSION_SECRET, ENCRYPTION_KEY, WEBHOOK_SHARED_SECRET, IMPACT_SHEET_CSV_URL, LLM_PROVIDER, ANTHROPIC_API_KEY, OPENAI_API_KEY, TURNSTILE_SITE_KEY, TURNSTILE_SECRET, PUBLIC_SITE_URL, VITE_API_URL, VITE_APPLICATION_FORM_URL, VITE_LINKEDIN_URL, VITE_ANALYTICS_URL, FEATURE_MOODLE_LINK. Add .gitignore that ignores .env.
5. Makefile: up, down, test, lint, seed, reindex. GitHub Actions ci.yml running ruff, mypy, pytest, eslint, vitest, pip-audit and npm audit.
6. README with setup steps.

Done when: make up starts everything, /api/v1/health returns ok, the web app shows a placeholder page, CI passes locally. Do not build any feature yet.
```

### Prompt 1: Database models, migrations and seed

```
Read #file:docs/SPEC.md sections 2 and 6, and look at the files in #folder:data.

Tasks:
1. Create SQLAlchemy 2 async models for every table in section 6 under backend/app/db/models/, with UUID primary keys, a unique business_id where the sample data has IDs, timestamps, nullable columns by default (only the NOT NULL columns listed in section 6 are required, typed as Optional in the models), and proper constraints and indexes (pathway_code, country, consent flags, outbox status and next_attempt_at).
2. Create the initial Alembic migration.
3. Write backend/scripts/seed.py that idempotently loads the CSV files in /data (upsert on business_id): pathways from impact_by_pathway.csv, alumni_profiles.csv, team_profiles.csv, partners_and_donors.csv, impact_by_location.csv (creates locations and impact_baseline, plus Dakar and Dar es Salaam), impact_by_year.csv, impact_by_pathway.csv, annual_report_metrics.csv, course_catalog_preview.csv, newsletter_subscribers_sample.csv (keep status and consent_text_version), express_interest_sample_submissions.csv (as historical rows with status received, NOT re-sent). Parse TRUE/FALSE into booleans, semicolon lists into arrays, dates into dates. Empty CSV cells become NULL, never empty strings (for example personal_website, video_file, interest_value, honeypot_field and the year note). The employer partner baseline is 27 from data/json/live_numbers.json.
4. Seed an initial admin only from environment variables, never with a default password.
5. pytest tests asserting: 20 alumni (19 with consent_to_publish true, ALU-14 false), 8 team members, 10 partners, 7 locations, 11 pathways, 17 course modules, 30 newsletter subscribers (2 unsubscribed), 15 submissions; baseline totals reconcile to 1248 learners, 972 graduates, 584 employed or freelancing; running the seed twice creates no duplicates.

Do not hard-code numbers outside tests. Explain how the upsert works.
```

### Prompt 2: Public content APIs with privacy by construction

```
Read #file:docs/SPEC.md sections 7.3, 8 and 9, and #codebase.

Build the public read endpoints: /pathways, /programmes/modules, /team, /partners, /alumni (filters pathway, country, skill, availability, q, page), /alumni/{business_id}.

Rules:
- Create separate Pydantic response schemas in app/schemas/public/ that physically do not contain private_notification_email, role_mailbox, consent internals or any email field.
- Alumni endpoints return only consent_to_publish = true and is_active rows. ALU-14 must return 404.
- photo_url is null when consent_to_show_photo is false (ALU-19) and the response includes an avatar_initials field instead. video_url is also null when consent_to_show_photo is false.
- Return a profile_link object: personal_website if present, otherwise linkedin_url, plus a contact_action field telling the frontend to open the Express Interest form with the alumnus pre-selected.
- Pagination, Cache-Control and ETag headers on GET responses.
- Static files: serve images from /media with a generator script scripts/make_placeholders.py that creates credited SVG placeholder photos, portfolio images, logos and a poster for every file path referenced in the CSVs, because the real images are not available. Add each to docs/CREDITS.md as generated.

Tests: a test that walks every public GET endpoint and fails if any response body contains an at sign or any value from alumni.private_notification_email or team.role_mailbox; ALU-14 is absent from every list; ALU-19 has no photo; pathway filter P3 returns ALU-05 and ALU-16 only.
```

### Prompt 3: Impact engine and live stream

```
Read #file:docs/SPEC.md sections 7.2 and 8, and #codebase.

Tasks:
1. services/impact.py: current value = baseline + sum of impact_events per metric and location, global totals, employed_or_freelancing_pct = employed / graduates recomputed from counts, women_pct weighted by learners, countries count, cohorts, employer partners.
2. Endpoints: GET /impact/summary, /impact/locations, /impact/pathways, /impact/years (flag 2026 as year to date). Include as_of (latest event time or baseline date) and a source field.
3. GET /impact/stream as Server-Sent Events: send the current summary on connect, then an impact.updated event whenever an event is inserted. Use PostgreSQL LISTEN/NOTIFY so it works with several API workers. Send a heartbeat every 20 seconds. Provide a polling-friendly /impact/summary with ETag as fallback.
4. A function add_event() that inserts an event idempotently on event_id and sends NOTIFY, used by webhooks, the sheet puller and the admin.

Tests: baseline totals reconcile with data/json/live_numbers.json; after inserting the 6 events from data/live_updates_to_simulate.csv the summary is 1275 learners, 992 graduates, 588 employed or freelancing, 28 employer partners; the Nairobi employed percentage is recomputed correctly; inserting the same event_id twice changes nothing; an event for an unknown city is stored as pending_location and does not break totals.
```

### Prompt 4: Inbound webhooks, simulator and sheet sync

```
Read #file:docs/SPEC.md section 8 (Inbound webhook contract) and #codebase.

Tasks:
1. POST /webhooks/impact and /webhooks/impact/batch (max 100). Verify X-Konexio-Timestamp and X-Konexio-Signature (hex HMAC-SHA256 of timestamp + dot + raw body, key WEBHOOK_SHARED_SECRET) using the raw bytes and a constant-time comparison. Reject timestamps older than 5 minutes. Validate the body with Pydantic. Return 202 on accept, 200 with duplicate true on a repeated event_id. Log bad signatures to security_log and rate limit by IP.
2. scripts/simulate_live_updates.py: reads data/live_updates_to_simulate.csv and POSTs each row with a valid signature, with a --speed option and a --url option.
3. workers/sheets_sync.py: every 5 minutes fetch IMPACT_SHEET_CSV_URL if set, map columns timestamp, metric, location, change, description to events using a deterministic event_id (hash of the row), insert unseen rows via add_event. Do nothing when the variable is empty.
4. docs/WEBHOOKS.md: step by step setup for Make and for Zapier (trigger on new Google Sheets or Airtable row, code step that signs the body, HTTP POST), a curl example, and the column layout of the source sheet, using the same columns as the CSV.

Tests: valid signature accepted, wrong secret rejected with 401, 6 minute old timestamp rejected, modified body rejected, duplicate event idempotent, batch of 6 sample events gives the expected totals.
```

### Prompt 5: Express Interest, routing engine, outbox and email

```
Read #file:docs/SPEC.md sections 7.1, 8 and 9, and #codebase. This is the most important backend feature, build it test first.

Build in this order:
1. Outbox: services/outbox.py to enqueue email or webhook rows in the same transaction as the business change, and workers/outbox_worker.py that claims rows with FOR UPDATE SKIP LOCKED, sends, records attempts and retries with backoff (1 min, 5 min, 30 min, 2 h, 12 h, then dead). Email via aiosmtplib to the SMTP settings (Mailpit in development) with Jinja2 autoescaped HTML and plain text templates in app/templates/email/: ack, alumni_notify, manager_notify, partnerships_notify, partnerships_flag_no_consent, report_link. Reject newlines in any header value.
2. services/routing.py: a pure function route_submission(submission, alumni, team) implementing exactly rules 1 to 6 in section 7.1 and returning the recipients and status. Role mailboxes come from team_members by job_title (Partnerships Lead, Alumni Community Manager).
3. services/spam.py: honeypot field, signed time trap token from GET /form-token (minimum 3 seconds), per-IP rate limit 5 per hour, more than 2 URLs in the message flagged, optional Turnstile verification when TURNSTILE_SECRET is set.
4. POST /interest: validate, store, route, enqueue, and return reference, a friendly confirmation message and expected_response_time of 3 working days. A spam submission returns the identical success shape, is stored as discarded_spam, writes security_log and enqueues nothing.

Tests: load data/express_interest_sample_submissions.csv and assert the result for all 15 submissions equals the table in section 7.1 (SUB-003 excludes ALU-14, SUB-004 notifies ALU-05 and ALU-16, SUB-013 notifies only the manager and partnerships lead, SUB-006 and SUB-011 enqueue nothing, SUB-009 does not notify alumni). Also test that a pathway notification email never contains another alumnus name, and that an email header injection attempt in the name field is rejected.
```

### Prompt 6: Newsletters with two lists

```
Read #file:docs/SPEC.md sections 7.4 and 8, and #codebase.

Tasks:
1. POST /newsletter/subscribe with email, list (alumni or donor_partner), consent checkbox, honeypot and form token. Create status pending, store consent_text_version (current version consent-text-v1) and enqueue a double opt-in email with a signed, expiring confirm link. If the address already exists on that list, respond identically (do not reveal membership).
2. GET /newsletter/confirm sets subscribed with consent_date. POST /newsletter/unsubscribe plus a one-click link and List-Unsubscribe headers on every email.
3. The two lists are independent. Never send to pending or unsubscribed rows.
4. Two sample newsletters (HTML email templates plus stored rows in newsletters): the alumni one has opportunities, new cohort numbers, spotlight of a consenting alumnus and a webinar placeholder; the donor and partner one has impact numbers pulled from the live summary, a story, and the latest annual report link. Use only sample data and mark placeholders. GET /newsletters/samples/{list} returns the rendered HTML.
5. Admin-only endpoint to send a test issue to one address through the outbox.

Tests: subscribing to one list does not subscribe to the other; the seeded unsubscribed rows never receive mail; tokens expire; the unsubscribe link works without login.
```

### Prompt 7: Contact form, admin authentication with 2FA, admin API

```
Read #file:docs/SPEC.md sections 7.5, 8 and 9, and #codebase.

Tasks:
1. POST /contact with topic, name, email, message, consent, honeypot, form token. Route by topic to the role mailbox (table in 7.5) through the outbox, send an acknowledgement, never return any mailbox to the browser.
2. Auth: POST /auth/login (argon2id, minimum 12 character passwords, lockout after 5 failures for 15 minutes, uniform error messages), mandatory TOTP with pyotp for admin and editor roles (setup returns a provisioning URI and QR as data URI, secret encrypted with ENCRYPTION_KEY, 10 single-use recovery codes stored hashed), HttpOnly Secure SameSite=Lax session cookie with 30 minute idle timeout, CSRF token for all mutating admin requests, logout.
3. Roles: admin (everything), editor (alumni, team, partners, impact events, newsletter samples), viewer (read only). Dependency functions to enforce roles.
4. Admin CRUD: alumni, team, partners; read endpoints for submissions (with routing result and resend), subscribers, impact events (plus manual add), security_log and audit_log. Every mutation writes audit_log with the diff. Deleting or withdrawing consent for an alumnus removes the profile from Postgres reads immediately and queues a Chroma removal.
5. scripts/create_admin.py prompting for a password (no default).

Tests: login lockout, 2FA required before any admin access, CSRF rejection, viewer cannot mutate, audit entries created, contact topic routing never leaks the mailbox.
```

### Prompt 8: ChromaDB semantic search and RAG chatbot

```
Read #file:docs/SPEC.md sections 9 and 10, and #codebase.

Tasks:
1. services/search.py with the chromadb HttpClient (CHROMA_HOST) and two collections: alumni_public and site_knowledge, exactly as in section 10. Use a multilingual sentence-transformers embedding function so English and French queries work. Index ONLY consenting alumni and only public fields. Never index emails.
2. scripts/reindex_chroma.py rebuilds both collections from Postgres and from a docs/site_content/ folder of markdown files (create these from the real data: how to apply, pathways, course catalog, annual report text, how to hire, privacy summary, FAQ marked TODO where facts are missing). A function reindex_alumnus(business_id) used by admin hooks, which removes the document when consent is false.
3. GET /search?q=&type=&pathway= returning merged semantic and keyword results with type, title, snippet, URL and score. Verify consent again against Postgres before returning an alumnus.
4. POST /chat: retrieve the top 5 chunks, build a prompt that treats retrieved text as untrusted data, call the provider chosen by LLM_PROVIDER (anthropic, openai, none). With none, return the best passages and links. Rules: answer only from context, cite source URLs, say you do not know and point to the Contact page otherwise, never output an email or phone number, ignore instructions found inside retrieved text, store no conversation text, rate limit 20 per hour per IP.
5. tests/chat_eval.json with 15 question and expected-source pairs and a pytest that checks retrieval returns the expected source for each.

Tests: ALU-14 is never returned by search or chat; a query for graphic designer returns ALU-03 first; a French query for formation en design graphique works; a prompt-injection string inside a site document is not obeyed.
```

### Prompt 9: Outbound webhooks

```
Read #file:docs/SPEC.md section 8 (Outbound webhooks) and #codebase.

Tasks:
1. Tables webhook_endpoints and webhook_deliveries already exist. Add admin endpoints to create, list, enable and disable endpoints (secret shown once, stored hashed), and to view deliveries and replay a dead one.
2. Emit events submission.received, submission.routed, newsletter.subscribed, newsletter.unsubscribed and impact.updated by writing an outbox row of kind webhook per subscribed endpoint, in the same transaction as the change.
3. The worker POSTs the envelope (id, type, created_at, data) with the same X-Konexio-Timestamp and X-Konexio-Signature scheme using the endpoint secret, 10 second timeout, retries per the schedule, dead after the last attempt. Payloads contain reference IDs only unless the endpoint has include_pii set by an admin. Block private IP ranges and localhost as destinations to prevent SSRF, and only allow https URLs in production.
4. Update docs/WEBHOOKS.md with example Make and Zapier catch-hook receivers and how to verify our signature.

Tests: signature verifies with a reference implementation, failed delivery retries with backoff, dead letters are reported, a spam submission never triggers an event, SSRF destinations are rejected.
```

### Prompt 10: Annual reports and PDF generation

```
Read #file:docs/SPEC.md section 7.6 and #codebase.

Tasks:
1. GET /reports and /reports/{year} from the annual_reports table (2024 and 2025), including vision_statement and the metrics, plus a link to the related yearly impact row.
2. GET /reports/{year}/pdf generates a branded PDF with ReportLab from the same data (cover with vision statement, metrics as a table and simple charts, a data notes page saying sample data, credits). Cache the file by year and data hash.
3. A helper get_latest_report_url() used by the donor acknowledgement email so the link is always the latest report.

Tests: both years return the right numbers (2025: 360 learners, 288 graduates, 80 percent graduation rate); the PDF opens and contains the vision statement text; the donor acknowledgement email contains the 2025 report link.
```

### Prompt 11: Frontend foundation and design system

```
Read #file:docs/SPEC.md section 11 and #codebase (frontend/).

Tasks:
1. src/style.css as the single global stylesheet imported once in main.tsx, with :root custom properties for the brand tokens (navy, blue, orange, neutrals), spacing scale, type scale and radii, a modern reset, a self-hosted font through @font-face, dark text on light surfaces with 4.5:1 contrast checked. Organise style.css in labelled sections in this order: tokens, reset, base elements, layout helpers, components (one block per component with BEM-style names such as .btn, .btn--primary, .card__title), pages, utilities, print, prefers-reduced-motion. Mobile first with min-width media queries at 640, 960 and 1200px, a visible :focus-visible style, no !important, no inline styles except values that come from data. Keep it under 30 KB gzip. Load leaflet.css only with the map.
2. Components in src/components/ui: Button, LinkButton, Card, Badge, Tabs, Accordion, Modal, Toast, Field (label, hint, error with aria-describedby), Select, Checkbox, KpiCard, Skeleton, Avatar (initials fallback), Pagination, VisuallyHidden, SkipLink. Each keyboard accessible with visible focus, each with a Vitest and Testing Library test.
3. Layout: Header with logo, the 8 core links, language switcher, LinkedIn icon and a persistent Apply now button (mobile menu with focus trap); Footer with sitemap, newsletter, privacy, credits, LinkedIn and the sample data notice. Landmarks and a skip link.
4. Router with lazy loaded routes for every page in section 11 (stub pages for now), a NotFound page, react-helmet-async titles and descriptions, scroll restoration, focus moved to the page heading on navigation.
5. src/api/client.ts (typed fetch, problem+json errors, base URL from VITE_API_URL) and a TanStack Query provider. i18n setup with en.json, fr.json and a /fr URL prefix. All text via i18n keys.

Done when: the site shell works on a 360px wide screen, axe reports no violations on the shell, tests pass.
```

### Prompt 12: Home page

```
Read #file:docs/SPEC.md section 11 (Home) and #codebase.

Build the Home page from live API data, with skeleton loaders and error states:
1. Hero: clear headline about training learners across Africa and connecting them to online work (copy in en.json, marked TODO for Konexio to approve), primary Apply now button linking to /get-involved#apply, secondary Express interest button.
2. Impact glimpse: ONE key figure, learners trained, from GET /impact/summary, animated count-up that respects prefers-reduced-motion, a visible as of date, a Live badge, a link to /impact. Subscribe to /impact/stream with EventSource and fall back to polling every 60 seconds; announce changes politely with aria-live and no layout shift. Also show graduates and the percent employed or freelancing as small secondary figures.
3. How it works in 3 steps, the 11 pathways as cards linking to /alumni?pathway=Pn, 4 featured alumni from /alumni (rotate using a deterministic daily seed), partner logos from /partners, a newsletter strip linking to /newsletter, a LinkedIn block.
4. Lazy load everything below the fold, optimise images, set title and description.

No hard-coded numbers anywhere in the component. Tests: the glimpse renders the API value, updates when an SSE message arrives, and shows an error state when the API fails.
```

### Prompt 13: About, Programmes and Konexio Team pages

```
Read #file:docs/SPEC.md section 11 and #codebase.

1. About: mission, who Konexio Africa and the Digi Pass programme are, countries served (from /impact/locations), values. Use only facts from the brief and the data; any other copy is a visible TODO placeholder in en.json, never invented numbers or quotes. Include the partner wall.
2. Programmes: Part I as an Accordion (M0 to M5 with duration and submodules from /programmes/modules); Part II as a grid of the 11 pathways with enrolled, completed, freelancing active and average days to first gig from /impact/pathways, each linking to the alumni filtered by that pathway; a course catalog preview section; a Moodle learner login link rendered only when the build flag VITE_FEATURE_MOODLE_LINK is true, with a comment and a note in docs/SECURITY.md that a public link must first be confirmed with Konexio; a strong Apply now call to action.
3. Konexio Team: cards with photo (avatar fallback), name, job title, short bio, LinkedIn link and a Contact button that opens /contact?topic=... mapped by role. No email addresses anywhere. Add a test that fails if any at sign appears in the rendered page.

All text via i18n keys, all images with meaningful alt text, headings in order.
```

### Prompt 14: Impact dashboard page with map

```
Read #file:docs/SPEC.md sections 7.2 and 11 (Impact), and #codebase.

Build /impact:
1. KPI cards (learners trained, graduates, employed or freelancing and its percent, women percent, countries, cohorts, employer partners) from /impact/summary, live through SSE, with as of date and data source line.
2. Geographic view: react-leaflet map with OpenStreetMap tiles and attribution, circle markers sized by learners_trained for the 7 locations, popup with the location figures, the map loaded lazily. Directly beside or below it an accessible table of the same data (city, country, learners, graduates, employed percent, women percent) that is sortable by keyboard, and marker focus that matches table rows. The table is the primary accessible alternative, not hidden.
3. Charts with Recharts: learners by pathway (bar), yearly trend 2022 to 2026 (line) with 2026 labelled year to date, women percent by location. Every chart has a text summary and a data table toggle.
4. A Download data button producing CSV from the API data.
5. A route /impact/embed with just the KPI cards and map, minimal chrome, intended to be embedded in iframes, with correct frame-ancestors handling documented in docs/SECURITY.md.
6. Mobile layout at 360px: the map and the table stack, touch targets at least 44px.

Tests: totals equal the API totals; the table has 7 rows; a new SSE event updates the cards; axe has no violations.
```

### Prompt 15: Alumni directory and profile pages

```
Read #file:docs/SPEC.md sections 7.3 and 11 (Alumni), and #codebase.

1. /alumni: filter bar (pathway select, country select, availability select, skill text, free text search) with state stored in the URL query string so filtered lists are shareable; results grid of cards (photo or initials avatar, name, city and country, pathway badge, 2-line bio, skills, availability badge); pagination; empty state; result count announced with aria-live.
2. /alumni/:id profile page: photo or an intro video player (poster image, no autoplay, controls, captions track with a placeholder VTT), full bio, skills, languages, portfolio title with portfolio image and link, personal website link (fall back to LinkedIn), availability, and a clear Contact this alumnus button that opens the Express Interest form pre-filled with interest_type alumni and the id. Related alumni in the same pathway at the bottom.
3. Never request or show a photo when photo_url is null; show the initials avatar. 404 page for unknown or non-public ids (ALU-14 must show not found).
4. External links open with rel noopener noreferrer and an indication they leave the site.
5. A compact AlumniEmbedCard component reusable on Home and in pathway sections, and JSON-LD Person markup is NOT added (privacy).

Tests: filtering by P3 shows 2 cards; ALU-19 shows no photo; ALU-14 route shows not found; the contact button navigates to the form with the alumnus selected.
```

### Prompt 16: Express Interest form, Get Involved and Contact pages

```
Read #file:docs/SPEC.md sections 7.1, 7.5 and 11, and #codebase.

1. ExpressInterestForm component per section 11: fields, dynamic alumni autocomplete (public alumni only) or pathway select, 1,500 character counter, the optional consent checkbox with plain explanation of what happens if unticked, hidden honeypot named website_url (off-screen, aria-hidden, tabindex -1, autocomplete off), form token from /form-token, client validation with zod, server error mapping, double submit protection. On success replace the form with a confirmation panel showing the reference, what happens next and the 3 working days response time, focus moved to it. Read the alumnus or pathway from the URL to pre-fill.
2. /get-involved with anchored sections: Apply (strong call to action, the application form embedded in an iframe from VITE_APPLICATION_FORM_URL with a title, loading placeholder and an open in new tab fallback link), Employers and clients, Donors and partners, the Express Interest form, partners wall.
3. /contact: topic select, name, email, message, consent, honeypot, token, confirmation panel. No email or phone number anywhere; say that messages are answered through the form.
4. Analytics events interest_submit, contact_submit, apply_click through a single track() helper that is a no-op when analytics is not configured.

Tests: honeypot is not visible to a keyboard user; required field errors are announced; success state shows for both a normal and a spam-simulated response identically; an interest link from an alumni profile pre-selects that alumnus.
```

### Prompt 17: Newsletter, Annual reports, Privacy, LinkedIn and Credits pages

```
Read #file:docs/SPEC.md sections 7.4, 7.6, 9 and 11, and #codebase.

1. /newsletter: two separate sign-up cards (alumni, donors and partners) each with its own consent sentence from the spec, email field, honeypot and token; links to the sample issue for each list rendered in an iframe or modal; pages /newsletter/confirmed and /newsletter/unsubscribed.
2. /reports and /reports/:year: list cards, then a year page with the vision statement, metric cards, a link to related impact figures, a Download PDF button (/reports/:year/pdf, with a file size and format note) and the full on-page version. Clearly note that 2026 figures are year to date and not a report.
3. /privacy: notice written from section 9 with the consent text versions, retention, rights and how to exercise them by the Contact form. Mark legal review needed in a visible TODO for Konexio.
4. LinkedIn: VITE_LINKEDIN_URL linked in the header and footer, share buttons on reports and alumni-free pages (share URL links, not third-party scripts), and a LinkedIn follow or post embed in the Home and Get Involved pages loaded only after the visitor clicks Load LinkedIn content (privacy).
5. /credits listing every image, font, icon, template and library from docs/CREDITS.md.

Tests: subscribing in one card sends only that list in the request; PDF link points at the right year; no email appears in any of these pages.
```

### Prompt 18: Search and chatbot UI

```
Read #file:docs/SPEC.md section 10 and #codebase.

1. A global search dialog (button in the header and the / key) calling GET /search, grouped results (Alumni, Programmes, Pages), keyboard navigation with arrow keys and Escape, results announced to screen readers.
2. A chat widget (floating button, accessible dialog, not auto-opening) calling POST /chat with streaming-style typing indicator, visible AI-generated disclaimer, sources list with links under each answer, suggestions chips (How do I apply, Which pathways exist, How many learners have been trained), a clear conversation button, and an error state that points to the Contact page. Do not persist the conversation.
3. Rate limit and error messages are friendly. Respect reduced motion.
4. track() events chatbot_open and search_used.

Tests: keyboard only operation, sources rendered as links, error state, no conversation text stored in localStorage or sessionStorage.
```

### Prompt 19: Admin interface

```
Read #file:docs/SPEC.md sections 8 and 9 and #codebase.

Build /admin (not linked from the public navigation, noindex) with: login, 2FA setup with QR code and recovery codes, 2FA verification, and after login a dashboard plus tables and forms for alumni (including consent flags with a clear warning when withdrawing consent), team, partners, submissions (routing result and resend), newsletter subscribers, impact events (add event manually), outbound webhook endpoints and deliveries, security log and audit log. Respect roles: hide actions the role cannot perform, but rely on the server for enforcement. Handle CSRF tokens, session timeout with a warning, and never display secrets after creation.

Tests: an unauthenticated visit redirects to login, an editor cannot see the webhook secrets screen, withdrawing consent makes the profile disappear from /alumni.
```

### Prompt 20: Security hardening

```
Read #file:docs/SPEC.md section 9 and #codebase. Act as a security reviewer first, then fix.

1. Produce docs/SECURITY.md: a checklist table of every control in section 9 with status (done, partial, missing), the file that implements it and the test that proves it.
2. Fix every gap. At minimum: security headers middleware with a Content-Security-Policy whose allow-list is exactly the embeds we use (OpenStreetMap tiles, the video host, the application form host, LinkedIn only after click), HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy; strict CORS to PUBLIC_SITE_URL; request body size limits; slowapi rate limits per the spec; log redaction so no emails appear in logs; salted hashing of IP and user agent; cookie flags; uniform login errors; 404 for non-public alumni.
3. Add tests: header test for every response type, a test that scans all public responses and the built frontend bundle for the at sign and known mailboxes, a spam fixture test, an SSRF test for webhook destinations, a brute-force login test.
4. Run pip-audit and npm audit and list findings.
5. Add a data erasure script and admin action that removes an alumnus from Postgres, the outbox and ChromaDB, with tests.

Do not weaken any existing check to make a test pass.
```

### Prompt 21: Accessibility, performance, analytics and French

```
Read #file:docs/SPEC.md section 11 and #codebase.

1. Accessibility audit: run axe-core with Playwright on every page at 360px and 1280px, test keyboard-only navigation of the menu, tabs, filters, map table, forms, chat and search, check colour contrast, add missing alt text, check focus order and visible focus, and add reduced motion handling. Write docs/ACCESSIBILITY.md with the findings, fixes and the remaining known issues. Fix everything with serious or critical impact.
2. Performance: Lighthouse CI budgets (mobile, throttled 4G) with scores of at least 90, initial JS under 200 KB gzip, route splitting, lazy map and charts, responsive WebP or AVIF with width and height, font subsetting and preload, no layout shift. Record before and after numbers in docs/PERFORMANCE.md for the before and after write-up.
3. Analytics: add a privacy-friendly analytics script loaded only when VITE_ANALYTICS_URL is set, implement the track() helper and the events from section 11, with no personal data in properties. Describe in docs/PRIVACY_NOTES.md what is collected.
4. French: complete fr.json for Home, Programmes, Impact, Get Involved, Express Interest, Newsletter and Privacy, a language switcher that keeps the current page, hreflang tags, html lang updates. Flag every French string in a review list file for a native speaker.
```

### Prompt 22: End-to-end tests

```
Read #file:docs/SPEC.md sections 2, 7 and 9 and #codebase.

Write Playwright tests that run against docker compose with seeded data and Mailpit:
1. Live impact: open Home, run scripts/simulate_live_updates.py, assert the learners figure becomes 1,275 without a reload; Impact page shows 7 map markers and table rows.
2. Express interest: submit as Employer for pathway P3 and assert the confirmation panel; read Mailpit and assert emails to ALU-05, ALU-16, the Alumni Community Manager, the Partnerships Lead and the sender acknowledgement, and none to others.
3. Spam: submit with the honeypot filled; the user sees success; Mailpit has no new message; security log has the entry.
4. Consent: ALU-14 is absent from the alumni list and search and gives not found; ALU-19 has the initials avatar.
5. Newsletter: double opt-in for both lists, then unsubscribe, then confirm no further mail.
6. Admin: login with 2FA, withdraw consent for an alumnus, confirm the public page disappears.
7. Privacy sweep: crawl every public page and assert there is no at sign or phone number pattern.
8. Accessibility smoke: axe on every route.

Add the suite to CI.
```

### Prompt 23: Production deployment and HTTPS

```
Read #file:docs/SPEC.md sections 4 and 9 and #codebase.

Create docker-compose.prod.yml and a Caddyfile: Caddy serving the built frontend with gzip and brotli, long cache for hashed assets, SPA fallback, /api proxied to the API, automatic HTTPS for DOMAIN from env, HTTP to HTTPS redirect, HSTS. Multi-stage Dockerfiles with non-root users and no dev dependencies, health checks, resource limits, Postgres and Chroma volumes with a documented backup command, Alembic migration run on deploy, secrets passed by env file not baked into images. Add docs/DEPLOY.md with steps for a small VPS (any provider) including DNS, firewall (only 80 and 443), first admin creation, running seed, running the sheet sync, and a post deploy smoke test script that checks HTTPS, headers, /health and one public page. Also a GitHub Actions deploy workflow template using secrets.
```

### Prompt 24: Documentation and the before and after write-up

```
Read #file:docs/SPEC.md and #codebase.

Write: README.md (what it is, architecture picture in Mermaid, run, test, seed, simulate live data, deploy); docs/CREDITS.md complete and accurate (check every asset and dependency); docs/BEFORE_AFTER.md as a short, plain-language explanation of what the team improved and why, in these sections: Clarity, Accessibility, Speed, Storytelling, Trust. Use measured numbers from docs/PERFORMANCE.md and docs/ACCESSIBILITY.md and leave clearly marked blanks (TEAM TO FILL IN) for the before state of the current Konexio website, because we have not measured it yet. Do not invent any figures. Also write docs/PRESENTATION_NOTES.md listing, per feature, the file that implements it and the 3 questions a judge is most likely to ask with short honest answers, and a section called AI use that lists where AI generated code and how we fact-checked it.
```

## 14. Suggested team split, so everyone can speak about their part

| Person | Owns | Prompts |
| --- | --- | --- |
| 1 Data and backend lead | Schema, seed, content APIs, impact engine | 0 to 3 |
| 2 Integrations | Webhooks in and out, sheet sync, Make or Zapier scenarios, email and outbox | 4, 5, 9 |
| 3 Security and privacy | Routing consent rules, auth and 2FA, hardening, privacy page | 7, 20, 17 (privacy) |
| 4 AI and search | ChromaDB, search, chatbot, French content | 8, 18, 21 (French) |
| 5 Frontend lead | Design system, Home, Programmes, About, Team | 11 to 13 |
| 6 Frontend features | Impact dashboard, Alumni, forms, newsletter, reports | 14 to 17, 10 |
| 7 Quality and delivery | Tests, accessibility, performance, deploy, documentation | 19, 21, 22 to 24 |

Adjust to your team size. Each person demonstrates the demo script for their prompts and explains the main decisions.

## 15. Definition of done

- All 10 must-haves work end to end on a phone-sized screen and in production over HTTPS.
- Simulated live updates change the Home glimpse and the Impact page without a reload.
- All 15 sample submissions route as in section 7.1.
- No email address or phone number is visible anywhere on the public site or in any public response.
- ALU-14 is never public, indexed or notified; ALU-19 never shows a photo.
- Two newsletter lists, double opt-in, separate sample issues.
- At least three embeds work and fall back gracefully.
- Tests, CI, Lighthouse and axe results are recorded in the docs.
- docs/CREDITS.md covers every asset, and the before and after write-up has the real numbers filled in.

## 16. Questions to confirm with Konexio before launch

1. Is a public Moodle login link or catalog preview appropriate (the brief says to confirm first)?
2. What is the official LinkedIn handle and brand guide (colours, logo files, fonts)?
3. Which application form (Google Forms, Typeform or other) and its URL?
4. Which source will hold the live impact numbers (Google Sheet or Airtable), and who updates it?
5. Do alumni who are notified receive the sender's email directly, or should replies go through Konexio?
6. Retention period for submissions and newsletter data, and legal review of the privacy notice for each country served.
7. Are the alumni intro videos covered by the same consent as photos?
8. Which email service will send the mail in production (SMTP provider, sending domain with SPF, DKIM and DMARC)?

## 17. Hosting on Vercel (frontend) and Render (backend)

Vercel serves the React build, Render runs the FastAPI API, the background worker and PostgreSQL, and Vercel forwards /api to Render so the browser sees one origin. This replaces Caddy, the ChromaDB container and Prompt 23. Render plan limits and prices change, so confirm them on render.com/pricing before you commit.

### 17.1 Target topology

| Piece | Where | Notes |
| --- | --- | --- |
| React build (Vite) | Vercel, Git integration, preview deployment per pull request | Static files, so no server code on Vercel. Only VITE\_ variables, which are public, so never put secrets in them |
| FastAPI API | Render Web Service, Docker | Health check path /api/v1/health, auto-deploy from main |
| Outbox, sheet sync, webhook delivery | Render Background Worker, or an in-process task (flag RUN\_WORKERS\_IN\_PROCESS) | Render has no free worker type; the cheapest is the same price as the smallest paid web instance |
| PostgreSQL 16 | Render Postgres, same region as the API, internal connection URL | Free databases expire after a limited period, so use a paid one for anything beyond the demo and enable backups |
| ChromaDB | **Embedded inside the API** (PersistentClient at CHROMA\_PATH), no separate service | The index is derived from Postgres, so the API rebuilds it at start-up if empty. A paid persistent disk is optional and only saves the rebuild time |
| Email | A transactional provider (Brevo, Resend, Postmark or similar) over SMTP or API | Mailpit stays in development only. Set up SPF, DKIM and DMARC on the sending domain |
| Webhooks in | Make, Zapier or Apps Script call the Render API URL directly | Not through Vercel |
| Static media and PDFs | Placeholders in frontend/public (Vercel). PDFs are generated by the API on demand | Render disks are not persistent by default, so nothing user-uploaded is stored on the API |

### 17.2 What changes in the spec

| Topic | Change |
| --- | --- |
| HTTPS | Both platforms issue certificates automatically. Add HSTS and the security headers in vercel.json for the site and in FastAPI middleware for the API. Caddy is dropped |
| API routing and cookies | Vercel rewrites /api/:path\* to the Render service. The admin cookie (HttpOnly, Secure, SameSite=Lax) and CSRF then work because the browser stays on one origin. Do not rely on a vercel.app page talking to an onrender.com API with cookies, because that is cross-site and breaks. If you prefer separate hostnames, use two subdomains of one domain (www and api) and set the cookie domain |
| Live stream (SSE) | The browser connects straight to VITE\_STREAM\_URL on Render, with CORS allowing only PUBLIC\_SITE\_URL, because long-lived streams through a rewrite may be cut. The stream is public and cookie-free. Keep the 20 second heartbeat and the polling fallback. Test it on the deployed site |
| Client IP | Behind Vercel and Render every request arrives from a proxy. Run uvicorn with proxy headers on, trust only those proxies, and use the original client address from X-Forwarded-For for rate limits, salted IP hashes and Turnstile. If you skip this, all visitors share one rate limit bucket and get blocked together |
| CORS | Allow PUBLIC\_SITE\_URL and VITE\_STREAM\_URL consumers only. Vercel preview URLs are allowed only in a non-production environment |
| CSP | connect-src includes the API and stream origin. frame-src keeps the embed allow-list. Use the same policy text in vercel.json and the API |
| Cold starts | Free Render web services sleep after about 15 minutes idle and take around a minute to wake. For a demo or judging day use the paid always-on instance, or ping /api/v1/health every 10 minutes from a monitor. The frontend shows a friendly loading and retry state and, for the Home impact glimpse, a last-known snapshot labelled with its as of date while the API wakes. The snapshot is a build-time cache of the API, not hard-coded text |
| Background work | Sheet sync can be a Render Cron Job running the sync once every 5 minutes, or run in-process. Outbox and outbound webhooks run in the worker. A sleeping free web service delays emails, another reason to pay for always-on |
| Embeddings and memory | The multilingual model needs far more memory than a 512 MB instance. Use EMBEDDING\_PROVIDER: onnx\_default (small, ships with Chroma, best for English, pre-downloaded in the Docker build), multilingual\_local (needs a 2 GB instance), or api (a hosted embedding API). Start with onnx\_default and judge French results before upgrading |
| Migrations | Run alembic upgrade head before the new version starts: a pre-deploy command if your plan supports it, otherwise at the start of the start command |
| Secrets | Render environment variables or an env group, marked not synced in the Blueprint. Vercel holds only public VITE\_ values. Rotate WEBHOOK\_SHARED\_SECRET and SESSION\_SECRET if ever shared |
| Region | Pick the Render region nearest your users and put the database in the same one, then measure latency from Nairobi and Lagos |

### 17.3 vercel.json (starting point)

```
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://YOUR-API.onrender.com/api/:path*" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    }
  ]
}
```

Add the Content-Security-Policy header after Prompt 20 produces the final allow-list. The /impact/embed route needs a different frame-ancestors value from the rest of the site.

### 17.4 render.yaml (Blueprint sketch, check against current Render docs)

```
services:
  - type: web
    name: konexio-api
    runtime: docker
    dockerfilePath: ./backend/Dockerfile
    dockerContext: ./backend
    healthCheckPath: /api/v1/health
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: konexio-db
          property: connectionString
      - key: SESSION_SECRET
        generateValue: true
      - key: WEBHOOK_SHARED_SECRET
        sync: false
      - key: SMTP_PASSWORD
        sync: false
      - key: PUBLIC_SITE_URL
        sync: false
      - key: CHROMA_PATH
        value: /app/chroma_data
      - key: RUN_WORKERS_IN_PROCESS
        value: "true"
  - type: worker
    name: konexio-worker
    runtime: docker
    dockerfilePath: ./backend/Dockerfile
    dockerContext: ./backend
    dockerCommand: python -m app.workers.run_all
databases:
  - name: konexio-db
    databaseName: konexio
```

If you run the worker as its own service, set RUN\_WORKERS\_IN\_PROCESS to false on the web service so jobs do not run twice.

### 17.5 Prompt 0b: Adapt the scaffold for Vercel and Render (run right after Prompt 0)

```
Read #file:docs/SPEC.md section 17 and #codebase. Prompt 0 is already done; adjust it for hosting on Vercel (frontend) and Render (backend). Do not add features.

1. Remove Caddy and the separate chroma service from the production setup. ChromaDB now runs embedded: use chromadb.PersistentClient(path=CHROMA_PATH) behind a small services/search.py factory. Keep docker-compose.yml for local development only (postgres, mailpit, api, web) and remove the chroma service from it too.
2. Config: add CHROMA_PATH, EMBEDDING_PROVIDER (onnx_default, multilingual_local, api), RUN_WORKERS_IN_PROCESS, PUBLIC_SITE_URL, VITE_STREAM_URL, and ENVIRONMENT (development, preview, production) to config.py and .env.example. Validate that production refuses to start with default secrets.
3. Backend/Dockerfile for Render: multi-stage, non-root user, listens on the PORT environment variable, runs uvicorn with --proxy-headers and a trusted forwarded IP setting, pre-downloads the embedding model at build time when EMBEDDING_PROVIDER is onnx_default.
4. Client IP: a dependency get_client_ip() that takes the left-most address from X-Forwarded-For only when the request comes from a trusted proxy, used by rate limits, IP hashing and Turnstile. Add tests with and without the header.
5. Start-up: run alembic upgrade head, then an optional background task that rebuilds ChromaDB if the collections are empty (leave the function as a stub for Prompt 8). Start the outbox and sheet-sync loops in-process only when RUN_WORKERS_IN_PROCESS is true, and add app/workers/run_all.py for a separate worker.
6. CORS: allow only PUBLIC_SITE_URL (plus Vercel preview origins when ENVIRONMENT is not production).
7. Create vercel.json (rewrites, headers, caching) and render.yaml exactly as in section 17.3 and 17.4, with comments marking every value I must replace. Add VITE_STREAM_URL support in the frontend API client (the SSE URL is separate from the proxied /api base).
8. Update README and .env.example with a table of which variable lives on Vercel and which on Render.

Done when: the API starts locally without Chroma or Caddy, tests pass, and the frontend builds with npm run build.
```

Also add this rule to .github/copilot-instructions.md: **Hosting: frontend on Vercel (static, public VITE\_ variables only), backend on Render (Docker, Postgres, embedded ChromaDB, worker). Read docs/SPEC.md section 17 before touching deployment, CORS, cookies, rate limits or the SSE stream.**

### 17.6 Prompt 8 addendum (paste at the end of Prompt 8)

```
Hosting change: ChromaDB is embedded (PersistentClient at CHROMA_PATH), not an HttpClient. Make reindex_all() idempotent and fast, call it at start-up when the collections are empty, and expose it through POST /admin/reindex. Choose the embedding function from EMBEDDING_PROVIDER (onnx_default by default). Store the chosen provider in the collection metadata and rebuild if it changes. Add a test that deleting the Chroma folder and restarting restores identical search results.
```

### 17.7 Prompt 23 (replacement): Deploy to Vercel and Render

```
Read #file:docs/SPEC.md sections 9 and 17 and #codebase. Ignore any earlier Caddy instructions.

1. Finalise vercel.json (rewrites, HSTS and security headers, long cache for hashed assets, CSP from docs/SECURITY.md, a separate frame-ancestors rule for /impact/embed) and render.yaml (web service, worker, database, health check, env var groups, secrets not synced).
2. Write docs/DEPLOY.md with exact steps: create the Render Postgres and API from the Blueprint, set the secrets, run the seed once (a one-off job or shell), create the first admin with scripts/create_admin.py, import the repo into Vercel with the frontend as root directory, set VITE_ variables, point the vercel.json rewrite at the Render URL, add custom domains, set PUBLIC_SITE_URL and CORS on Render, configure the email provider and DNS records (SPF, DKIM, DMARC), create the Make or Zapier scenario against the Render webhook URL, and set up a free uptime monitor pinging /api/v1/health.
3. scripts/smoke_test.py that takes the site URL and checks: HTTPS and HSTS, security headers, /api/v1/health through the Vercel rewrite, one public page, /api/v1/impact/summary, an SSE connection receiving the first event from the Render URL, an admin cookie flow on the same origin (Set-Cookie flags Secure, HttpOnly, SameSite=Lax), a rate limit that applies per visitor and not to every visitor at once, and that no at sign appears in public responses.
4. A GitHub Actions workflow: tests on pull requests, Vercel handles preview deploys, Render auto-deploys main only when CI is green, and the smoke test runs against production after deploy.
5. Frontend resilience: retry with backoff and a friendly waking up message for the first request, and the labelled last-known snapshot of /impact/summary stored at build time for the Home glimpse while the API is asleep.

Do not hard-code the Render URL anywhere except vercel.json and docs.
```
