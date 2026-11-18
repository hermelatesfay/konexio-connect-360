import { type FormEvent, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import {
  changeAccountPassword,
  disableTwoFactor,
  fetchTwoFactorStatus,
  reauthenticateSession,
  startTwoFactorEnroll,
  verifyTwoFactorEnroll,
} from '../api';
import { useAuthStore } from '../store/authStore';
import type { TwoFactorEnrollStartPayload, TwoFactorStatusPayload } from '../types';

const SecuritySettingsPanel = () => {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const refreshAuthSession = useAuthStore((s) => s.refreshAuthSession);

  const [status, setStatus] = useState<TwoFactorStatusPayload | null>(null);
  const [statusChecked, setStatusChecked] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Enrollment / rotation flow
  const [enrollData, setEnrollData] = useState<TwoFactorEnrollStartPayload | null>(null);
  const [enrollCode, setEnrollCode] = useState('');
  const [enrollBusy, setEnrollBusy] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedRecovery, setCopiedRecovery] = useState(false);

  // Re-authentication (fresh auth window)
  const [reauthCode, setReauthCode] = useState('');
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthBusy, setReauthBusy] = useState(false);

  // Disable 2FA (non-admin only)
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [disableBusy, setDisableBusy] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordTotpCode, setPasswordTotpCode] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);

  const loadingStatus = !statusChecked;

  const loadStatus = async (authToken: string) => {
    try {
      const res = await fetchTwoFactorStatus(authToken);
      setStatus(res);
    } catch {
      // Keep graceful UI fallback from authStore user
    } finally {
      setStatusChecked(true);
    }
  };

  useEffect(() => {
    if (!token) return;
    let active = true;
    fetchTwoFactorStatus(token)
      .then((res) => {
        if (active) setStatus(res);
      })
      .catch(() => {
        // Keep graceful UI fallback from authStore user
      })
      .finally(() => {
        if (active) setStatusChecked(true);
      });
    return () => {
      active = false;
    };
  }, [token]);

  if (!user || !token) return null;

  const isAdmin = user.role === 'admin';
  const totpEnabled = status?.totp_enabled ?? Boolean(user.totp_enabled);
  const aal = status?.aal ?? user.aal ?? 'aal1';

  const handleStartEnroll = async () => {
    setFeedback(null);
    setRecoveryCodes(null);
    setEnrollBusy(true);
    try {
      const payload = await startTwoFactorEnroll(token);
      setEnrollData(payload);
      setEnrollCode('');
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to start authenticator setup.',
      });
    } finally {
      setEnrollBusy(false);
    }
  };

  const handleConfirmEnroll = async (e: FormEvent) => {
    e.preventDefault();
    if (!enrollCode.trim()) return;
    setFeedback(null);
    setEnrollBusy(true);
    try {
      const res = await verifyTwoFactorEnroll(token, enrollCode.trim());
      refreshAuthSession(res.access_token, res.user);
      setEnrollData(null);
      setEnrollCode('');
      setRecoveryCodes(res.recovery_codes ?? null);
      setFeedback({
        type: 'success',
        text: 'Two-factor authentication is active (AAL2). Save your single-use recovery codes below.',
      });
      await loadStatus(res.access_token);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Verification code could not be confirmed.',
      });
    } finally {
      setEnrollBusy(false);
    }
  };

  const handleReauth = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setReauthBusy(true);
    try {
      const res = await reauthenticateSession(
        token,
        totpEnabled ? { totp_code: reauthCode.trim() } : { password: reauthPassword },
      );
      refreshAuthSession(res.access_token, res.user);
      setReauthCode('');
      setReauthPassword('');
      setFeedback({
        type: 'success',
        text: 'Fresh verification confirmed. Privileged actions are unlocked for the next 10 minutes.',
      });
      await loadStatus(res.access_token);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Re-authentication failed.',
      });
    } finally {
      setReauthBusy(false);
    }
  };

  const handleDisable2fa = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setDisableBusy(true);
    try {
      const res = await disableTwoFactor(token, {
        password: disablePassword,
        totp_code: disableCode.trim(),
      });
      refreshAuthSession(res.access_token, res.user);
      setShowDisableForm(false);
      setDisablePassword('');
      setDisableCode('');
      setRecoveryCodes(null);
      setFeedback({
        type: 'success',
        text: 'Two-factor authentication has been disabled for your account.',
      });
      await loadStatus(res.access_token);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to disable two-factor authentication.',
      });
    } finally {
      setDisableBusy(false);
    }
  };

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (newPassword.length < 8) {
      setFeedback({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    setPasswordBusy(true);
    try {
      const res = await changeAccountPassword(token, {
        current_password: currentPassword,
        new_password: newPassword,
        ...(totpEnabled ? { totp_code: passwordTotpCode.trim() } : {}),
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordTotpCode('');
      setFeedback({ type: 'success', text: res.message });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to change password.',
      });
    } finally {
      setPasswordBusy(false);
    }
  };

  const copyText = async (value: string, kind: 'secret' | 'recovery') => {
    try {
      await navigator.clipboard.writeText(value);
      if (kind === 'secret') {
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

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      {feedback ? (
        <div className={`alert-box ${feedback.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
          ) : (
            <ShieldAlert size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
          )}
          <span>{feedback.text}</span>
        </div>
      ) : null}

      <div className="kpi-strip" style={{ marginTop: 0 }}>
        <div className="kpi-card">
          <span className="kpi-label">Two-Factor Authentication</span>
          <span className="kpi-value" style={{ fontSize: '1.35rem' }}>
            {loadingStatus ? 'Checking...' : totpEnabled ? 'Active' : 'Not enabled'}
          </span>
          <span className="kpi-sub">
            {isAdmin ? 'Mandatory for administrator access' : 'Authenticator app (TOTP)'}
          </span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Session Assurance</span>
          <span className="kpi-value" style={{ fontSize: '1.35rem' }}>
            {aal.toUpperCase()}
          </span>
          <span className="kpi-sub">
            {aal === 'aal2' ? 'Two-factor verified' : 'Password verified'}
          </span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Recovery Codes</span>
          <span className="kpi-value" style={{ fontSize: '1.35rem' }}>
            {totpEnabled ? status?.recovery_codes_remaining ?? 8 : 0}
          </span>
          <span className="kpi-sub">Single-use backup codes remaining</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Fresh Auth Window</span>
          <span className="kpi-value" style={{ fontSize: '1.35rem' }}>
            {status?.fresh_auth_valid ? 'Verified' : 'Expired'}
          </span>
          <span className="kpi-sub">Required for sensitive role/security updates</span>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Left: Authenticator App (TOTP 2FA) Management */}
        <div className="form-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <ShieldCheck size={19} aria-hidden="true" style={{ color: 'var(--green)' }} />
            <h2 className="card-title">Authenticator App (TOTP 2FA)</h2>
          </div>
          <p className="card-copy" style={{ marginBottom: '18px' }}>
            {isAdmin
              ? 'Administrator accounts require an active authenticator app (Google Authenticator, Microsoft Authenticator, or Authy) for every session.'
              : 'Protect your Konexio Africa account with 6-digit verification codes from an authenticator app.'}
          </p>

          {recoveryCodes ? (
            <div className="alert-box alert-info" style={{ display: 'grid', gap: '10px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <strong>Save Your Single-Use Recovery Codes</strong>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => copyText(recoveryCodes.join('\n'), 'recovery')}
                >
                  <Copy size={14} aria-hidden="true" />
                  {copiedRecovery ? 'Copied' : 'Copy All'}
                </button>
              </div>
              <p style={{ margin: 0, fontSize: '0.84rem' }}>
                Store these codes offline. Each code works once if you ever lose access to your authenticator device.
              </p>
              <div
                className="mono"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '6px 12px',
                  fontSize: '0.85rem',
                  background: 'var(--white)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 12px',
                }}
              >
                {recoveryCodes.map((code) => (
                  <span key={code}>{code}</span>
                ))}
              </div>
            </div>
          ) : null}

          {enrollData ? (
            <form onSubmit={handleConfirmEnroll} style={{ display: 'grid', gap: '14px' }}>
              <div
                style={{
                  display: 'flex',
                  gap: '18px',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  padding: '14px',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--canvas)',
                }}
              >
                <img
                  src={enrollData.qr_data_url}
                  alt="Scan this QR code with your authenticator app"
                  style={{
                    width: '156px',
                    height: '156px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--line)',
                    background: '#fff',
                  }}
                />
                <div style={{ flex: '1 1 200px', display: 'grid', gap: '8px' }}>
                  <strong style={{ color: 'var(--indigo)', fontSize: '0.92rem' }}>
                    Step 1: Scan QR or enter setup key
                  </strong>
                  <p className="card-copy" style={{ fontSize: '0.84rem' }}>
                    Account: <span className="mono">{enrollData.account}</span>
                  </p>
                  <div
                    className="mono"
                    style={{
                      fontSize: '0.82rem',
                      wordBreak: 'break-all',
                      padding: '8px 10px',
                      background: 'var(--white)',
                      border: '1px solid var(--line)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    {enrollData.manual_secret}
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ width: 'fit-content' }}
                    onClick={() => copyText(enrollData.manual_secret, 'secret')}
                  >
                    <Copy size={13} aria-hidden="true" />
                    {copiedSecret ? 'Key Copied' : 'Copy Setup Key'}
                  </button>
                </div>
              </div>

              <div className="field-group">
                <label htmlFor="sec-enroll-code">Step 2: Enter 6-digit code from app</label>
                <input
                  id="sec-enroll-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  className="input-control mono"
                  value={enrollCode}
                  onChange={(e) => setEnrollCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button type="submit" className="btn btn-primary" disabled={enrollBusy}>
                  {enrollBusy ? 'Verifying...' : 'Confirm & Activate 2FA'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setEnrollData(null);
                    setEnrollCode('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'grid', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={totpEnabled ? 'btn btn-outline btn-sm' : 'btn btn-amber'}
                  disabled={enrollBusy}
                  onClick={handleStartEnroll}
                >
                  <KeyRound size={15} aria-hidden="true" />
                  {enrollBusy
                    ? 'Preparing QR code...'
                    : totpEnabled
                      ? 'Rotate Authenticator & Recovery Codes'
                      : 'Set Up Authenticator 2FA'}
                </button>

                {totpEnabled && !isAdmin ? (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setShowDisableForm((prev) => !prev)}
                  >
                    {showDisableForm ? 'Cancel Disable' : 'Disable 2FA'}
                  </button>
                ) : null}
              </div>

              {showDisableForm && totpEnabled && !isAdmin ? (
                <form
                  onSubmit={handleDisable2fa}
                  style={{
                    display: 'grid',
                    gap: '12px',
                    padding: '16px',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--canvas)',
                  }}
                >
                  <strong style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>
                    Confirm Disable Two-Factor Authentication
                  </strong>
                  <div className="field-group">
                    <label htmlFor="sec-disable-pw">Current password</label>
                    <input
                      id="sec-disable-pw"
                      type="password"
                      className="input-control"
                      value={disablePassword}
                      onChange={(e) => setDisablePassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor="sec-disable-code">Current 6-digit authenticator code</label>
                    <input
                      id="sec-disable-code"
                      type="text"
                      inputMode="numeric"
                      maxLength={8}
                      className="input-control mono"
                      value={disableCode}
                      onChange={(e) => setDisableCode(e.target.value)}
                      placeholder="123456"
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={disableBusy}>
                    {disableBusy ? 'Disabling...' : 'Confirm Disable 2FA'}
                  </button>
                </form>
              ) : null}

              {/* Fresh Re-authentication Widget */}
              <form
                onSubmit={handleReauth}
                style={{
                  marginTop: '6px',
                  paddingTop: '16px',
                  borderTop: '1px solid var(--line)',
                  display: 'grid',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RefreshCw size={15} aria-hidden="true" style={{ color: 'var(--cyan-ink)' }} />
                  <strong style={{ fontSize: '0.9rem', color: 'var(--indigo)' }}>
                    Fresh Verification Window
                  </strong>
                </div>
                <p className="card-copy" style={{ fontSize: '0.84rem' }}>
                  Refresh your verification timestamp before making privileged role or account updates.
                </p>
                {totpEnabled ? (
                  <div className="field-group">
                    <label htmlFor="sec-reauth-code">6-digit authenticator code</label>
                    <input
                      id="sec-reauth-code"
                      type="text"
                      inputMode="numeric"
                      maxLength={8}
                      className="input-control mono"
                      value={reauthCode}
                      onChange={(e) => setReauthCode(e.target.value)}
                      placeholder="123456"
                      required
                    />
                  </div>
                ) : (
                  <div className="field-group">
                    <label htmlFor="sec-reauth-pw">Confirm current password</label>
                    <input
                      id="sec-reauth-pw"
                      type="password"
                      className="input-control"
                      value={reauthPassword}
                      onChange={(e) => setReauthPassword(e.target.value)}
                      required
                    />
                  </div>
                )}
                <button
                  type="submit"
                  className="btn btn-outline btn-sm"
                  style={{ width: 'fit-content' }}
                  disabled={reauthBusy}
                >
                  {reauthBusy ? 'Verifying...' : 'Verify Fresh Session'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right: Change Password */}
        <div className="form-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={18} aria-hidden="true" style={{ color: 'var(--indigo)' }} />
              <h2 className="card-title">Update Account Password</h2>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowPasswords((prev) => !prev)}
            >
              {showPasswords ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
              {showPasswords ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="card-copy" style={{ marginBottom: '18px' }}>
            Choose a strong password of at least 8 characters. Accounts with 2FA enabled require a current authenticator code.
          </p>

          <form onSubmit={handlePasswordChange} style={{ display: 'grid', gap: '14px' }}>
            <div className="field-group">
              <label htmlFor="sec-cur-pw">Current password</label>
              <input
                id="sec-cur-pw"
                type={showPasswords ? 'text' : 'password'}
                className="input-control"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="sec-new-pw">New password (min 8 characters)</label>
              <input
                id="sec-new-pw"
                type={showPasswords ? 'text' : 'password'}
                className="input-control"
                autoComplete="new-password"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="sec-confirm-pw">Confirm new password</label>
              <input
                id="sec-confirm-pw"
                type={showPasswords ? 'text' : 'password'}
                className="input-control"
                autoComplete="new-password"
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {totpEnabled ? (
              <div className="field-group">
                <label htmlFor="sec-pw-totp">6-digit authenticator code</label>
                <input
                  id="sec-pw-totp"
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  className="input-control mono"
                  value={passwordTotpCode}
                  onChange={(e) => setPasswordTotpCode(e.target.value)}
                  placeholder="123456"
                  required
                />
              </div>
            ) : null}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: 'fit-content' }}
              disabled={passwordBusy}
            >
              {passwordBusy ? 'Updating password...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettingsPanel;
