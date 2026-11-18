import { useState, type FormEvent } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { subscribeNewsletter } from '../api';

type FooterProps = {
  onNavigate: (path: string) => void;
};

const Footer = ({ onNavigate }: FooterProps) => {
  const [email, setEmail] = useState('');
  const [list, setList] = useState<'alumni' | 'donor_partner'>('alumni');
  const [consent, setConsent] = useState(false);
  const [websiteUrlHoneypot, setWebsiteUrlHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  const handleSubscribe = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const result = await subscribeNewsletter({
        email,
        list,
        consent,
        website_url: websiteUrlHoneypot,
      });
      setEmail('');
      setConsent(false);
      setFeedback({ type: 'success', text: result.message });
    } catch (error) {
      setFeedback({
        type: 'error',
        text: error instanceof Error ? error.message : 'Unable to subscribe right now.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <h2 className="footer-heading" style={{ fontSize: '1.15rem' }}>
              Konexio Africa — Digi Pass
            </h2>
            <p style={{ margin: '0 0 14px', fontSize: '0.9rem', lineHeight: 1.65 }}>
              A digital skills and career placement platform equipping learners, graduates, and
              displaced talent across seven African hubs for sustainable online work.
            </p>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.82)' }}>
              Enquiries are routed securely through our Contact and Express Interest forms to protect
              staff and alumni privacy.
            </p>
          </div>

          <div>
            <h3 className="footer-heading">Navigation</h3>
            <ul className="footer-links">
              {[
                ['Home', '/'],
                ['About Us', '/about'],
                ['Impact Dashboard', '/impact'],
                ['Alumni Directory', '/alumni'],
                ['Konexio Team', '/team'],
                ['Get Involved', '/get-involved'],
                ['Contact Form', '/contact'],
              ].map(([label, path]) => (
                <li key={path}>
                  <button
                    type="button"
                    className="footer-link-btn"
                    onClick={() => onNavigate(path)}
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="footer-heading">Programmes</h3>
            <ul className="footer-links">
              <li>
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={() => onNavigate('/programmes')}
                >
                  Part I Foundations (M0–M5)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={() => onNavigate('/programmes')}
                >
                  11 Career Pathways (P1–P11)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={() => onNavigate('/alumni?pathway=P1')}
                >
                  Digital Marketing (P1)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={() => onNavigate('/alumni?pathway=P3')}
                >
                  Customer Service &amp; VA (P3)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={() => onNavigate('/alumni?pathway=P7')}
                >
                  Sales &amp; Lead Gen (P7)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={() => onNavigate('/team')}
                >
                  Team &amp; LinkedIn Profiles
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="footer-heading">Newsletter Updates</h3>
            <form onSubmit={handleSubscribe} style={{ display: 'grid', gap: '10px' }}>
              <div className="sr-only" aria-hidden="true">
                <label htmlFor="footer-website-url">Website</label>
                <input
                  id="footer-website-url"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={websiteUrlHoneypot}
                  onChange={(e) => setWebsiteUrlHoneypot(e.target.value)}
                />
              </div>
              <label className="sr-only" htmlFor="footer-newsletter-list">
                Newsletter list
              </label>
              <select
                id="footer-newsletter-list"
                className="footer-input"
                value={list}
                onChange={(e) => setList(e.target.value as 'alumni' | 'donor_partner')}
              >
                <option value="alumni" style={{ color: '#142D42' }}>
                  Alumni &amp; Learner Updates
                </option>
                <option value="donor_partner" style={{ color: '#142D42' }}>
                  Partner &amp; Donor Briefings
                </option>
              </select>

              <label className="sr-only" htmlFor="footer-newsletter-email">
                Email address
              </label>
              <input
                id="footer-newsletter-email"
                type="email"
                required
                placeholder="you@example.org"
                className="footer-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  fontSize: '0.78rem',
                  color: 'rgba(255,255,255,0.78)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  style={{ marginTop: '3px' }}
                />
                <span>I agree to receive updates from Konexio Africa and can unsubscribe anytime.</span>
              </label>

              <button
                type="submit"
                className="btn btn-amber btn-sm"
                disabled={submitting}
                style={{ width: 'fit-content' }}
              >
                {submitting ? 'Subscribing...' : 'Subscribe'}
                <ArrowRight size={14} aria-hidden="true" />
              </button>

              {feedback ? (
                <p
                  aria-live="polite"
                  style={{
                    margin: 0,
                    fontSize: '0.8rem',
                    color: feedback.type === 'success' ? '#A7F3D0' : '#FECACA',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {feedback.type === 'success' ? (
                    <CheckCircle2 size={14} aria-hidden="true" />
                  ) : null}
                  {feedback.text}
                </p>
              ) : null}
            </form>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 Konexio Africa Digi Pass</span>
         
          <div style={{ display: 'flex', gap: '18px' }}>
            <button
              type="button"
              className="footer-link-btn"
              onClick={() => onNavigate('/privacy')}
            >
              Privacy Policy
            </button>
            <button
              type="button"
              className="footer-link-btn"
              onClick={() => onNavigate('/terms')}
            >
              Terms of Use
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
