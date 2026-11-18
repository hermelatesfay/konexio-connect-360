import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bot,
  ChevronDown,
  ChevronUp,
  Cloud,
  Cpu,
  Database,
  Headset,
  Info,
  Languages,
  Megaphone,
  Palette,
  Search,
  ShieldCheck,
  Smartphone,
  TrendingUp,
} from 'lucide-react';
import workshopPhoto from '../assets/images/programmes_workshop_1794927726803.jpg';
import { fetchProgrammes } from '../api';
import type { CourseModule, PathwayInfo } from '../types';

type ProgrammesPageProps = {
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
    case 'P8':
      return <Cpu {...props} />;
    case 'P9':
      return <ShieldCheck {...props} />;
    case 'P10':
      return <Cloud {...props} />;
    case 'P11':
      return <Smartphone {...props} />;
    default:
      return <Cpu {...props} />;
  }
}

const ProgrammesPage = ({ onNavigate }: ProgrammesPageProps) => {
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [pathways, setPathways] = useState<PathwayInfo[]>([]);
  const [openModule, setOpenModule] = useState<string>('M0');
  const [expandedPathway, setExpandedPathway] = useState<string>('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Available' | 'Completed'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchProgrammes()
      .then((data) => {
        if (!active) return;
        setModules(data.modules);
        setPathways(data.pathways);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load programmes.');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredPathways = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pathways.filter((pw) => {
      if (statusFilter !== 'all' && pw.status !== statusFilter) return false;
      if (!q) return true;
      return (
        pw.code.toLowerCase().includes(q) ||
        pw.name.toLowerCase().includes(q) ||
        pw.description.toLowerCase().includes(q)
      );
    });
  }, [pathways, query, statusFilter]);

  return (
    <div>
      {/* Hero */}
      <section className="section">
        <div className="container">
          <div className="split-editorial">
            <div>
              <span className="kicker">Digi Pass Curriculum · 2026 Syllabus</span>
              <h1 className="page-title">
                Eleven specialized pathways built around real remote work opportunities.
              </h1>
              <p className="lead-copy">
                Learners complete Part I core workplace readiness modules (M0–M5, about 3 months in a
                hybrid model with WhatsApp chatbot support), then advance into a 2-month Part II
                freelancing pathway (P1–P11). Metrics reflect outcomes as of 31 October 2026.
              </p>
              <div className="hero-actions">
                <button
                  type="button"
                  className="btn btn-amber"
                  onClick={() => onNavigate('/signup?type=learner')}
                >
                  Apply Now
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => onNavigate('/alumni')}
                >
                  View Alumni Portfolios
                </button>
              </div>
            </div>

            <div className="photo-frame" style={{ aspectRatio: '16 / 9' }}>
              <img
                src={workshopPhoto}
                alt="Learners participating in a Konexio Africa digital skills workshop"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          <div className="grid-2" style={{ marginTop: '40px' }}>
            <div className="card">
              <span className="step-index" style={{ marginBottom: 0 }}>PART I · ~3 MONTHS</span>
              <h2 className="card-title">Core Workplace Readiness (M0–M5)</h2>
              <p className="card-copy">
                Hybrid sessions paired with guided WhatsApp chatbot practice to build essential
                communication, security, cloud tooling, and workplace etiquette before specialization.
              </p>
            </div>
            <div className="card">
              <span className="step-index" style={{ marginBottom: 0 }}>PART II · 2 MONTHS</span>
              <h2 className="card-title">Specialized Freelancing Tracks (P1–P11)</h2>
              <p className="card-copy">
                Hands-on career tracks combining curated external courses, trainer check-ins, live
                webinars, and working-professional mentor briefs toward remote readiness.
              </p>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="container" style={{ marginBottom: '24px' }}>
          <div className="alert-box alert-error">{error}</div>
        </div>
      ) : null}

      {/* Searchable & Filterable 11 Pathways Directory */}
      <section className="section section-surface-white">
        <div className="container">
          <div className="section-header-row">
            <div>
              <span className="kicker">Part II — Career Pathways Directory (P1–P11)</span>
              <h2 className="section-title">Search and compare all eleven training pathways.</h2>
            </div>

            <div className="segmented-control" role="tablist" aria-label="Filter pathways by status">
              {(['all', 'Available', 'Completed'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === status}
                  className={`segmented-btn${statusFilter === status ? ' is-active' : ''}`}
                  onClick={() => setStatusFilter(status)}
                >
                  {status === 'all' ? 'All 11 Pathways' : `${status} Cohorts`}
                </button>
              ))}
            </div>
          </div>

          <div
            className="form-panel"
            style={{
              padding: '16px 18px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ position: 'relative', flex: '1 1 280px' }}>
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
                type="search"
                aria-label="Search pathways by keyword or code"
                className="input-control"
                style={{ paddingLeft: '36px' }}
                placeholder="Search pathways (e.g. Digital Marketing, Cybersecurity, AI, Translation)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <span className="mono" style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>
              Showing {filteredPathways.length} of {pathways.length} pathways
            </span>
          </div>

          {filteredPathways.length === 0 && !loading ? (
            <div className="form-panel" style={{ textAlign: 'center', padding: '40px 24px' }}>
              <p className="card-copy" style={{ marginBottom: '16px' }}>
                No pathways matched your search query.
              </p>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setQuery('');
                  setStatusFilter('all');
                }}
              >
                Reset pathway filters
              </button>
            </div>
          ) : (
            <div className="pathway-grid">
              {filteredPathways.map((pathway) => {
                const isExpanded = expandedPathway === pathway.code;
                const completionPct =
                  pathway.learners_enrolled > 0
                    ? Math.round((pathway.completed / pathway.learners_enrolled) * 100)
                    : 0;

                return (
                  <article key={pathway.code} className="pathway-card">
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '8px',
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
                        <span>
                          <strong>{pathway.learners_enrolled}</strong> enrolled
                        </span>
                        <span>
                          <strong>{pathway.completed}</strong> completed
                        </span>
                        <span>
                          <strong>{pathway.freelancing_active}</strong> active
                        </span>
                      </div>

                      {isExpanded ? (
                        <div
                          style={{
                            marginTop: '12px',
                            padding: '12px',
                            background: 'var(--cream)',
                            border: '1px solid var(--line)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.84rem',
                            display: 'grid',
                            gap: '6px',
                          }}
                        >
                          <div>
                            Completion rate: <strong>{completionPct}%</strong>
                          </div>
                          <div>
                            Average time to first gig: <strong>{pathway.avg_days_to_first_gig} days</strong>
                          </div>
                          <div>
                            Track status: <strong>{pathway.status}</strong> (cohort dates &amp; schedule shared upon application)
                          </div>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => onNavigate('/signup?type=learner')}
                            >
                              Apply Now
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => onNavigate(`/alumni?pathway=${pathway.code}`)}
                            >
                              Matching Alumni
                            </button>
                          </div>
                        </div>
                      ) : null}

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: '12px',
                          fontSize: '0.82rem',
                          color: 'var(--slate)',
                        }}
                      >
                        <button
                          type="button"
                          className="inline-link-btn"
                          onClick={() =>
                            setExpandedPathway(isExpanded ? '' : pathway.code)
                          }
                        >
                          {isExpanded ? 'Hide details' : 'Programme details'}
                        </button>
                        <button
                          type="button"
                          className="inline-link-btn"
                          onClick={() => onNavigate(`/alumni?pathway=${pathway.code}`)}
                        >
                          Alumni ({pathway.code}) <ArrowRight size={14} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Part I: Modules M0 to M5 */}
      <section className="section">
        <div className="container">
          <div className="section-header-row">
            <div>
              <span className="kicker">Part I — Core Foundations (M0 to M5)</span>
              <h2 className="section-title">Six foundational modules completed before specialization.</h2>
            </div>
          </div>

          <div className="accordion-list" style={{ marginBottom: '32px' }}>
            {(loading ? [] : modules).map((mod) => {
              const isOpen = openModule === mod.code;
              return (
                <article key={mod.code} className="accordion-item">
                  <button
                    type="button"
                    className="accordion-trigger"
                    aria-expanded={isOpen}
                    onClick={() => setOpenModule(isOpen ? '' : mod.code)}
                  >
                    <div>
                      <div className="meta-inline">
                        <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--green-ink)' }}>
                          {mod.code}
                        </span>
                        {mod.duration ? (
                          <>
                            <span>·</span>
                            <span style={{ fontSize: '0.8rem' }}>{mod.duration}</span>
                          </>
                        ) : null}
                      </div>
                      <h3 style={{ fontSize: '1.08rem', marginTop: '4px' }}>{mod.title}</h3>
                    </div>
                    {isOpen ? (
                      <ChevronUp size={18} aria-hidden="true" />
                    ) : (
                      <ChevronDown size={18} aria-hidden="true" />
                    )}
                  </button>

                  {isOpen ? (
                    <div className="accordion-body">
                      <ul className="submodule-list">
                        {mod.submodules.map((sub) => (
                          <li key={sub}>{sub}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>

          <div className="grid-2" style={{ marginBottom: '32px', alignItems: 'start' }}>
            <div className="card">
              <span className="kicker">Delivery Model &amp; Certification</span>
              <h3 className="card-title">How Part I &amp; Part II Work</h3>
              <ul className="submodule-list" style={{ marginTop: 0 }}>
                <li>
                  <strong>Part I (about 3 months):</strong> Hybrid instruction combining in-person
                  studios, virtual sessions, and guided WhatsApp chatbot practice. Graduates earn
                  the <strong>Konexio Certificate (Part I)</strong>.
                </li>
                <li>
                  <strong>Part II (2 months):</strong> Intensive freelancing bootcamps pairing
                  external platforms (Coursera, Alison, Udemy) with trainer check-ins, webinars, and
                  working-professional mentor meetings.
                </li>
              </ul>
            </div>

            <div className="card">
              <span className="kicker">Admissions</span>
              <h3 className="card-title">How to Apply in 4 Steps</h3>
              <ol className="submodule-list" style={{ marginTop: 0 }}>
                <li>Read the Part I &amp; Part II programme overview above.</li>
                <li>Complete your learner profile application online.</li>
                <li>Attend a regional hub or virtual information session.</li>
                <li>Join the next regional cohort intake.</li>
              </ol>
            </div>
          </div>

          <div className="alert-box alert-info" style={{ marginBottom: '24px' }}>
            <Info size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Frequently Asked Questions</strong>
              <p style={{ margin: '6px 0 0' }}>
                <strong>Eligibility:</strong> Motivated learners aged 18–35 building a digital career.{' '}
                <strong>Certification:</strong> Graduates who pass final assessments earn the Konexio
                graduate certificate; participation certificates are available separately.{' '}
                <strong>Employer outreach:</strong> Employers connect via the Express Interest form—private
                emails and phone numbers are never published.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-amber btn-sm"
              style={{ marginLeft: 'auto' }}
              onClick={() => onNavigate('/signup?type=learner')}
            >
              Apply Now
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProgrammesPage;