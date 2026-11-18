import { useEffect, useState } from 'react';
import { ArrowRight, Download, FileText, MapPin } from 'lucide-react';
import ImpactMap from '../components/ImpactMap';
import {
  fetchAlumni,
  fetchImpactLocations,
  fetchImpactSummary,
  fetchImpactYears,
  fetchProgrammes,
  fetchReports,
} from '../api';
import type {
  AnnualReport,
  ImpactStory,
  ImpactSummary,
  LocationImpact,
  PathwayInfo,
  PublicAlumnus,
  YearlyImpact,
} from '../types';

type ImpactsPageProps = {
  onNavigate: (path: string) => void;
};

const ImpactsPage = ({ onNavigate }: ImpactsPageProps) => {
  const [summary, setSummary] = useState<ImpactSummary | null>(null);
  const [locations, setLocations] = useState<LocationImpact[]>([]);
  const [pathways, setPathways] = useState<PathwayInfo[]>([]);
  const [years, setYears] = useState<YearlyImpact[]>([]);
  const [reports, setReports] = useState<AnnualReport[]>([]);
  const [impactStories, setImpactStories] = useState<ImpactStory[]>([]);
  const [stories, setStories] = useState<PublicAlumnus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchImpactSummary(),
      fetchImpactLocations(),
      fetchProgrammes(),
      fetchImpactYears(),
      fetchReports(),
      fetchAlumni(),
    ])
      .then(([sumRes, locRes, progRes, yearRes, repRes, alumRes]) => {
        if (!active) return;
        setSummary(sumRes);
        setLocations(locRes.locations);
        setPathways(progRes.pathways);
        setYears(yearRes.years);
        setReports(repRes.reports);
        setImpactStories(repRes.stories ?? []);
        setStories(alumRes.alumni.slice(0, 3));
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load impact metrics.');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleDownloadCsv = () => {
    const header = [
      'Hub ID',
      'City',
      'Country',
      'Latitude',
      'Longitude',
      'Learners Trained',
      'Graduates',
      'Employed or Freelancing',
      'Employment Rate %',
      'Women Learners %',
      'Completed Cohorts',
    ];
    const rows = locations.map((loc) => [
      loc.business_id,
      loc.city,
      loc.country,
      loc.latitude,
      loc.longitude,
      loc.learners_trained,
      loc.graduates,
      loc.employed_or_freelancing,
      loc.employment_rate_pct,
      loc.women_pct,
      loc.cohorts_completed,
    ]);
    const csvContent = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'konexio-africa-impact-locations.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadReport = (report: AnnualReport) => {
    const lines = [
      `${report.title}`,
      'Konexio Africa Digi Pass · Reference Date: 31 October 2026',
      '',
      `Vision Statement: ${report.vision_statement}`,
      ...(report.director_message ? [`Director Note: ${report.director_message}`] : []),
      `Learners Trained: ${report.learners_trained}`,
      `Graduates: ${report.graduates} (${report.graduation_rate_pct}%)`,
      `Employed or Freelancing Rate: ${report.employed_or_freelancing_pct}%`,
      `Women Learners: ${report.women_pct}%`,
      `Countries Active: ${report.countries}`,
      `Completed Cohorts: ${report.cohorts}`,
      `Employer Partners: ${report.employer_partners}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `konexio-africa-annual-report-${report.year}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const maxEnrolled = Math.max(...pathways.map((p) => p.learners_enrolled), 1);
  const maxYearLearners = Math.max(...years.map((y) => y.learners_trained), 1);

  return (
    <div>
      {/* Section 1: Overview */}
      <section className="section">
        <div className="container">
          <div className="section-header-row">
            <div>
              <span className="kicker">
                Impact Dashboard · Data as of {summary?.as_of ?? '31 October 2026'}
              </span>
              <h1 className="page-title">Measured Outcomes &amp; Geographic Footprint</h1>
              <p className="lead-copy">
                Regional totals reconcile across all seven active hubs, eleven training pathways,
                and five annual reporting periods (with 2026 clearly labelled year-to-date through 31
                October 2026).
              </p>
            </div>

            <button
              type="button"
              className="btn btn-outline"
              onClick={handleDownloadCsv}
              disabled={locations.length === 0}
            >
              <Download size={16} aria-hidden="true" />
              Download Location CSV
            </button>
          </div>

          {error ? <div className="alert-box alert-error">{error}</div> : null}

          <div className="kpi-strip">
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
              <span className="kpi-label">Alumni employed or freelancing</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-value">
                {loading || !summary ? '—' : `${summary.employment_rate_pct}%`}
              </span>
              <span className="kpi-label">Employment rate</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-value">{loading || !summary ? '—' : summary.countries}</span>
              <span className="kpi-label">Countries</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-value">
                {loading || !summary ? '—' : summary.cohorts_completed}
              </span>
              <span className="kpi-label">Completed cohorts</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-value">
                {loading || !summary ? '—' : `${summary.women_pct}%`}
              </span>
              <span className="kpi-label">Women learners</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-value">
                {loading || !summary ? '—' : summary.employer_partners}
              </span>
              <span className="kpi-label">Employer partners</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Geographic Impact */}
      <section className="section section-surface-white">
        <div className="container">
          <div className="section-header-row">
            <div>
              <span className="kicker">Section 2 · Geographic Impact</span>
              <h2 className="section-title">Impact across seven African cities.</h2>
            </div>
          </div>

          {locations.length > 0 ? <ImpactMap locations={locations} /> : null}
        </div>
      </section>

      {/* Section 3: Impact Over Time (2022–2026 YTD) */}
      <section className="section">
        <div className="container">
          <div className="section-header-row">
            <div>
              <span className="kicker">Section 3 · Multi-Year Trajectory</span>
              <h2 className="section-title">Impact Over Time (2022–2026 YTD)</h2>
              <p className="lead-copy" style={{ marginTop: '8px' }}>
                Annual progression in learners trained, graduates, employment rate, country footprint,
                and employer partnerships. Year 2026 reflects performance through 31 October 2026 (YTD).
              </p>
            </div>
          </div>

          <div className="form-panel" style={{ marginBottom: '28px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                marginBottom: '18px',
                flexWrap: 'wrap',
              }}
            >
              <h3 className="card-title">Annual Learners vs. Graduates &amp; Employment Rate</h3>
              <div className="meta-inline">
                <span>
                  <strong style={{ color: 'var(--navy)' }}>Navy:</strong> Learners
                </span>
                <span>·</span>
                <span>
                  <strong style={{ color: 'var(--green)' }}>Green:</strong> Graduates
                </span>
              </div>
            </div>

            <div className="bar-chart-list">
              {years.map((row) => {
                const learnersPct = Math.round((row.learners_trained / maxYearLearners) * 100);
                const gradsPct = Math.round((row.graduates / maxYearLearners) * 100);
                return (
                  <div key={row.year} className="bar-row">
                    <div>
                      <strong>{row.year}</strong>
                      {row.is_ytd ? (
                        <span
                          className="mono"
                          style={{ marginLeft: '6px', color: 'var(--amber-ink)', fontSize: '0.75rem' }}
                        >
                          YTD
                        </span>
                      ) : null}
                      <div style={{ fontSize: '0.78rem', color: 'var(--slate)' }}>
                        {row.countries_active} countries · {row.employer_partners_cumulative} partners
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: '4px' }}>
                      <div className="bar-track" title={`${row.learners_trained} learners`}>
                        <div className="bar-fill" style={{ width: `${learnersPct}%` }} />
                      </div>
                      <div className="bar-track" title={`${row.graduates} graduates`}>
                        <div className="bar-fill bar-fill-green" style={{ width: `${gradsPct}%` }} />
                      </div>
                    </div>

                    <div className="mono" style={{ textAlign: 'right', fontSize: '0.8rem' }}>
                      <div>{row.learners_trained} lrn.</div>
                      <div style={{ color: 'var(--green-ink)' }}>
                        {row.employed_or_freelancing_pct}% emp.
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th className="num">Learners</th>
                  <th className="num">Graduates</th>
                  <th className="num">Employed %</th>
                  <th className="num">Women %</th>
                  <th className="num">Countries</th>
                  <th className="num">Cohorts</th>
                  <th className="num">Partners</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {years.map((row) => (
                  <tr key={row.year}>
                    <td>
                      <strong>{row.year}</strong>
                      {row.is_ytd ? (
                        <span
                          className="mono"
                          style={{ marginLeft: '6px', color: 'var(--amber-ink)', fontSize: '0.75rem' }}
                        >
                          YTD
                        </span>
                      ) : null}
                    </td>
                    <td className="num">{row.learners_trained}</td>
                    <td className="num">{row.graduates}</td>
                    <td className="num">{row.employed_or_freelancing_pct}%</td>
                    <td className="num">{row.women_pct}%</td>
                    <td className="num">{row.countries_active}</td>
                    <td className="num">{row.cohorts_completed}</td>
                    <td className="num">{row.employer_partners_cumulative}</td>
                    <td style={{ whiteSpace: 'normal', minWidth: '220px', color: 'var(--slate)' }}>
                      {row.note ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 4: Programme Impact (P1–P11) */}
      <section className="section section-surface-white">
        <div className="container">
          <div className="section-header-row">
            <div>
              <span className="kicker">Section 4 · Programme Impact (P1–P11)</span>
              <h2 className="section-title">
                Enrolment, completion, active freelancing &amp; time to first gig.
              </h2>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => onNavigate('/programmes')}
            >
              Explore All 11 Pathways
            </button>
          </div>

          <div className="form-panel">
            <div className="meta-inline" style={{ marginBottom: '16px' }}>
              <span>
                <strong style={{ color: 'var(--navy)' }}>Navy bar:</strong> Enrolled
              </span>
              <span>·</span>
              <span>
                <strong style={{ color: 'var(--amber-ink)' }}>Amber bar:</strong> Completed
              </span>
              <span>·</span>
              <span>
                <strong style={{ color: 'var(--green-ink)' }}>Green bar:</strong> Active freelancing
              </span>
            </div>

            <div className="bar-chart-list">
              {pathways.map((pathway) => {
                const enrolledPct = Math.round((pathway.learners_enrolled / maxEnrolled) * 100);
                const completedPct = Math.round((pathway.completed / maxEnrolled) * 100);
                const workingPct = Math.round((pathway.freelancing_active / maxEnrolled) * 100);
                return (
                  <div key={pathway.code} className="bar-row">
                    <div>
                      <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--green-ink)' }}>
                        {pathway.code}
                      </span>{' '}
                      <strong style={{ fontSize: '0.86rem' }}>{pathway.name}</strong>
                      <div style={{ fontSize: '0.76rem', color: 'var(--slate)' }}>
                        Avg {pathway.avg_days_to_first_gig} days to first gig
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: '4px' }}>
                      <div className="bar-track" title={`${pathway.learners_enrolled} enrolled`}>
                        <div className="bar-fill" style={{ width: `${enrolledPct}%` }} />
                      </div>
                      <div className="bar-track" title={`${pathway.completed} completed`}>
                        <div className="bar-fill bar-fill-amber" style={{ width: `${completedPct}%` }} />
                      </div>
                      <div className="bar-track" title={`${pathway.freelancing_active} active`}>
                        <div className="bar-fill bar-fill-green" style={{ width: `${workingPct}%` }} />
                      </div>
                    </div>

                    <div className="mono" style={{ textAlign: 'right', fontSize: '0.78rem' }}>
                      <div>{pathway.learners_enrolled} enr.</div>
                      <div style={{ color: 'var(--amber-ink)' }}>{pathway.completed} grad.</div>
                      <div style={{ color: 'var(--green-ink)' }}>{pathway.freelancing_active} active</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Impact Stories & Annual Reports */}
      <section className="section">
        <div className="container">
          <div className="section-header-row">
            <div>
              <span className="kicker">Section 5 · Stories &amp; Annual Reports</span>
              <h2 className="section-title">Approved Graduate Outcomes &amp; Annual Reports</h2>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => onNavigate('/alumni')}
            >
              Browse Alumni Directory
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>

          {impactStories.length > 0 ? (
            <div className="grid-3" style={{ marginBottom: '28px' }}>
              {impactStories.map((story) => (
                <article key={story.id} className="card card-cream">
                  <div className="meta-inline">
                    <MapPin size={14} aria-hidden="true" />
                    <strong>{story.city}</strong>
                  </div>
                  <h3 className="card-title">{story.title}</h3>
                  <p className="card-copy" style={{ fontStyle: 'italic' }}>
                    “{story.quote}”
                  </p>
                  {story.highlight ? (
                    <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--green-ink)' }}>
                      {story.highlight}
                    </span>
                  ) : null}
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--navy)', marginTop: 'auto' }}>
                    {story.attribution}
                  </span>
                </article>
              ))}
            </div>
          ) : null}

          {stories.length > 0 ? (
            <div className="grid-3" style={{ marginBottom: '40px' }}>
              {stories.map((alum) => (
                <article key={alum.business_id} className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                      <h3 className="card-title">
                        {alum.first_name} {alum.last_name}
                      </h3>
                    </div>
                  </div>
                  <p className="card-copy" style={{ fontWeight: 600, color: 'var(--navy)' }}>
                    {alum.pathway_name}
                  </p>
                  <p className="card-copy">{alum.short_bio}</p>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      marginTop: 'auto',
                      paddingTop: '12px',
                      borderTop: '1px solid var(--line)',
                    }}
                  >
                    <span className="meta-inline">
                      <MapPin size={14} aria-hidden="true" />
                      {[alum.city, alum.country].filter(Boolean).join(', ')}
                    </span>
                    <button
                      type="button"
                      className="inline-link-btn"
                      onClick={() => onNavigate(`/alumni/${alum.business_id}`)}
                    >
                      Profile <ArrowRight size={14} aria-hidden="true" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          <div className="grid-2">
            {reports.map((report) => (
              <article key={report.year} className="card card-cream">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                  <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--green-ink)' }}>
                    Annual Report · {report.year}
                  </span>
                  <FileText size={16} aria-hidden="true" style={{ color: 'var(--navy)' }} />
                </div>
                <h3 className="card-title">{report.title}</h3>
                <p className="card-copy">{report.vision_statement}</p>
                {report.director_message ? (
                  <p className="card-copy" style={{ fontSize: '0.88rem' }}>
                    {report.director_message}
                  </p>
                ) : null}
                {report.highlights && report.highlights.length > 0 ? (
                  <ul className="submodule-list" style={{ marginTop: '4px' }}>
                    {report.highlights.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
                <div className="meta-inline tabular-nums" style={{ marginTop: '6px' }}>
                  <span>
                    <strong>{report.learners_trained}</strong> learners
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    <strong>{report.graduates}</strong> graduates ({report.graduation_rate_pct}%)
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    <strong>{report.employed_or_freelancing_pct}%</strong> employed
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    <strong>{report.employer_partners}</strong> partners
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: 'auto' }}>
                  {report.pdf_url ? (
                    <a
                      href={report.pdf_url}
                      download={`Konexio-Africa-Annual-Report-${report.year}.pdf`}
                      className="btn btn-primary btn-sm"
                    >
                      <Download size={14} aria-hidden="true" />
                      Download {report.year} PDF
                    </a>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => handleDownloadReport(report)}
                  >
                    <Download size={14} aria-hidden="true" />
                    Text Summary
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ImpactsPage;