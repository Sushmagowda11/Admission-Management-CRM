import { useState } from 'react';
import { login } from '../api.js';

export default function LoginPage({ onAuthed }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [statusMessage, setStatusMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLoginSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      await login({ username, password });
      setStatusMessage({ type: 'ok', text: 'Login successful. Redirecting...' });
      await onAuthed?.();
    } catch (err) {
      const messageText = err?.response?.data?.error || err?.message || 'Login failed';
      setStatusMessage({ type: 'error', text: messageText });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="panel">
      <div style={{ fontWeight: 800, marginBottom: 6 }}>Login</div>
      <div className="muted" style={{ marginBottom: 14, fontSize: 13 }}>
        Demo users: `admin/admin123`, `officer/officer123`, `management/management123`
      </div>

      <form onSubmit={handleLoginSubmit} className="row">
        <div className="field" style={{ minWidth: 260 }}>
          <label>Username</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="field" style={{ minWidth: 260 }}>
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="field" style={{ minWidth: 160, paddingTop: 22 }}>
          <button className="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </div>
      </form>

      {statusMessage ? (
        <div className={`msg ${statusMessage.type === 'ok' ? 'ok' : 'error'}`}>{statusMessage.text}</div>
      ) : null}
    </div>
  );
}

