import { useState } from 'react';
import { apiRequest } from '../lib/api';

const ResetPasswordPage = ({ token, onNavigate }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm]         = useState('');
  const [done, setDone]               = useState(false);
  const [error, setError]             = useState('');
  const [busy, setBusy]               = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirm) { setError('Passwords do not match.'); return; }
    if (newPassword.length < 10) { setError('Password must be at least 10 characters.'); return; }
    setBusy(true);
    setError('');
    try {
      await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      });
      setDone(true);
    } catch (err) {
      setError(err.message || 'Reset failed. The link may have expired.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="section-shell">
      <div style={{ maxWidth: 440, margin: '2rem auto' }}>
        <div className="auth-card">
          <div className="auth-card-header">
            <h1>Set new password</h1>
            <p className="muted-copy">Choose a strong password with at least 10 characters.</p>
          </div>

          {done ? (
            <div>
              <p style={{ color: 'var(--success)', fontWeight: 600, marginBottom: '1rem' }}>
                Password updated. You can now sign in with your new password.
              </p>
              <button className="accent-btn" type="button" onClick={() => onNavigate('login')}>
                Sign in
              </button>
            </div>
          ) : (
            <form className="stack-form" onSubmit={handleSubmit}>
              {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}
              <div className="form-group">
                <label htmlFor="reset-password">New password</label>
                <input
                  id="reset-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 10 characters"
                  required
                  minLength={10}
                />
              </div>
              <div className="form-group">
                <label htmlFor="reset-confirm">Confirm password</label>
                <input
                  id="reset-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat your new password"
                  required
                />
              </div>
              <button className="accent-btn auth-submit" type="submit" disabled={busy || !token}>
                {busy ? 'Updating...' : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default ResetPasswordPage;
