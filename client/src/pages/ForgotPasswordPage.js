import { useState } from 'react';
import { apiRequest } from '../lib/api';

const ForgotPasswordPage = ({ onNavigate }) => {
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');
  const [busy, setBusy]       = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError('Email is required.'); return; }
    setBusy(true);
    setError('');
    try {
      await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });
      setSent(true);
    } catch (err) {
      setError(err.message || 'Request failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="section-shell">
      <div style={{ maxWidth: 440, margin: '2rem auto' }}>
        <div className="auth-card">
          <div className="auth-card-header">
            <h1>Forgot password</h1>
            <p className="muted-copy">Enter your email and we will send a reset link if an account exists.</p>
          </div>

          {sent ? (
            <div>
              <p style={{ color: 'var(--success)', fontWeight: 600, marginBottom: '1rem' }}>
                If that email is registered, a reset link has been sent. Check your inbox.
              </p>
              <button className="ghost-btn" type="button" onClick={() => onNavigate('login')}>
                Back to sign in
              </button>
            </div>
          ) : (
            <form className="stack-form" onSubmit={handleSubmit}>
              {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}
              <div className="form-group">
                <label htmlFor="forgot-email">Email address</label>
                <input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
              <button className="accent-btn auth-submit" type="submit" disabled={busy}>
                {busy ? 'Sending...' : 'Send reset link'}
              </button>
              <p className="auth-switch-prompt">
                <button className="inline-link" type="button" onClick={() => onNavigate('login')}>
                  Back to sign in
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default ForgotPasswordPage;
