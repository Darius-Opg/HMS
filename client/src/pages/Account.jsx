import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

export default function Account() {
  const { user, logout } = useAuth();
  const [result, setResult] = useState(null);

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
    <main className="app-page app-content-with-sidebar p-6">
      <section className="app-card mx-auto max-w-xl space-y-4 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{user.name}</h1>
            <p className="app-accent-text text-sm">{user.email}</p>
          </div>
          <button onClick={logout} className="app-button">
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
            {user.permissions.map((permission) => (
              <span key={permission} className="app-chip">
                {permission}
              </span>
            ))}
          </div>
        </div>

        <div className="border-t border-[#AB784D]/35 pt-4 dark:border-[#B38A5E]/35">
          <button onClick={testUsers} className="app-button-primary">
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
      </section>
    </main>
  );
}
