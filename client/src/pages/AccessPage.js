import { useEffect, useState } from 'react';
import { EyeIcon, EyeOffIcon, LockIcon, ShieldIcon, ZapIcon } from '../components/MarketplaceIcons';

const PASSWORD_STRENGTH = [
  { label: 'Weak', color: 'var(--danger)', minLength: 0 },
  { label: 'Fair', color: '#f0ad4e', minLength: 6 },
  { label: 'Good', color: 'var(--accent)', minLength: 8 },
  { label: 'Strong', color: 'var(--success)', minLength: 12 },
];

const getPasswordStrength = (password) => {
  if (!password) return null;
  const len = password.length;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const variety = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;

  if (len >= 12 && variety >= 3) return PASSWORD_STRENGTH[3];
  if (len >= 8 && variety >= 2) return PASSWORD_STRENGTH[2];
  if (len >= 6) return PASSWORD_STRENGTH[1];
  return PASSWORD_STRENGTH[0];
};

const resolveInitialTab = (accessView) => (accessView === 'register' ? 'register' : 'login');

const AccessPage = ({
  accessView,
  authForm,
  setAuthForm,
  submitAuth,
  trackForm,
  setTrackForm,
  submitTrack,
  isBusy,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState(resolveInitialTab(accessView));

  useEffect(() => {
    const nextTab = resolveInitialTab(accessView);
    setActiveTab(nextTab);
    setAuthForm((previous) => ({ ...previous, mode: nextTab }));
  }, [accessView, setAuthForm]);

  const passwordStrength = activeTab === 'register' ? getPasswordStrength(authForm.password) : null;

  const selectTab = (tab) => {
    setActiveTab(tab);
    setAuthForm((previous) => ({ ...previous, mode: tab }));
  };

  return (
    <section className="section-shell">
      <div className="auth-shell">
        <div className="auth-card auth-card-primary" id="auth-form-card">
          <div className="auth-card-header">
            <h1>{activeTab === 'login' ? 'Sign in' : 'Create account'}</h1>
            <p className="muted-copy">
              {activeTab === 'login'
                ? 'Sign in to access your orders, wishlist, and personalized recommendations.'
                : 'Create your RealCommerce account to start shopping, track orders, and save items.'}
            </p>
          </div>

          <div className="segmented-control" aria-label="Auth mode">
            <button
              type="button"
              className={activeTab === 'login' ? 'is-active' : ''}
              onClick={() => selectTab('login')}
            >
              Sign in
            </button>
            <button
              type="button"
              className={activeTab === 'register' ? 'is-active' : ''}
              onClick={() => selectTab('register')}
            >
              Create account
            </button>
          </div>

          <form
            className="stack-form"
            onSubmit={(event) => {
              event.preventDefault();
              submitAuth();
            }}
            aria-label={activeTab === 'login' ? 'Sign in form' : 'Registration form'}
          >
            {activeTab === 'register' && (
              <div className="form-group">
                <label htmlFor="auth-name">Full name</label>
                <input
                  id="auth-name"
                  type="text"
                  autoComplete="name"
                  value={authForm.fullName || ''}
                  onChange={(event) => setAuthForm((previous) => ({ ...previous, fullName: event.target.value }))}
                  placeholder="Enter your full name"
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="auth-email">Email address</label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                value={authForm.email || ''}
                onChange={(event) => setAuthForm((previous) => ({ ...previous, email: event.target.value }))}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="auth-password">Password</label>
              <div className="password-field-wrap">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={activeTab === 'login' ? 'current-password' : 'new-password'}
                  value={authForm.password || ''}
                  onChange={(event) => setAuthForm((previous) => ({ ...previous, password: event.target.value }))}
                  placeholder={activeTab === 'login' ? 'Enter your password' : 'Create a strong password'}
                  required
                  minLength={activeTab === 'register' ? 10 : undefined}
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                </button>
              </div>

              {activeTab === 'register' && authForm.password && passwordStrength && (
                <div className="password-strength">
                  <div className="password-strength-track">
                    <div
                      className="password-strength-fill"
                      style={{
                        width: `${Math.min(100, ((PASSWORD_STRENGTH.indexOf(passwordStrength) + 1) / PASSWORD_STRENGTH.length) * 100)}%`,
                        background: passwordStrength.color,
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: passwordStrength.color }}>
                    {passwordStrength.label}
                  </span>
                </div>
              )}
            </div>

            <button className="accent-btn auth-submit" type="submit" disabled={isBusy}>
              {isBusy ? 'Please wait...' : activeTab === 'login' ? 'Sign in' : 'Create account'}
            </button>

            {activeTab === 'login' && (
              <p className="auth-switch-prompt">
                New to RealCommerce?{' '}
                <button
                  className="inline-link"
                  type="button"
                  onClick={() => selectTab('register')}
                >
                  Create your free account
                </button>
              </p>
            )}

            {activeTab === 'register' && (
              <p className="auth-switch-prompt">
                Already have an account?{' '}
                <button
                  className="inline-link"
                  type="button"
                  onClick={() => selectTab('login')}
                >
                  Sign in
                </button>
              </p>
            )}

            <p className="helper-copy" style={{ textAlign: 'center', fontSize: 11 }}>
              By continuing, you agree to RealCommerce's Conditions of Use and Privacy Notice.
            </p>
          </form>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="auth-card" id="order-track-card">
            <h2>Track an Order</h2>
            <p className="muted-copy" style={{ fontSize: 13, marginBottom: '0.75rem' }}>
              Enter your order number and sign in to view secure delivery updates for your account.
            </p>
            <form
              className="stack-form"
              onSubmit={(event) => {
                event.preventDefault();
                submitTrack();
              }}
              aria-label="Order tracking form"
            >
              <input
                id="track-order-number"
                type="text"
                value={trackForm?.orderNumber || ''}
                onChange={(event) => setTrackForm((previous) => ({ ...previous, orderNumber: event.target.value }))}
                placeholder="Enter order number"
                required
              />
              <button className="ghost-btn" type="submit" disabled={isBusy}>
                Track order
              </button>
            </form>
          </div>

          <div className="auth-card auth-card-security">
            <div className="security-badges">
              <div className="security-badge">
                <span className="security-badge-icon"><LockIcon size={16} /></span>
                <div>
                  <strong>SSL Encrypted</strong>
                  <small>256-bit encryption</small>
                </div>
              </div>
              <div className="security-badge">
                <span className="security-badge-icon"><ShieldIcon size={16} /></span>
                <div>
                  <strong>ACID Compliant</strong>
                  <small>Transactional integrity</small>
                </div>
              </div>
              <div className="security-badge">
                <span className="security-badge-icon"><ZapIcon size={16} /></span>
                <div>
                  <strong>Rate Limited</strong>
                  <small>Brute-force protection</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AccessPage;
