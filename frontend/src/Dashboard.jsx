import { useState, useRef, useEffect } from 'react';
import { supabase } from './supabase';
import { chat as apiChat, zentraScore as apiZentraScore, uploadFile, getMe } from './api';

const CREDITS_PER_PROMPT = 10;

export default function Dashboard({ profile, setProfile }) {
  const [tab, setTab] = useState('chat');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [scoreInputs, setScoreInputs] = useState({ income: '', expenses: '', savings: '', debt: '' });
  const [scoreResult, setScoreResult] = useState(null);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [uploadSummary, setUploadSummary] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const refreshProfile = async () => {
    try {
      const data = await getMe();
      setProfile(data);
    } catch (_) {}
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleChat = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const next = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
      const res = await apiChat(next);
      setMessages((m) => [...m, { role: 'assistant', content: res.message.content }]);
      await refreshProfile();
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Request failed';
      setMessages((m) => [...m, { role: 'assistant', content: `Error: ${msg}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleScore = async (e) => {
    e.preventDefault();
    const { income, expenses, savings, debt } = scoreInputs;
    const i = parseFloat(income) || 0;
    const ex = parseFloat(expenses) || 0;
    const s = parseFloat(savings) || 0;
    const d = parseFloat(debt) || 0;
    setScoreLoading(true);
    setScoreResult(null);
    try {
      const res = await apiZentraScore(i, ex, s, d);
      setScoreResult(res);
    } catch (err) {
      setScoreResult({ error: err.response?.data?.detail || err.message });
    } finally {
      setScoreLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || uploadLoading) return;
    setUploadLoading(true);
    setUploadSummary(null);
    try {
      const res = await uploadFile(file);
      setUploadSummary(res.summary);
      setFile(null);
      await refreshProfile();
    } catch (err) {
      setUploadSummary(`Error: ${err.response?.data?.detail || err.message}`);
    } finally {
      setUploadLoading(false);
    }
  };

  const signOut = () => {
    supabase?.auth.signOut();
  };

  const credits = profile?.credits ?? 0;

  return (
    <div className="dashboard">
      <header className="header">
        <div className="header-left">
          <span className="logo">Zentra</span>
          <nav>
            <button className={tab === 'chat' ? 'active' : ''} onClick={() => setTab('chat')}>Chat</button>
            <button className={tab === 'score' ? 'active' : ''} onClick={() => setTab('score')}>Zentra Score</button>
            <button className={tab === 'upload' ? 'active' : ''} onClick={() => setTab('upload')}>Upload</button>
          </nav>
        </div>
        <div className="header-right">
          <span className="credits">Credits: {credits}</span>
          <span className="badge free">Free</span>
          <button className="logout" onClick={signOut}>Sign out</button>
        </div>
      </header>

      <main className="main">
        {tab === 'chat' && (
          <section className="panel chat-panel">
            <h2>AI Chat</h2>
            <p className="hint">10 credits per message. Ask anything about money, taxes, or budgeting in India.</p>
            <div className="messages">
              {messages.length === 0 && (
                <p className="muted">Send a message to start. Example: &quot;How much should I save from my salary?&quot;</p>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`msg ${m.role}`}>
                  <span className="role">{m.role === 'user' ? 'You' : 'Zentra'}</span>
                  <div className="content">{m.content}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleChat} className="chat-form">
              <input
                type="text"
                placeholder="Type your question…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
              />
              <button type="submit" disabled={loading}>
                {loading ? '…' : 'Send'}
              </button>
            </form>
          </section>
        )}

        {tab === 'score' && (
          <section className="panel score-panel">
            <h2>Zentra Score</h2>
            <p className="hint">Get a 0–100 score based on income, expenses, savings, and debt.</p>
            <form onSubmit={handleScore}>
              <div className="grid">
                <label>Income (₹)</label>
                <input type="number" min="0" step="any" placeholder="0" value={scoreInputs.income} onChange={(e) => setScoreInputs((s) => ({ ...s, income: e.target.value }))} />
                <label>Expenses (₹)</label>
                <input type="number" min="0" step="any" placeholder="0" value={scoreInputs.expenses} onChange={(e) => setScoreInputs((s) => ({ ...s, expenses: e.target.value }))} />
                <label>Savings (₹)</label>
                <input type="number" min="0" step="any" placeholder="0" value={scoreInputs.savings} onChange={(e) => setScoreInputs((s) => ({ ...s, savings: e.target.value }))} />
                <label>Debt (₹)</label>
                <input type="number" min="0" step="any" placeholder="0" value={scoreInputs.debt} onChange={(e) => setScoreInputs((s) => ({ ...s, debt: e.target.value }))} />
              </div>
              <button type="submit" disabled={scoreLoading}>{scoreLoading ? 'Calculating…' : 'Calculate Score'}</button>
            </form>
            {scoreResult && (
              <div className="score-result">
                {scoreResult.error ? (
                  <p className="error">{scoreResult.error}</p>
                ) : (
                  <>
                    <p className="score-value">Your Zentra Score: <strong>{scoreResult.score}</strong>/100</p>
                  </>
                )}
              </div>
            )}
          </section>
        )}

        {tab === 'upload' && (
          <section className="panel upload-panel">
            <h2>Upload PDF or Excel</h2>
            <p className="hint">We extract text and summarize it with AI. 10 credits per upload.</p>
            <form onSubmit={handleUpload}>
              <input type="file" accept=".pdf,.xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <button type="submit" disabled={!file || uploadLoading}>
                {uploadLoading ? 'Processing…' : 'Upload & summarize'}
              </button>
            </form>
            {uploadSummary && <div className="summary"><pre>{uploadSummary}</pre></div>}
          </section>
        )}
      </main>

      <style>{`
        .dashboard { min-height: 100vh; display: flex; flex-direction: column; }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          background: var(--surface);
          border-bottom: 1px solid var(--border);
        }
        .header-left { display: flex; align-items: center; gap: 2rem; }
        .logo { font-weight: 700; font-size: 1.25rem; color: var(--accent); }
        .header nav { display: flex; gap: 0.5rem; }
        .header nav button {
          padding: 0.5rem 0.75rem;
          background: transparent;
          border: none;
          color: var(--muted);
          cursor: pointer;
          border-radius: 6px;
        }
        .header nav button:hover { color: var(--text); }
        .header nav button.active { background: var(--border); color: var(--text); }
        .header-right { display: flex; align-items: center; gap: 1rem; }
        .credits { color: var(--muted); font-size: 0.9rem; }
        .badge { font-size: 0.75rem; padding: 0.25rem 0.5rem; border-radius: 6px; }
        .badge.free { background: var(--border); color: var(--muted); }
        .badge.paid { background: var(--accent-dim); color: white; }
        .logout { background: transparent; border: 1px solid var(--border); color: var(--text); padding: 0.5rem 0.75rem; border-radius: 6px; cursor: pointer; }
        .logout:hover { background: var(--border); }
        .main { flex: 1; padding: 1.5rem; max-width: 900px; margin: 0 auto; width: 100%; }
        .panel h2 { margin: 0 0 0.5rem; }
        .hint { color: var(--muted); font-size: 0.9rem; margin: 0 0 1.5rem; }
        .messages { min-height: 200px; max-height: 400px; overflow-y: auto; margin-bottom: 1rem; padding: 1rem; background: var(--bg); border-radius: 8px; border: 1px solid var(--border); }
        .msg { margin-bottom: 1rem; }
        .msg .role { font-size: 0.8rem; color: var(--muted); }
        .msg .content { margin-top: 0.25rem; white-space: pre-wrap; }
        .msg.assistant .content { color: var(--text); }
        .chat-form { display: flex; gap: 0.5rem; }
        .chat-form input { flex: 1; padding: 0.75rem 1rem; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--text); }
        .chat-form button { padding: 0.75rem 1.25rem; background: var(--accent); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; }
        .chat-form button:disabled { opacity: 0.5; cursor: not-allowed; }
        .grid { display: grid; grid-template-columns: auto 1fr; gap: 0.5rem 1rem; align-items: center; margin-bottom: 1rem; max-width: 400px; }
        .grid label { color: var(--muted); }
        .grid input { padding: 0.5rem; border: 1px solid var(--border); border-radius: 6px; background: var(--bg); color: var(--text); }
        .score-panel button, .upload-panel button { padding: 0.75rem 1.25rem; background: var(--accent); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; }
        .score-panel button:disabled, .upload-panel button:disabled { opacity: 0.5; cursor: not-allowed; }
        .score-result { margin-top: 1rem; padding: 1rem; background: var(--surface); border-radius: 8px; border: 1px solid var(--border); }
        .score-value { margin: 0; font-size: 1.1rem; }
        .score-value strong { color: var(--accent); }
        .summary { margin-top: 1rem; padding: 1rem; background: var(--bg); border-radius: 8px; border: 1px solid var(--border); }
        .summary pre { margin: 0; white-space: pre-wrap; font-size: 0.9rem; }
        .upload-panel input[type=file] { margin-bottom: 1rem; display: block; color: var(--muted); }
        .error { color: var(--danger); }
        .muted { color: var(--muted); font-size: 0.9rem; }
      `}</style>
    </div>
  );
}
