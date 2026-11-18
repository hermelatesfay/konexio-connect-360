import { type FormEvent, useState } from 'react';
import { ArrowRight, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

type LoginPageProps = {
  onNavigate: (path: string) => void;
};

const DEMO_ACCOUNTS = [
  {
    label: 'Employer / Client',
    email: 'employer@konexio-demo.org',
    description: 'Talent search, hiring enquiries & submission tracking',
  },
  {
    label: 'Learner',
    email: 'learner@konexio-demo.org',
    description: 'Part I modules, cohort status & pathway explorer',
  },
  {
    label: 'Alumni',
    email: 'alumni@konexio-demo.org',
    description: 'Portfolio links, availability & consent preferences',
  },
  {
    label: 'Partner / Donor',
    email: 'partner@konexio-demo.org',
    description: 'Impact metrics, reports & newsletter preferences',
  },
  {
    label: 'Administrator',
    email: 'admin@konexio-demo.org',
    description: 'Consent moderation, user roles & live impact console',
  },
];

const LoginPage = ({ onNavigate }: LoginPageProps) => {
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const user = await login({ email: email.trim(), password });
      onNavigate(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch {
      // Error surfaced via authStore
    }
  };

  const handleDemoSignIn = async (demoEmail: string) => {
    clearError();
    setEmail(demoEmail);
    setPassword('KonexioDemo2026!');
    try {
      const user = await login({ email: demoEmail, password: 'KonexioDemo2026!' });
      onNavigate(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch {
      // Error surfaced via authStore
    }
  };

  return (
    <section className="auth-shell">
      <div className="container">
        <div className="auth-layout">
          <div className="form-panel">
            <span className="kicker">Member Access</span>
            <h1 className="page-title" style={{ marginBottom: '8px' }}>
              Sign In to Konexio Connect
            </h1>
            <p className="card-copy" style={{ marginBottom: '22px' }}>
              Access your learner tracker, alumni consent controls, partner overview, or administrator console.
            </p>

            {error ? (
              <div className="alert-box alert-error" style={{ marginBottom: '18px' }}>
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
              <div className="field-group">
                <label htmlFor="login-email">Email address</label>
                <input
                  id="login-email"
                  type="email"
                  className="input-control"
                  required
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    clearError();
                  }}
                  placeholder="name@konexio-demo.org"
                />
              </div>

              <div className="field-group">
                <label htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  type="password"
                  className="input-control"
                  required
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    clearError();
                  }}
                  placeholder="Enter your password"
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                <Lock size={15} aria-hidden="true" />
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div
              style={{
                marginTop: '22px',
                paddingTop: '18px',
                borderTop: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <span className="card-copy">New to Konexio Africa?</span>
              <button
                type="button"
                className="inline-link-btn"
                onClick={() => onNavigate('/signup')}
              >
                Create an account
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            </div>
          </div>

          <aside className="form-panel" style={{ background: 'var(--white)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <KeyRound size={18} aria-hidden="true" style={{ color: 'var(--amber-ink)' }} />
              <span className="kicker" style={{ marginBottom: 0 }}>
                QUICK ROLE ACCESS
              </span>
            </div>
            <h2 className="card-title" style={{ marginBottom: '8px' }}>
              Role-Based Portal Accounts
            </h2>
            <p className="card-copy" style={{ marginBottom: '18px' }}>
              Select any pre-configured role account below to sign in through the standard JWT
              authentication flow and access role-specific workflows.
            </p>

            <div style={{ display: 'grid', gap: '10px' }}>
              {DEMO_ACCOUNTS.map((acct) => (
                <div
                  key={acct.email}
                  style={{
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.92rem', color: 'var(--navy)' }}>
                      {acct.label}
                    </strong>
                    <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--slate)' }}>
                      {acct.email}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>
                      {acct.description}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={loading}
                    onClick={() => handleDemoSignIn(acct.email)}
                  >
                    Sign in as {acct.label}
                  </button>
                </div>
              ))}
            </div>

            <div className="alert-box alert-info" style={{ marginTop: '16px' }}>
              <ShieldCheck size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span style={{ fontSize: '0.82rem' }}>
                Administrator routes are strictly verified server-side; non-admin accounts receive HTTP 403.
              </span>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default LoginPage;