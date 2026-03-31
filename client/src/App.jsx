import { useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, Link, useNavigate } from 'react-router-dom';
import { getMe, logout } from './api';
import LoginPage from './pages/LoginPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import OfficerPage from './pages/OfficerPage.jsx';
import ManagementPage from './pages/ManagementPage.jsx';

function getRouteForRole(role) {
  if (role === 'ADMIN') return '/admin';
  if (role === 'OFFICER') return '/officer';
  if (role === 'MANAGEMENT') return '/management';
  return '/login';
}

function TopBar({ me, onLogout }) {
  const navigationLinks = useMemo(() => {
    if (!me) return [];
    if (me.role === 'ADMIN') return [{ to: '/admin', label: 'Masters Setup' }];
    if (me.role === 'OFFICER') return [{ to: '/officer', label: 'Admission Officer' }];
    return [{ to: '/management', label: 'Dashboard' }];
  }, [me]);

  return (
    <div className="topbar panel" style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontWeight: 800 }}>Admission Management</div>
        <div className="muted" style={{ fontSize: 12 }}>
          Role: <span className="tag">{me?.role || '—'}</span>
        </div>
      </div>
      <div className="links">
        {navigationLinks.map((l) => (
          <Link key={l.to} to={l.to} className="tag">
            {l.label}
          </Link>
        ))}
        {me ? (
          <button className="danger" onClick={onLogout}>
            Logout
          </button>
        ) : null}
      </div>
    </div>
  );
}

function AppInner() {
  const [me, setMe] = useState(null);
  const [booting, setBooting] = useState(true);
  const nav = useNavigate();

  const loadCurrentUser = useCallback(async () => {
    setBooting(true);
    const token = localStorage.getItem('token');
    if (!token) {
      setMe(null);
      setBooting(false);
      return;
    }
    try {
      const user = await getMe();
      setMe(user);
    } catch {
      localStorage.removeItem('token');
      setMe(null);
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  async function logoutAndRedirect() {
    await logout();
    setMe(null);
    nav('/login');
  }

  if (booting) {
    return (
      <div className="container">
        <div className="panel">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container">
      {me ? <TopBar me={me} onLogout={logoutAndRedirect} /> : null}

      <Routes>
        <Route
          path="/login"
          element={!me ? <LoginPage onAuthed={() => loadCurrentUser()} /> : <Navigate to={getRouteForRole(me.role)} replace />}
        />

        <Route
          path="/admin"
          element={me?.role === 'ADMIN' ? <AdminPage /> : <Navigate to={me ? getRouteForRole(me.role) : '/login'} replace />}
        />
        <Route
          path="/officer"
          element={me?.role === 'OFFICER' ? <OfficerPage /> : <Navigate to={me ? getRouteForRole(me.role) : '/login'} replace />}
        />
        <Route
          path="/management"
          element={me?.role === 'MANAGEMENT' ? <ManagementPage /> : <Navigate to={me ? getRouteForRole(me.role) : '/login'} replace />}
        />

        <Route
          path="*"
          element={
            <Navigate
              to={me ? getRouteForRole(me.role) : '/login'}
              replace
            />
          }
        />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}

