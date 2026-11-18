import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Briefcase,
  Compass,
  HeartHandshake,
  Layers,
  ShieldCheck,
  Target,
} from 'lucide-react';
import mentorshipPhoto from '../assets/images/about_mentorship_1794927725109.jpg';
import communityPhoto from '../assets/images/community_network_1794927726435.jpg';
import {
  fetchImpactLocations,
  fetchImpactSummary,
  fetchPartners,
  PARTNER_LOGOS,
} from '../api';
import type { ImpactSummary, LocationImpact, PublicPartner } from '../types';

type AboutPageProps = {
  onNavigate: (path: string) => void;
};

const AboutPage = ({ onNavigate }: AboutPageProps) => {
  const [summary, setSummary] = useState<ImpactSummary | null>(null);
  const [locations, setLocations] = useState<LocationImpact[]>([]);
  const [partners, setPartners] = useState<PublicPartner[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([fetchImpactSummary(), fetchImpactLocations(), fetchPartners()])
      .then(([sumRes, locRes, partnerRes]) => {
        if (!active) return;
        setSummary(sumRes);
        setLocations(locRes.locations);
        setPartners(partnerRes.partners);
      })
      .catch(() => {
        /* Handled gracefully */
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="section">
        <div className="container">
          <div className="split-editorial">
            <div>
              <span className="kicker">About Konexio Africa</span>
              <h1 className="page-title">
                Equipping African talent for sustainable digital work across borders.
              </h1>
              <p className="lead-copy">
                Konexio Africa delivers the Digi Pass programme—connecting young people, women, and
                displaced learners across seven African hubs with structured digital training,
                career coaching, and remote work placement.
              </p>
              <div className="hero-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => onNavigate('/programmes')}
                >
                  Explore Programmes
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

            <div className="photo-frame" style={{ aspectRatio: '4 / 3' }}>
              <img
                src={mentorshipPhoto}
                alt="A Konexio Africa mentor coaching a learner on a laptop in a modern training studio"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Mission, Vision, Values */}
      <section className="section section-surface-white">
        <div className="container">
          <div className="section-header-row">
            <div>
              <span className="kicker">Mission, Vision &amp; Values</span>
              <h2 className="section-title">What guides every Digi Pass cohort.</h2>
            </div>
          </div>

          <div className="grid-3">
            <article className="step-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="step-index" style={{ marginBottom: 0 }}>01 · MISSION</span>
                <Target size={20} color="#0B6B94" aria-hidden="true" />
              </div>
              <h3>Practical Digital Skills</h3>
              <p>
                Equip learners with the digital, professional and AI skills they need to work online
                and build sustainable remote careers.
              </p>
            </article>
            <article className="step-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="step-index" style={{ marginBottom: 0 }}>02 · VISION</span>
                <Compass size={20} color="#1B1D5E" aria-hidden="true" />
              </div>
              <h3>Inclusive Remote Access</h3>
              <p>
                A digital career for every motivated learner, wherever they start—an inclusive
                digital economy connecting talent from Nairobi to Dakar.
              </p>
            </article>
            <article className="step-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="step-index" style={{ marginBottom: 0 }}>03 · VALUES</span>
                <ShieldCheck size={20} color="#EB8928" aria-hidden="true" />
              </div>
              <h3>EPOCH &amp; Consent First</h3>
              <p>
                Empathy, Perspective, Openness, Curiosity, and Humility—paired with equity in
                access (54% women learners) and strict consent-first graduate privacy.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Problem & Approach */}
      <section className="section">
        <div className="container">
          <div className="split-editorial">
            <div>
              <span className="kicker">The Challenge &amp; Our Approach</span>
              <h2 className="section-title">
                Moving beyond isolated workshops to complete employment pipelines.
              </h2>
              <p className="lead-copy">
                <strong>The challenge:</strong> Many aspiring professionals lack access to
                structured digital readiness, workplace communication coaching, and credible routes
                to international or regional remote employers.
              </p>
              <p className="lead-copy">
                <strong>Our approach:</strong> Digi Pass pairs six foundational workplace modules
                (Part I: M0–M5) with eleven market-aligned skill tracks (Part II: P1–P11), guiding
                every participant from onboarding to a client-ready portfolio and employer
                introductions.
              </p>
            </div>

            <div className="photo-frame" style={{ aspectRatio: '4 / 3' }}>
              <img
                src={communityPhoto}
                alt="Konexio Africa graduates and employers connecting at a career showcase"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Visual Learner Journey */}
      <section className="section section-surface-white">
        <div className="container">
          <div className="section-header-row">
            <div>
              <span className="kicker">Learner Journey</span>
              <h2 className="section-title">Four steps from enrolment to sustained livelihoods.</h2>
            </div>
          </div>

          <div className="grid-4">
            <article className="step-card">
              <span className="step-index">Stage 01</span>
              <h3>Digital Onboarding</h3>
              <p>
                Learners enter regional hubs across 7 countries and build cloud collaboration,
                digital safety, and remote etiquette in Part I (M0–M5).
              </p>
            </article>
            <article className="step-card">
              <span className="step-index">Stage 02</span>
              <h3>Pathway Specialisation</h3>
              <p>
                Participants select one of 11 specialized pathways—from digital marketing and
                graphic design to AI support, translation, and cloud workflows.
              </p>
            </article>
            <article className="step-card">
              <span className="step-index">Stage 03</span>
              <h3>Portfolio &amp; Briefs</h3>
              <p>
                Under mentor feedback, learners produce real work samples, mock client
                deliverables, and clear freelance service profiles.
              </p>
            </article>
            <article className="step-card">
              <span className="step-index">Stage 04</span>
              <h3>Employer Matching</h3>
              <p>
                Consented graduates publish profiles in the Talent Directory where vetted
                employers and clients initiate privacy-protected introductions.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Impact Highlights + Geographic Footprint */}
      <section className="section">
        <div className="container">
          <div className="section-header-row">
            <div>
              <span className="kicker">
                Impact Highlights · As of {summary?.as_of ?? '31 October 2026'}
              </span>
              <h2 className="section-title">Seven regional hubs across East and West Africa.</h2>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => onNavigate('/impact')}
            >
              Open Full Impact Dashboard
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>

          <div className="kpi-strip" style={{ marginTop: 0, marginBottom: '28px' }}>
            <div className="kpi-card">
              <span className="kpi-value">
                {summary ? summary.learners_trained.toLocaleString() : '—'}
              </span>
              <span className="kpi-label">Learners trained</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-value">{summary ? summary.graduates.toLocaleString() : '—'}</span>
              <span className="kpi-label">Graduates</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-value">
                {summary ? `${summary.employment_rate_pct}%` : '—'}
              </span>
              <span className="kpi-label">Employment rate</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-value">{summary ? summary.employer_partners : '—'}</span>
              <span className="kpi-label">Employer partners</span>
            </div>
          </div>

          <div className="grid-4">
            {locations.map((loc) => (
              <article key={loc.business_id} className="card">
                <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--cyan-ink)' }}>
                  {loc.business_id} · {loc.country}
                </span>
                <h3 className="card-title">{loc.city}</h3>
                <div className="meta-inline tabular-nums">
                  <span>
                    <strong>{loc.learners_trained}</strong> learners
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    <strong>{loc.employment_rate_pct}%</strong> employed
                  </span>
                </div>
                <span style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>
                  {loc.cohorts_completed} completed cohorts · {loc.women_pct}% women
                </span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Partners + Multi-role CTA */}
      <section className="section section-surface-white">
        <div className="container">
          <div className="section-header-row">
            <div>
              <span className="kicker">Partners &amp; Supporters</span>
              <h2 className="section-title">Collaborating across sectors.</h2>
            </div>
          </div>

          <div className="partners-grid" style={{ marginBottom: '40px' }}>
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
                    <strong>{partner.organisation}</strong>
                    <span aria-hidden="true">·</span>
                    <span>{partner.type}</span>
                  </div>
                  <p className="card-copy" style={{ fontSize: '0.86rem' }}>
                    {partner.description}
                  </p>
                </article>
              );
            })}
          </div>

          <div className="grid-3">
            <div className="card card-cream">
              <Layers size={20} color="#1B1D5E" aria-hidden="true" />
              <h3 className="card-title">Learners</h3>
              <p className="card-copy">
                Begin your Digi Pass application and explore eleven market-aligned digital tracks.
              </p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ width: 'fit-content', marginTop: 'auto' }}
                onClick={() => onNavigate('/signup?type=learner')}
              >
                Apply Now
              </button>
            </div>
            <div className="card card-cream">
              <Briefcase size={20} color="#0B6B94" aria-hidden="true" />
              <h3 className="card-title">Employers &amp; Clients</h3>
              <p className="card-copy">
                Connect with consented Digi Pass graduates ready for remote contracts and teams.
              </p>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ width: 'fit-content', marginTop: 'auto' }}
                onClick={() => onNavigate('/get-involved#express-interest')}
              >
                Find Talent
              </button>
            </div>
            <div className="card card-cream">
              <HeartHandshake size={20} color="#944905" aria-hidden="true" />
              <h3 className="card-title">Donors &amp; Partners</h3>
              <p className="card-copy">
                Sponsor cohorts, contribute mentorship, or host workshops across our seven hubs.
              </p>
              <button
                type="button"
                className="btn btn-amber btn-sm"
                style={{ width: 'fit-content', marginTop: 'auto' }}
                onClick={() => onNavigate('/get-involved#partner-register')}
              >
                Become a Partner
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;