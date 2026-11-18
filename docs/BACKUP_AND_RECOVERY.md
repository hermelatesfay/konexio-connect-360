# Backup and Disaster Recovery Guide

## 1. Architecture Overview
Konexio Africa (`konexio-connect-360`) persists structured application state and uploaded media binaries inside a managed Google Cloud SQL for PostgreSQL instance (`ai-studio-32a4e203`, region `europe-west2`):
- **Relational Records**: 23 normalized PostgreSQL tables defined in `src/db/schema.ts` (users, roles, TOTP MFA secrets/recovery codes, password reset tokens, pathways, modules, locations, annual reports, impact stories, team members, partners, alumni profiles, learner progress, express interest submissions, contact messages, newsletter subscriptions, consent records, notifications, impact events, audit logs, and platform settings).
- **Binary File Storage**: User-uploaded alumni photos, portfolio assets, and partner documents are stored inside the `uploaded_files` table (`data_base64`, `mime_type`, `size_bytes`, `is_public`), meaning database backups automatically include uploaded assets without split-brain drift between SQL records and disk files.

## 2. Automated Backups & Point-in-Time Recovery (GCP Console)
Because this applet provisions a Developer-edition Cloud SQL PostgreSQL instance, production disaster-recovery guarantees require enabling automated backups and WAL archiving in Google Cloud Console:
1. Open **Google Cloud Console -> SQL -> Instances -> `ai-studio-32a4e203`**.
2. Navigate to **Backups -> Edit configuration**:
   - Enable **Automated daily backups** and select a maintenance/backup window off-peak (e.g., `02:00 UTC`).
   - Set retention to at least **7–30 backups**.
   - Enable **Point-in-time recovery (PITR)** with write-ahead logging (WAL) retention of **7 days**.
3. Optionally configure **Cross-region backup replication** if compliance requires off-region redundancy outside `europe-west2`.

## 3. Manual Export & Logical Verification (`pg_dump` / `pg_restore`)
Before performing schema migrations or major production operations, export a consistent snapshot via Cloud SQL Auth Proxy:
```bash
# 1. Start Cloud SQL Auth Proxy in a secure workstation session
cloud-sql-proxy imposing-stone-wq7xb:europe-west2:ai-studio-32a4e203 --port 5432

# 2. Export full schema + data in custom compressed format
pg_dump -h 127.0.0.1 -p 5432 -U <POSTGRES_USER> -d <POSTGRES_DB> -Fc -f konexio_backup_$(date +%Y%m%d_%H%M%S).dump
```

To restore into a staging database for drill verification:
```bash
pg_restore -h 127.0.0.1 -p 5432 -U <POSTGRES_USER> -d <TARGET_DB> --clean --if-exists konexio_backup_YYYYMMDD_HHMMSS.dump
```

## 4. Soft-Delete / Logical Recovery
Sensitive entities (`users`, `alumni_profiles`, `partners`) use soft archival (`archived_at`) rather than hard `DELETE` statements.
- Accidental partner archival (`status = 'archived'`) can be reversed cleanly from PostgreSQL or the Administrator Console without losing linked consent logs, audit history, or express-interest submissions.
- Consent changes on alumni profiles (`consent_to_publish`, `consent_to_show_photo`) and newsletter lists are append-logged in `consent_records` and `audit_logs` for traceability.

## 5. Honest Operational Notes & Current Limitations
- **Automated GCP Backups & PITR**: Must be verified/enabled by the project owner in Google Cloud Console; the application server does not schedule `pg_dump` cron jobs itself.
- **Email Delivery**: Password reset tokens (`password_reset_tokens`) and routing alerts are persisted in PostgreSQL, and account notifications appear in-app; outbound transactional SMTP/SendGrid dispatch is not configured in this deployment and requires an external mail provider if email delivery is desired.
