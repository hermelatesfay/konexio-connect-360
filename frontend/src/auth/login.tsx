import { type FormEvent, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import {
  confirmPasswordReset,
  requestPasswordReset,
  startTwoFactorEnroll,
  verifyTwoFactorChallenge,
  verifyTwoFactorEnroll,
} from '../api';
import { useAuthStore } from '../store/authStore';
import type { TwoFactorEnrollStartPayload, TwoFactorVerifyResponse } from '../types';

type LoginPageProps = {
  onNavigate: (path: string) => void;
};

type AuthViewMode = 'signin' | 'forgot' | 'reset';

const LoginPage = ({ onNavigate }: LoginPageProps) => {
  const login = useAuthStore((state) => state.login);
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const pendingMfa = useAuthStore((state) => state.pendingMfa);
  const completeMfaAuth = useAuthStore((state) => state.completeMfaAuth);
  const clearPendingMfa = useAuthStore((state) => state.clearPendingMfa);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const [viewMode, setViewMode] = useState<AuthViewMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Forgot / Reset password flow
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  // 2FA challenge / enrollment flow
  const [mfaCode, setMfaCode] = useState('');
  const [mfaBusy, setMfaBusy] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [enrollPayload, setEnrollPayload] = useState<TwoFactorEnrollStartPayload | null>(null);
  const [enrollSetupComplete, setEnrollSetupComplete] =
    useState<TwoFactorVerifyResponse | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedRecovery, setCopiedRecovery] = useState(false);

  useEffect(() => {
    if (pendingMfa?.mode !== 'setup') {
      return;
    }

    let active = true;
    startTwoFactorEnroll(pendingMfa.mfaToken)
      .then((res) => {
        if (active) {
          setMfaError(null);
          setEnrollPayload(res);
        }
      })
      .catch((err) => {
        if (active) {
          setMfaError(
            err instanceof Error
              ? err.message
              : 'Unable to initialize two-factor authenticator setup.',
          );
        }
      });

    return () => {
      active = false;
    };
  }, [pendingMfa]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResetSuccess(null);
    setMfaError(null);
    setMfaCode('');
    setEnrollPayload(null);
    setEnrollSetupComplete(null);
    try {
      const result = await login({
        email: email.trim(),
        password,
        remember_me: rememberMe,
      });
      if (result.status === 'authenticated') {
        onNavigate(result.user.role === 'admin' ? '/admin' : '/dashboard');
      }
    } catch {
      // Error surfaced via authStore
    }
  };

  const handleGoogleSignIn = async () => {
    setResetSuccess(null);
    setMfaError(null);
    setMfaCode('');
    setEnrollPayload(null);
    setEnrollSetupComplete(null);
    try {
      const result = await loginWithGoogle();
      if (result.status === 'authenticated') {
        onNavigate(result.user.role === 'admin' ? '/admin' : '/dashboard');
      }
    } catch {
      // Error surfaced via authStore
    }
  };

  const handleMfaChallengeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pendingMfa) return;
    setMfaBusy(true);
    setMfaError(null);

    try {
      const res = await verifyTwoFactorChallenge(pendingMfa.mfaToken, mfaCode.trim());
      completeMfaAuth(res.access_token, res.user, pendingMfa.rememberMe);
      setMfaCode('');
      onNavigate(res.user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setMfaError(
        err instanceof Error ? err.message : 'Invalid verification code. Please try again.',
      );
    } finally {
      setMfaBusy(false);
    }
  };

  const handleMfaEnrollVerifySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pendingMfa) return;
    setMfaBusy(true);
    setMfaError(null);

    try {
      const res = await verifyTwoFactorEnroll(pendingMfa.mfaToken, mfaCode.trim());
      setEnrollSetupComplete(res);
      setMfaCode('');
    } catch (err) {
      setMfaError(
        err instanceof Error ? err.message : 'Invalid 6-digit authenticator code.',
      );
    } finally {
      setMfaBusy(false);
    }
  };

  const handleFinalizeSetupLogin = () => {
    if (!enrollSetupComplete || !pendingMfa) return;
    completeMfaAuth(
      enrollSetupComplete.access_token,
      enrollSetupComplete.user,
      pendingMfa.rememberMe,
    );
    onNavigate(enrollSetupComplete.user.role === 'admin' ? '/admin' : '/dashboard');
  };

  const handleForgotSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResetBusy(true);
    setResetError(null);
    setResetSuccess(null);
    try {
      const res = await requestPasswordReset(resetEmail.trim());
      setResetSuccess(res.message);
      setViewMode('reset');
    } catch (err) {
      setResetError(
        err instanceof Error ? err.message : 'Unable to submit password reset request.',
      );
    } finally {
      setResetBusy(false);
    }
  };

  const handleConfirmResetSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResetBusy(true);
    setResetError(null);
    try {
      const res = await confirmPasswordReset({
        email: resetEmail.trim(),
        reset_code: resetCode.trim(),
        new_password: resetNewPassword,
      });
      setEmail(resetEmail.trim());
      setPassword('');
      setResetCode('');
      setResetNewPassword('');
      setResetSuccess(res.message);
      setViewMode('signin');
    } catch (err) {
      setResetError(
        err instanceof Error ? err.message : 'Invalid or expired reset code.',
      );
    } finally {
      setResetBusy(false);
    }
  };

  const copyValue = async (text: string, type: 'secret' | 'recovery') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'secret') {
        setCopiedSecret(true);
        window.setTimeout(() => setCopiedSecret(false), 2000);
      } else {
        setCopiedRecovery(true);
        window.setTimeout(() => setCopiedRecovery(false), 2000);
      }
    } catch {
      // Clipboard optional
    }
  };

  const resetToSignIn = () => {
    clearPendingMfa();
    clearError();
    setMfaCode('');
    setMfaError(null);
    setEnrollPayload(null);
    setEnrollSetupComplete(null);
    setResetError(null);
    setViewMode('signin');
  };

  return (
    <section className="auth-shell">
      <div className="container auth-single-container">
        <div className="form-panel auth-card">
          <div className="auth-brand-bar">
            <img
              src="/assets/aistudio/konexio_africa_placeholder_logo_9c0e099e.png"
              alt="Konexio Africa"
            />
            <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--slate)' }}>
              Digi Pass Portal
            </span>
          </div>

          {/* 1. Mandatory 2FA Enrollment Complete (Recovery Codes Display) */}
          {pendingMfa?.mode === 'setup' && enrollSetupComplete ? (
            <div style={{ display: 'grid', gap: '16px' }}>
              <div className="alert-box alert-success">
                <ShieldCheck size={19} aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>Two-Factor Authentication Activated</strong>
                  <p style={{ margin: '4px 0 0', fontSize: '0.86rem' }}>
                    Save these single-use recovery codes before opening the administrator console.
                  </p>
                </div>
              </div>

              {enrollSetupComplete.recovery_codes?.length ? (
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    <strong style={{ fontSize: '0.88rem', color: 'var(--indigo)' }}>
                      Single-use recovery codes
                    </strong>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() =>
                        copyValue(enrollSetupComplete.recovery_codes!.join('\n'), 'recovery')
                      }
                    >
                      <Copy size={13} aria-hidden="true" />
                      {copiedRecovery ? 'Copied' : 'Copy Codes'}
                    </button>
                  </div>
                  <div className="recovery-code-grid mono">
                    {enrollSetupComplete.recovery_codes.map((code) => (
                      <span key={code}>{code}</span>
                    ))}
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                className="btn btn-amber"
                onClick={handleFinalizeSetupLogin}
              >
                Continue to Administrator Console
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          ) : pendingMfa?.mode === 'setup' ? (
            /* 2. Mandatory 2FA QR Enrollment for Admin */
            <div style={{ display: 'grid', gap: '16px' }}>
              <span className="kicker">Mandatory Administrator Security</span>
              <h1 className="page-title" style={{ fontSize: '1.65rem' }}>
                Set Up Two-Factor Authentication
              </h1>
              <p className="card-copy">
                Administrator accounts must verify with an authenticator app before entering the
                console. Scan the QR code with Google Authenticator, Microsoft Authenticator, or
                Authy.
              </p>

              {mfaError ? <div className="alert-box alert-error">{mfaError}</div> : null}

              {enrollPayload ? (
                <form onSubmit={handleMfaEnrollVerifySubmit} style={{ display: 'grid', gap: '16px' }}>
                  <div className="mfa-qr-box">
                    <img
                      src={enrollPayload.qr_data_url}
                      alt="Authenticator app QR code for Konexio Africa"
                    />
                    <div style={{ display: 'grid', gap: '8px', flex: '1 1 180px' }}>
                      <strong style={{ fontSize: '0.88rem', color: 'var(--indigo)' }}>
                        Or enter setup key manually
                      </strong>
                      <div className="mono mfa-secret-code">{enrollPayload.manual_secret}</div>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ width: 'fit-content' }}
                        onClick={() => copyValue(enrollPayload.manual_secret, 'secret')}
                      >
                        <Copy size={13} aria-hidden="true" />
                        {copiedSecret ? 'Copied Key' : 'Copy Key'}
                      </button>
                    </div>
                  </div>

                  <div className="field-group">
                    <label htmlFor="mfa-enroll-code">6-digit verification code</label>
                    <input
                      id="mfa-enroll-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      className="input-control mono"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button type="submit" className="btn btn-primary" disabled={mfaBusy}>
                      <ShieldCheck size={15} aria-hidden="true" />
                      {mfaBusy ? 'Activating 2FA...' : 'Verify & Activate 2FA'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={resetToSignIn}
                    >
                      Use a different account
                    </button>
                  </div>
                </form>
              ) : (
                <p className="card-copy">Generating encrypted authenticator QR code...</p>
              )}
            </div>
          ) : pendingMfa?.mode === 'challenge' ? (
            /* 3. Standard TOTP / Recovery Code Challenge */
            <div style={{ display: 'grid', gap: '16px' }}>
              <span className="kicker">Two-Factor Verification</span>
              <h1 className="page-title" style={{ fontSize: '1.65rem' }}>
                Enter Authenticator Code
              </h1>
              <p className="card-copy">
                Enter the 6-digit code from your authenticator app or a single-use recovery code
                for <strong style={{ color: 'var(--indigo)' }}>{pendingMfa.user.email}</strong>.
              </p>

              {mfaError ? <div className="alert-box alert-error">{mfaError}</div> : null}

              <form onSubmit={handleMfaChallengeSubmit} style={{ display: 'grid', gap: '16px' }}>
                <div className="field-group">
                  <label htmlFor="mfa-challenge-code">Verification or recovery code</label>
                  <input
                    id="mfa-challenge-code"
                    type="text"
                    autoComplete="one-time-code"
                    maxLength={12}
                    className="input-control mono"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    placeholder="123456 or XXXX-XXXX"
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button type="submit" className="btn btn-primary" disabled={mfaBusy}>
                    <KeyRound size={15} aria-hidden="true" />
                    {mfaBusy ? 'Verifying...' : 'Verify & Sign In'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={resetToSignIn}
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            </div>
          ) : viewMode === 'forgot' ? (
            /* 4. Forgot Password Step 1 */
            <div style={{ display: 'grid', gap: '16px' }}>
              <span className="kicker">Account Recovery</span>
              <h1 className="page-title" style={{ fontSize: '1.65rem' }}>
                Reset Your Password
              </h1>
              <p className="card-copy">
                Enter the email address associated with your Konexio Africa account to request a
                password reset code.
              </p>

              {resetError ? <div className="alert-box alert-error">{resetError}</div> : null}

              <form onSubmit={handleForgotSubmit} style={{ display: 'grid', gap: '16px' }}>
                <div className="field-group">
                  <label htmlFor="forgot-email">Email address</label>
                  <input
                    id="forgot-email"
                    type="email"
                    className="input-control"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="name@organisation.org"
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={resetBusy}>
                  {resetBusy ? 'Sending request...' : 'Request Reset Code'}
                </button>
              </form>

              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <button
                  type="button"
                  className="inline-link-btn"
                  onClick={() => {
                    setResetError(null);
                    setViewMode('signin');
                  }}
                >
                  <ArrowLeft size={14} aria-hidden="true" />
                  Back to Sign In
                </button>
                <button
                  type="button"
                  className="inline-link-btn"
                  onClick={() => {
                    setResetError(null);
                    setViewMode('reset');
                  }}
                >
                  Already have a reset code?
                </button>
              </div>
            </div>
          ) : viewMode === 'reset' ? (
            /* 5. Forgot Password Step 2 */
            <div style={{ display: 'grid', gap: '16px' }}>
              <span className="kicker">Account Recovery</span>
              <h1 className="page-title" style={{ fontSize: '1.65rem' }}>
                Enter Reset Code
              </h1>

              {resetSuccess ? (
                <div className="alert-box alert-info">
                  <CheckCircle2 size={17} aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{resetSuccess}</span>
                </div>
              ) : null}
              {resetError ? <div className="alert-box alert-error">{resetError}</div> : null}

              <form onSubmit={handleConfirmResetSubmit} style={{ display: 'grid', gap: '14px' }}>
                <div className="field-group">
                  <label htmlFor="reset-email">Email address</label>
                  <input
                    id="reset-email"
                    type="email"
                    className="input-control"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="name@organisation.org"
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="reset-code">Reset code</label>
                  <input
                    id="reset-code"
                    type="text"
                    className="input-control mono"
                    required
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="8-character reset code"
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="reset-new-password">New password (min 8 characters)</label>
                  <div className="password-input-wrap">
                    <input
                      id="reset-new-password"
                      type={showResetPassword ? 'text' : 'password'}
                      className="input-control"
                      minLength={8}
                      required
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      aria-label={showResetPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowResetPassword((prev) => !prev)}
                    >
                      {showResetPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" disabled={resetBusy}>
                  {resetBusy ? 'Updating password...' : 'Update Password'}
                </button>
              </form>

              <button
                type="button"
                className="inline-link-btn"
                style={{ width: 'fit-content' }}
                onClick={() => {
                  setResetError(null);
                  setViewMode('signin');
                }}
              >
                <ArrowLeft size={14} aria-hidden="true" />
                Back to Sign In
              </button>
            </div>
          ) : (
            /* 6. Standard Clean Sign-In Form (No Quick Role Access) */
            <>
              <span className="kicker">Member Access</span>
              <h1 className="page-title" style={{ marginBottom: '8px', fontSize: '1.85rem' }}>
                Sign In to Konexio Connect
              </h1>
              <p className="card-copy" style={{ marginBottom: '22px' }}>
                Sign in with your registered email and password to access your learner, alumni,
                employer, partner, or administrator workspace.
              </p>

              {resetSuccess ? (
                <div className="alert-box alert-success" style={{ marginBottom: '18px' }}>
                  <CheckCircle2 size={17} aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{resetSuccess}</span>
                </div>
              ) : null}

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
                    autoComplete="email"
                    className="input-control"
                    required
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      clearError();
                    }}
                    placeholder="name@organisation.org"
                  />
                </div>

                <div className="field-group">
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    <label htmlFor="login-password">Password</label>
                    <button
                      type="button"
                      className="inline-link-btn"
                      style={{ fontSize: '0.82rem' }}
                      onClick={() => {
                        setResetEmail(email.trim());
                        setResetError(null);
                        setResetSuccess(null);
                        setViewMode('forgot');
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="password-input-wrap">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      className="input-control"
                      required
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        clearError();
                      }}
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                  />
                  <span>Remember me on this device</span>
                </label>

                <button type="submit" className="btn btn-primary" disabled={loading}>
                  <Lock size={15} aria-hidden="true" />
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <div className="auth-divider">
                <span>or</span>
              </div>

              <button
                type="button"
                className="btn btn-outline"
                disabled={loading}
                onClick={handleGoogleSignIn}
                style={{ width: '100%' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                  />
                </svg>
                Continue with Google
              </button>

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
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default LoginPage;