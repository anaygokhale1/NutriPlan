'use client';

// src/app/auth/page.js
//
// Combined Login / Sign Up page for VitalMenu.
// Uses Supabase Auth — no external libraries needed beyond @supabase/supabase-js
// which is already installed in your project.
//
// Flow:
//   New user  → Sign Up → email confirmation → redirect to /
//   Returning → Sign In → redirect to /
//   Forgot pw → Reset   → email sent → redirect back here

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text: string }

  const clearMessage = () => setMessage(null);

  // ── Sign Up ──────────────────────────────────────────────────────────────
  const handleSignUp = async (e) => {
    e.preventDefault();
    clearMessage();

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (password.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        // After email confirmation, redirect back to the app
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    setLoading(false);

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({
        type: 'success',
        text: 'Account created! Check your email for a confirmation link before signing in.',
      });
    }
  };

  // ── Sign In ──────────────────────────────────────────────────────────────
  const handleSignIn = async (e) => {
    e.preventDefault();
    clearMessage();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      // Redirect to main app after successful login
      window.location.href = '/';
    }
  };

  // ── Password Reset ───────────────────────────────────────────────────────
  const handleReset = async (e) => {
    e.preventDefault();
    clearMessage();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    setLoading(false);

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({
        type: 'success',
        text: 'Password reset email sent. Check your inbox.',
      });
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .auth-page {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        /* ── Left panel — branding hero ── */
        .auth-hero {
          background:
            url('https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&q=80&auto=format&fit=crop')
            center / cover no-repeat;
          position: relative;
          display: flex;
          align-items: flex-end;
          padding: 3rem;
          min-height: 100vh;
        }
        .auth-hero-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(160deg, rgba(15,31,23,0.75) 0%, rgba(26,71,49,0.65) 100%);
        }
        .auth-hero-content {
          position: relative; z-index: 1; color: white;
        }
        .auth-logo {
          display: flex; align-items: center; gap: 0.75rem;
          margin-bottom: 2rem;
        }
        .auth-logo svg { flex-shrink: 0; }
        .auth-logo-name {
          font-family: 'Playfair Display', serif;
          font-size: 2rem; font-weight: 800;
          background: linear-gradient(135deg, #fff 0%, #a8e6a3 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .auth-hero-heading {
          font-family: 'Playfair Display', serif;
          font-size: 2.5rem; font-weight: 700;
          line-height: 1.2; margin-bottom: 1rem;
        }
        .auth-hero-sub {
          font-size: 1rem; opacity: 0.8; line-height: 1.6;
          max-width: 360px; margin-bottom: 2rem;
        }
        .auth-features {
          display: flex; flex-direction: column; gap: 0.6rem;
        }
        .auth-feature {
          display: flex; align-items: center; gap: 0.6rem;
          font-size: 0.9rem; opacity: 0.9; font-weight: 500;
        }
        .auth-feature-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #74c69d; flex-shrink: 0;
        }

        /* ── Right panel — form ── */
        .auth-form-panel {
          background: #fdfaf5;
          display: flex; align-items: center; justify-content: center;
          padding: 2rem;
        }
        .auth-form-box {
          width: 100%; max-width: 420px;
        }
        .auth-form-title {
          font-family: 'Playfair Display', serif;
          font-size: 2rem; font-weight: 700;
          background: linear-gradient(135deg, #1a4731, #40916c);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 0.4rem;
        }
        .auth-form-sub {
          font-size: 0.9rem; color: #7a8c82;
          margin-bottom: 2rem; font-weight: 500;
        }
        .auth-tabs {
          display: flex; gap: 0; border-radius: 10px;
          background: #e8f5e9; padding: 4px;
          margin-bottom: 1.75rem;
        }
        .auth-tab {
          flex: 1; padding: 0.55rem;
          border: none; border-radius: 8px; background: none;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.88rem; font-weight: 700;
          color: #7a8c82; cursor: pointer; transition: all 0.2s;
        }
        .auth-tab.active {
          background: white; color: #1a4731;
          box-shadow: 0 2px 8px rgba(26,71,49,0.12);
        }
        .auth-field { margin-bottom: 1.1rem; }
        .auth-label {
          display: block; font-size: 0.78rem; font-weight: 700;
          color: #3d5147; text-transform: uppercase;
          letter-spacing: 0.5px; margin-bottom: 0.4rem;
        }
        .auth-input {
          width: 100%; padding: 0.75rem 1rem;
          border: 1.5px solid #dde8e0; border-radius: 10px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.95rem; background: white; color: #0f1f17;
          transition: all 0.2s;
        }
        .auth-input:focus {
          outline: none; border-color: #40916c;
          box-shadow: 0 0 0 3px rgba(64,145,108,0.12);
        }
        .auth-btn {
          width: 100%; padding: 0.875rem;
          background: linear-gradient(135deg, #1a4731, #40916c);
          color: white; border: none; border-radius: 10px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 1rem; font-weight: 700; cursor: pointer;
          transition: all 0.2s; margin-top: 0.5rem;
          box-shadow: 0 4px 14px rgba(26,71,49,0.25);
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
        }
        .auth-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(26,71,49,0.35);
        }
        .auth-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .auth-link {
          background: none; border: none; color: #2d6a4f;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.85rem; font-weight: 700; cursor: pointer;
          text-decoration: underline; padding: 0;
        }
        .auth-link:hover { color: #1a4731; }
        .auth-footer {
          text-align: center; margin-top: 1.5rem;
          font-size: 0.85rem; color: #7a8c82;
        }
        .auth-message {
          padding: 0.875rem 1rem; border-radius: 10px;
          font-size: 0.88rem; font-weight: 600;
          margin-bottom: 1.25rem; line-height: 1.5;
        }
        .auth-message.success {
          background: #f0fdf4; border: 1.5px solid #86efac; color: #166534;
        }
        .auth-message.error {
          background: #fff1f2; border: 1.5px solid #fca5a5; color: #be123c;
        }
        .auth-divider {
          display: flex; align-items: center; gap: 1rem;
          margin: 1.25rem 0; color: #b0bdb7; font-size: 0.8rem;
        }
        .auth-divider::before, .auth-divider::after {
          content: ''; flex: 1; height: 1px; background: #dde8e0;
        }

        /* Spinner */
        .spinner {
          width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.4);
          border-top-color: white; border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Mobile */
        @media (max-width: 768px) {
          .auth-page { grid-template-columns: 1fr; }
          .auth-hero { display: none; }
          .auth-form-panel { padding: 1.5rem; align-items: flex-start; padding-top: 3rem; }
        }
      `}</style>

      <div className="auth-page">

        {/* ── Left: Hero ── */}
        <div className="auth-hero">
          <div className="auth-hero-overlay" />
          <div className="auth-hero-content">
            <div className="auth-logo">
              <svg width="40" height="40" viewBox="0 0 42 42" fill="none">
                <circle cx="21" cy="21" r="21" fill="rgba(255,255,255,0.15)"/>
                <path d="M10 20 Q10 30 21 30 Q32 30 32 20 Z" fill="rgba(255,255,255,0.9)"/>
                <path d="M15 16 Q16 13 15 10" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M21 15 Q22 12 21 9" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M27 16 Q28 13 27 10" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M29 17 Q34 12 36 15 Q33 20 29 17Z" fill="#a8e6a3" opacity="0.9"/>
              </svg>
              <span className="auth-logo-name">VitalMenu</span>
            </div>
            <h1 className="auth-hero-heading">
              Nutrition that's<br />built around you.
            </h1>
            <p className="auth-hero-sub">
              AI-generated 7-day meal plans tailored to your goals,
              body and lifestyle — updated every week.
            </p>
            <div className="auth-features">
              {[
                '600+ recipes across 11 cuisines',
                'Science-backed macro calculation',
                'Adapts to your dietary restrictions',
                'Tracks your progress over time',
              ].map(f => (
                <div key={f} className="auth-feature">
                  <div className="auth-feature-dot" />
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Form ── */}
        <div className="auth-form-panel">
          <div className="auth-form-box">

            {mode === 'reset' ? (
              // ── Password Reset ──
              <>
                <h2 className="auth-form-title">Reset password</h2>
                <p className="auth-form-sub">
                  Enter your email and we'll send you a reset link.
                </p>
                {message && (
                  <div className={`auth-message ${message.type}`}>{message.text}</div>
                )}
                <form onSubmit={handleReset}>
                  <div className="auth-field">
                    <label className="auth-label">Email address</label>
                    <input
                      type="email" required
                      className="auth-input"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                  </div>
                  <button type="submit" className="auth-btn" disabled={loading}>
                    {loading ? <span className="spinner" /> : 'Send reset link'}
                  </button>
                </form>
                <div className="auth-footer">
                  <button className="auth-link" onClick={() => { setMode('login'); clearMessage(); }}>
                    ← Back to sign in
                  </button>
                </div>
              </>
            ) : (
              // ── Login / Signup tabs ──
              <>
                <h2 className="auth-form-title">
                  {mode === 'login' ? 'Welcome back' : 'Create account'}
                </h2>
                <p className="auth-form-sub">
                  {mode === 'login'
                    ? 'Sign in to view your meal plans and profile.'
                    : 'Get started with your personalised nutrition plan.'}
                </p>

                {/* Tab switcher */}
                <div className="auth-tabs">
                  <button
                    className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
                    onClick={() => { setMode('login'); clearMessage(); }}
                  >
                    Sign In
                  </button>
                  <button
                    className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
                    onClick={() => { setMode('signup'); clearMessage(); }}
                  >
                    Sign Up
                  </button>
                </div>

                {/* Message banner */}
                {message && (
                  <div className={`auth-message ${message.type}`}>{message.text}</div>
                )}

                <form onSubmit={mode === 'login' ? handleSignIn : handleSignUp}>

                  {/* Full name — signup only */}
                  {mode === 'signup' && (
                    <div className="auth-field">
                      <label className="auth-label">Full name</label>
                      <input
                        type="text" required
                        className="auth-input"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        placeholder="Jane Smith"
                      />
                    </div>
                  )}

                  <div className="auth-field">
                    <label className="auth-label">Email address</label>
                    <input
                      type="email" required
                      className="auth-input"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </div>

                  <div className="auth-field">
                    <label className="auth-label">Password</label>
                    <input
                      type="password" required
                      className="auth-input"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={mode === 'signup' ? 'Min. 8 characters' : '••••••••'}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    />
                  </div>

                  {/* Confirm password — signup only */}
                  {mode === 'signup' && (
                    <div className="auth-field">
                      <label className="auth-label">Confirm password</label>
                      <input
                        type="password" required
                        className="auth-input"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        autoComplete="new-password"
                      />
                    </div>
                  )}

                  <button type="submit" className="auth-btn" disabled={loading}>
                    {loading
                      ? <span className="spinner" />
                      : mode === 'login' ? 'Sign In →' : 'Create Account →'
                    }
                  </button>

                </form>

                {/* Forgot password */}
                {mode === 'login' && (
                  <div className="auth-footer">
                    <button className="auth-link" onClick={() => { setMode('reset'); clearMessage(); }}>
                      Forgot your password?
                    </button>
                  </div>
                )}

                {/* Terms — signup only */}
                {mode === 'signup' && (
                  <div className="auth-footer">
                    By signing up you agree to our{' '}
                    <a href="/privacy" style={{color:'#2d6a4f',fontWeight:700}}>Privacy Policy</a>.
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
