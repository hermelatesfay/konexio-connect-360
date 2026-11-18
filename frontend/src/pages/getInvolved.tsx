import { type FormEvent, useEffect, useState } from 'react';
import {
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  Globe,
  GraduationCap,
  HeartHandshake,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import communityPhoto from '../assets/images/community_network_1794927726435.jpg';
import {
  PARTNER_LOGOS,
  fetchAlumni,
  fetchPartners,
  fetchProgrammes,
  registerPartnerApplication,
  submitExpressInterest,
  subscribeNewsletter,
} from '../api';
import type {
  ExpressInterestResponse,
  PathwayInfo,
  PublicAlumnus,
  PublicPartner,
} from '../types';

type GetInvolvedPageProps = {
  onNavigate: (path: string) => void;
  initialSearch?: string;
};

const GetInvolvedPage = ({ onNavigate, initialSearch = '' }: GetInvolvedPageProps) => {
  const initialParams = new URLSearchParams(initialSearch);
  const initialInterestType = initialParams.get('interest_type');
  const initialInterestValue = initialParams.get('interest_value') ?? '';
  const initialVisitorType = initialParams.get('visitor_type');

  const [alumni, setAlumni] = useState<PublicAlumnus[]>([]);
  const [pathways, setPathways] = useState<PathwayInfo[]>([]);
  const [partners, setPartners] = useState<PublicPartner[]>([]);

  // Express Interest form state
  const [fullName, setFullName] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [email, setEmail] = useState('');
  const [visitorType, setVisitorType] = useState<'Employer' | 'Client' | 'Donor'>(
    initialVisitorType === 'Client' || initialVisitorType === 'Donor'
      ? initialVisitorType
      : 'Employer',
  );
  const [interestType, setInterestType] = useState<'alumni' | 'pathway' | 'general'>(
    initialInterestType === 'alumni' || initialInterestType === 'pathway'
      ? initialInterestType
      : 'pathway',
  );
  const [interestValue, setInterestValue] = useState(
    initialInterestValue || (initialInterestType === 'alumni' ? '' : 'P1'),
  );
  const [message, setMessage] = useState('');
  const [consentToContact, setConsentToContact] = useState(true);
  const [websiteUrlHoneypot, setWebsiteUrlHoneypot] = useState('');
  const [interestLoading, setInterestLoading] = useState(false);
  const [interestError, setInterestError] = useState<string | null>(null);
  const [interestReceipt, setInterestReceipt] = useState<ExpressInterestResponse | null>(null);

  // Partner Organisation Registration state
  const [partnerOrg, setPartnerOrg] = useState('');
  const [partnerType, setPartnerType] = useState<
    'Employer' | 'Client' | 'Training partner' | 'Donor'
  >('Employer');
  const [partnerCountry, setPartnerCountry] = useState('');
  const [partnerWebsite, setPartnerWebsite] = useState('');
  const [partnerContactName, setPartnerContactName] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [partnerPhone, setPartnerPhone] = useState('');
  const [partnerDescription, setPartnerDescription] = useState('');
  const [partnerLoading, setPartnerLoading] = useState(false);
  const [partnerError, setPartnerError] = useState<string | null>(null);
  const [partnerReceipt, setPartnerReceipt] = useState<{
    business_id: string;
    status: string;
  } | null>(null);

  // Donor & Partner Newsletter state
  const [donorEmail, setDonorEmail] = useState('');
  const [donorConsent, setDonorConsent] = useState(false);
  const [donorHoneypot, setDonorHoneypot] = useState('');
  const [donorNewsStatus, setDonorNewsStatus] = useState<string | null>(null);
  const [donorNewsError, setDonorNewsError] = useState<string | null>(null);
  const [donorNewsLoading, setDonorNewsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([fetchAlumni(), fetchProgrammes(), fetchPartners()])
      .then(([alumniRes, progRes, partnersRes]) => {
        if (!active) return;
        setAlumni(alumniRes.alumni);
        setPathways(progRes.pathways);
        setPartners(partnersRes.partners);
      })
      .catch(() => {
        /* Handled gracefully on submit if needed */
      });
    return () => {
      active = false;
    };
  }, []);

  const handleInterestTypeChange = (nextType: 'alumni' | 'pathway' | 'general') => {
    setInterestType(nextType);
    if (nextType === 'pathway') {
      setInterestValue(pathways[0]?.code ?? 'P1');
    } else if (nextType === 'alumni') {
      setInterestValue(alumni[0]?.business_id ?? '');
    } else {
      setInterestValue('');
    }
  };

  const handleExpressInterestSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setInterestError(null);

    if (!fullName.trim()) {
      setInterestError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setInterestError('Please enter a valid work or personal email address.');
      return;
    }
    if (interestType === 'alumni' && !interestValue) {
      setInterestError('Please select a public alumnus from the directory.');
      return;
    }
    if (interestType === 'pathway' && !interestValue) {
      setInterestError('Please select one of the 11 programme pathways.');
      return;
    }
    if (!message.trim() || message.trim().length > 1500) {
      setInterestError('Please provide a message (1 to 1,500 characters).');
      return;
    }

    setInterestLoading(true);
    try {
      const response = await submitExpressInterest({
        full_name: fullName.trim(),
        organisation: organisation.trim() || undefined,
        email: email.trim(),
        visitor_type: visitorType,
        interest_type: interestType,
        interest_value: interestType === 'general' ? undefined : interestValue,
        message: message.trim(),
        consent_to_be_contacted: consentToContact,
        website_url: websiteUrlHoneypot,
      });
      setInterestReceipt(response);
      setMessage('');
    } catch (err) {
      setInterestError(
        err instanceof Error ? err.message : 'Unable to submit your enquiry. Please try again.',
      );
    } finally {
      setInterestLoading(false);
    }
  };

  const handlePartnerSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPartnerError(null);

    if (
      !partnerOrg.trim() ||
      !partnerContactName.trim() ||
      !partnerEmail.trim() ||
      !partnerDescription.trim()
    ) {
      setPartnerError('Please complete organisation, contact name, email, and description.');
      return;
    }

    setPartnerLoading(true);
    try {
      const response = await registerPartnerApplication({
        organisation: partnerOrg.trim(),
        type: partnerType,
        country: partnerCountry.trim() || undefined,
        website: partnerWebsite.trim() || undefined,
        contact_name: partnerContactName.trim(),
        email: partnerEmail.trim(),
        phone: partnerPhone.trim() || undefined,
        description: partnerDescription.trim(),
      });
      setPartnerReceipt(response);
      setPartnerOrg('');
      setPartnerDescription('');
    } catch (err) {
      setPartnerError(
        err instanceof Error ? err.message : 'Unable to submit partner registration.',
      );
    } finally {
      setPartnerLoading(false);
    }
  };

  const handleDonorNewsletterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setDonorNewsStatus(null);
    setDonorNewsError(null);

    if (!donorEmail.trim() || !donorEmail.includes('@')) {
      setDonorNewsError('Please enter a valid organisation or work email address.');
      return;
    }
    if (!donorConsent) {
      setDonorNewsError('Please confirm your consent to receive Donor & Partner updates.');
      return;
    }

    setDonorNewsLoading(true);
    try {
      const res = await subscribeNewsletter({
        email: donorEmail.trim(),
        list: 'donor_partner',
        consent: donorConsent,
        website_url: donorHoneypot,
      });
      setDonorNewsStatus(res.message);
      setDonorEmail('');
      setDonorConsent(false);
    } catch (err) {
      setDonorNewsError(
        err instanceof Error ? err.message : 'Unable to save subscription right now.',
      );
    } finally {
      setDonorNewsLoading(false);
    }
  };

  return (
    <>
      <section className="section-tight section-surface-white">
        <div className="container">
          <div className="split-editorial">
            <div>
              <span className="kicker">Partnerships &amp; Participation</span>
              <h1 className="page-title">Get Involved with Konexio Africa</h1>
              <p className="lead-copy">
                Partner with us to hire vetted Digi Pass graduates, fund training cohorts,
                collaborate on technical curriculum delivery, or widen remote work access across
                seven African hubs.
              </p>
              <div className="hero-actions">
                <a href="#express-interest" className="btn btn-amber">
                  Express Hiring or Donor Interest
                  <ArrowRight size={16} aria-hidden="true" />
                </a>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => onNavigate('/signup?type=learner')}
                >
                  Apply as a Learner
                </button>
              </div>
            </div>

            <div className="photo-frame" style={{ aspectRatio: '4 / 3' }}>
              <img
                src={communityPhoto}
                alt="Konexio Africa graduates and employers collaborating during a partner showcase"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Four Explicit Participation Pathways */}
      <section className="section">
        <div className="container">
          <div className="section-header-row">
            <div>
              <span className="kicker">Ways to Collaborate</span>
              <h2 className="section-title">Four Ways to Get Involved</h2>
            </div>
          </div>

          <div className="grid-2">
            <article className="card">
              <Briefcase size={24} aria-hidden="true" style={{ color: 'var(--green)' }} />
              <h3 className="card-title">1. Become an employer or client</h3>
              <p className="card-copy">
                Recruit trained graduates or commission project freelancers across 11 digital
                pathways. Filter consent-approved profiles in our Alumni Directory or route a
                role/project brief directly to our Partnerships Lead and Alumni Community Manager.
              </p>
              <div className="hero-actions" style={{ marginTop: 'auto' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => onNavigate('/alumni')}
                >
                  Browse Alumni Talent
                </button>
                <a href="#express-interest" className="btn btn-outline btn-sm">
                  Submit Hiring Brief
                </a>
              </div>
            </article>

            <article className="card">
              <HeartHandshake size={24} aria-hidden="true" style={{ color: 'var(--amber-ink)' }} />
              <h3 className="card-title">2. Become a donor or funding partner</h3>
              <p className="card-copy">
                Co-fund regional cohorts, women-in-tech access initiatives, or youth employability
                grants across our seven active cities. Receive structured annual reports and track
                reconciled outcomes through 31 October 2026.
              </p>
              <div className="hero-actions" style={{ marginTop: 'auto' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => onNavigate('/impact')}
                >
                  Inspect Impact &amp; Reports
                </button>
                <button
                  type="button"
                  className="btn btn-amber btn-sm"
                  onClick={() => onNavigate('/signup?type=donor')}
                >
                  Join as a Donor
                </button>
              </div>
            </article>

            <article className="card">
              <Building2 size={24} aria-hidden="true" style={{ color: 'var(--navy)' }} />
              <h3 className="card-title">3. Become a training or strategic partner</h3>
              <p className="card-copy">
                Co-deliver technical mentorship, host regional training labs, or align local
                community outreach and certification bridges with our Part I foundations and
                specialized Part II tracks.
              </p>
              <div className="hero-actions" style={{ marginTop: 'auto' }}>
                <a href="#partner-register" className="btn btn-outline btn-sm">
                  Register Your Organisation
                  <ArrowRight size={14} aria-hidden="true" />
                </a>
              </div>
            </article>

            <article className="card">
              <GraduationCap size={24} aria-hidden="true" style={{ color: 'var(--green)' }} />
              <h3 className="card-title">4. Support digital skills and employment opportunities</h3>
              <p className="card-copy">
                Host mock interviews, provide project briefs for capstone practice, refer youth
                candidates, or join as an aspiring learner starting Part I Career Readiness.
              </p>
              <div className="hero-actions" style={{ marginTop: 'auto' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => onNavigate('/signup?type=learner')}
                >
                  Apply as a Learner
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => onNavigate('/contact')}
                >
                  Contact Our Team
                </button>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Approved Sample Partners Wall */}
      <section className="section section-surface-white">
        <div className="container">
          <div className="section-header-row">
            <div>
              <span className="kicker">
                Approved Network · 31 October 2026
              </span>
              <h2 className="section-title">Approved Employer, Training &amp; Funding Partners</h2>
            </div>
          </div>

          <div className="partners-grid">
            {partners.map((partner) => {
              const logoSrc = partner.logo_key ? PARTNER_LOGOS[partner.logo_key] : null;
              return (
                <article key={partner.business_id} className="partner-tile">
                  <div className="partner-logo-box">
                    {logoSrc ? (
                      <img
                        src={logoSrc}
                        alt={`${partner.organisation} logo`}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="partner-logo-fallback">{partner.organisation}</span>
                    )}
                  </div>
                  <div className="meta-inline">
                    <span className="pathway-code">{partner.business_id}</span>
                    <span>·</span>
                    <span>{partner.type}</span>
                    {partner.country ? (
                      <>
                        <span>·</span>
                        <span>{partner.country}</span>
                      </>
                    ) : null}
                  </div>
                  <h3 className="card-title">{partner.organisation}</h3>
                  {partner.description ? <p className="card-copy">{partner.description}</p> : null}
                  {partner.website ? (
                    <a
                      href={partner.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-link-btn"
                      style={{ marginTop: 'auto', fontSize: '0.84rem' }}
                    >
                      <Globe size={14} aria-hidden="true" />
                      Organisation Website
                    </a>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Express Interest + Partner Forms */}
      <section id="express-interest" className="section">
        <div className="container">
          <div className="grid-2" style={{ alignItems: 'start' }}>
            {/* Express Interest Form */}
            <div className="form-panel">
              <span className="kicker">Employer, Client &amp; Donor Routing</span>
              <h2 className="section-title" style={{ marginBottom: '8px' }}>
                Express Interest
              </h2>
              <p className="card-copy" style={{ marginBottom: '20px' }}>
                Submit an enquiry about a specific public alumnus, a technical pathway, or general
                cohort sponsorship. Every enquiry receives a reference ID and 3-working-day SLA.
              </p>

              {interestReceipt ? (
                <div className="alert-box alert-success" style={{ marginBottom: '20px' }}>
                  <CheckCircle2
                    size={20}
                    aria-hidden="true"
                    style={{ flexShrink: 0, marginTop: '2px' }}
                  />
                  <div>
                    <strong>Inquiry Logged · Reference {interestReceipt.reference_id}</strong>
                    <p style={{ margin: '6px 0 4px' }}>{interestReceipt.message}</p>
                    <p style={{ margin: 0, fontSize: '0.84rem' }}>
                      Expected response time:{' '}
                      <strong>{interestReceipt.expected_response_time}</strong>.
                    </p>
                  </div>
                </div>
              ) : null}

              {interestError ? (
                <div className="alert-box alert-error" style={{ marginBottom: '18px' }}>
                  {interestError}
                </div>
              ) : null}

              <form onSubmit={handleExpressInterestSubmit} style={{ display: 'grid', gap: '14px' }}>
                <div className="sr-only" aria-hidden="true">
                  <label htmlFor="interest-website-url">Website</label>
                  <input
                    id="interest-website-url"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={websiteUrlHoneypot}
                    onChange={(e) => setWebsiteUrlHoneypot(e.target.value)}
                  />
                </div>

                <div className="form-grid-2">
                  <div className="field-group">
                    <label htmlFor="interest-full-name">Full name</label>
                    <input
                      id="interest-full-name"
                      type="text"
                      className="input-control"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor="interest-org">Organisation (optional)</label>
                    <input
                      id="interest-org"
                      type="text"
                      className="input-control"
                      value={organisation}
                      onChange={(e) => setOrganisation(e.target.value)}
                      placeholder="Company or foundation"
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="field-group">
                    <label htmlFor="interest-email">Work email</label>
                    <input
                      id="interest-email"
                      type="email"
                      className="input-control"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@organisation.org"
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor="interest-visitor-type">I am inquiring as</label>
                    <select
                      id="interest-visitor-type"
                      className="select-control"
                      value={visitorType}
                      onChange={(e) =>
                        setVisitorType(e.target.value as 'Employer' | 'Client' | 'Donor')
                      }
                    >
                      <option value="Employer">Employer</option>
                      <option value="Client">Client</option>
                      <option value="Donor">Donor</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="field-group">
                    <label htmlFor="interest-category">Interest category</label>
                    <select
                      id="interest-category"
                      className="select-control"
                      value={interestType}
                      onChange={(e) =>
                        handleInterestTypeChange(e.target.value as 'alumni' | 'pathway' | 'general')
                      }
                    >
                      <option value="pathway">Specific Pathway (P1–P11)</option>
                      <option value="alumni">Specific Public Alumnus</option>
                      <option value="general">General Partnership / Funding</option>
                    </select>
                  </div>

                  {interestType === 'pathway' ? (
                    <div className="field-group">
                      <label htmlFor="interest-pathway-select">Select pathway</label>
                      <select
                        id="interest-pathway-select"
                        className="select-control"
                        value={interestValue}
                        onChange={(e) => setInterestValue(e.target.value)}
                      >
                        {pathways.map((pw) => (
                          <option key={pw.code} value={pw.code}>
                            {pw.code} · {pw.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  {interestType === 'alumni' ? (
                    <div className="field-group">
                      <label htmlFor="interest-alumni-select">Select public alumnus</label>
                      <select
                        id="interest-alumni-select"
                        className="select-control"
                        value={interestValue}
                        onChange={(e) => setInterestValue(e.target.value)}
                      >
                        <option value="">Choose a consent-approved alumnus</option>
                        {alumni.map((alum) => (
                          <option key={alum.business_id} value={alum.business_id}>
                            {alum.business_id} · {alum.first_name} {alum.last_name} ({alum.pathway_code})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>

                <div className="field-group">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                    }}
                  >
                    <label htmlFor="interest-message">Project or opportunity brief</label>
                    <span className="mono" style={{ fontSize: '0.76rem', color: 'var(--slate)' }}>
                      {message.length}/1500
                    </span>
                  </div>
                  <textarea
                    id="interest-message"
                    className="textarea-control"
                    maxLength={1500}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Share role scope, timeline, location/remote setup, or funding goals."
                  />
                </div>

                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={consentToContact}
                    onChange={(e) => setConsentToContact(e.target.checked)}
                  />
                  <span>
                    Consent to direct routing: allow Konexio Africa to share this inquiry with
                    matched alumni (leave unchecked to route privately to the Partnerships Lead only).
                  </span>
                </label>

                <button type="submit" className="btn btn-amber" disabled={interestLoading}>
                  {interestLoading ? 'Routing inquiry...' : 'Submit Express Interest'}
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </form>
            </div>

            {/* Partner Application Form */}
            <div id="partner-register" className="form-panel">
              <span className="kicker">Institutional Onboarding</span>
              <h2 className="section-title" style={{ marginBottom: '8px' }}>
                Register a Partner Organisation
              </h2>
              <p className="card-copy" style={{ marginBottom: '20px' }}>
                Apply to join our employer, client, training partner, or donor network. Approved
                partners may opt in to appear on our public website.
              </p>

              {partnerReceipt ? (
                <div className="alert-box alert-success" style={{ marginBottom: '20px' }}>
                  <ShieldCheck
                    size={20}
                    aria-hidden="true"
                    style={{ flexShrink: 0, marginTop: '2px' }}
                  />
                  <div>
                    <strong>Partner Application Received · {partnerReceipt.business_id}</strong>
                    <p style={{ margin: '6px 0 0' }}>
                      Status: <strong>{partnerReceipt.status}</strong>. Our Partnerships Lead will
                      review your submission and follow up within 3 working days.
                    </p>
                  </div>
                </div>
              ) : null}

              {partnerError ? (
                <div className="alert-box alert-error" style={{ marginBottom: '18px' }}>
                  {partnerError}
                </div>
              ) : null}

              <form onSubmit={handlePartnerSubmit} style={{ display: 'grid', gap: '14px' }}>
                <div className="form-grid-2">
                  <div className="field-group">
                    <label htmlFor="partner-org">Organisation name</label>
                    <input
                      id="partner-org"
                      type="text"
                      className="input-control"
                      required
                      value={partnerOrg}
                      onChange={(e) => setPartnerOrg(e.target.value)}
                      placeholder="Organisation name"
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor="partner-type">Partner category</label>
                    <select
                      id="partner-type"
                      className="select-control"
                      value={partnerType}
                      onChange={(e) =>
                        setPartnerType(
                          e.target.value as 'Employer' | 'Client' | 'Training partner' | 'Donor',
                        )
                      }
                    >
                      <option value="Employer">Employer</option>
                      <option value="Client">Client</option>
                      <option value="Training partner">Training partner</option>
                      <option value="Donor">Donor</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="field-group">
                    <label htmlFor="partner-country">Country</label>
                    <input
                      id="partner-country"
                      type="text"
                      className="input-control"
                      value={partnerCountry}
                      onChange={(e) => setPartnerCountry(e.target.value)}
                      placeholder="e.g. Kenya, Ghana, Senegal"
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor="partner-website">Website (optional)</label>
                    <input
                      id="partner-website"
                      type="url"
                      className="input-control"
                      value={partnerWebsite}
                      onChange={(e) => setPartnerWebsite(e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="field-group">
                    <label htmlFor="partner-contact-name">Primary contact name</label>
                    <input
                      id="partner-contact-name"
                      type="text"
                      className="input-control"
                      required
                      value={partnerContactName}
                      onChange={(e) => setPartnerContactName(e.target.value)}
                      placeholder="Contact person"
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor="partner-email">Contact email</label>
                    <input
                      id="partner-email"
                      type="email"
                      className="input-control"
                      required
                      value={partnerEmail}
                      onChange={(e) => setPartnerEmail(e.target.value)}
                      placeholder="contact@organisation.org"
                    />
                  </div>
                </div>

                <div className="field-group">
                  <label htmlFor="partner-phone">Phone (optional)</label>
                  <input
                    id="partner-phone"
                    type="tel"
                    className="input-control"
                    value={partnerPhone}
                    onChange={(e) => setPartnerPhone(e.target.value)}
                    placeholder="+254..."
                  />
                </div>

                <div className="field-group">
                  <label htmlFor="partner-description">How would you like to partner?</label>
                  <textarea
                    id="partner-description"
                    className="textarea-control"
                    required
                    value={partnerDescription}
                    onChange={(e) => setPartnerDescription(e.target.value)}
                    placeholder="Describe hiring volumes, project outsourcing needs, training collaboration, or cohort funding."
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={partnerLoading}>
                  {partnerLoading ? 'Submitting application...' : 'Submit Partner Application'}
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Separate Donor & Partner Newsletter Subscription */}
      <section className="section section-surface-white">
        <div className="container" style={{ maxWidth: '820px' }}>
          <div className="form-panel card-cream">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Sparkles size={18} aria-hidden="true" style={{ color: 'var(--amber-ink)' }} />
              <span className="kicker" style={{ marginBottom: 0 }}>
                Donor &amp; Partner Newsletter · Consent-Based List
              </span>
            </div>
            <h2 className="section-title" style={{ marginBottom: '8px' }}>
              Quarterly Impact &amp; Partnership Briefings
            </h2>
            <p className="card-copy" style={{ marginBottom: '20px' }}>
              Receive cohort graduation updates, annual reports, and regional hub priorities
              curated specifically for employers, donors, and strategic partners.
            </p>

            {donorNewsStatus ? (
              <div className="alert-box alert-success" style={{ marginBottom: '16px' }}>
                <CheckCircle2 size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
                <span>{donorNewsStatus}</span>
              </div>
            ) : null}

            {donorNewsError ? (
              <div className="alert-box alert-error" style={{ marginBottom: '16px' }}>
                {donorNewsError}
              </div>
            ) : null}

            <form onSubmit={handleDonorNewsletterSubmit} style={{ display: 'grid', gap: '14px' }}>
              <div className="sr-only" aria-hidden="true">
                <label htmlFor="donor-news-honeypot">Website</label>
                <input
                  id="donor-news-honeypot"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={donorHoneypot}
                  onChange={(e) => setDonorHoneypot(e.target.value)}
                />
              </div>

              <div className="form-grid-2" style={{ alignItems: 'end' }}>
                <div className="field-group">
                  <label htmlFor="donor-newsletter-email">Organisation or work email</label>
                  <input
                    id="donor-newsletter-email"
                    type="email"
                    className="input-control"
                    required
                    value={donorEmail}
                    onChange={(e) => setDonorEmail(e.target.value)}
                    placeholder="partnerships@organisation.org"
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={donorNewsLoading}
                >
                  <Mail size={15} aria-hidden="true" />
                  {donorNewsLoading ? 'Subscribing...' : 'Subscribe to Donor & Partner Updates'}
                </button>
              </div>

              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={donorConsent}
                  onChange={(e) => setDonorConsent(e.target.checked)}
                />
                <span>
                  I consent to receive Donor &amp; Partner quarterly updates from Konexio Africa and
                  can withdraw consent at any time.
                </span>
              </label>
            </form>
          </div>
        </div>
      </section>
    </>
  );
};

export default GetInvolvedPage;
