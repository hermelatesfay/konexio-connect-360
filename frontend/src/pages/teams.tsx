import { useEffect, useState } from 'react';
import { ArrowRight, ExternalLink, Mail, ShieldCheck } from 'lucide-react';
import { fetchTeam } from '../api';
import type { PublicTeamMember } from '../types';

type TeamsPageProps = {
  onNavigate: (path: string) => void;
};

const TeamsPage = ({ onNavigate }: TeamsPageProps) => {
  const [team, setTeam] = useState<PublicTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchTeam()
      .then((res) => {
        if (!active) return;
        setTeam(res.team);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load Konexio Africa team.');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <section className="section-tight section-surface-white">
        <div className="container">
          <span className="kicker">People &amp; Leadership</span>
          <h1 className="page-title">The Konexio Africa Team</h1>
          <p className="lead-copy">
            Regional directors, curriculum architects, alumni community managers, and partnership
            coordinators leading cohort delivery across seven African hubs. Personal role mailboxes
            are never displayed publicly; select “Contact via Form” on any card to message the right
            role desk directly.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {loading ? <p className="card-copy">Loading team directory...</p> : null}
          {error ? <div className="alert-box alert-error">{error}</div> : null}

          {!loading && !error ? (
            <div className="grid-4">
              {team.map((member, index) => (
                <article key={member.business_id} className="card">
                  <div className="team-portrait-frame">
                    <div
                      className={`avatar avatar-lg${
                        index % 3 === 1
                          ? ' avatar-cyan'
                          : index % 3 === 2
                            ? ' avatar-amber'
                            : ''
                      }`}
                      style={{ width: '58px', height: '58px', fontSize: '1.1rem' }}
                      aria-hidden="true"
                    >
                      {member.initials}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="pathway-code">{member.business_id}</span>
                      <div style={{ fontSize: '0.76rem', color: 'var(--slate)' }}>
                        Leadership &amp; Delivery
                      </div>
                    </div>
                  </div>

                  <div>
                    <h2 className="card-title">
                      {member.first_name} {member.last_name}
                    </h2>
                    <p
                      style={{
                        margin: '4px 0 0',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        color: 'var(--cyan-ink)',
                      }}
                    >
                      {member.job_title}
                    </p>
                  </div>

                  <p className="card-copy" style={{ flex: 1 }}>
                    {member.short_bio}
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      paddingTop: '12px',
                      borderTop: '1px solid var(--line)',
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() =>
                        onNavigate(`/contact?topic=${encodeURIComponent(member.contact_topic)}`)
                      }
                    >
                      <Mail size={14} aria-hidden="true" />
                      Contact via Form
                    </button>
                    {member.linkedin_url ? (
                      <a
                        href={member.linkedin_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-outline btn-sm"
                      >
                        LinkedIn
                        <ExternalLink size={14} aria-hidden="true" />
                      </a>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          <div className="alert-box alert-info" style={{ marginTop: '36px' }}>
            <ShieldCheck size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Role-Based Routing Without Public Inbox Exposure</strong>
              <p style={{ margin: '4px 0 0' }}>
                In line with Konexio Africa security and privacy standards, staff email addresses and
                private mailboxes are never published on public pages. Selecting “Contact via Form”
                pre-fills the matching topic on our secure contact form.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ marginLeft: 'auto' }}
              onClick={() => onNavigate('/contact')}
            >
              Open Contact Form
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>
    </>
  );
};

export default TeamsPage;
