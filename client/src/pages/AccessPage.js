import { useEffect, useState } from 'react';
import { EyeIcon, EyeOffIcon, LockIcon, ShieldIcon, ZapIcon, CheckCircleIcon, TruckIcon, RefreshIcon, GlobeIcon } from '../components/MarketplaceIcons';

const PASSWORD_STRENGTH = [
  { label: 'Weak',   color: '#CC0C39', width: '25%' },
  { label: 'Fair',   color: '#f0ad4e', width: '50%' },
  { label: 'Good',   color: '#007600', width: '75%' },
  { label: 'Strong', color: '#007600', width: '100%' },
];

const getPasswordStrength = (password) => {
  if (!password) return null;
  const len        = password.length;
  const hasUpper   = /[A-Z]/.test(password);
  const hasLower   = /[a-z]/.test(password);
  const hasNumber  = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const variety    = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  if (len >= 12 && variety >= 3) return PASSWORD_STRENGTH[3];
  if (len >= 8  && variety >= 2) return PASSWORD_STRENGTH[2];
  if (len >= 6)                  return PASSWORD_STRENGTH[1];
  return PASSWORD_STRENGTH[0];
};

const FEATURES = [
  { Icon: TruckIcon,   title: 'Fast Delivery',   copy: 'Free shipping on eligible orders over $250.' },
  { Icon: LockIcon,    title: 'Secure Checkout',  copy: '256-bit SSL encryption on every transaction.' },
  { Icon: RefreshIcon, title: 'Easy Returns',     copy: 'Hassle-free returns within 30 days.' },
  { Icon: GlobeIcon,   title: 'Multi-Currency',   copy: 'Shop in your preferred currency at live rates.' },
];

const resolveInitialTab = (accessView) =>
  accessView === 'register' ? 'register' : 'login';

const AccessPage = ({ accessView, authForm, setAuthForm, submitAuth, isBusy, onNavigate }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab]       = useState(resolveInitialTab(accessView));
  const [mounted, setMounted]           = useState(false);

  useEffect(() => {
    setMounted(true);
    const nextTab = resolveInitialTab(accessView);
    setActiveTab(nextTab);
    setAuthForm((prev) => ({ ...prev, mode: nextTab }));
  }, [accessView, setAuthForm]);

  const passwordStrength = activeTab === 'register' ? getPasswordStrength(authForm.password) : null;
  const isLogin = activeTab === 'login';

  const selectTab = (tab) => {
    setActiveTab(tab);
    setAuthForm((prev) => ({ ...prev, mode: tab }));
  };

  return (
    <div className={`auth-page ${mounted ? 'auth-page-mounted' : ''}`}>
      {/* Left panel — branding & features */}
      <div className="auth-left-panel">
        <div className="auth-left-inner">
          <button
            className="auth-panel-logo"
            type="button"
            onClick={() => onNavigate('home')}
            aria-label="Go to homepage"
          >
            <span className="auth-panel-logo-mark">RC</span>
            <span className="auth-panel-logo-name">RealCommerce</span>
          </button>

          <div className="auth-panel-headline">
            <h1>
              {isLogin
                ? 'Welcome back.'
                : 'Join millions of shoppers.'}
            </h1>
            <p>
              {isLogin
                ? 'Sign in to access your orders, wishlist, and personalised recommendations.'
                : 'Create your free account and start shopping with confidence today.'}
            </p>
          </div>

          <div className="auth-panel-features">
            {FEATURES.map((f) => (
              <div className="auth-panel-feature" key={f.title}>
                <span className="auth-panel-feature-icon"><f.Icon size={20} /></span>
                <div>
                  <strong>{f.title}</strong>
                  <p>{f.copy}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="auth-panel-trust">
            <div className="auth-trust-badge"><LockIcon size={13} /><span>256-bit SSL</span></div>
            <div className="auth-trust-badge"><ShieldIcon size={13} /><span>ACID compliant</span></div>
            <div className="auth-trust-badge"><ZapIcon size={13} /><span>Rate limited</span></div>
          </div>
        </div>

        {/* Decorative circles */}
        <div className="auth-deco-circle auth-deco-1" aria-hidden="true" />
        <div className="auth-deco-circle auth-deco-2" aria-hidden="true" />
        <div className="auth-deco-circle auth-deco-3" aria-hidden="true" />
      </div>

      {/* Right panel — form */}
      <div className="auth-right-panel">
        <div className="auth-form-wrap">
          {/* Mobile logo */}
          <button
            className="auth-mobile-logo"
            type="button"
            onClick={() => onNavigate('home')}
          >
            <span className="auth-panel-logo-mark" style={{ width: 32, height: 32, fontSize: 13 }}>RC</span>
            <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--ink)' }}>RealCommerce</span>
          </button>

          {/* Tab switcher */}
          <div className="auth-tab-row" role="tablist" aria-label="Authentication mode">
            <button
              role="tab"
              aria-selected={isLogin}
              className={`auth-tab ${isLogin ? 'auth-tab-active' : ''}`}
              type="button"
              onClick={() => selectTab('login')}
            >
              Sign in
            </button>
            <button
              role="tab"
              aria-selected={!isLogin}
              className={`auth-tab ${!isLogin ? 'auth-tab-active' : ''}`}
              type="button"
              onClick={() => selectTab('register')}
            >
              Create account
            </button>
          </div>

          <div className="auth-form-card">
            <h2 className="auth-form-title">
              {isLogin ? 'Sign in to your account' : 'Create your account'}
            </h2>
            <p className="auth-form-subtitle">
              {isLogin
                ? 'Enter your credentials to continue shopping.'
                : 'Fill in your details to get started — it only takes a minute.'}
            </p>

            <form
              className="auth-form"
              onSubmit={(e) => { e.preventDefault(); submitAuth(); }}
              aria-label={isLogin ? 'Sign in form' : 'Registration form'}
              noValidate
            >
              {!isLogin && (
                <div className="auth-field">
                  <label htmlFor="auth-name">Full name</label>
                  <input
                    id="auth-name"
                    type="text"
                    autoComplete="name"
                    value={authForm.fullName || ''}
                    onChange={(e) => setAuthForm((p) => ({ ...p, fullName: e.target.value }))}
                    placeholder="First and last name"
                    required
                  />
                </div>
              )}

              <div className="auth-field">
                <label htmlFor="auth-email">Email address</label>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  value={authForm.email || ''}
                  onChange={(e) => setAuthForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="auth-field">
                <div className="auth-field-label-row">
                  <label htmlFor="auth-password">Password</label>
                  {isLogin && (
                    <button
                      className="auth-forgot-link"
                      type="button"
                      onClick={() => onNavigate('forgot-password')}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="password-field-wrap">
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    value={authForm.password || ''}
                    onChange={(e) => setAuthForm((p) => ({ ...p, password: e.target.value }))}
                    placeholder={isLogin ? 'Enter your password' : 'At least 10 characters'}
                    required
                    minLength={!isLogin ? 10 : undefined}
                  />
                  <button
                    className="password-toggle"
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                  </button>
                </div>

                {!isLogin && authForm.password && passwordStrength && (
                  <div className="auth-strength-wrap">
                    <div className="auth-strength-track">
                      <div
                        className="auth-strength-fill"
                        style={{ width: passwordStrength.width, background: passwordStrength.color }}
                      />
                    </div>
                    <span className="auth-strength-label" style={{ color: passwordStrength.color }}>
                      {passwordStrength.label}
                    </span>
                  </div>
                )}
              </div>

              {!isLogin && (
                <ul className="auth-password-rules">
                  {[
                    { rule: (p) => p.length >= 10,          text: 'At least 10 characters' },
                    { rule: (p) => /[A-Z]/.test(p),         text: 'One uppercase letter' },
                    { rule: (p) => /\d/.test(p),            text: 'One number' },
                    { rule: (p) => /[^A-Za-z0-9]/.test(p), text: 'One special character' },
                  ].map(({ rule, text }) => {
                    const ok = rule(authForm.password || '');
                    return (
                      <li key={text} className={`auth-rule ${ok ? 'auth-rule-ok' : ''}`}>
                        <CheckCircleIcon size={12} />
                        <span>{text}</span>
                      </li>
                    );
                  })}
                </ul>
              )}

              <button
                className="auth-submit-btn"
                type="submit"
                disabled={isBusy}
              >
                {isBusy
                  ? <span className="auth-spinner" />
                  : isLogin ? 'Sign in' : 'Create account'}
              </button>

              <p className="auth-legal">
                By continuing, you agree to RealCommerce's{' '}
                <span className="auth-legal-link">Conditions of Use</span> and{' '}
                <span className="auth-legal-link">Privacy Notice</span>.
              </p>
            </form>

            <div className="auth-switch-row">
              {isLogin ? (
                <>
                  <span>New to RealCommerce?</span>
                  <button className="auth-switch-btn" type="button" onClick={() => selectTab('register')}>
                    Create your free account →
                  </button>
                </>
              ) : (
                <>
                  <span>Already have an account?</span>
                  <button className="auth-switch-btn" type="button" onClick={() => selectTab('login')}>
                    Sign in →
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessPage;
