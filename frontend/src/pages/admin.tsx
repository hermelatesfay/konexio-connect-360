import { type FormEvent, useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import {
  fetchAdminOverview,
  recordAdminImpactEvent,
  updateAdminAlumnus,
  updateAdminPartner,
  updateAdminUserRole,
} from '../api';
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
    name: string;
    visitor_category?: string;
    topic: string;
    routed_to_role: string;
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
};

const ASSIGNABLE_ROLES: UserRole[] = [
  'learner',
  'alumni',
  'employer',
  'partner',
  'donor',
  'admin',
];

const AdminPage = ({ onNavigate }: AdminPageProps) => {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [tab, setTab] = useState<'overview' | 'alumni' | 'partners' | 'submissions' | 'users'>(
    'overview',
  );
  const [overview, setOverview] = useState<AdminOverviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const loading = Boolean(isAuthenticated && token && user?.role === 'admin') && !overview && !error;

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
    if (!isAuthenticated || !token || user?.role !== 'admin') return;
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
  }, [isAuthenticated, token, user?.role]);

  if (!isAuthenticated || !token || user?.role !== 'admin') {
    return (
      <section className="dashboard-shell">
        <div className="container" style={{ maxWidth: '640px' }}>
          <div className="form-panel">
            <div className="alert-box alert-error" style={{ marginBottom: '20px' }}>
              <ShieldAlert size={20} aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Access Restricted — Administrator Role Required</strong>
                <p style={{ margin: '6px 0 0' }}>
                  Only authorised Konexio Africa administrators can access consent moderation,
                  partner approvals, user permissions, and live impact controls.
                </p>
              </div>
            </div>
            <div className="hero-actions" style={{ marginTop: 0 }}>
              <button type="button" className="btn btn-primary" onClick={() => onNavigate('/login')}>
                Sign In with Admin Account
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

  const handleUpdateUserRole = async (userId: number, role: UserRole) => {
    setStatusNote(null);
    setError(null);
    try {
      await updateAdminUserRole(token, userId, role);
      setStatusNote(`Updated account #${userId} permission role to ${role}.`);
      await loadOverview(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update user role.');
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
      setStatusNote('Recorded live impact event and updated summary metrics.');
      await loadOverview(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to record impact event.');
    } finally {
      setSubmittingEvent(false);
    }
  };

  return (
    <section className="dashboard-shell">
      <div className="container">
        <div className="dashboard-header">
          <div>
            <span className="kicker">ADMINISTRATOR CONSOLE</span>
            <h1 className="page-title">Governance, Consent &amp; Live Impact</h1>
            <p className="card-copy" style={{ marginTop: '4px' }}>
              Signed in as {user.first_name} {user.second_name} ({user.email})
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
              Overview &amp; Live Impact
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
              Enquiries &amp; Contacts
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'users'}
              className={`segmented-btn${tab === 'users' ? ' is-active' : ''}`}
              onClick={() => setTab('users')}
            >
              Users &amp; Roles ({overview?.users.length ?? 0})
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
          <div className="alert-box alert-error" style={{ marginBottom: '20px' }}>
            {error}
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
                {overview.alumni.map((alum) => (
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
                          onClick={() =>
                            handleToggleAlumni(alum.business_id, {
                              consent_to_publish: !alum.consent_to_publish,
                            })
                          }
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
                            handleToggleAlumni(alum.business_id, {
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
        ) : null}

        {/* Partners Moderation Tab */}
        {overview && tab === 'partners' ? (
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
                {overview.partners.map((partner) => (
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
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() =>
                            handleUpdatePartner(partner.business_id, {
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
                            handleUpdatePartner(partner.business_id, {
                              show_on_site: !partner.show_on_site,
                            })
                          }
                        >
                          {partner.show_on_site ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {/* Submissions, Contacts & Subscribers Tab */}
        {overview && tab === 'submissions' ? (
          <div style={{ display: 'grid', gap: '24px' }}>
            <div>
              <h2 className="card-title" style={{ marginBottom: '12px' }}>
                Express Interest Routing Log ({overview.submissions.length})
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
                    {overview.submissions.map((sub) => (
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
            </div>

            <div className="grid-2" style={{ alignItems: 'start' }}>
              <div className="card">
                <h2 className="card-title">Contact Messages ({overview.contacts.length})</h2>
                {overview.contacts.length === 0 ? (
                  <p className="card-copy">No new contact messages logged yet in this session.</p>
                ) : (
                  <div style={{ display: 'grid', gap: '10px' }}>
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
                <div style={{ display: 'grid', gap: '8px' }}>
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

        {/* Users & Permissions Tab */}
        {overview && tab === 'users' ? (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Linked Record</th>
                  <th>Role &amp; Permissions</th>
                </tr>
              </thead>
              <tbody>
                {overview.users.map((acct) => (
                  <tr key={acct.id}>
                    <td className="mono">{acct.id}</td>
                    <td>
                      <strong>
                        {acct.first_name} {acct.second_name}
                      </strong>
                    </td>
                    <td className="mono">{acct.email}</td>
                    <td className="mono">{acct.linked_business_id ?? '—'}</td>
                    <td>
                      <select
                        aria-label={`Role for ${acct.email}`}
                        className="select-control"
                        style={{ minWidth: '150px', padding: '6px 10px' }}
                        value={acct.role}
                        onChange={(e) =>
                          handleUpdateUserRole(acct.id, e.target.value as UserRole)
                        }
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
        ) : null}
      </div>
    </section>
  );
};

export default AdminPage;
