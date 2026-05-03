'use client';

// src/app/auth/update-password/page.js
//
// This page handles the redirect from the password reset email.
// Supabase sends the user here with a token in the URL.
// We let them enter a new password and then redirect to the app.

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (password.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Password updated! Redirecting...' });
      setTimeout(() => { window.location.href = '/'; }, 2000);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #fdfaf5; }
        .pw-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem; }
        .pw-box { background: white; border-radius: 20px; padding: 2.5rem; width: 100%; max-width: 400px; box-shadow: 0 6px 24px rgba(26,71,49,0.12); }
        h2 { font-family: 'Playfair Display', serif; font-size: 1.8rem; font-weight: 700; background: linear-gradient(135deg,#1a4731,#40916c); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 0.5rem; }
        p { font-size: 0.9rem; color: #7a8c82; margin-bottom: 1.5rem; }
        label { display: block; font-size: 0.78rem; font-weight: 700; color: #3d5147; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.4rem; margin-top: 1rem; }
        input { width: 100%; padding: 0.75rem 1rem; border: 1.5px solid #dde8e0; border-radius: 10px; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 0.95rem; }
        input:focus { outline: none; border-color: #40916c; box-shadow: 0 0 0 3px rgba(64,145,108,0.12); }
        button { width: 100%; padding: 0.875rem; background: linear-gradient(135deg,#1a4731,#40916c); color: white; border: none; border-radius: 10px; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1rem; font-weight: 700; cursor: pointer; margin-top: 1.5rem; }
        button:disabled { opacity: 0.6; cursor: not-allowed; }
        .msg { padding: 0.875rem 1rem; border-radius: 10px; font-size: 0.88rem; font-weight: 600; margin-bottom: 1rem; }
        .msg.success { background: #f0fdf4; border: 1.5px solid #86efac; color: #166534; }
        .msg.error { background: #fff1f2; border: 1.5px solid #fca5a5; color: #be123c; }
      `}</style>
      <div className="pw-wrap">
        <div className="pw-box">
          <h2>Set new password</h2>
          <p>Enter and confirm your new password below.</p>
          {message && <div className={`msg ${message.type}`}>{message.text}</div>}
          <form onSubmit={handleUpdate}>
            <label>New password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" />
            <label>Confirm new password</label>
            <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter password" />
            <button type="submit" disabled={loading}>{loading ? 'Updating...' : 'Update Password'}</button>
          </form>
        </div>
      </div>
    </>
  );
}
