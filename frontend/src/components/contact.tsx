import { type FormEvent, useState } from 'react';
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { API_BASE_URL } from '../api';

type ContactProps = {
  initialTopic?: string;
  onNavigate?: (path: string) => void;
};

const VISITOR_CATEGORIES = [
  'Employer / Client',
  'Prospective Learner',
  'Alumni',
  'Donor / Partner',
  'General',
];

const CONTACT_TOPICS = [
  'Training and programmes',
  'Partnerships, funding, hiring',
  'Alumni community',
  'Website or technical problem',
  'Press and general',
];

const ContactSection = ({ initialTopic = '', onNavigate }: ContactProps) => {
  const matchedTopic = CONTACT_TOPICS.includes(initialTopic)
    ? initialTopic
    : CONTACT_TOPICS[0];

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [visitorCategory, setVisitorCategory] = useState(VISITOR_CATEGORIES[0]);
  const [topic, setTopic] = useState(matchedTopic);
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [websiteUrlHoneypot, setWebsiteUrlHoneypot] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [routedRole, setRoutedRole] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedTopic = topic.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName || !trimmedEmail || !trimmedTopic || !trimmedMessage) {
      setStatus('error');
      setFeedback('Please enter your name, email address, enquiry topic, and message.');
      return;
    }

    if (trimmedPhone && (trimmedPhone.length < 7 || trimmedPhone.length > 32)) {
      setStatus('error');
      setFeedback('If providing a phone number, please enter 7 to 32 characters.');
      return;
    }

    if (!consent) {
      setStatus('error');
      setFeedback('Please confirm your consent so our team can review and respond to your enquiry.');
      return;
    }

    setStatus('submitting');
    setFeedback(null);
    setRoutedRole(null);

    try {
      const response = await fetch(`${API_BASE_URL}/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          phone: trimmedPhone || undefined,
          visitor_category: visitorCategory,
          topic: trimmedTopic,
          message: trimmedMessage,
          consent,
          website_url: websiteUrlHoneypot,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const messageText =
          typeof data?.detail === 'string'
            ? data.detail
            : 'Unable to send your message right now. Please try again.';
        throw new Error(messageText);
      }

      setStatus('success');
      setRoutedRole(typeof data?.routed_to_role === 'string' ? data.routed_to_role : null);
      setFeedback('Your message has been logged and routed to the appropriate Konexio Africa desk.');
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
      setConsent(false);
    } catch (err) {
      setStatus('error');
      setFeedback(
        err instanceof Error ? err.message : 'Unable to send your message right now.',
      );
    }
  };

  return (
    <section className="section">
      <div className="container">
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <div>
            <span className="kicker">Topic-Routed Support</span>
            <h1 className="page-title">Contact Konexio Africa</h1>
            <p className="lead-copy">
              Messages are routed internally by visitor category and enquiry topic to the right
              programme, partnerships, alumni, or technical coordinator. Private staff email
              addresses and personal phone numbers are never published publicly.
            </p>

            <div className="card" style={{ marginTop: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} aria-hidden="true" style={{ color: 'var(--cyan-ink)' }} />
                <h2 className="card-title">How Your Message Is Routed</h2>
              </div>
              <div className="numbered-list" style={{ marginTop: '8px' }}>
                <div className="numbered-row">
                  <span className="numbered-idx">01</span>
                  <div>
                    <strong style={{ color: 'var(--indigo)' }}>Training and programmes</strong>
                    <div className="card-copy" style={{ fontSize: '0.88rem' }}>
                      Curriculum, cohorts, and learner admissions
                    </div>
                  </div>
                </div>
                <div className="numbered-row">
                  <span className="numbered-idx">02</span>
                  <div>
                    <strong style={{ color: 'var(--indigo)' }}>Partnerships, funding, hiring</strong>
                    <div className="card-copy" style={{ fontSize: '0.88rem' }}>
                      Employer hiring &amp; institutional grants
                    </div>
                  </div>
                </div>
                <div className="numbered-row">
                  <span className="numbered-idx">03</span>
                  <div>
                    <strong style={{ color: 'var(--indigo)' }}>Alumni community</strong>
                    <div className="card-copy" style={{ fontSize: '0.88rem' }}>
                      Graduate showcase and consent preferences
                    </div>
                  </div>
                </div>
                <div className="numbered-row">
                  <span className="numbered-idx">04</span>
                  <div>
                    <strong style={{ color: 'var(--indigo)' }}>Website or technical problem</strong>
                    <div className="card-copy" style={{ fontSize: '0.88rem' }}>
                      Platform access and account support
                    </div>
                  </div>
                </div>
                <div className="numbered-row">
                  <span className="numbered-idx">05</span>
                  <div>
                    <strong style={{ color: 'var(--indigo)' }}>Press and general</strong>
                    <div className="card-copy" style={{ fontSize: '0.88rem' }}>
                      Communications and regional hub requests
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {onNavigate ? (
              <div className="hero-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => onNavigate('/get-involved#express-interest')}
                >
                  Hiring? Use Express Interest Form
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </div>

          <div className="form-panel">
            <h2 className="card-title" style={{ marginBottom: '16px' }}>
              Send a Direct Enquiry
            </h2>

            {status === 'success' && feedback ? (
              <div className="alert-box alert-success" style={{ marginBottom: '18px' }}>
                <CheckCircle2 size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>{feedback}</strong>
                  {routedRole ? (
                    <p style={{ margin: '4px 0 0', fontSize: '0.86rem' }}>
                      Assigned role desk: <strong>{routedRole}</strong>. Expected response: 3 working days.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {status === 'error' && feedback ? (
              <div className="alert-box alert-error" style={{ marginBottom: '18px' }}>
                {feedback}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
              {/* Hidden spam-protection honeypot field */}
              <div className="sr-only" aria-hidden="true">
                <label htmlFor="contact-website-url">Website</label>
                <input
                  id="contact-website-url"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={websiteUrlHoneypot}
                  onChange={(e) => setWebsiteUrlHoneypot(e.target.value)}
                />
              </div>

              <div className="form-grid-2">
                <div className="field-group">
                  <label htmlFor="contact-name">Full name</label>
                  <input
                    id="contact-name"
                    type="text"
                    className="input-control"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="contact-category">Visitor category</label>
                  <select
                    id="contact-category"
                    className="select-control"
                    value={visitorCategory}
                    onChange={(e) => setVisitorCategory(e.target.value)}
                  >
                    {VISITOR_CATEGORIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="field-group">
                  <label htmlFor="contact-email">Email address</label>
                  <input
                    id="contact-email"
                    type="email"
                    className="input-control"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.org"
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="contact-phone">Phone number (optional)</label>
                  <input
                    id="contact-phone"
                    type="tel"
                    className="input-control"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Optional contact number"
                  />
                </div>
              </div>

              <div className="field-group">
                <label htmlFor="contact-topic">Enquiry type / Topic</label>
                <select
                  id="contact-topic"
                  className="select-control"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                >
                  {CONTACT_TOPICS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <label htmlFor="contact-message">Message</label>
                  <span className="mono" style={{ fontSize: '0.76rem', color: 'var(--slate)' }}>
                    {message.length}/1500
                  </span>
                </div>
                <textarea
                  id="contact-message"
                  className="textarea-control"
                  maxLength={1500}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How can our team assist you?"
                />
              </div>

              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>
                  I consent to Konexio Africa storing and routing this enquiry internally so the
                  relevant team coordinator can respond.
                </span>
              </label>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={status === 'submitting'}
              >
                {status === 'submitting' ? 'Sending message...' : 'Send Message'}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
