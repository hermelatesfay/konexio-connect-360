import { ArrowLeft, FileText, ShieldCheck } from 'lucide-react';

type LegalPageProps = {
  mode: 'privacy' | 'terms';
  onNavigate: (path: string) => void;
};

const LegalPage = ({ mode, onNavigate }: LegalPageProps) => {
  const isPrivacy = mode === 'privacy';

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: '820px' }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ marginBottom: '20px', paddingInline: 0 }}
          onClick={() => onNavigate('/')}
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Back to Home
        </button>

        <div className="form-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            {isPrivacy ? (
              <ShieldCheck size={22} aria-hidden="true" style={{ color: 'var(--green)' }} />
            ) : (
              <FileText size={22} aria-hidden="true" style={{ color: 'var(--navy)' }} />
            )}
            <span className="kicker" style={{ marginBottom: 0 }}>
              Konexio Africa · Data Governance &amp; Privacy · 31 October 2026
            </span>
          </div>

          <h1 className="page-title" style={{ marginBottom: '16px' }}>
            {isPrivacy ? 'Privacy Policy & Consent Controls' : 'Terms of Use & Platform Governance'}
          </h1>

          {isPrivacy ? (
            <div style={{ display: 'grid', gap: '16px' }}>
              <p className="card-copy">
                Konexio Africa — Digi Pass treats learner, alumni, team, and partner privacy as
                foundational. We collect only the information needed to respond to enquiries, send
                newsletters you opted into, and showcase alumni profiles with explicit consent.
              </p>
              <h2 className="card-title">1. What We Collect &amp; Why</h2>
              <p className="card-copy">
                We store contact form and Express Interest submissions (name, organisation, email,
                message), newsletter opt-in preferences, and alumni profile details that graduates
                explicitly agree to publish. Data is reviewed solely by authorised Konexio Africa
                staff and—when visitor routing consent is enabled—matched alumni. We never sell
                personal data.
              </p>
              <h2 className="card-title">2. Alumni Publication &amp; Media Consent</h2>
              <p className="card-copy">
                An alumnus profile appears in the public directory only when{' '}
                <strong>consent to publish</strong> is explicitly enabled. Alumni may update
                availability, withdraw publication consent, or restrict portrait media display at
                any time from their personal dashboard or via the Contact form.
              </p>
              <h2 className="card-title">3. Private Notification Addresses &amp; Team Mailboxes</h2>
              <p className="card-copy">
                Private alumni notification emails and internal Konexio Africa role mailboxes are
                never exposed on public web pages or public API payloads. Inquiries are routed
                server-side through our Express Interest and Contact workflows.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              <p className="card-copy">
                Metrics, hub breakdowns, programme cohorts, alumni profiles, team bios, and partner
                showcase records presented across this platform reflect Konexio Africa Digi Pass
                records as of <strong>31 October 2026</strong>.
              </p>
              <h2 className="card-title">1. Programme &amp; Reporting Scope</h2>
              <p className="card-copy">
                Figures cover seven active training hubs across Africa (1,248 learners trained, 972
                graduates, 584 alumni employed or freelancing, 60% employment rate, 18 completed
                cohorts, 54% women learners, and 27 employer partners), alongside Annual Reports for
                2024 and 2025.
              </p>
              <h2 className="card-title">2. Role-Based Access &amp; Moderation</h2>
              <p className="card-copy">
                Learner, alumni, employer, partner, and donor dashboards provide personal session
                capabilities. Administrative consent moderation and impact governance routes are
                restricted strictly to authorised administrators.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default LegalPage;
