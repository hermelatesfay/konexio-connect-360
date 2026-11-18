import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Archive,
  ArrowUpDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  FileCheck2,
  History,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import {
  ApiError,
  fetchAdminOverview,
  recordAdminImpactEvent,
  updateAdminAlumnus,
  updateAdminPartner,
  updateAdminPathway,
  updateAdminUserRole,
} from '../api';
import SecuritySettingsPanel from '../components/SecuritySettingsPanel';
import { useAuthStore } from '../store/authStore';
import type { ImpactSummary, LocationImpact, UserRole } from '../types';

type AdminPageProps = {
  onNavigate: (path: string) => void;
};

type AdminOverviewPayload = {
  summary: ImpactSummary;
  counts: {
    users: number;
    alumni_total: number;
    alumni_public: number;
    partners_total: number;
    partners_pending: number;
    submissions_total: number;
    contact_messages: number;
    newsletter_subscribers: number;
  };
  users: Array<{
    id: number;
    first_name: string;
    second_name: string;
    email: string;
    role: UserRole;
    is_active?: boolean;
    linked_business_id: string | null;
  }>;
  alumni: Array<{
    business_id: string;
    first_name: string;
    last_name: string;
    city: string;
    country: string;
    pathway_code: string;
    availability: string;
    consent_to_publish: boolean;
    consent_to_show_photo: boolean;
    is_active: boolean;
  }>;
  partners: Array<{
    business_id: string;
    organisation: string;
    type: string;
    country: string;
    show_on_site: boolean;
    status: string;
  }>;
  submissions: Array<{
    business_id: string;
    submitted_at: string;
    full_name: string;
    organisation: string | null;
    visitor_type: string;
    interest_type: string;
    interest_value: string | null;
    consent_to_be_contacted: boolean;
    status: string;
    notified_alumni_ids: string[];
    notified_roles: string[];
  }>;
  contacts: Array<{
    id: number;
    reference_id?: string;
    name: string;
    visitor_category?: string;
    topic: string;
    routed_to_role: string;
    status?: string;
    message: string;
    created_at: string;
  }>;
  subscribers: Array<{
    id: number;
    list: string;
    status: string;
    consent_date: string;
    consent_text_version: string;
  }>;
  impact_events: Array<{
    event_id: string;
    metric: string;
    location_city: string;
    change: number;
    description: string;
    occurred_at: string;
  }>;
  locations: LocationImpact[];
  pathways?: Array<{
    code: string;
    name: string;
    status: 'Available' | 'Completed';
    is_active: boolean;
    learners_enrolled: number;
  }>;
  consent_records?: Array<{
    id: number;
    subject_type: string;
    consent_scope: string;
    granted: boolean;
    source: string;
    notes: string;
    created_at: string;
  }>;
  audit_logs?: Array<{
    id: number;
    actor_email: string;
    action: string;
    target_type: string;
    target_id: string;
    details: Record<string, unknown>;
    created_at: string;
  }>;
};

type ConfirmDialogState = {
  title: string;
  message: string;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  onConfirm: () => Promise<void>;
};

const ASSIGNABLE_ROLES: UserRole[] = [
  'learner',
  'alumni',
  'employer',
  'partner',
  'donor',
  'admin',
];

const PAGE_SIZE = 10;

function maskEmailAddress(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const [local, domain] = parts;
  const visible = local.length <= 2 ? local[0] ?? '*' : `${local.slice(0, 2)}***`;
  return `${visible}@${domain}`;
}

const AdminPage = ({ onNavigate }: AdminPageProps) => {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const isVerifiedAdmin = Boolean(
    isAuthenticated && token && user?.role === 'admin' && user?.aal === 'aal2',
  );

  const [tab, setTab] = useState<
    | 'overview'
    | 'alumni'
    | 'partners'
    | 'submissions'
    | 'pathways'
    | 'governance'
    | 'users'
    | 'security'
  >('overview');
  const [overview, setOverview] = useState<AdminOverviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const loading = isVerifiedAdmin && !overview && !error;

  // Confirmation modal state
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  // Table search, filters, sorting, and pagination
  const [alumniSearch, setAlumniSearch] = useState('');
  const [alumniConsentFilter, setAlumniConsentFilter] = useState<'all' | 'public' | 'private'>('all');
  const [alumniSortAsc, setAlumniSortAsc] = useState(true);
  const [alumniPage, setAlumniPage] = useState(1);

  const [partnerSearch, setPartnerSearch] = useState('');
  const [partnerStatusFilter, setPartnerStatusFilter] = useState<'all' | 'approved' | 'pending_review' | 'archived'>('all');
  const [partnerPage, setPartnerPage] = useState(1);

  const [submissionSearch, setSubmissionSearch] = useState('');
  const [submissionPage, setSubmissionPage] = useState(1);

  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [userPage, setUserPage] = useState(1);

  const [governanceSearch, setGovernanceSearch] = useState('');
  const [auditPage, setAuditPage] = useState(1);
  const [consentPage, setConsentPage] = useState(1);

  // Fresh TOTP challenge for sensitive role reassignment
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    userId: number;
    email: string;
    role: UserRole;
  } | null>(null);
  const [roleTotpCode, setRoleTotpCode] = useState('');
  const [roleUpdating, setRoleUpdating] = useState(false);

  // Live impact event form
  const [metric, setMetric] = useState<
    'learners_trained' | 'graduates' | 'employed_or_freelancing' | 'employer_partners'
  >('graduates');
  const [city, setCity] = useState('Nairobi');
  const [change, setChange] = useState(1);
  const [description, setDescription] = useState('');
  const [submittingEvent, setSubmittingEvent] = useState(false);

  const loadOverview = async (authToken: string) => {
    setError(null);
    try {
      const data = (await fetchAdminOverview(authToken)) as AdminOverviewPayload;
      setOverview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load administrator console.');
    }
  };

  useEffect(() => {
    if (!isVerifiedAdmin || !token) return;
    let active = true;
    fetchAdminOverview(token)
      .then((data) => {
        if (active) setOverview(data as AdminOverviewPayload);
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load administrator console.');
        }
      });
    return () => {
      active = false;
    };
  }, [isVerifiedAdmin, token]);

  const filteredAlumni = useMemo(() => {
    if (!overview) return [];
    const q = alumniSearch.trim().toLowerCase();
    return overview.alumni
      .filter((a) => {
        if (alumniConsentFilter === 'public' && !a.consent_to_publish) return false;
        if (alumniConsentFilter === 'private' && a.consent_to_publish) return false;
        if (!q) return true;
        return `${a.business_id} ${a.first_name} ${a.last_name} ${a.city} ${a.country} ${a.pathway_code}`
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) =>
        alumniSortAsc
          ? a.business_id.localeCompare(b.business_id)
          : b.business_id.localeCompare(a.business_id),
      );
  }, [overview, alumniSearch, alumniConsentFilter, alumniSortAsc]);

  const filteredPartners = useMemo(() => {
    if (!overview) return [];
    const q = partnerSearch.trim().toLowerCase();
    return overview.partners.filter((p) => {
      if (partnerStatusFilter !== 'all' && p.status !== partnerStatusFilter) return false;
      if (!q) return true;
      return `${p.business_id} ${p.organisation} ${p.type} ${p.country}`.toLowerCase().includes(q);
    });
  }, [overview, partnerSearch, partnerStatusFilter]);

  const filteredSubmissions = useMemo(() => {
    if (!overview) return [];
    const q = submissionSearch.trim().toLowerCase();
    return overview.submissions.filter((s) => {
      if (!q) return true;
      return `${s.business_id} ${s.full_name} ${s.organisation ?? ''} ${s.visitor_type} ${s.interest_value ?? ''}`
        .toLowerCase()
        .includes(q);
    });
  }, [overview, submissionSearch]);

  const filteredUsers = useMemo(() => {
    if (!overview) return [];
    const q = userSearch.trim().toLowerCase();
    return overview.users.filter((u) => {
      if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
      if (!q) return true;
      return `${u.id} ${u.first_name} ${u.second_name} ${u.email} ${u.role} ${u.linked_business_id ?? ''}`
        .toLowerCase()
        .includes(q);
    });
  }, [overview, userSearch, userRoleFilter]);

  const filteredAudits = useMemo(() => {
    const rows = overview?.audit_logs ?? [];
    const q = governanceSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      `${r.actor_email} ${r.action} ${r.target_type} ${r.target_id}`.toLowerCase().includes(q),
    );
  }, [overview?.audit_logs, governanceSearch]);

  const filteredConsents = useMemo(() => {
    const rows = overview?.consent_records ?? [];
    const q = governanceSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      `${r.subject_type} ${r.consent_scope} ${r.source} ${r.notes}`.toLowerCase().includes(q),
    );
  }, [overview?.consent_records, governanceSearch]);

  if (!isVerifiedAdmin || !token || !user) {
    const needsTwoFactor = Boolean(isAuthenticated && user?.role === 'admin' && user?.aal !== 'aal2');
    return (
      <section className="dashboard-shell">
        <div className="container" style={{ maxWidth: '640px' }}>
          <div className="form-panel">
            <div className="alert-box alert-error" style={{ marginBottom: '20px' }}>
              <ShieldAlert size={20} aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>
                  {needsTwoFactor
                    ? 'Two-Factor Verification (AAL2) Required'
                    : 'Access Restricted — Administrator Role Required'}
                </strong>
                <p style={{ margin: '6px 0 0' }}>
                  {needsTwoFactor
                    ? 'Your administrator account must complete authenticator verification before accessing governance, consent moderation, and user permissions.'
                    : 'Only authorised Konexio Africa administrators with verified two-factor authentication can access this console.'}
                </p>
              </div>
            </div>
            <div className="hero-actions" style={{ marginTop: 0 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  if (needsTwoFactor) logout();
                  onNavigate('/login');
                }}
              >
                {needsTwoFactor ? 'Verify with Two-Factor Sign In' : 'Sign In with Admin Account'}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => onNavigate('/')}>
                Return Home
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const runConfirmed = async () => {
    if (!confirmDialog) return;
    setConfirmBusy(true);
    try {
      await confirmDialog.onConfirm();
      setConfirmDialog(null);
    } finally {
      setConfirmBusy(false);
    }
  };

  const handleToggleAlumni = async (
    businessId: string,
    patch: { consent_to_publish?: boolean; consent_to_show_photo?: boolean; is_active?: boolean },
  ) => {
    setStatusNote(null);
    setError(null);
    try {
      await updateAdminAlumnus(token, businessId, patch);
      setStatusNote(`Updated consent/visibility settings for ${businessId}.`);
      await loadOverview(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed.');
    }
  };

  const handleUpdatePartner = async (
    businessId: string,
    patch: { show_on_site?: boolean; status?: string },
  ) => {
    setStatusNote(null);
    setError(null);
    try {
      await updateAdminPartner(token, businessId, patch);
      setStatusNote(`Updated partner status for ${businessId}.`);
      await loadOverview(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed.');
    }
  };

  const handleUpdatePathway = async (
    code: string,
    patch: { status?: 'Available' | 'Completed'; is_active?: boolean },
  ) => {
    setStatusNote(null);
    setError(null);
    try {
      await updateAdminPathway(token, code, patch);
      setStatusNote(`Updated pathway ${code} availability.`);
      await loadOverview(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update pathway.');
    }
  };

  const handleUpdateUserRole = async (
    userId: number,
    acctEmail: string,
    role: UserRole,
    totpCode?: string,
  ) => {
    setStatusNote(null);
    setError(null);
    setRoleUpdating(true);
    try {
      await updateAdminUserRole(token, userId, role, totpCode);
      setPendingRoleChange(null);
      setRoleTotpCode('');
      setStatusNote(`Updated account #${userId} permission role to ${role}.`);
      await loadOverview(token);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'FRESH_AUTH_REQUIRED') {
        setPendingRoleChange({ userId, email: acctEmail, role });
        setError(
          'Fresh two-factor verification is required to reassign user roles. Enter your 6-digit authenticator code below.',
        );
      } else {
        setError(err instanceof Error ? err.message : 'Unable to update user role.');
      }
    } finally {
      setRoleUpdating(false);
    }
  };

  const handleImpactSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmittingEvent(true);
    setStatusNote(null);
    setError(null);
    try {
      await recordAdminImpactEvent(token, {
        metric,
        location_city: city,
        change,
        description: description.trim(),
      });
      setDescription('');
      setStatusNote('Recorded live impact event and updated summary metrics in PostgreSQL.');
      await loadOverview(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to record impact event.');
    } finally {
      setSubmittingEvent(false);
    }
  };

  const alumniTotalPages = Math.max(1, Math.ceil(filteredAlumni.length / PAGE_SIZE));
  const pagedAlumni = filteredAlumni.slice((alumniPage - 1) * PAGE_SIZE, alumniPage * PAGE_SIZE);

  const partnerTotalPages = Math.max(1, Math.ceil(filteredPartners.length / PAGE_SIZE));
  const pagedPartners = filteredPartners.slice(
    (partnerPage - 1) * PAGE_SIZE,
    partnerPage * PAGE_SIZE,
  );

  const submissionTotalPages = Math.max(1, Math.ceil(filteredSubmissions.length / PAGE_SIZE));
  const pagedSubmissions = filteredSubmissions.slice(
    (submissionPage - 1) * PAGE_SIZE,
    submissionPage * PAGE_SIZE,
  );

  const userTotalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const pagedUsers = filteredUsers.slice((userPage - 1) * PAGE_SIZE, userPage * PAGE_SIZE);

  const auditTotalPages = Math.max(1, Math.ceil(filteredAudits.length / PAGE_SIZE));
  const pagedAudits = filteredAudits.slice((auditPage - 1) * PAGE_SIZE, auditPage * PAGE_SIZE);

  const consentTotalPages = Math.max(1, Math.ceil(filteredConsents.length / PAGE_SIZE));
  const pagedConsents = filteredConsents.slice(
    (consentPage - 1) * PAGE_SIZE,
    consentPage * PAGE_SIZE,
  );

  return (
    <section className="dashboard-shell">
      <div className="container">
        <div className="dashboard-header">
          <div>
            <span className="kicker">ADMINISTRATOR CONSOLE</span>
            <h1 className="page-title">Governance, Consent &amp; Live Impact</h1>
            <p className="card-copy" style={{ marginTop: '4px' }}>
              Signed in as {user.first_name} {user.second_name} ({maskEmailAddress(user.email)})
            </p>
          </div>

          <div className="segmented-control" role="tablist" aria-label="Administrator sections">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'overview'}
              className={`segmented-btn${tab === 'overview' ? ' is-active' : ''}`}
              onClick={() => setTab('overview')}
            >
              Overview
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'alumni'}
              className={`segmented-btn${tab === 'alumni' ? ' is-active' : ''}`}
              onClick={() => setTab('alumni')}
            >
              Alumni ({overview?.alumni.length ?? 0})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'partners'}
              className={`segmented-btn${tab === 'partners' ? ' is-active' : ''}`}
              onClick={() => setTab('partners')}
            >
              Partners ({overview?.partners.length ?? 0})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'submissions'}
              className={`segmented-btn${tab === 'submissions' ? ' is-active' : ''}`}
              onClick={() => setTab('submissions')}
            >
              Enquiries
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'pathways'}
              className={`segmented-btn${tab === 'pathways' ? ' is-active' : ''}`}
              onClick={() => setTab('pathways')}
            >
              Pathways ({overview?.pathways?.length ?? 0})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'governance'}
              className={`segmented-btn${tab === 'governance' ? ' is-active' : ''}`}
              onClick={() => setTab('governance')}
            >
              Consent &amp; Audit
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'users'}
              className={`segmented-btn${tab === 'users' ? ' is-active' : ''}`}
              onClick={() => setTab('users')}
            >
              Users ({overview?.users.length ?? 0})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'security'}
              className={`segmented-btn${tab === 'security' ? ' is-active' : ''}`}
              onClick={() => setTab('security')}
            >
              Security &amp; 2FA
            </button>
          </div>
        </div>

        {statusNote ? (
          <div className="alert-box alert-success" style={{ marginBottom: '20px' }}>
            <CheckCircle2 size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
            <span>{statusNote}</span>
          </div>
        ) : null}

        {error ? (
          <div
            className="alert-box alert-error"
            style={{
              marginBottom: '20px',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <span>{error}</span>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => void loadOverview(token)}
            >
              <RefreshCw size={14} aria-hidden="true" />
              Retry
            </button>
          </div>
        ) : null}

        {loading && !overview ? <p className="card-copy">Loading administrator workspace...</p> : null}

        {/* Overview & Live Impact Tab */}
        {overview && tab === 'overview' ? (
          <div style={{ display: 'grid', gap: '24px' }}>
            <div className="kpi-strip" style={{ marginTop: 0 }}>
              <div className="kpi-card">
                <span className="kpi-label">Learners Trained</span>
                <span className="kpi-value">{overview.summary.learners_trained.toLocaleString()}</span>
                <span className="kpi-sub">As of {overview.summary.as_of}</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-label">Graduates</span>
                <span className="kpi-value">{overview.summary.graduates.toLocaleString()}</span>
                <span className="kpi-sub">{overview.counts.alumni_public} public directory profiles</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-label">Employed or Freelancing</span>
                <span className="kpi-value">
                  {overview.summary.employed_or_freelancing.toLocaleString()}
                </span>
                <span className="kpi-sub">{overview.summary.employment_rate_pct}% employment rate</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-label">Employer Partners</span>
                <span className="kpi-value">{overview.summary.employer_partners}</span>
                <span className="kpi-sub">{overview.counts.partners_pending} pending review</span>
              </div>
            </div>

            <div className="grid-2" style={{ alignItems: 'start' }}>
              <div className="form-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Activity size={18} aria-hidden="true" style={{ color: 'var(--amber-ink)' }} />
                  <h2 className="card-title">Record Live Impact Event</h2>
                </div>
                <p className="card-copy" style={{ marginBottom: '16px' }}>
                  Log verified cohort graduations, placements, or employer partner onboarding to
                  update live impact summary counters.
                </p>

                <form onSubmit={handleImpactSubmit} style={{ display: 'grid', gap: '14px' }}>
                  <div className="form-grid-2">
                    <div className="field-group">
                      <label htmlFor="evt-metric">Metric</label>
                      <select
                        id="evt-metric"
                        className="select-control"
                        value={metric}
                        onChange={(e) =>
                          setMetric(
                            e.target.value as
                              | 'learners_trained'
                              | 'graduates'
                              | 'employed_or_freelancing'
                              | 'employer_partners',
                          )
                        }
                      >
                        <option value="learners_trained">Learners trained</option>
                        <option value="graduates">Graduates</option>
                        <option value="employed_or_freelancing">Employed or freelancing</option>
                        <option value="employer_partners">Employer partners</option>
                      </select>
                    </div>

                    <div className="field-group">
                      <label htmlFor="evt-city">Hub location</label>
                      <select
                        id="evt-city"
                        className="select-control"
                        value={city}
                        disabled={metric === 'employer_partners'}
                        onChange={(e) => setCity(e.target.value)}
                      >
                        {overview.locations.map((loc) => (
                          <option key={loc.business_id} value={loc.city}>
                            {loc.city}, {loc.country}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="field-group">
                      <label htmlFor="evt-change">Delta (+/-)</label>
                      <input
                        id="evt-change"
                        type="number"
                        className="input-control"
                        value={change}
                        onChange={(e) => setChange(Number(e.target.value))}
                        required
                      />
                    </div>
                    <div className="field-group">
                      <label htmlFor="evt-desc">Event audit description</label>
                      <input
                        id="evt-desc"
                        type="text"
                        className="input-control"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g. Cohort 19 verified placements"
                        required
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary" disabled={submittingEvent}>
                    {submittingEvent ? 'Recording event...' : 'Apply Impact Update'}
                  </button>
                </form>
              </div>

              <div className="card">
                <ShieldCheck size={20} aria-hidden="true" style={{ color: 'var(--green)' }} />
                <h2 className="card-title">Audit &amp; Privacy Safeguards</h2>
                <ul className="submodule-list" style={{ marginTop: 0 }}>
                  <li>
                    Registered user accounts: <strong>{overview.counts.users}</strong>
                  </li>
                  <li>
                    Public vs total alumni: <strong>{overview.counts.alumni_public}</strong> /{' '}
                    {overview.counts.alumni_total}
                  </li>
                  <li>
                    Express Interest records: <strong>{overview.counts.submissions_total}</strong>
                  </li>
                  <li>
                    Contact messages: <strong>{overview.counts.contact_messages}</strong>
                  </li>
                  <li>
                    Newsletter subscribers: <strong>{overview.counts.newsletter_subscribers}</strong>
                  </li>
                </ul>

                {overview.impact_events.length > 0 ? (
                  <div style={{ marginTop: '8px' }}>
                    <strong style={{ fontSize: '0.86rem', color: 'var(--navy)' }}>
                      Recent Impact Updates
                    </strong>
                    <div style={{ display: 'grid', gap: '8px', marginTop: '8px' }}>
                      {overview.impact_events.slice(0, 4).map((evt) => (
                        <div
                          key={evt.event_id}
                          style={{
                            padding: '8px 10px',
                            border: '1px solid var(--line)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.84rem',
                          }}
                        >
                          <span className="mono">{evt.event_id}</span> · {evt.location_city} ·{' '}
                          <strong>
                            {evt.change > 0 ? `+${evt.change}` : evt.change} {evt.metric}
                          </strong>{' '}
                          — {evt.description}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {/* Alumni Consent Moderation Tab */}
        {overview && tab === 'alumni' ? (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div className="admin-toolbar">
              <div className="field-group" style={{ flex: '1 1 240px' }}>
                <label htmlFor="admin-alum-q">Search alumni</label>
                <div style={{ position: 'relative' }}>
                  <Search
                    size={15}
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      left: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--slate)',
                    }}
                  />
                  <input
                    id="admin-alum-q"
                    type="search"
                    className="input-control"
                    style={{ paddingLeft: '32px' }}
                    value={alumniSearch}
                    onChange={(e) => {
                      setAlumniSearch(e.target.value);
                      setAlumniPage(1);
                    }}
                    placeholder="ID, name, hub, or pathway..."
                  />
                </div>
              </div>
              <div className="field-group" style={{ minWidth: '180px' }}>
                <label htmlFor="admin-alum-consent">Consent filter</label>
                <select
                  id="admin-alum-consent"
                  className="select-control"
                  value={alumniConsentFilter}
                  onChange={(e) => {
                    setAlumniConsentFilter(e.target.value as 'all' | 'public' | 'private');
                    setAlumniPage(1);
                  }}
                >
                  <option value="all">All ({overview.alumni.length})</option>
                  <option value="public">Published only</option>
                  <option value="private">Private / Excluded</option>
                </select>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setAlumniSortAsc((s) => !s)}
              >
                <ArrowUpDown size={14} aria-hidden="true" />
                Sort ID ({alumniSortAsc ? 'A–Z' : 'Z–A'})
              </button>
            </div>

            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Hub</th>
                    <th>Pathway</th>
                    <th>Public Consent</th>
                    <th>Photo / Video</th>
                    <th>Active</th>
                    <th>Moderation</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedAlumni.map((alum) => (
                    <tr key={alum.business_id}>
                      <td className="mono">{alum.business_id}</td>
                      <td>
                        <strong>
                          {alum.first_name} {alum.last_name}
                        </strong>
                      </td>
                      <td>
                        {alum.city}, {alum.country}
                      </td>
                      <td className="mono">{alum.pathway_code}</td>
                      <td>{alum.consent_to_publish ? 'Published' : 'Private (Excluded)'}</td>
                      <td>{alum.consent_to_show_photo ? 'Allowed' : 'Hidden (Text-Only)'}</td>
                      <td>{alum.is_active ? 'Active' : 'Inactive'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => {
                              if (alum.consent_to_publish) {
                                setConfirmDialog({
                                  title: `Unpublish ${alum.business_id}?`,
                                  message: `Removing public directory consent hides ${alum.first_name} ${alum.last_name} from the public directory and AI public search immediately.`,
                                  confirmLabel: 'Unpublish Profile',
                                  tone: 'danger',
                                  onConfirm: () =>
                                    handleToggleAlumni(alum.business_id, { consent_to_publish: false }),
                                });
                              } else {
                                void handleToggleAlumni(alum.business_id, { consent_to_publish: true });
                              }
                            }}
                          >
                            {alum.consent_to_publish ? (
                              <EyeOff size={13} aria-hidden="true" />
                            ) : (
                              <Eye size={13} aria-hidden="true" />
                            )}
                            {alum.consent_to_publish ? 'Unpublish' : 'Publish'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() =>
                              void handleToggleAlumni(alum.business_id, {
                                consent_to_show_photo: !alum.consent_to_show_photo,
                              })
                            }
                          >
                            <UserCheck size={13} aria-hidden="true" />
                            {alum.consent_to_show_photo ? 'Hide Media' : 'Allow Media'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {alumniTotalPages > 1 ? (
              <div className="pagination-row">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={alumniPage <= 1}
                  onClick={() => setAlumniPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft size={14} aria-hidden="true" />
                  Previous
                </button>
                <span className="mono" style={{ fontSize: '0.82rem' }}>
                  Page {alumniPage} of {alumniTotalPages} ({filteredAlumni.length} matching)
                </span>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={alumniPage >= alumniTotalPages}
                  onClick={() => setAlumniPage((p) => Math.min(alumniTotalPages, p + 1))}
                >
                  Next
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Partners Moderation Tab */}
        {overview && tab === 'partners' ? (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div className="admin-toolbar">
              <div className="field-group" style={{ flex: '1 1 240px' }}>
                <label htmlFor="admin-partner-q">Search partners</label>
                <input
                  id="admin-partner-q"
                  type="search"
                  className="input-control"
                  value={partnerSearch}
                  onChange={(e) => {
                    setPartnerSearch(e.target.value);
                    setPartnerPage(1);
                  }}
                  placeholder="Organisation, ID, or country..."
                />
              </div>
              <div className="field-group" style={{ minWidth: '180px' }}>
                <label htmlFor="admin-partner-status">Status filter</label>
                <select
                  id="admin-partner-status"
                  className="select-control"
                  value={partnerStatusFilter}
                  onChange={(e) => {
                    setPartnerStatusFilter(
                      e.target.value as 'all' | 'approved' | 'pending_review' | 'archived',
                    );
                    setPartnerPage(1);
                  }}
                >
                  <option value="all">All statuses</option>
                  <option value="approved">Approved</option>
                  <option value="pending_review">Pending review</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Organisation</th>
                    <th>Type</th>
                    <th>Country</th>
                    <th>Status</th>
                    <th>Public Showcase</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedPartners.map((partner) => (
                    <tr key={partner.business_id}>
                      <td className="mono">{partner.business_id}</td>
                      <td>
                        <strong>{partner.organisation}</strong>
                      </td>
                      <td>{partner.type}</td>
                      <td>{partner.country}</td>
                      <td>{partner.status}</td>
                      <td>{partner.show_on_site ? 'Visible' : 'Hidden'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() =>
                              void handleUpdatePartner(partner.business_id, {
                                status: 'approved',
                                show_on_site: true,
                              })
                            }
                          >
                            Approve &amp; Show
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() =>
                              void handleUpdatePartner(partner.business_id, {
                                show_on_site: !partner.show_on_site,
                              })
                            }
                          >
                            {partner.show_on_site ? 'Hide' : 'Show'}
                          </button>
                          {partner.status !== 'archived' ? (
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() =>
                                setConfirmDialog({
                                  title: `Archive ${partner.organisation}?`,
                                  message: `Archiving ${partner.business_id} removes this partner from public showcase listings and marks the record archived in PostgreSQL.`,
                                  confirmLabel: 'Archive Partner',
                                  tone: 'danger',
                                  onConfirm: () =>
                                    handleUpdatePartner(partner.business_id, {
                                      status: 'archived',
                                      show_on_site: false,
                                    }),
                                })
                              }
                            >
                              <Archive size={13} aria-hidden="true" />
                              Archive
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {partnerTotalPages > 1 ? (
              <div className="pagination-row">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={partnerPage <= 1}
                  onClick={() => setPartnerPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft size={14} aria-hidden="true" />
                  Previous
                </button>
                <span className="mono" style={{ fontSize: '0.82rem' }}>
                  Page {partnerPage} of {partnerTotalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={partnerPage >= partnerTotalPages}
                  onClick={() => setPartnerPage((p) => Math.min(partnerTotalPages, p + 1))}
                >
                  Next
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Submissions, Contacts & Subscribers Tab */}
        {overview && tab === 'submissions' ? (
          <div style={{ display: 'grid', gap: '24px' }}>
            <div>
              <div className="admin-toolbar" style={{ marginBottom: '12px' }}>
                <div className="field-group" style={{ flex: '1 1 260px' }}>
                  <label htmlFor="admin-sub-q">Search Express Interest logs</label>
                  <input
                    id="admin-sub-q"
                    type="search"
                    className="input-control"
                    value={submissionSearch}
                    onChange={(e) => {
                      setSubmissionSearch(e.target.value);
                      setSubmissionPage(1);
                    }}
                    placeholder="Reference ID, sender, organisation, or target..."
                  />
                </div>
              </div>

              <h2 className="card-title" style={{ marginBottom: '12px' }}>
                Express Interest Routing Log ({filteredSubmissions.length})
              </h2>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ref</th>
                      <th>Sender</th>
                      <th>Visitor Type</th>
                      <th>Target</th>
                      <th>Consent</th>
                      <th>Routing Status</th>
                      <th>Notified Roles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedSubmissions.map((sub) => (
                      <tr key={sub.business_id}>
                        <td className="mono">{sub.business_id}</td>
                        <td>
                          <strong>{sub.full_name}</strong>
                          {sub.organisation ? ` (${sub.organisation})` : ''}
                        </td>
                        <td>{sub.visitor_type}</td>
                        <td>
                          {sub.interest_type}
                          {sub.interest_value ? ` · ${sub.interest_value}` : ''}
                        </td>
                        <td>{sub.consent_to_be_contacted ? 'Yes' : 'No'}</td>
                        <td>{sub.status}</td>
                        <td>{sub.notified_roles.join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {submissionTotalPages > 1 ? (
                <div className="pagination-row" style={{ marginTop: '12px' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={submissionPage <= 1}
                    onClick={() => setSubmissionPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft size={14} aria-hidden="true" />
                    Previous
                  </button>
                  <span className="mono" style={{ fontSize: '0.82rem' }}>
                    Page {submissionPage} of {submissionTotalPages}
                  </span>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={submissionPage >= submissionTotalPages}
                    onClick={() => setSubmissionPage((p) => Math.min(submissionTotalPages, p + 1))}
                  >
                    Next
                    <ChevronRight size={14} aria-hidden="true" />
                  </button>
                </div>
              ) : null}
            </div>

            <div className="grid-2" style={{ alignItems: 'start' }}>
              <div className="card">
                <h2 className="card-title">Contact Messages ({overview.contacts.length})</h2>
                {overview.contacts.length === 0 ? (
                  <p className="card-copy">No contact messages logged yet.</p>
                ) : (
                  <div style={{ display: 'grid', gap: '10px', maxHeight: '360px', overflowY: 'auto' }}>
                    {overview.contacts.map((msg) => (
                      <div
                        key={msg.id}
                        style={{
                          padding: '10px 12px',
                          border: '1px solid var(--line)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <div className="meta-inline">
                          {msg.reference_id ? <span className="mono">{msg.reference_id}</span> : null}
                          <strong>{msg.name}</strong>
                          {msg.visitor_category ? (
                            <>
                              <span>·</span>
                              <span>{msg.visitor_category}</span>
                            </>
                          ) : null}
                          <span>·</span>
                          <span>{msg.topic}</span>
                          <span>·</span>
                          <span>Routed to {msg.routed_to_role}</span>
                        </div>
                        <p className="card-copy" style={{ marginTop: '4px' }}>
                          {msg.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card">
                <h2 className="card-title">
                  Newsletter Consent Records ({overview.subscribers.length})
                </h2>
                <div style={{ display: 'grid', gap: '8px', maxHeight: '360px', overflowY: 'auto' }}>
                  {overview.subscribers.map((sub) => (
                    <div
                      key={sub.id}
                      style={{
                        padding: '10px 12px',
                        border: '1px solid var(--line)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '10px',
                        fontSize: '0.86rem',
                      }}
                    >
                      <span>
                        List: <strong>{sub.list}</strong> ({sub.consent_text_version})
                      </span>
                      <span className="mono">{sub.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Pathways Availability Moderation Tab */}
        {overview && tab === 'pathways' ? (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Pathway Name</th>
                  <th>Status</th>
                  <th>Enrolled</th>
                  <th>Active</th>
                  <th>Moderation</th>
                </tr>
              </thead>
              <tbody>
                {(overview.pathways ?? []).map((pw) => (
                  <tr key={pw.code}>
                    <td className="mono">{pw.code}</td>
                    <td>
                      <strong>{pw.name}</strong>
                    </td>
                    <td>{pw.status}</td>
                    <td className="num">{pw.learners_enrolled}</td>
                    <td>{pw.is_active ? 'Visible' : 'Disabled'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() =>
                            void handleUpdatePathway(pw.code, {
                              status: pw.status === 'Available' ? 'Completed' : 'Available',
                            })
                          }
                        >
                          Mark {pw.status === 'Available' ? 'Completed' : 'Available'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => {
                            if (pw.is_active) {
                              setConfirmDialog({
                                title: `Disable pathway ${pw.code}?`,
                                message: `Disabling ${pw.name} hides it from public programme listings and learner selection.`,
                                confirmLabel: 'Disable Pathway',
                                tone: 'danger',
                                onConfirm: () => handleUpdatePathway(pw.code, { is_active: false }),
                              });
                            } else {
                              void handleUpdatePathway(pw.code, { is_active: true });
                            }
                          }}
                        >
                          {pw.is_active ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {/* Consent Ledger & Audit Logs Tab */}
        {overview && tab === 'governance' ? (
          <div style={{ display: 'grid', gap: '24px' }}>
            <div className="admin-toolbar">
              <div className="field-group" style={{ flex: '1 1 280px' }}>
                <label htmlFor="admin-gov-q">Filter consent &amp; audit logs</label>
                <input
                  id="admin-gov-q"
                  type="search"
                  className="input-control"
                  value={governanceSearch}
                  onChange={(e) => {
                    setGovernanceSearch(e.target.value);
                    setAuditPage(1);
                    setConsentPage(1);
                  }}
                  placeholder="Search actor, action, scope, or source..."
                />
              </div>
            </div>

            <div className="grid-2" style={{ alignItems: 'start' }}>
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <History size={18} aria-hidden="true" style={{ color: 'var(--indigo)' }} />
                  <h2 className="card-title">Security &amp; Moderation Audit Logs ({filteredAudits.length})</h2>
                </div>
                {pagedAudits.length === 0 ? (
                  <p className="card-copy">No audit log entries match this filter.</p>
                ) : (
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {pagedAudits.map((log) => (
                      <div
                        key={log.id}
                        style={{
                          padding: '10px 12px',
                          border: '1px solid var(--line)',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--canvas)',
                          fontSize: '0.84rem',
                        }}
                      >
                        <div className="meta-inline">
                          <span className="mono">{log.action}</span>
                          <span>·</span>
                          <strong>
                            {log.target_type}:{log.target_id}
                          </strong>
                        </div>
                        <div className="meta-inline" style={{ marginTop: '4px' }}>
                          <span>{maskEmailAddress(log.actor_email)}</span>
                          <span>·</span>
                          <span>{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {auditTotalPages > 1 ? (
                  <div className="pagination-row">
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={auditPage <= 1}
                      onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </button>
                    <span className="mono" style={{ fontSize: '0.8rem' }}>
                      {auditPage} / {auditTotalPages}
                    </span>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={auditPage >= auditTotalPages}
                      onClick={() => setAuditPage((p) => Math.min(auditTotalPages, p + 1))}
                    >
                      Next
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileCheck2 size={18} aria-hidden="true" style={{ color: 'var(--green)' }} />
                  <h2 className="card-title">Consent Ledger ({filteredConsents.length})</h2>
                </div>
                {pagedConsents.length === 0 ? (
                  <p className="card-copy">No consent records match this filter.</p>
                ) : (
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {pagedConsents.map((rec) => (
                      <div
                        key={rec.id}
                        style={{
                          padding: '10px 12px',
                          border: '1px solid var(--line)',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--canvas)',
                          fontSize: '0.84rem',
                        }}
                      >
                        <div className="meta-inline">
                          <span className="mono">{rec.consent_scope}</span>
                          <span>·</span>
                          <strong style={{ color: rec.granted ? 'var(--green-ink)' : 'var(--danger)' }}>
                            {rec.granted ? 'Granted' : 'Withdrawn / Declined'}
                          </strong>
                        </div>
                        <p className="card-copy" style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                          {rec.subject_type} · {rec.source} — {rec.notes}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {consentTotalPages > 1 ? (
                  <div className="pagination-row">
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={consentPage <= 1}
                      onClick={() => setConsentPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </button>
                    <span className="mono" style={{ fontSize: '0.8rem' }}>
                      {consentPage} / {consentTotalPages}
                    </span>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={consentPage >= consentTotalPages}
                      onClick={() => setConsentPage((p) => Math.min(consentTotalPages, p + 1))}
                    >
                      Next
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {/* Users & Permissions Tab */}
        {overview && tab === 'users' ? (
          <div style={{ display: 'grid', gap: '18px' }}>
            <div className="admin-toolbar">
              <div className="field-group" style={{ flex: '1 1 240px' }}>
                <label htmlFor="admin-user-q">Search users</label>
                <input
                  id="admin-user-q"
                  type="search"
                  className="input-control"
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setUserPage(1);
                  }}
                  placeholder="Name, email, or linked ID..."
                />
              </div>
              <div className="field-group" style={{ minWidth: '170px' }}>
                <label htmlFor="admin-user-role">Filter role</label>
                <select
                  id="admin-user-role"
                  className="select-control"
                  value={userRoleFilter}
                  onChange={(e) => {
                    setUserRoleFilter(e.target.value);
                    setUserPage(1);
                  }}
                >
                  <option value="all">All roles</option>
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {pendingRoleChange ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleUpdateUserRole(
                    pendingRoleChange.userId,
                    pendingRoleChange.email,
                    pendingRoleChange.role,
                    roleTotpCode.trim(),
                  );
                }}
                className="form-panel"
                style={{ display: 'flex', alignItems: 'flex-end', gap: '14px', flexWrap: 'wrap' }}
              >
                <div className="field-group" style={{ flex: '1 1 260px' }}>
                  <label htmlFor="admin-role-totp">
                    Verify 6-digit authenticator code to set{' '}
                    <span className="mono">{maskEmailAddress(pendingRoleChange.email)}</span> to{' '}
                    <span className="mono">{pendingRoleChange.role}</span>
                  </label>
                  <input
                    id="admin-role-totp"
                    type="text"
                    inputMode="numeric"
                    maxLength={8}
                    className="input-control mono"
                    value={roleTotpCode}
                    onChange={(e) => setRoleTotpCode(e.target.value)}
                    placeholder="123456"
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={roleUpdating}>
                  {roleUpdating ? 'Verifying...' : 'Confirm Role Change'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setPendingRoleChange(null);
                    setRoleTotpCode('');
                    setError(null);
                  }}
                >
                  Cancel
                </button>
              </form>
            ) : null}

            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email (Masked)</th>
                    <th>Linked Record</th>
                    <th>Role &amp; Permissions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedUsers.map((acct) => (
                    <tr key={acct.id}>
                      <td className="mono">{acct.id}</td>
                      <td>
                        <strong>
                          {acct.first_name} {acct.second_name}
                        </strong>
                      </td>
                      <td className="mono">{maskEmailAddress(acct.email)}</td>
                      <td className="mono">{acct.linked_business_id ?? '—'}</td>
                      <td>
                        <select
                          aria-label={`Role for ${acct.first_name} ${acct.second_name}`}
                          className="select-control"
                          style={{ minWidth: '150px', padding: '6px 10px' }}
                          value={acct.role}
                          disabled={roleUpdating}
                          onChange={(e) => {
                            const nextRole = e.target.value as UserRole;
                            if (nextRole === acct.role) return;
                            setConfirmDialog({
                              title: `Change role for ${acct.first_name} ${acct.second_name}?`,
                              message: `Reassign ${maskEmailAddress(acct.email)} from "${acct.role}" to "${nextRole}"? This updates workspace permissions immediately.`,
                              confirmLabel: `Set Role to ${nextRole}`,
                              tone: nextRole === 'admin' ? 'danger' : 'primary',
                              onConfirm: () => handleUpdateUserRole(acct.id, acct.email, nextRole),
                            });
                          }}
                        >
                          {ASSIGNABLE_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {userTotalPages > 1 ? (
              <div className="pagination-row">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={userPage <= 1}
                  onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft size={14} aria-hidden="true" />
                  Previous
                </button>
                <span className="mono" style={{ fontSize: '0.82rem' }}>
                  Page {userPage} of {userTotalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={userPage >= userTotalPages}
                  onClick={() => setUserPage((p) => Math.min(userTotalPages, p + 1))}
                >
                  Next
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Security & 2FA Tab */}
        {tab === 'security' ? <SecuritySettingsPanel /> : null}
      </div>

      {/* Confirmation Modal */}
      {confirmDialog ? (
        <div
          className="confirm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
        >
          <div className="confirm-modal-card">
            <h2 id="confirm-modal-title" className="card-title">
              {confirmDialog.title}
            </h2>
            <p className="card-copy" style={{ marginTop: '8px' }}>
              {confirmDialog.message}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={confirmBusy}
                onClick={() => setConfirmDialog(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn btn-sm ${confirmDialog.tone === 'danger' ? 'btn-amber' : 'btn-primary'}`}
                disabled={confirmBusy}
                onClick={() => void runConfirmed()}
              >
                {confirmBusy ? 'Applying...' : confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default AdminPage;
