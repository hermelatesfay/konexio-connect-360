import { type ChangeEvent, type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle2,
  FileBarChart,
  ImagePlus,
  Lock,
  Mail,
  RefreshCw,
  Save,
  Search,
  Send,
  Shield,
  Users,
} from 'lucide-react';
import {
  fetchDashboardData,
  markNotificationRead,
  submitExpressInterest,
  updateAlumniDashboard,
  updateDashboardNewsletter,
  updateLearnerProgress,
  uploadFile,
} from '../api';
import SecuritySettingsPanel from '../components/SecuritySettingsPanel';
import { useAuthStore } from '../store/authStore';
import type {
  AnnualReport,
  CourseModule,
  ImpactSummary,
  NotificationItem,
  PathwayInfo,
  PublicAlumnus,
} from '../types';

type DashboardPageProps = {
  onNavigate: (path: string) => void;
};

type LearnerDashboardPayload = {
  role: 'learner';
  application_id: string;
  application_status: string;
  pathway: PathwayInfo;
  all_pathways: PathwayInfo[];
  modules: CourseModule[];
  completed_modules?: string[];
  learning_goal: string | null;
  location: string | null;
  peers_in_pathway: number;
  notifications?: NotificationItem[];
};

type AlumniDashboardPayload = {
  role: 'alumni';
  profile: {
    business_id: string;
    first_name: string;
    last_name: string;
    city: string;
    country: string;
    pathway_code: string;
    short_bio: string;
    skills: string[];
    languages: string[];
    availability: string;
    portfolio_title: string;
    portfolio_url: string | null;
    portfolio_image?: string | null;
    photo_file?: string | null;
    personal_website: string | null;
    linkedin_url: string | null;
    consent_to_publish: boolean;
    consent_to_show_photo: boolean;
    is_active: boolean;
  } | null;
  inquiries: Array<{
    business_id: string;
    submitted_at: string;
    organisation: string;
    visitor_type: string;
    interest_type: string;
    message: string;
  }>;
  notifications?: NotificationItem[];
};

type EmployerDashboardPayload = {
  role: 'employer';
  organisation: {
    business_id: string;
    organisation: string;
    type: string;
    country: string;
    description: string;
    website: string | null;
    show_on_site: boolean;
    status: string;
  } | null;
  pathways: PathwayInfo[];
  alumni: PublicAlumnus[];
  submissions: Array<{
    business_id: string;
    submitted_at: string;
    interest_type: string;
    interest_value: string | null;
    status: string;
    message: string;
  }>;
};

type PartnerDashboardPayload = {
  role: 'partner' | 'donor';
  organisation: {
    business_id: string;
    organisation: string;
    type: string;
    country: string;
    description: string;
    website: string | null;
    show_on_site: boolean;
    status: string;
  } | null;
  summary: ImpactSummary;
  submissions: Array<{
    business_id: string;
    submitted_at: string;
    interest_type: string;
    interest_value: string | null;
    status: string;
    message: string;
  }>;
  reports: AnnualReport[];
  newsletter_preferences: {
    donor_partner: boolean;
    alumni: boolean;
  };
};

const DashboardPage = ({ onNavigate }: DashboardPageProps) => {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);

  const [activeTab, setActiveTab] = useState<'workspace' | 'security'>('workspace');
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loading = Boolean(isAuthenticated && token && user?.role !== 'admin') && !data && !error;

  // Learner module checklist (persisted in PostgreSQL via /api/dashboard/learner/progress)
  const [completedModules, setCompletedModules] = useState<Record<string, boolean>>({});
  const [savingModuleCode, setSavingModuleCode] = useState<string | null>(null);

  // Notifications state
  const [notificationsList, setNotificationsList] = useState<NotificationItem[]>([]);
  const [markingNotifId, setMarkingNotifId] = useState<number | null>(null);

  // Alumni editable profile, portfolio & consent fields
  const [shortBio, setShortBio] = useState('');
  const [availability, setAvailability] = useState('Open to work');
  const [skillsText, setSkillsText] = useState('');
  const [portfolioTitle, setPortfolioTitle] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [personalWebsite, setPersonalWebsite] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [portfolioImagePreviewUrl, setPortfolioImagePreviewUrl] = useState<string | null>(null);
  const [uploadingAsset, setUploadingAsset] = useState<'alumni_photo' | 'alumni_portfolio' | null>(null);
  const [consentPublish, setConsentPublish] = useState(false);
  const [consentPhoto, setConsentPhoto] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Employer talent filter & inline enquiry state
  const [employerSearch, setEmployerSearch] = useState('');
  const [employerPathway, setEmployerPathway] = useState('');
  const [enquiryTargetType, setEnquiryTargetType] = useState<'alumni' | 'pathway'>('pathway');
  const [enquiryTargetValue, setEnquiryTargetValue] = useState('P1');
  const [enquiryMessage, setEnquiryMessage] = useState('');
  const [enquiryConsent, setEnquiryConsent] = useState(true);
  const [enquirySubmitting, setEnquirySubmitting] = useState(false);
  const [enquiryReceipt, setEnquiryReceipt] = useState<string | null>(null);

  // Partner / Donor newsletter toggle feedback
  const [newsletterNote, setNewsletterNote] = useState<string | null>(null);
  const [newsletterUpdating, setNewsletterUpdating] = useState(false);

  const hydratePayload = useCallback((res: Record<string, unknown>) => {
    setData(res);
    setError(null);
    if (Array.isArray(res.notifications)) {
      setNotificationsList(res.notifications as NotificationItem[]);
    }
    if (res.role === 'learner' && Array.isArray(res.completed_modules)) {
      const nextMap: Record<string, boolean> = {};
      for (const code of res.completed_modules as string[]) {
        nextMap[code] = true;
      }
      setCompletedModules(nextMap);
    }
    if (res.role === 'alumni' && res.profile) {
      const prof = res.profile as AlumniDashboardPayload['profile'];
      if (prof) {
        setShortBio(prof.short_bio ?? '');
        setAvailability(prof.availability ?? 'Open to work');
        setSkillsText((prof.skills ?? []).join(', '));
        setPortfolioTitle(prof.portfolio_title ?? '');
        setPortfolioUrl(prof.portfolio_url ?? '');
        setPersonalWebsite(prof.personal_website ?? '');
        setLinkedinUrl(prof.linkedin_url ?? '');
        setPhotoPreviewUrl(prof.photo_file ?? null);
        setPortfolioImagePreviewUrl(prof.portfolio_image ?? null);
        setConsentPublish(Boolean(prof.consent_to_publish));
        setConsentPhoto(Boolean(prof.consent_to_show_photo));
      }
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    if (!isAuthenticated || !token || user?.role === 'admin') return;
    setError(null);
    try {
      const res = await fetchDashboardData(token);
      hydratePayload(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load your dashboard.');
    }
  }, [isAuthenticated, token, user?.role, hydratePayload]);

  useEffect(() => {
    if (!isAuthenticated || !token || user?.role === 'admin') return;
    let active = true;

    fetchDashboardData(token)
      .then((res) => {
        if (!active) return;
        hydratePayload(res);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load your dashboard.');
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated, token, user?.role, hydratePayload]);

  const toggleModule = async (code: string) => {
    if (!user || !token) return;
    const nextChecked = !completedModules[code];
    setCompletedModules((prev) => ({ ...prev, [code]: nextChecked }));
    setSavingModuleCode(code);
    setError(null);
    try {
      const res = await updateLearnerProgress(token, code, nextChecked);
      const nextMap: Record<string, boolean> = {};
      for (const c of res.completed_modules) {
        nextMap[c] = true;
      }
      setCompletedModules(nextMap);
    } catch (err) {
      setCompletedModules((prev) => ({ ...prev, [code]: !nextChecked }));
      setError(err instanceof Error ? err.message : 'Unable to save module progress.');
    } finally {
      setSavingModuleCode(null);
    }
  };

  const handleMarkNotificationRead = async (id: number) => {
    if (!token) return;
    setMarkingNotifId(id);
    try {
      await markNotificationRead(token, id);
      setNotificationsList((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update notification.');
    } finally {
      setMarkingNotifId(null);
    }
  };

  const handleAssetUpload = async (
    purpose: 'alumni_photo' | 'alumni_portfolio',
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !token) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a PNG, JPEG, or WEBP image.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be 2 MB or smaller.');
      return;
    }

    setUploadingAsset(purpose);
    setError(null);
    setSaveMessage(null);

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read selected file.'));
        reader.readAsDataURL(file);
      });

      const uploaded = await uploadFile(token, {
        purpose,
        filename: file.name,
        mime_type: file.type,
        data_base64: dataUrl,
      });

      if (purpose === 'alumni_photo') {
        setPhotoPreviewUrl(uploaded.url);
        setSaveMessage(
          'Profile photo uploaded to PostgreSQL storage. Public visibility respects your photo consent checkbox.',
        );
      } else {
        setPortfolioImagePreviewUrl(uploaded.url);
        setSaveMessage(
          'Portfolio image uploaded to PostgreSQL storage. Public visibility respects your photo consent checkbox.',
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to upload image.');
    } finally {
      setUploadingAsset(null);
    }
  };

  const handleSaveAlumni = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSavingProfile(true);
    setSaveMessage(null);
    setError(null);

    try {
      const res = await updateAlumniDashboard(token, {
        short_bio: shortBio,
        availability,
        skills: skillsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        portfolio_title: portfolioTitle.trim() || undefined,
        portfolio_url: portfolioUrl.trim() || null,
        personal_website: personalWebsite.trim() || null,
        linkedin_url: linkedinUrl.trim() || null,
        consent_to_publish: consentPublish,
        consent_to_show_photo: consentPhoto,
      });
      setSaveMessage(
        res.consent_to_publish
          ? 'Profile updated. Your public alumni directory listing is active.'
          : 'Profile updated. Your profile is currently hidden from the public directory.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleEmployerEnquirySubmit = async (e: FormEvent, orgName?: string) => {
    e.preventDefault();
    if (!user || !token || !enquiryMessage.trim()) return;
    setEnquirySubmitting(true);
    setEnquiryReceipt(null);
    setError(null);

    try {
      const res = await submitExpressInterest({
        full_name: `${user.first_name} ${user.second_name}`,
        organisation: orgName || 'Employer Partner',
        email: user.email,
        visitor_type: 'Employer',
        interest_type: enquiryTargetType,
        interest_value: enquiryTargetValue,
        message: enquiryMessage.trim(),
        consent_to_be_contacted: enquiryConsent,
      });
      setEnquiryReceipt(
        `Enquiry ${res.reference_id} routed cleanly (${res.expected_response_time}).`,
      );
      setEnquiryMessage('');
      const refreshed = await fetchDashboardData(token);
      setData(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit enquiry.');
    } finally {
      setEnquirySubmitting(false);
    }
  };

  const handleNewsletterToggle = async (
    list: 'donor_partner' | 'alumni',
    nextSubscribed: boolean,
  ) => {
    if (!token) return;
    setNewsletterUpdating(true);
    setNewsletterNote(null);
    setError(null);
    try {
      const res = await updateDashboardNewsletter(token, { list, subscribed: nextSubscribed });
      setNewsletterNote(
        `${res.list === 'donor_partner' ? 'Donor & Partner' : 'Alumni'} list preference updated (${res.status}).`,
      );
      const refreshed = await fetchDashboardData(token);
      setData(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update newsletter preferences.');
    } finally {
      setNewsletterUpdating(false);
    }
  };

  const employerFilteredAlumni = useMemo(() => {
    if (data?.role !== 'employer') return [];
    const payload = data as EmployerDashboardPayload;
    const q = employerSearch.trim().toLowerCase();
    return payload.alumni.filter((alum) => {
      if (employerPathway && alum.pathway_code !== employerPathway) return false;
      if (!q) return true;
      const haystack = [
        alum.first_name,
        alum.last_name,
        alum.city ?? '',
        alum.country ?? '',
        alum.pathway_name,
        ...alum.skills,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [data, employerSearch, employerPathway]);

  if (!isAuthenticated || !user || !token) {
    return (
      <section className="dashboard-shell">
        <div className="container" style={{ maxWidth: '640px' }}>
          <div className="form-panel">
            <div className="alert-box alert-info" style={{ marginBottom: '20px' }}>
              <Lock size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Sign In Required</strong>
                <p style={{ margin: '4px 0 0' }}>
                  Please sign in to access your role-specific employer, alumni, learner, donor/partner,
                  or administrator workspace.
                </p>
              </div>
            </div>
            <div className="hero-actions" style={{ marginTop: 0 }}>
              <button type="button" className="btn btn-primary" onClick={() => onNavigate('/login')}>
                Sign In
              </button>
              <button type="button" className="btn btn-outline" onClick={() => onNavigate('/signup')}>
                Create an Account
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (user.role === 'admin' && user.aal !== 'aal2') {
    return (
      <section className="dashboard-shell">
        <div className="container" style={{ maxWidth: '640px' }}>
          <div className="form-panel">
            <div className="alert-box alert-error" style={{ marginBottom: '20px' }}>
              <Lock size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Two-Factor Verification Required</strong>
                <p style={{ margin: '4px 0 0' }}>
                  Administrator accounts require two-factor authenticator verification (AAL2) before
                  accessing protected workspaces.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                logout();
                onNavigate('/login');
              }}
            >
              Sign In with Two-Factor Verification
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-shell">
      <div className="container">
        <div className="dashboard-header">
          <div>
            <span className="kicker">
              {user.role.toUpperCase()} DASHBOARD
            </span>
            <h1 className="page-title">
              Welcome, {user.first_name} {user.second_name}
            </h1>
            <div className="meta-inline" style={{ marginTop: '6px' }}>
              <span>{user.email}</span>
              {user.linked_business_id ? (
                <>
                  <span>·</span>
                  <span className="mono">{user.linked_business_id}</span>
                </>
              ) : null}
              <span>·</span>
              <span className="mono">{user.totp_enabled ? '2FA Active' : '2FA Optional'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div className="segmented-control" role="tablist" aria-label="Dashboard sections">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'workspace'}
                className={`segmented-btn${activeTab === 'workspace' ? ' is-active' : ''}`}
                onClick={() => setActiveTab('workspace')}
              >
                Workspace
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'security'}
                className={`segmented-btn${activeTab === 'security' ? ' is-active' : ''}`}
                onClick={() => setActiveTab('security')}
              >
                Security &amp; 2FA
              </button>
            </div>
            {user.role === 'admin' ? (
              <button type="button" className="btn btn-amber btn-sm" onClick={() => onNavigate('/admin')}>
                <Shield size={15} aria-hidden="true" />
                Administrator Console
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => onNavigate('/programmes')}
            >
              Browse Pathways
            </button>
          </div>
        </div>

        {activeTab === 'security' ? (
          <SecuritySettingsPanel />
        ) : (
          <>
            {user.role === 'admin' ? (
              <div className="form-panel" style={{ marginBottom: '24px' }}>
                <span className="kicker">Administrator Access Verified (AAL2)</span>
                <h2 className="card-title" style={{ marginBottom: '8px' }}>
                  Manage Konexio Connect Governance &amp; Moderation
                </h2>
                <p className="card-copy" style={{ marginBottom: '16px' }}>
                  Your session has completed two-factor verification. Open the Administrator Console to
                  review alumni consent, approve partner organisations, manage user permissions, or record
                  live impact updates.
                </p>
                <button type="button" className="btn btn-primary" onClick={() => onNavigate('/admin')}>
                  <Shield size={16} aria-hidden="true" />
                  Open Administrator Console
                </button>
              </div>
            ) : null}

            {loading ? <p className="card-copy">Loading dashboard workspace...</p> : null}
            {error ? (
              <div
                className="alert-box alert-error"
                style={{ marginBottom: '20px', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}
              >
                <span>{error}</span>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => void refreshDashboard()}
                >
                  <RefreshCw size={14} aria-hidden="true" />
                  Retry
                </button>
              </div>
            ) : null}

            {!loading && notificationsList.length > 0 ? (
              <div className="form-panel" style={{ marginBottom: '24px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    marginBottom: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Bell size={18} aria-hidden="true" style={{ color: 'var(--amber-ink)' }} />
                    <h2 className="card-title">Notifications &amp; Account Alerts</h2>
                  </div>
                  <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>
                    {notificationsList.filter((n) => !n.is_read).length} unread
                  </span>
                </div>
                <div className="notifications-list">
                  {notificationsList.slice(0, 6).map((item) => (
                    <div
                      key={item.id}
                      className={`notification-item${!item.is_read ? ' notification-unread' : ''}`}
                    >
                      <div style={{ flex: 1 }}>
                        <div className="meta-inline">
                          <strong style={{ color: 'var(--indigo)' }}>{item.title}</strong>
                          <span>·</span>
                          <span className="mono">{item.category}</span>
                          <span>·</span>
                          <span>{new Date(item.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="card-copy" style={{ fontSize: '0.86rem', marginTop: '4px' }}>
                          {item.body}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                        {item.link_path && item.link_path !== '/dashboard' ? (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => onNavigate(item.link_path)}
                          >
                            Open
                          </button>
                        ) : null}
                        {!item.is_read ? (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            disabled={markingNotifId === item.id}
                            onClick={() => void handleMarkNotificationRead(item.id)}
                          >
                            {markingNotifId === item.id ? 'Saving...' : 'Mark read'}
                          </button>
                        ) : (
                          <span className="mono" style={{ fontSize: '0.76rem', color: 'var(--slate)' }}>
                            Read
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* 1. Employer / Client Workspace */}
            {!loading && data?.role === 'employer' ? (() => {
          const employer = data as EmployerDashboardPayload;
          return (
            <div style={{ display: 'grid', gap: '24px' }}>
              <div className="kpi-strip" style={{ marginTop: 0 }}>
                <div className="kpi-card">
                  <span className="kpi-label">Organisation</span>
                  <span className="kpi-value" style={{ fontSize: '1.25rem' }}>
                    {employer.organisation?.organisation ?? 'Employer Account'}
                  </span>
                  <span className="kpi-sub">
                    {employer.organisation?.country ?? 'Regional Partner'} ·{' '}
                    {employer.organisation?.status ?? 'active'}
                  </span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Public Alumni Talent</span>
                  <span className="kpi-value">{employer.alumni.length}</span>
                  <span className="kpi-sub">Consent-approved specialists</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Matching Results</span>
                  <span className="kpi-value">{employerFilteredAlumni.length}</span>
                  <span className="kpi-sub">Filtered by skill or pathway</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Submitted Enquiries</span>
                  <span className="kpi-value">{employer.submissions.length}</span>
                  <span className="kpi-sub">Tracked SLA routing log</span>
                </div>
              </div>

              <div className="grid-2" style={{ alignItems: 'start' }}>
                {/* Employer Alumni Discovery */}
                <div className="form-panel">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Briefcase size={18} aria-hidden="true" style={{ color: 'var(--green)' }} />
                    <h2 className="card-title">Discover Consent-Approved Alumni</h2>
                  </div>

                  <div className="form-grid-2" style={{ marginBottom: '16px' }}>
                    <div className="field-group">
                      <label htmlFor="emp-search">Search skill or hub</label>
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
                          id="emp-search"
                          type="search"
                          className="input-control"
                          style={{ paddingLeft: '32px' }}
                          value={employerSearch}
                          onChange={(e) => setEmployerSearch(e.target.value)}
                          placeholder="e.g. Figma, Python, Nairobi"
                        />
                      </div>
                    </div>
                    <div className="field-group">
                      <label htmlFor="emp-pathway">Filter pathway</label>
                      <select
                        id="emp-pathway"
                        className="select-control"
                        value={employerPathway}
                        onChange={(e) => setEmployerPathway(e.target.value)}
                      >
                        <option value="">All 11 pathways</option>
                        {employer.pathways.map((pw) => (
                          <option key={pw.code} value={pw.code}>
                            {pw.code} · {pw.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: '10px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                    {employerFilteredAlumni.length === 0 ? (
                      <div className="alert-box alert-info" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>No consent-approved alumni matched those filters.</span>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => {
                            setEmployerSearch('');
                            setEmployerPathway('');
                          }}
                        >
                          Reset
                        </button>
                      </div>
                    ) : (
                      employerFilteredAlumni.slice(0, 8).map((alum) => (
                        <div
                          key={alum.business_id}
                          style={{
                            padding: '12px 14px',
                            border: '1px solid var(--line)',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--cream)',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '10px',
                              flexWrap: 'wrap',
                            }}
                          >
                            <div>
                              <strong style={{ color: 'var(--navy)' }}>
                                {alum.first_name} {alum.last_name}
                              </strong>{' '}
                              <span className="pathway-code">· {alum.pathway_code}</span>
                            </div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--green-ink)', fontWeight: 600 }}>
                              {alum.availability}
                            </span>
                          </div>
                          <p className="card-copy" style={{ fontSize: '0.86rem', margin: '6px 0' }}>
                            {alum.skills.slice(0, 4).join(' · ')}
                          </p>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => onNavigate(`/alumni/${alum.business_id}`)}
                            >
                              View Profile
                            </button>
                            <button
                              type="button"
                              className="btn btn-amber btn-sm"
                              onClick={() => {
                                setEnquiryTargetType('alumni');
                                setEnquiryTargetValue(alum.business_id);
                              }}
                            >
                              Select for Enquiry
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Talent Enquiry Form + Submission History */}
                <div style={{ display: 'grid', gap: '20px' }}>
                  <div className="form-panel">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <Send size={18} aria-hidden="true" style={{ color: 'var(--amber-ink)' }} />
                      <h2 className="card-title">Submit Talent Enquiry</h2>
                    </div>

                    {enquiryReceipt ? (
                      <div className="alert-box alert-success" style={{ marginBottom: '14px' }}>
                        <CheckCircle2 size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
                        <span>{enquiryReceipt}</span>
                      </div>
                    ) : null}

                    <form
                      onSubmit={(e) =>
                        handleEmployerEnquirySubmit(e, employer.organisation?.organisation)
                      }
                      style={{ display: 'grid', gap: '12px' }}
                    >
                      <div className="form-grid-2">
                        <div className="field-group">
                          <label htmlFor="emp-enq-type">Enquiry target</label>
                          <select
                            id="emp-enq-type"
                            className="select-control"
                            value={enquiryTargetType}
                            onChange={(e) => {
                              const nextType = e.target.value as 'alumni' | 'pathway';
                              setEnquiryTargetType(nextType);
                              setEnquiryTargetValue(
                                nextType === 'pathway'
                                  ? 'P1'
                                  : employer.alumni[0]?.business_id ?? '',
                              );
                            }}
                          >
                            <option value="pathway">Specific Pathway (P1–P11)</option>
                            <option value="alumni">Specific Public Alumnus</option>
                          </select>
                        </div>

                        <div className="field-group">
                          <label htmlFor="emp-enq-val">Select target</label>
                          <select
                            id="emp-enq-val"
                            className="select-control"
                            value={enquiryTargetValue}
                            onChange={(e) => setEnquiryTargetValue(e.target.value)}
                          >
                            {enquiryTargetType === 'pathway'
                              ? employer.pathways.map((pw) => (
                                  <option key={pw.code} value={pw.code}>
                                    {pw.code} · {pw.name}
                                  </option>
                                ))
                              : employer.alumni.map((alum) => (
                                  <option key={alum.business_id} value={alum.business_id}>
                                    {alum.business_id} · {alum.first_name} {alum.last_name}
                                  </option>
                                ))}
                          </select>
                        </div>
                      </div>

                      <div className="field-group">
                        <label htmlFor="emp-enq-msg">Role or project scope</label>
                        <textarea
                          id="emp-enq-msg"
                          className="textarea-control"
                          required
                          maxLength={1500}
                          value={enquiryMessage}
                          onChange={(e) => setEnquiryMessage(e.target.value)}
                          placeholder="Outline deliverables, required skills, and remote cadence."
                        />
                      </div>

                      <label className="checkbox-field">
                        <input
                          type="checkbox"
                          checked={enquiryConsent}
                          onChange={(e) => setEnquiryConsent(e.target.checked)}
                        />
                        <span>Allow matched alumni to receive this project brief directly.</span>
                      </label>

                      <button type="submit" className="btn btn-primary" disabled={enquirySubmitting}>
                        {enquirySubmitting ? 'Sending...' : 'Send Hiring Enquiry'}
                        <ArrowRight size={15} aria-hidden="true" />
                      </button>
                    </form>
                  </div>

                  <div className="card">
                    <h2 className="card-title">Submitted Enquiry History ({employer.submissions.length})</h2>
                    {employer.submissions.length === 0 ? (
                      <p className="card-copy">No enquiries logged under your account yet.</p>
                    ) : (
                      <div style={{ display: 'grid', gap: '10px' }}>
                        {employer.submissions.map((sub) => (
                          <div
                            key={sub.business_id}
                            style={{
                              padding: '10px 12px',
                              border: '1px solid var(--line)',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--cream)',
                            }}
                          >
                            <div className="meta-inline">
                              <span className="mono">{sub.business_id}</span>
                              <span>·</span>
                              <span>
                                {sub.interest_type}
                                {sub.interest_value ? ` (${sub.interest_value})` : ''}
                              </span>
                              <span>·</span>
                              <strong>{sub.status}</strong>
                            </div>
                            <p className="card-copy" style={{ marginTop: '4px', fontSize: '0.86rem' }}>
                              {sub.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })() : null}

        {/* 2. Learner Workspace */}
        {!loading && data?.role === 'learner' ? (() => {
          const learner = data as LearnerDashboardPayload;
          const totalModules = learner.modules.length;
          const doneCount = learner.modules.filter((m) => completedModules[m.code]).length;
          const progressPct = totalModules > 0 ? Math.round((doneCount / totalModules) * 100) : 0;

          return (
            <div style={{ display: 'grid', gap: '24px' }}>
              <div className="kpi-strip" style={{ marginTop: 0 }}>
                <div className="kpi-card">
                  <span className="kpi-label">Application / Cohort Ref</span>
                  <span className="kpi-value" style={{ fontSize: '1.35rem' }}>
                    {learner.application_id}
                  </span>
                  <span className="kpi-sub">Status: {learner.application_status.replace(/_/g, ' ')}</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Selected Pathway</span>
                  <span className="kpi-value">{learner.pathway.code}</span>
                  <span className="kpi-sub">{learner.pathway.name}</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Foundations Progress</span>
                  <span className="kpi-value">{progressPct}%</span>
                  <span className="kpi-sub">
                    {doneCount} of {totalModules} Part I modules checked
                  </span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Public Alumni Peers</span>
                  <span className="kpi-value">{learner.peers_in_pathway}</span>
                  <span className="kpi-sub">Graduates in {learner.pathway.code}</span>
                </div>
              </div>

              <div className="grid-2" style={{ alignItems: 'start' }}>
                <div className="form-panel">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <BookOpen size={18} aria-hidden="true" style={{ color: 'var(--green)' }} />
                    <h2 className="card-title">Part I Foundations Checklist (M0–M5)</h2>
                  </div>
                  <p className="card-copy" style={{ marginBottom: '16px' }}>
                    Track your progress through the core Digi Pass foundations before advancing to
                    your {learner.pathway.code} specialization track.
                  </p>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {learner.modules.map((mod) => (
                      <label
                        key={mod.code}
                        className="checkbox-field"
                        style={{
                          padding: '12px 14px',
                          border: '1px solid var(--line)',
                          borderRadius: 'var(--radius-sm)',
                          background: completedModules[mod.code]
                            ? 'rgba(52, 122, 104, 0.06)'
                            : 'var(--white)',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(completedModules[mod.code])}
                          disabled={savingModuleCode === mod.code}
                          onChange={() => void toggleModule(mod.code)}
                        />
                        <div>
                          <strong style={{ color: 'var(--navy)' }}>
                            {mod.code} · {mod.title}
                          </strong>
                          <div style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>
                            {mod.submodules.length} core topics
                            {savingModuleCode === mod.code ? ' · Saving...' : ''}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <Users size={20} aria-hidden="true" style={{ color: 'var(--navy)' }} />
                  <h2 className="card-title">My Cohort &amp; Career Goal</h2>
                  <p className="card-copy">
                    <strong>Hub location:</strong> {learner.location || 'Regional cohort'}
                  </p>
                  <p className="card-copy">
                    <strong>Recorded learning goal:</strong>{' '}
                    {learner.learning_goal || 'Build remote-ready digital skills.'}
                  </p>
                  <p className="card-copy">{learner.pathway.description}</p>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ marginTop: 'auto' }}
                    onClick={() => onNavigate(`/alumni?pathway=${learner.pathway.code}`)}
                  >
                    Connect with {learner.pathway.code} Alumni
                    <ArrowRight size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="form-panel">
                <h2 className="card-title" style={{ marginBottom: '12px' }}>
                  Explore All 11 Digital Career Pathways
                </h2>
                <div className="grid-3">
                  {learner.all_pathways.map((pw) => (
                    <div
                      key={pw.code}
                      style={{
                        padding: '14px',
                        border:
                          pw.code === learner.pathway.code
                            ? '1px solid var(--navy)'
                            : '1px solid var(--line)',
                        borderRadius: 'var(--radius-sm)',
                        background:
                          pw.code === learner.pathway.code ? 'var(--cream)' : 'var(--white)',
                      }}
                    >
                      <div className="meta-inline" style={{ marginBottom: '4px' }}>
                        <span className="pathway-code">{pw.code}</span>
                        <span>·</span>
                        <span>{pw.status}</span>
                      </div>
                      <strong style={{ fontSize: '0.94rem', color: 'var(--navy)' }}>
                        {pw.name}
                      </strong>
                      <p className="card-copy" style={{ fontSize: '0.84rem', marginTop: '6px' }}>
                        {pw.learners_enrolled} learners enrolled · Avg {pw.avg_days_to_first_gig}{' '}
                        days to gig
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })() : null}

        {/* 3. Alumni Workspace */}
        {!loading && data?.role === 'alumni' ? (() => {
          const alumData = data as AlumniDashboardPayload;
          return (
            <div className="grid-2" style={{ alignItems: 'start' }}>
              <div className="form-panel">
                <span className="kicker">Profile, Portfolio &amp; Consent Controls</span>
                <h2 className="card-title" style={{ marginBottom: '12px' }}>
                  Manage Public Graduate Profile
                </h2>

                {saveMessage ? (
                  <div className="alert-box alert-success" style={{ marginBottom: '16px' }}>
                    <CheckCircle2 size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
                    <span>{saveMessage}</span>
                  </div>
                ) : null}

                <form onSubmit={handleSaveAlumni} style={{ display: 'grid', gap: '14px' }}>
                  <div className="field-group">
                    <label htmlFor="alum-availability">Availability status</label>
                    <select
                      id="alum-availability"
                      className="select-control"
                      value={availability}
                      onChange={(e) => setAvailability(e.target.value)}
                    >
                      <option value="Available for freelance work">Available for freelance work</option>
                      <option value="Available part-time">Available part-time</option>
                      <option value="Open to full-time roles">Open to full-time roles</option>
                      <option value="Open to work">Open to work</option>
                      <option value="Freelancing">Freelancing</option>
                      <option value="Employed">Employed</option>
                      <option value="Available for projects">Available for projects</option>
                    </select>
                  </div>

                  <div className="field-group">
                    <label htmlFor="alum-skills">Skills (comma-separated)</label>
                    <input
                      id="alum-skills"
                      type="text"
                      className="input-control"
                      value={skillsText}
                      onChange={(e) => setSkillsText(e.target.value)}
                    />
                  </div>

                  <div className="field-group">
                    <label htmlFor="alum-portfolio-title">Featured portfolio deliverable</label>
                    <input
                      id="alum-portfolio-title"
                      type="text"
                      className="input-control"
                      value={portfolioTitle}
                      onChange={(e) => setPortfolioTitle(e.target.value)}
                      placeholder="e.g. Regional E-Commerce Campaign Case Study"
                    />
                  </div>

                  <div className="form-grid-2">
                    <div className="field-group">
                      <label htmlFor="alum-portfolio-url">Portfolio URL (optional)</label>
                      <input
                        id="alum-portfolio-url"
                        type="url"
                        className="input-control"
                        value={portfolioUrl}
                        onChange={(e) => setPortfolioUrl(e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="field-group">
                      <label htmlFor="alum-website">Personal website (optional)</label>
                      <input
                        id="alum-website"
                        type="url"
                        className="input-control"
                        value={personalWebsite}
                        onChange={(e) => setPersonalWebsite(e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <div className="field-group">
                    <label htmlFor="alum-linkedin">LinkedIn URL (optional)</label>
                    <input
                      id="alum-linkedin"
                      type="url"
                      className="input-control"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      placeholder="https://www.linkedin.com/in/..."
                    />
                  </div>

                  <div className="field-group">
                    <label htmlFor="alum-bio">Short public bio</label>
                    <textarea
                      id="alum-bio"
                      className="textarea-control"
                      value={shortBio}
                      onChange={(e) => setShortBio(e.target.value)}
                      maxLength={2000}
                    />
                  </div>

                  <div className="form-grid-2">
                    <div className="field-group">
                      <label htmlFor="alum-photo-upload">Profile photo (PNG, JPEG, WEBP · max 2 MB)</label>
                      <label
                        htmlFor="alum-photo-upload"
                        className="btn btn-outline btn-sm"
                        style={{ width: 'fit-content', cursor: 'pointer' }}
                      >
                        <ImagePlus size={15} aria-hidden="true" />
                        {uploadingAsset === 'alumni_photo' ? 'Uploading photo...' : 'Upload Profile Photo'}
                      </label>
                      <input
                        id="alum-photo-upload"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        disabled={uploadingAsset !== null}
                        onChange={(e) => void handleAssetUpload('alumni_photo', e)}
                      />
                      {photoPreviewUrl ? (
                        <div className="portfolio-preview-card" style={{ marginTop: '6px', maxWidth: '220px' }}>
                          <img src={photoPreviewUrl} alt="Alumnus uploaded profile preview" />
                        </div>
                      ) : null}
                    </div>

                    <div className="field-group">
                      <label htmlFor="alum-portfolio-upload">
                        Portfolio showcase image (PNG, JPEG, WEBP · max 2 MB)
                      </label>
                      <label
                        htmlFor="alum-portfolio-upload"
                        className="btn btn-outline btn-sm"
                        style={{ width: 'fit-content', cursor: 'pointer' }}
                      >
                        <ImagePlus size={15} aria-hidden="true" />
                        {uploadingAsset === 'alumni_portfolio'
                          ? 'Uploading portfolio...'
                          : 'Upload Portfolio Image'}
                      </label>
                      <input
                        id="alum-portfolio-upload"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        disabled={uploadingAsset !== null}
                        onChange={(e) => void handleAssetUpload('alumni_portfolio', e)}
                      />
                      {portfolioImagePreviewUrl ? (
                        <div className="portfolio-preview-card" style={{ marginTop: '6px', maxWidth: '220px' }}>
                          <img src={portfolioImagePreviewUrl} alt="Uploaded portfolio preview" />
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={consentPublish}
                      onChange={(e) => setConsentPublish(e.target.checked)}
                    />
                    <span>
                      Publish my profile in the public Konexio Africa Alumni Directory.
                    </span>
                  </label>

                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={consentPhoto}
                      onChange={(e) => setConsentPhoto(e.target.checked)}
                    />
                    <span>
                      Allow photo or video display (uncheck for a text-only public profile).
                    </span>
                  </label>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                      <Save size={15} aria-hidden="true" />
                      {savingProfile ? 'Saving...' : 'Save Preferences'}
                    </button>
                    {alumData.profile && consentPublish ? (
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => onNavigate(`/alumni/${alumData.profile!.business_id}`)}
                      >
                        View Public Profile
                      </button>
                    ) : null}
                  </div>
                </form>
              </div>

              <div className="card">
                <span className="kicker">Employer &amp; Client Routing</span>
                <h2 className="card-title">Matched Opportunities ({alumData.inquiries.length})</h2>
                {alumData.inquiries.length === 0 ? (
                  <p className="card-copy">
                    No direct inquiries routed to your profile or pathway yet. Keep your
                    availability, portfolio links, and skills updated for matching.
                  </p>
                ) : (
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {alumData.inquiries.map((inq) => (
                      <div
                        key={inq.business_id}
                        style={{
                          padding: '14px',
                          border: '1px solid var(--line)',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--cream)',
                        }}
                      >
                        <div className="meta-inline" style={{ marginBottom: '6px' }}>
                          <span className="mono">{inq.business_id}</span>
                          <span>·</span>
                          <strong>{inq.organisation}</strong>
                          <span>·</span>
                          <span>{inq.visitor_type}</span>
                        </div>
                        <p className="card-copy">{inq.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })() : null}

        {/* 4. Partner / Donor Workspace */}
        {!loading && (data?.role === 'partner' || data?.role === 'donor') ? (() => {
          const partnerData = data as PartnerDashboardPayload;
          return (
            <div style={{ display: 'grid', gap: '24px' }}>
              <div className="kpi-strip" style={{ marginTop: 0 }}>
                <div className="kpi-card">
                  <span className="kpi-label">Learners Trained</span>
                  <span className="kpi-value">
                    {partnerData.summary.learners_trained.toLocaleString()}
                  </span>
                  <span className="kpi-sub">As of {partnerData.summary.as_of}</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Graduates</span>
                  <span className="kpi-value">{partnerData.summary.graduates.toLocaleString()}</span>
                  <span className="kpi-sub">{partnerData.summary.women_pct}% women learners</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Employment Rate</span>
                  <span className="kpi-value">{partnerData.summary.employment_rate_pct}%</span>
                  <span className="kpi-sub">
                    {partnerData.summary.employed_or_freelancing} employed / freelancing
                  </span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Active Hubs</span>
                  <span className="kpi-value">{partnerData.summary.countries}</span>
                  <span className="kpi-sub">{partnerData.summary.cohorts_completed} cohorts</span>
                </div>
              </div>

              <div className="grid-2" style={{ alignItems: 'start' }}>
                <div className="card">
                  <Building2 size={20} aria-hidden="true" style={{ color: 'var(--navy)' }} />
                  <h2 className="card-title">
                    {partnerData.organisation?.organisation || 'Organisation Overview'}
                  </h2>
                  {partnerData.organisation ? (
                    <>
                      <div className="meta-inline">
                        <span className="mono">{partnerData.organisation.business_id}</span>
                        <span>·</span>
                        <span>{partnerData.organisation.type}</span>
                        <span>·</span>
                        <strong>Status: {partnerData.organisation.status}</strong>
                      </div>
                      <p className="card-copy">{partnerData.organisation.description}</p>
                      <p className="meta-inline">
                        Public website listing:{' '}
                        <strong>
                          {partnerData.organisation.show_on_site ? 'Published' : 'Pending approval'}
                        </strong>
                      </p>
                    </>
                  ) : (
                    <p className="card-copy">
                      Submit or update your institutional profile via our Get Involved partner
                      onboarding form.
                    </p>
                  )}

                  <div
                    style={{
                      marginTop: '10px',
                      paddingTop: '14px',
                      borderTop: '1px solid var(--line)',
                      display: 'grid',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Mail size={16} aria-hidden="true" style={{ color: 'var(--green)' }} />
                      <strong style={{ fontSize: '0.92rem', color: 'var(--navy)' }}>
                        Newsletter &amp; Briefing Preferences
                      </strong>
                    </div>

                    {newsletterNote ? (
                      <div className="alert-box alert-success" style={{ padding: '10px 12px' }}>
                        <span>{newsletterNote}</span>
                      </div>
                    ) : null}

                    <label className="checkbox-field">
                      <input
                        type="checkbox"
                        disabled={newsletterUpdating}
                        checked={Boolean(partnerData.newsletter_preferences?.donor_partner)}
                        onChange={(e) =>
                          handleNewsletterToggle('donor_partner', e.target.checked)
                        }
                      />
                      <span>Donor &amp; Partner quarterly impact briefings</span>
                    </label>
                    <label className="checkbox-field">
                      <input
                        type="checkbox"
                        disabled={newsletterUpdating}
                        checked={Boolean(partnerData.newsletter_preferences?.alumni)}
                        onChange={(e) => handleNewsletterToggle('alumni', e.target.checked)}
                      />
                      <span>General Konexio Africa community updates</span>
                    </label>
                  </div>

                  <button
                    type="button"
                    className="btn btn-amber btn-sm"
                    style={{ marginTop: 'auto' }}
                    onClick={() => onNavigate('/get-involved#express-interest')}
                  >
                    Submit Partnership or Funding Enquiry
                    <ArrowRight size={14} aria-hidden="true" />
                  </button>
                </div>

                <div className="card">
                  <FileBarChart size={20} aria-hidden="true" style={{ color: 'var(--green)' }} />
                  <h2 className="card-title">Approved Annual Reports</h2>
                  <p className="card-copy">
                    Review verified outcome summaries as of 31 October 2026.
                  </p>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {partnerData.reports.map((rep) => (
                      <div
                        key={rep.year}
                        style={{
                          padding: '10px 12px',
                          border: '1px solid var(--line)',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--cream)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '8px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <strong style={{ fontSize: '0.9rem', color: 'var(--navy)' }}>
                            {rep.title}
                          </strong>
                          {rep.pdf_url ? (
                            <a
                              href={rep.pdf_url}
                              download={`Konexio-Africa-Annual-Report-${rep.year}.pdf`}
                              className="inline-link-btn"
                              style={{ fontSize: '0.8rem' }}
                            >
                              PDF
                            </a>
                          ) : null}
                        </div>
                        <div className="meta-inline">
                          <span>{rep.learners_trained.toLocaleString()} trained</span>
                          <span>·</span>
                          <span>{rep.employed_or_freelancing_pct}% employed</span>
                          <span>·</span>
                          <span>{rep.women_pct}% women</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => onNavigate('/impact')}
                  >
                    Open Full Impact &amp; Reports Page
                  </button>
                </div>
              </div>
            </div>
          );
        })() : null}
          </>
        )}
      </div>
    </section>
  );
};

export default DashboardPage;
