import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Globe,
  Languages,
  MapPin,
  Search,
  ShieldAlert,
  Sparkles,
  UserCheck,
  Video,
} from 'lucide-react';
import { fetchAlumni, fetchAlumnusDetail, fetchProgrammes } from '../api';
import type { PathwayInfo, PublicAlumnus } from '../types';

type AlumniPageProps = {
  onNavigate: (path: string) => void;
  initialSearch?: string;
  businessId?: string;
};

const AVAILABILITY_OPTIONS = [
  'Available for freelance work',
  'Available part-time',
  'Open to full-time roles',
  'Open to work',
  'Freelancing',
  'Employed',
  'Available for projects',
];

const AlumniPage = ({ onNavigate, initialSearch = '', businessId }: AlumniPageProps) => {
  const initialParams = new URLSearchParams(initialSearch);

  // Directory filters
  const [searchQuery, setSearchQuery] = useState(initialParams.get('q') ?? '');
  const [pathwayFilter, setPathwayFilter] = useState(initialParams.get('pathway') ?? '');
  const [countryFilter, setCountryFilter] = useState(initialParams.get('country') ?? '');
  const [skillFilter, setSkillFilter] = useState(initialParams.get('skill') ?? '');
  const [availabilityFilter, setAvailabilityFilter] = useState(
    initialParams.get('availability') ?? '',
  );

  // Directory data
  const [alumni, setAlumni] = useState<PublicAlumnus[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [pathways, setPathways] = useState<PathwayInfo[]>([]);
  const [loadedQueryKey, setLoadedQueryKey] = useState<string | null>(null);
  const [directoryError, setDirectoryError] = useState<string | null>(null);

  // Profile detail data
  const [profile, setProfile] = useState<PublicAlumnus | null>(null);
  const [related, setRelated] = useState<PublicAlumnus[]>([]);
  const [loadedProfileId, setLoadedProfileId] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const currentQueryKey = `${searchQuery.trim()}|${pathwayFilter}|${countryFilter}|${skillFilter.trim()}|${availabilityFilter}`;
  const directoryLoading = !businessId && loadedQueryKey !== currentQueryKey && !directoryError;
  const profileLoading = Boolean(businessId) && loadedProfileId !== businessId && !profileError;

  useEffect(() => {
    let active = true;
    fetchProgrammes()
      .then((res) => {
        if (active) setPathways(res.pathways);
      })
      .catch(() => {
        /* Handled gracefully by filter options */
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!businessId) return;
    let active = true;

    fetchAlumnusDetail(businessId)
      .then((res) => {
        if (!active) return;
        setProfile(res.profile);
        setRelated(res.related);
        setProfileError(null);
        setLoadedProfileId(businessId);
      })
      .catch((err) => {
        if (!active) return;
        setProfile(null);
        setProfileError(err instanceof Error ? err.message : 'Alumni profile unavailable.');
        setLoadedProfileId(businessId);
      });

    return () => {
      active = false;
    };
  }, [businessId]);

  useEffect(() => {
    if (businessId) return;
    let active = true;

    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (pathwayFilter) params.set('pathway', pathwayFilter);
    if (countryFilter) params.set('country', countryFilter);
    if (skillFilter.trim()) params.set('skill', skillFilter.trim());
    if (availabilityFilter) params.set('availability', availabilityFilter);
    const nextSearch = params.toString();
    const targetUrl = nextSearch ? `/alumni?${nextSearch}` : '/alumni';
    if (window.location.pathname + window.location.search !== targetUrl) {
      window.history.replaceState({}, '', targetUrl);
    }

    fetchAlumni({
      q: searchQuery.trim() || undefined,
      pathway: pathwayFilter || undefined,
      country: countryFilter || undefined,
      skill: skillFilter.trim() || undefined,
      availability: availabilityFilter || undefined,
    })
      .then((res) => {
        if (!active) return;
        setAlumni(res.alumni);
        setCountries((prev) => (res.countries.length > 0 ? res.countries : prev));
        setDirectoryError(null);
        setLoadedQueryKey(currentQueryKey);
      })
      .catch((err) => {
        if (!active) return;
        setDirectoryError(err instanceof Error ? err.message : 'Unable to load alumni directory.');
        setLoadedQueryKey(currentQueryKey);
      });

    return () => {
      active = false;
    };
  }, [
    businessId,
    currentQueryKey,
    searchQuery,
    pathwayFilter,
    countryFilter,
    skillFilter,
    availabilityFilter,
  ]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setPathwayFilter('');
    setCountryFilter('');
    setSkillFilter('');
    setAvailabilityFilter('');
  };

  // Profile detail view (/alumni/:businessId)
  if (businessId) {
    if (profileLoading) {
      return (
        <section className="section">
          <div className="container">
            <p className="card-copy">Loading verified public alumnus profile...</p>
          </div>
        </section>
      );
    }

    if (profileError || !profile) {
      return (
        <section className="section">
          <div className="container">
            <div className="form-panel" style={{ maxWidth: '640px' }}>
              <div className="alert-box alert-info">
                <ShieldAlert size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>Public Profile Unavailable</strong>
                  <p style={{ margin: '6px 0 0' }}>
                    This alumnus record is either private, unpublished by consent preference, or does not exist.
                  </p>
                </div>
              </div>
              <div className="hero-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => onNavigate('/alumni')}
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                  Return to Alumni Directory
                </button>
              </div>
            </div>
          </div>
        </section>
      );
    }

    const displayName = `${profile.first_name} ${profile.last_name}`.trim();
    const locationText = [profile.city, profile.country].filter(Boolean).join(', ');

    return (
      <>
        <section className="section-tight section-surface-white">
          <div className="container">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ marginBottom: '20px', paddingInline: 0 }}
              onClick={() => onNavigate('/alumni')}
            >
              <ArrowLeft size={15} aria-hidden="true" />
              Back to Alumni Directory
            </button>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '24px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                <div
                  className={`avatar avatar-lg${profile.consent_to_show_photo ? ' avatar-green' : ''}`}
                  aria-hidden="true"
                >
                  {profile.initials}
                </div>
                <div>
                  <div className="meta-inline" style={{ marginBottom: '6px' }}>
                    <span className="pathway-code">{profile.business_id}</span>
                    <span>·</span>
                    <span>{profile.pathway_code} · {profile.pathway_name}</span>
                    <span>·</span>
                    <strong>{profile.availability}</strong>
                  </div>
                  <h1 className="page-title">{displayName}</h1>
                  {locationText ? (
                    <div className="meta-inline" style={{ marginTop: '6px' }}>
                      <MapPin size={15} aria-hidden="true" />
                      <span>{locationText}</span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="hero-actions" style={{ marginTop: 0 }}>
                <button
                  type="button"
                  className="btn btn-amber"
                  onClick={() =>
                    onNavigate(
                      `/get-involved?interest_type=alumni&interest_value=${encodeURIComponent(
                        profile.business_id,
                      )}#express-interest`,
                    )
                  }
                >
                  Express interest in this alumnus
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="grid-2" style={{ alignItems: 'start' }}>
              <div className="card">
                <span className="kicker">Profile Summary</span>
                <h2 className="card-title">About & Specialisation</h2>
                <p className="card-copy">
                  {profile.short_bio ||
                    'Konexio Africa Digi Pass graduate ready for remote employment and project delivery.'}
                </p>

                {profile.skills.length > 0 ? (
                  <div style={{ marginTop: '8px' }}>
                    <strong style={{ fontSize: '0.84rem', color: 'var(--navy)' }}>
                      Core Technical & Workplace Skills
                    </strong>
                    <p className="card-copy" style={{ marginTop: '4px' }}>
                      {profile.skills.join(' · ')}
                    </p>
                  </div>
                ) : null}

                {profile.languages.length > 0 ? (
                  <div className="meta-inline" style={{ marginTop: '6px' }}>
                    <Languages size={15} aria-hidden="true" />
                    <span>Working languages: {profile.languages.join(', ')}</span>
                  </div>
                ) : null}

                {!profile.consent_to_show_photo ? (
                  <div className="alert-box alert-info" style={{ marginTop: '8px' }}>
                    <UserCheck size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>
                      Text-only public profile: per this alumnus’s consent settings, no portrait photograph or video is displayed.
                    </span>
                  </div>
                ) : profile.has_video ? (
                  <div className="meta-inline" style={{ marginTop: '6px', color: 'var(--green-ink)' }}>
                    <Video size={15} aria-hidden="true" />
                    <span>Approved graduate introduction record on file</span>
                  </div>
                ) : null}
              </div>

              <div className="card">
                <span className="kicker">Work & Credentials</span>
                <h2 className="card-title">Portfolio & Public Links</h2>
                {profile.consent_to_show_photo && profile.portfolio_image ? (
                  <div className="portfolio-preview-card">
                    <img
                      src={profile.portfolio_image}
                      alt={
                        profile.portfolio_title
                          ? `${profile.portfolio_title} visual deliverable`
                          : `${displayName} portfolio showcase`
                      }
                    />
                  </div>
                ) : null}
                {profile.portfolio_title ? (
                  <div>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--navy)' }}>
                      Featured Portfolio Deliverable
                    </strong>
                    <p className="card-copy" style={{ marginTop: '4px' }}>
                      {profile.portfolio_title}
                    </p>
                  </div>
                ) : null}

                <div style={{ display: 'grid', gap: '10px', marginTop: '6px' }}>
                  {profile.portfolio_url ? (
                    <a
                      href={profile.portfolio_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline btn-sm"
                      style={{ justifyContent: 'space-between' }}
                    >
                      <span>View Portfolio Sample</span>
                      <ExternalLink size={14} aria-hidden="true" />
                    </a>
                  ) : null}
                  {profile.personal_website ? (
                    <a
                      href={profile.personal_website}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline btn-sm"
                      style={{ justifyContent: 'space-between' }}
                    >
                      <span>Personal Website</span>
                      <Globe size={14} aria-hidden="true" />
                    </a>
                  ) : null}
                  {profile.linkedin_url ? (
                    <a
                      href={profile.linkedin_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline btn-sm"
                      style={{ justifyContent: 'space-between' }}
                    >
                      <span>LinkedIn Profile</span>
                      <ExternalLink size={14} aria-hidden="true" />
                    </a>
                  ) : null}
                  {!profile.portfolio_url && !profile.personal_website && !profile.linkedin_url ? (
                    <p className="card-copy">
                      Contact introductions and portfolio samples are coordinated securely by the Konexio Africa Alumni Community team via the Express Interest workflow.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            {related.length > 0 ? (
              <div style={{ marginTop: '48px' }}>
                <div className="section-header-row" style={{ marginBottom: '20px' }}>
                  <div>
                    <span className="kicker">Same Pathway Peers</span>
                    <h2 className="section-title">Other Graduates in {profile.pathway_code}</h2>
                  </div>
                </div>
                <div className="grid-3">
                  {related.map((peer) => (
                    <article key={peer.business_id} className="card">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="avatar" aria-hidden="true">
                          {peer.initials}
                        </div>
                        <div>
                          <h3 className="card-title">
                            {peer.first_name} {peer.last_name}
                          </h3>
                          <div className="meta-inline">
                            <span>{[peer.city, peer.country].filter(Boolean).join(', ')}</span>
                            <span>·</span>
                            <span>{peer.availability}</span>
                          </div>
                        </div>
                      </div>
                      <p className="card-copy">{peer.short_bio}</p>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ marginTop: 'auto' }}
                        onClick={() => onNavigate(`/alumni/${peer.business_id}`)}
                      >
                        View Profile
                        <ArrowRight size={14} aria-hidden="true" />
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </>
    );
  }

  // Directory view (/alumni)
  return (
    <>
      <section className="section-tight section-surface-white">
        <div className="container">
          <div className="section-header-row" style={{ marginBottom: '20px' }}>
            <div>
              <span className="kicker">Alumni Talent Directory</span>
              <h1 className="page-title">Consent-Approved Digi Pass Graduates</h1>
              <p className="lead-copy">
                Search trained freelancers and job-ready digital specialists across Africa. Only alumni who have given explicit consent appear in this public directory; direct introductions are routed through Konexio Africa without exposing private email addresses.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-amber"
              onClick={() => onNavigate('/get-involved#express-interest')}
            >
              Employer? Find Talent
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>

          <form
            className="filter-bar filter-bar-5"
            onSubmit={(e) => e.preventDefault()}
            aria-label="Filter alumni directory"
          >
            <div className="field-group">
              <label htmlFor="alumni-search">Search name or city</label>
              <div style={{ position: 'relative' }}>
                <Search
                  size={16}
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--slate)',
                  }}
                />
                <input
                  id="alumni-search"
                  type="search"
                  className="input-control"
                  style={{ paddingLeft: '36px' }}
                  placeholder="Name, hub city, or keyword"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="alumni-pathway">Programme pathway</label>
              <select
                id="alumni-pathway"
                className="select-control"
                value={pathwayFilter}
                onChange={(e) => setPathwayFilter(e.target.value)}
              >
                <option value="">All 11 pathways</option>
                {pathways.map((pw) => (
                  <option key={pw.code} value={pw.code}>
                    {pw.code} · {pw.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label htmlFor="alumni-country">Country</label>
              <select
                id="alumni-country"
                className="select-control"
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
              >
                <option value="">All countries</option>
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label htmlFor="alumni-skill">Skills filter</label>
              <input
                id="alumni-skill"
                type="search"
                className="input-control"
                placeholder="e.g. Figma, SQL, Canva"
                value={skillFilter}
                onChange={(e) => setSkillFilter(e.target.value)}
              />
            </div>

            <div className="field-group">
              <label htmlFor="alumni-availability">Availability</label>
              <select
                id="alumni-availability"
                className="select-control"
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value)}
              >
                <option value="">Any availability</option>
                {AVAILABILITY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="btn btn-outline"
              onClick={handleResetFilters}
              disabled={
                !searchQuery &&
                !pathwayFilter &&
                !countryFilter &&
                !skillFilter &&
                !availabilityFilter
              }
            >
              Reset
            </button>
          </form>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              marginBottom: '20px',
              flexWrap: 'wrap',
            }}
            aria-live="polite"
          >
            <p className="card-copy">
              {directoryLoading
                ? 'Searching public alumni profiles...'
                : `Showing ${alumni.length} consent-approved public ${alumni.length === 1 ? 'profile' : 'profiles'}.`}
            </p>
            <button
              type="button"
              className="inline-link-btn"
              onClick={() => onNavigate('/get-involved#express-interest')}
            >
              Request pathway talent matching
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>

          {directoryError ? (
            <div className="alert-box alert-error">{directoryError}</div>
          ) : null}

          {!directoryLoading && alumni.length === 0 ? (
            <div className="form-panel" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <Sparkles size={28} aria-hidden="true" style={{ color: 'var(--amber-ink)', margin: '0 auto 12px' }} />
              <h2 className="card-title">No matching public alumni profiles found</h2>
              <p className="card-copy" style={{ maxWidth: '48ch', margin: '8px auto 20px' }}>
                Try widening your search keyword or clearing one of the country, pathway, or availability filters.
              </p>
              <button type="button" className="btn btn-primary" onClick={handleResetFilters}>
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid-3">
              {alumni.map((alum) => (
                <article key={alum.business_id} className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      className={`avatar${alum.consent_to_show_photo ? ' avatar-green' : ''}`}
                      aria-hidden="true"
                    >
                      {alum.initials}
                    </div>
                    <div>
                      <div className="meta-inline">
                        <span className="pathway-code">{alum.pathway_code}</span>
                        <span>·</span>
                        <span>{alum.availability}</span>
                      </div>
                      <h2 className="card-title">
                        {alum.first_name} {alum.last_name}
                      </h2>
                    </div>
                  </div>

                  <p className="card-copy" style={{ fontWeight: 600, color: 'var(--navy)' }}>
                    {alum.pathway_name}
                  </p>

                  {alum.consent_to_show_photo && alum.portfolio_image ? (
                    <div className="portfolio-thumb">
                      <img
                        src={alum.portfolio_image}
                        alt={
                          alum.portfolio_title
                            ? `${alum.portfolio_title} preview`
                            : `${alum.first_name} ${alum.last_name} deliverable`
                        }
                        loading="lazy"
                      />
                    </div>
                  ) : null}

                  <p className="card-copy">{alum.short_bio}</p>

                  {alum.skills.length > 0 ? (
                    <p className="meta-inline" style={{ marginTop: 'auto' }}>
                      <strong>Skills:</strong> {alum.skills.slice(0, 4).join(' · ')}
                    </p>
                  ) : null}

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      paddingTop: '12px',
                      borderTop: '1px solid var(--line)',
                      marginTop: alum.skills.length > 0 ? '4px' : 'auto',
                    }}
                  >
                    <span className="meta-inline">
                      <MapPin size={14} aria-hidden="true" />
                      {[alum.city, alum.country].filter(Boolean).join(', ')}
                    </span>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => onNavigate(`/alumni/${alum.business_id}`)}
                    >
                      View Profile
                      <ArrowRight size={14} aria-hidden="true" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default AlumniPage;