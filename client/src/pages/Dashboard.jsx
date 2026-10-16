// client/src/pages/Dashboard.jsx
//
// Temporary page for validating the auth flow. The "Test GET /users"
// button exercises requireAuth + requirePermission('MANAGE_USERS')
// through the same apiFetch path real pages will use. Safe to delete
// once real pages exist.

import { useState } from 'react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import RoomCard from '../components/DashboardRoomCard';
import Header from '../components/Header';
import { listRoomTypes } from '../lib/roomApi.js';
import { useEffect } from 'react';


const ROW_PATTERN = [2, 1, 2];

function toRows(items) {
  const rows = [];
  let start = 0;
  while (start < items.length) {
    const size = ROW_PATTERN[rows.length % ROW_PATTERN.length];
    rows.push(items.slice(start, start + size));
    start += size;
  }
  return rows;
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [result, setResult] = useState(null);

  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    listRoomTypes()
      .then((data) => { if (!cancelled) setRoomTypes(data); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const testUsers = async () => {
    setResult({ pending: true });
    try {
      const res = await apiFetch('/users');
      const body = await res.json().catch(() => null);
      setResult({ status: res.status, body });
    } catch {
      setResult({ status: 'network error', body: null });
    }
  };


  return (
    <>
      <Header />
      <div className="app-page app-content-with-sidebar p-6">

        <div className="app-card mx-auto max-w-xl space-y-4 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{user.name}</h1>
              <p className="app-accent-text text-sm">{user.email}</p>
            </div>
            <button
              onClick={logout}
              className="app-button"
            >
              Log out
            </button>
          </div>

          <div>
            <p className="app-accent-label">Role</p>
            <p className="text-sm text-gray-900 dark:text-white">{user.role}</p>
          </div>

          <div>
            <p className="app-accent-label">Permissions</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {user.permissions.map((p) => (
                <span key={p} className="app-chip">
                  {p}
                </span>
              ))}
            </div>
          </div>

          <div className="border-t border-[#AB784D]/35 pt-4 dark:border-[#B38A5E]/35">
            <button
              onClick={testUsers}
              className="app-button-primary"
            >
              Test GET /users (needs MANAGE_USERS)
            </button>

            {result && !result.pending && (
              <div className="mt-3 text-sm">
                <p>
                  Status: <span className="font-mono text-gray-900 dark:text-white">{result.status}</span>
                </p>
                <pre className="mt-1 overflow-x-auto rounded border border-[#AB784D]/25 bg-[#F9F6F2] p-2 text-xs text-[#80552F] dark:border-[#B38A5E]/25 dark:bg-[#0A0A0A] dark:text-[#B38A5E]">
                  {Array.isArray(result.body)
                    ? `${result.body.length} user(s) returned`
                    : JSON.stringify(result.body, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>


        {loading && <p className="app-accent-text p-4 text-sm">Loading room types…</p>}
        {error && <p className="p-4 text-sm text-red-600">{error}</p>}

        <div className="mx-auto mt-6 max-w-6xl space-y-6">
          {toRows(roomTypes).map((row, r) => {
            const fullWidth = ROW_PATTERN[r % ROW_PATTERN.length] === 1;
            return (
              <div
                key={r}
                className={fullWidth ? "" : "grid grid-cols-1 gap-6 md:grid-cols-2"}
              >
                {row.map((t) => {
                  const counts = t.roomCounts ?? t.counts;
                  return (
                    <RoomCard
                      key={t.id}
                      roomType={t.id}
                      roomName={t.name}
                      roomDesc={t.description}
                      basePrice={t.basePrice}
                      capacity={t.capacity}
                      features={t.features}
                      total={counts?.total}
                      available={counts?.available}
                      occupied={counts?.occupied}
                      maintainance={counts?.maintenance}
                      wide={fullWidth}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}