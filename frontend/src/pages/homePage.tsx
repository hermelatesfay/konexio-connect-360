import { type FormEvent, useEffect, useState } from 'react';
import {
  ArrowRight,
  Bot,
  Briefcase,
  CheckCircle2,
  Cpu,
  Database,
  Globe2,
  Headset,
  Languages,
  MapPin,
  Megaphone,
  Palette,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import mentorshipPhoto from '../assets/images/about_mentorship_1794927725109.jpg';
import ImpactMap from '../components/ImpactMap';
import {
  fetchAlumni,
  fetchImpactLocations,
  fetchImpactSummary,
  fetchPartners,
  fetchProgrammes,
  PARTNER_LOGOS,
  subscribeNewsletter,
} from '../api';
import type {
  ImpactSummary,
  LocationImpact,
  PathwayInfo,
  PublicAlumnus,
  PublicPartner,
} from '../types';

type HomePageProps = {
  onNavigate: (path: string) => void;
};

function renderPathwayIcon(code: string) {
  const props = { size: 20, 'aria-hidden': true as const, style: { color: 'var(--cyan-ink)' } };
  switch (code) {
    case 'P1':
      return <Megaphone {...props} />;
    case 'P2':
      return <Palette {...props} />;
    case 'P3':
      return <Headset {...props} />;
    case 'P4':
      return <Bot {...props} />;
    case 'P5':
      return <Languages {...props} />;
    case 'P6':
      return <Database {...props} />;
    case 'P7':
      return <TrendingUp {...props} />;
    default:
      return <Cpu {...props} />;
  }
}

const HomePage = ({ onNavigate }: HomePageProps) => {
  const [summary, setSummary] = useState<ImpactSummary | null>(null);
  const [locations, setLocations] = useState<LocationImpact[]>([]);
  const [pathways, setPathways] = useState<PathwayInfo[]>([]);
  const [featuredAlumni, setFeaturedAlumni] = useState<PublicAlumnus[]>([]);
  const [partners, setPartners] = useState<PublicPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Page newsletter section
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterList, setNewsletterList] = useState<'alumni' | 'donor_partner'>('alumni');
  const [newsletterConsent, setNewsletterConsent] = useState(false);
  const [newsletterHoneypot, setNewsletterHoneypot] = useState('');
  const [newsletterBusy, setNewsletterBusy] = useState(false);
  const [newsletterFeedback, setNewsletterFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchImpactSummary(),
      fetchImpactLocations(),
      fetchProgrammes(),
      fetchAlumni(),
      fetchPartners(),
    ])
      .then(([summaryData, locData, progData, alumniData, partnersData]) => {
        if (!active) return;
        setSummary(summaryData);
        setLocations(locData.locations);
        setPathways(progData.pathways);
        setFeaturedAlumni(alumniData.alumni.slice(0, 4));
        setPartners(partnersData.partners);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load platform overview.');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleNewsletterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setNewsletterBusy(true);
    setNewsletterFeedback(null);
    try {
      const res = await subscribeNewsletter({
        email: newsletterEmail.trim(),
        list: newsletterList,
        consent: newsletterConsent,
        website_url: newsletterHoneypot,
      });
      setNewsletterEmail('');
      setNewsletterConsent(false);
      setNewsletterFeedback({ type: 'success', text: res.message });
    } catch (err) {
      setNewsletterFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to subscribe right now.',
      });
    } finally {
      setNewsletterBusy(false);
    }
  };

  return (
    <div>
      {/* Hero Section with hero_home_1_edb06057.png Full-Width Background & Overlaid Copy/CTAs */}
      <section className="banner-hero-home">
        <div className="container">
          <div className="banner-hero-home-grid">
            <div>
              <span className="banner-kicker">Konexio Africa · Digi Pass Programme</span>
              <h1 className="hero-title">
                Building Digital Skills. Unlocking African Potential.
              </h1>
              <p className="banner-lead">
                We equip youth, women, and displaced talent across seven African hubs with practical
                digital skills, career readiness, and direct pathways into remote employment and
                freelancing.
              </p>

              <div className="hero-actions">
                <button
                  type="button"
                  className="btn btn-amber"
                  onClick={() => onNavigate('/programmes')}
                >
                  Explore Programmes
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="btn btn-hero-outline"
                  onClick={() => onNavigate('/impact')}
                >
                  Discover Our Impact
                </button>
              </div>
            </div>

            <div className="banner-glass-card">
              <strong style={{ color: 'var(--white)', fontSize: '0.98rem' }}>
                Training connected to remote employment
              </strong>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(255,255,255,0.86)' }}>
                Part I workplace readiness and Part II specialized digital careers across seven East
                and West African hubs.
              </p>
              <div className="banner-meta-line">
                <span>7 African hubs</span>
                <span aria-hidden="true">·</span>
                <span>11 pathways</span>
                <span aria-hidden="true">·</span>
                <span>18 cohorts</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-tight" style={{ paddingBottom: '28px' }}>
        <div className="container">
          {error ? (
            <div className="alert-box alert-error" style={{ marginBottom: '24px' }}>
              {error}
            </div>
          ) : null}

          {/* Dashboard-style Impact Section */}
          <div>
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
              <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--cyan-ink)', fontWeight: 600 }}>
                Impact Overview · As of {summary?.as_of ?? '31 October 2026'} · Demonstration dataset
              </span>
              <button
                type="button"
                className="inline-link-btn"
                style={{ fontSize: '0.84rem' }}
                onClick={() => onNavigate('/impact')}
              >
                Open full impact dashboard <ArrowRight size={14} aria-hidden="true" />
              </button>
            </div>

            <div
              className="kpi-strip kpi-strip-5"
              style={{ marginTop: 0 }}
              aria-label="Konexio Africa impact statistics"
            >
              <div className="kpi-card">
                <span className="kpi-value">
                  {loading || !summary ? '—' : summary.learners_trained.toLocaleString()}
                </span>
                <span className="kpi-label">Learners trained</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-value">
                  {loading || !summary ? '—' : summary.graduates.toLocaleString()}
                </span>
                <span className="kpi-label">Graduates</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-value">
                  {loading || !summary ? '—' : summary.employed_or_freelancing.toLocaleString()}
                </span>
                <span className="kpi-label">Employed or freelancing</span>
                <span className="kpi-sub">
                  {summary ? `${summary.employment_rate_pct}% employment rate` : '60% rate'}
                </span>
              </div>
              <div className="kpi-card">
                <span className="kpi-value">{loading || !summary ? '—' : summary.countries}</span>
                <span className="kpi-label">Countries</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-value">
                  {loading || !summary ? '—' : `${summary.women_pct}%`}
                </span>
                <span className="kpi-label">Women learners</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 1. Introduction to Konexio Africa */}
      <section className="section section-surface-white">
        <div className="container">
          <div className="split-editorial">
            <div className="photo-frame" style={{ aspectRatio: '4 / 3' }}>
              <img
                src={mentorshipPhoto}
                alt="Konexio Africa mentor guiding a learner through a digital workflow"
                referrerPolicy="no-referrer"
              />
            </div>

            <div>
              <span className="kicker">Who We Are</span>
              <h2 className="section-title">
                Closing the digital opportunity gap with market-ready training and mentorship.
              </h2>
              <p className="lead-copy">
                Konexio Africa’s Digi Pass model begins with core digital workplace readiness
                (Part I) before guiding learners into focused freelance and remote career tracks
                (Part II). Graduates showcase verified portfolios to employers and clients across
                Africa and globally.
              </p>

              <div className="numbered-list">
                <div className="numbered-row">
                  <span className="numbered-idx">01</span>
                  <div>
                    <strong style={{ color: 'var(--indigo)' }}>Part I Workplace Foundations</strong>
                    <div className="card-copy" style={{ fontSize: '0.88rem' }}>
                      Six core readiness modules (M0–M5) with studio sessions and WhatsApp practice.
                    </div>
                  </div>
                </div>
                <div className="numbered-row">
                  <span className="numbered-idx">02</span>
                  <div>
                    <strong style={{ color: 'var(--indigo)' }}>Part II Career Specialisation</strong>
                    <div className="card-copy" style={{ fontSize: '0.88rem' }}>
                      Eleven remote-work tracks (P1–P11) guided by mentors and client project briefs.
                    </div>
                  </div>
                </div>
                <div className="numbered-row">
                  <span className="numbered-idx">03</span>
                  <div>
                    <strong style={{ color: 'var(--indigo)' }}>Consent-First Talent Matching</strong>
                    <div className="card-copy" style={{ fontSize: '0.88rem' }}>
                      Direct employer introductions coordinated without exposing personal contact emails.
                    </div>
                  </div>
                </div>
              </div>

              <div className="hero-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => onNavigate('/about')}
                >
                  Read Our Story
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => onNavigate('/team')}
                >
                  Meet the Team
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Featured Programmes */}
      <section className="section">
        <div className="container">
          <div className="section-header-row">
            <div>
              <span className="kicker">Featured Programmes</span>
              <h2 className="section-title">Eleven career pathways built for remote demand.</h2>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => onNavigate('/programmes')}
            >
              View All 11 Pathways
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>

          <div className="pathway-grid">
            {pathways.slice(0, 6).map((pathway) => (
              <article key={pathway.code} className="pathway-card">
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      marginBottom: '10px',
                    }}
                  >
                    {renderPathwayIcon(pathway.code)}
                    <span className="pathway-code">
                      {pathway.code} · {pathway.status}
                    </span>
                  </div>
                  <h3 className="card-title">{pathway.name}</h3>
                  <p className="card-copy" style={{ marginTop: '8px' }}>
                    {pathway.description}
                  </p>
                </div>

                <div>
                  <div className="pathway-stats-row">
                    <span>{pathway.learners_enrolled} enrolled</span>
                    <span>{pathway.completed} completed</span>
                    <span>{pathway.freelancing_active} active</span>
                  </div>
                  <button
                    type="button"
                    className="inline-link-btn"
                    style={{ marginTop: '12px', fontSize: '0.86rem' }}
                    onClick={() => onNavigate(`/alumni?pathway=${pathway.code}`)}
                  >
                    Explore {pathway.code} talent
                    <ArrowRight size={14} aria-hidden="true" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Impact Across Africa Map Preview */}
      <section className="section section-surface-white">
        <div className="container">
          <div className="section-header-row">
            <div>
              <span className="kicker">Regional Footprint</span>
              <h2 className="section-title">Impact across seven East and West African hubs.</h2>
              <p className="lead-copy">
                Select any city marker to preview local cohort completions, employment rates, and
                women participation as of {summary?.as_of ?? '31 October 2026'}.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onNavigate('/impact')}
            >
              Open Full Impact Map
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>

          {locations.length > 0 ? <ImpactMap locations={locations} compact /> : null}
        </div>
      </section>

      {/* 4. Alumni Success Stories */}
      <section className="section">
        <div className="container">
          <div className="section-header-row">
            <div>
              <span className="kicker">Alumni Stories</span>
              <h2 className="section-title">Graduates ready for employment and project work.</h2>
              <p className="lead-copy">
                Only graduates who grant explicit publication consent appear publicly. Private
                email addresses are never displayed.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => onNavigate('/alumni')}
            >
              Browse Alumni Directory
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>

          <div className="grid-4">
            {featuredAlumni.map((alum) => (
              <article key={alum.business_id} className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    className={`avatar${alum.consent_to_show_photo ? ' avatar-green' : ''}`}
                    aria-hidden="true"
                  >
                    {alum.initials}
                  </div>
                  <div>
                    <h3 className="card-title" style={{ fontSize: '1.02rem' }}>
                      {alum.first_name} {alum.last_name}
                    </h3>
                    <div className="meta-inline">
                      <MapPin size={13} aria-hidden="true" />
                      <span>
                        {alum.city}, {alum.country}
                      </span>
                    </div>
                  </div>
                </div>

                {alum.consent_to_show_photo && alum.portfolio_image ? (
                  <div className="portfolio-thumb">
                    <img
                      src={alum.portfolio_image}
                      alt={`${alum.first_name} ${alum.last_name} portfolio highlight`}
                      loading="lazy"
                    />
                  </div>
                ) : null}

                <div className="meta-inline">
                  <strong className="mono">{alum.pathway_code}</strong>
                  <span aria-hidden="true">·</span>
                  <span>{alum.availability}</span>
                </div>

                <p className="card-copy" style={{ fontSize: '0.88rem' }}>
                  {alum.short_bio}
                </p>

                <button
                  type="button"
                  className="inline-link-btn"
                  style={{ marginTop: 'auto', fontSize: '0.85rem' }}
                  onClick={() => onNavigate(`/alumni/${alum.business_id}`)}
                >
                  View profile <ArrowRight size={14} aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Employer & Partner Opportunities */}
      <section className="section section-surface-white">
        <div className="container">
          <div className="section-header-row">
            <div>
              <span className="kicker">Partner Ecosystem</span>
              <h2 className="section-title">
                {summary?.employer_partners ?? 27} employer, client, donor, and training partners.
              </h2>
              <p className="lead-copy">
                Hire vetted talent across eleven pathways, commission remote teams, or co-fund new
                cohorts across Africa.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => onNavigate('/get-involved#partner-register')}
            >
              Partner With Us
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>

          <div className="partners-grid">
            {partners.slice(0, 6).map((partner) => {
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
                    <strong>{partner.organisation}</strong>
                    <span aria-hidden="true">·</span>
                    <span>{partner.type}</span>
                    {partner.country ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{partner.country}</span>
                      </>
                    ) : null}
                  </div>
                  <p className="card-copy" style={{ fontSize: '0.86rem' }}>
                    {partner.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. Strong Get Involved Section with hero_home_2_28d3aeba.png Overlaid Callout Banner */}
      <section className="section section-surface-navy">
        <div className="container">
          <div className="banner-callout-home">
            <div className="banner-callout-inner">
              <div style={{ maxWidth: '640px' }}>
                <span className="banner-kicker">Get Involved · Konexio Connect</span>
                <h2 className="section-title">
                  Partner, hire, or train with Konexio Africa.
                </h2>
                <p className="banner-lead" style={{ marginTop: '10px', fontSize: '0.98rem' }}>
                  Choose the pathway suited to your goals—whether hiring vetted Digi Pass graduates,
                  co-funding a cohort, or launching your digital career.
                </p>
              </div>
              <div className="hero-actions" style={{ marginTop: 0 }}>
                <button
                  type="button"
                  className="btn btn-amber"
                  onClick={() => onNavigate('/get-involved#express-interest')}
                >
                  Partner With Us
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="btn btn-hero-outline"
                  onClick={() => onNavigate('/signup?type=learner')}
                >
                  Apply as a Learner
                </button>
              </div>
            </div>
          </div>

          <div className="grid-3">
            <div className="kpi-card" style={{ gap: '12px' }}>
              <Briefcase size={20} color="#EB8928" aria-hidden="true" />
              <strong style={{ fontSize: '1.05rem' }}>For Employers &amp; Clients</strong>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(255,255,255,0.86)' }}>
                Filter consented alumni profiles by pathway or express hiring interest with a 3-day
                routing guarantee.
              </p>
              <button
                type="button"
                className="btn btn-amber btn-sm"
                style={{ marginTop: 'auto', width: 'fit-content' }}
                onClick={() => onNavigate('/get-involved#express-interest')}
              >
                Find Talent
              </button>
            </div>

            <div className="kpi-card" style={{ gap: '12px' }}>
              <Globe2 size={20} color="#18A4DC" aria-hidden="true" />
              <strong style={{ fontSize: '1.05rem' }}>For Donors &amp; Partners</strong>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(255,255,255,0.86)' }}>
                Support scholarships, laptops, and regional cohort expansion backed by transparent
                annual reporting.
              </p>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ marginTop: 'auto', width: 'fit-content' }}
                onClick={() => onNavigate('/get-involved?visitor_type=Donor#express-interest')}
              >
                Support a Cohort
              </button>
            </div>

            <div className="kpi-card" style={{ gap: '12px' }}>
              <ShieldCheck size={20} color="#EB8928" aria-hidden="true" />
              <strong style={{ fontSize: '1.05rem' }}>For Prospective Learners</strong>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(255,255,255,0.86)' }}>
                Apply to start Part I workplace readiness and advance into one of 11 specialized
                pathways.
              </p>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ marginTop: 'auto', width: 'fit-content' }}
                onClick={() => onNavigate('/signup?type=learner')}
              >
                Apply Now
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Newsletter Subscription Section */}
      <section className="section">
        <div className="container">
          <div className="form-panel">
            <div className="grid-2" style={{ alignItems: 'center' }}>
              <div>
                <span className="kicker">Stay Connected</span>
                <h2 className="section-title">Subscribe to Konexio Africa Briefings</h2>
                <p className="lead-copy" style={{ marginTop: '10px' }}>
                  Receive separate dispatches tailored to either Alumni &amp; Learners or Employer
                  Partners &amp; Donors. You can unsubscribe at any time.
                </p>
              </div>

              <form onSubmit={handleNewsletterSubmit} style={{ display: 'grid', gap: '12px' }}>
                <div className="sr-only" aria-hidden="true">
                  <label htmlFor="home-nl-hp">Website</label>
                  <input
                    id="home-nl-hp"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={newsletterHoneypot}
                    onChange={(e) => setNewsletterHoneypot(e.target.value)}
                  />
                </div>

                <div className="form-grid-2">
                  <div className="field-group">
                    <label htmlFor="home-nl-list">Briefing list</label>
                    <select
                      id="home-nl-list"
                      className="select-control"
                      value={newsletterList}
                      onChange={(e) =>
                        setNewsletterList(e.target.value as 'alumni' | 'donor_partner')
                      }
                    >
                      <option value="alumni">Alumni &amp; Learners</option>
                      <option value="donor_partner">Donors &amp; Partners</option>
                    </select>
                  </div>
                  <div className="field-group">
                    <label htmlFor="home-nl-email">Email address</label>
                    <input
                      id="home-nl-email"
                      type="email"
                      required
                      className="input-control"
                      placeholder="you@example.org"
                      value={newsletterEmail}
                      onChange={(e) => setNewsletterEmail(e.target.value)}
                    />
                  </div>
                </div>

                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={newsletterConsent}
                    onChange={(e) => setNewsletterConsent(e.target.checked)}
                  />
                  <span>
                    I consent to receive newsletter updates for the selected list.
                  </span>
                </label>

                {newsletterFeedback ? (
                  <div
                    className={`alert-box ${
                      newsletterFeedback.type === 'success' ? 'alert-success' : 'alert-error'
                    }`}
                  >
                    {newsletterFeedback.type === 'success' ? (
                      <CheckCircle2 size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
                    ) : null}
                    <span>{newsletterFeedback.text}</span>
                  </div>
                ) : null}

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: 'fit-content' }}
                  disabled={newsletterBusy}
                >
                  {newsletterBusy ? 'Subscribing...' : 'Subscribe to Updates'}
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;