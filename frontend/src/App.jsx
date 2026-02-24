import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api, setAuthToken } from './api';
import { supabase } from './supabase';
import Login from './Login';
import Dashboard from './Dashboard';

function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.access_token) {
        setAuthToken(session.access_token);
        setUser(session.user);
        try {
          const me = await api.get('/me');
          setProfile(me.data);
        } catch {
          setProfile(null);
        }
      } else {
        setAuthToken(null);
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        setAuthToken(session.access_token);
        setUser(session.user);
        api.get('/me').then((r) => setProfile(r.data)).catch(() => setProfile(null));
      }
      setLoading(false);
    });
    return () => subscription?.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/" element={user ? <Dashboard profile={profile} setProfile={setProfile} /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
