import { useState } from 'react';
import { supabase } from './supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!supabase) {
      setError('Supabase not configured.');
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/` },
      });
      if (err) throw err;
      setSent(true);
    } catch (err) {
      setError(err.message || 'Failed to send magic link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo">
          <span className="logo-icon">Z</span>
          <h1>Zentra</h1>
          <p className="tagline">AI financial copilot for India</p>
        </div>
        {!sent ? (
          <form onSubmit={handleSubmit}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
            {error && <p className="error">{error}</p>}
            <button type="submit" disabled={loading}>
              {loading ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        ) : (
          <div className="sent">
            <p>Check your inbox.</p>
            <p className="muted">We sent a magic link to <strong>{email}</strong>. Click it to sign in.</p>
          </div>
        )}
      </div>
      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          background: linear-gradient(180deg, var(--bg) 0%, var(--surface) 100%);
        }
        .login-card {
          width: 100%;
          max-width: 400px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 2rem;
        }
        .logo { text-align: center; margin-bottom: 2rem; }
        .logo-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #0F766E, #14b8a6);
          border-radius: 12px;
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
          margin-bottom: 0.75rem;
        }
        .logo h1 { margin: 0; font-size: 1.75rem; }
        .tagline { color: var(--muted); margin: 0.25rem 0 0; font-size: 0.9rem; }
        .login-card label { display: block; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--muted); }
        .login-card input {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--bg);
          color: var(--text);
          font-size: 1rem;
          margin-bottom: 1rem;
        }
        .login-card input:focus {
          outline: none;
          border-color: var(--accent);
        }
        .login-card .error { color: var(--danger); font-size: 0.9rem; margin: -0.5rem 0 1rem; }
        .login-card button {
          width: 100%;
          padding: 0.75rem 1rem;
          background: var(--accent);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
        }
        .login-card button:hover:not(:disabled) { background: var(--accent-dim); }
        .login-card button:disabled { opacity: 0.7; cursor: not-allowed; }
        .sent { text-align: center; }
        .sent .muted { color: var(--muted); font-size: 0.9rem; margin-top: 0.5rem; }
      `}</style>
    </div>
  );
}
