import { CalendarDays, LogOut, Moon, ShieldCheck, Sun, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/useTheme';

export default function Account() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const permissions = user.permissions ?? [];
  const memberSince = user.createdAt && !Number.isNaN(Date.parse(user.createdAt))
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(user.createdAt))
    : 'Not available';
  const initials = user.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <main className="app-page app-content-with-sidebar min-h-screen px-5 pb-12 pt-24 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="app-accent-label mb-2">Your workspace</p>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">Account settings</h1>
          <p className="app-muted-text mt-2 text-sm">Manage your profile, appearance, and account access.</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.8fr)]">
          <section className="app-card p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#F3D5A3]/50 text-xl font-semibold text-[#80552F] dark:bg-[#D4AF7A]/20 dark:text-[#F3D5A3]">
                  {initials || <UserRound aria-hidden="true" size={26} />}
                </div>
                <div className="min-w-0">
                  <p className="app-accent-label mb-1">Signed in as</p>
                  <h2 className="truncate text-xl font-semibold text-gray-900 dark:text-white">{user.name}</h2>
                  <p className="app-muted-text mt-1 truncate text-sm">{user.email}</p>
                </div>
              </div>
              <button type="button" onClick={logout} className="app-button inline-flex items-center gap-2">
                <LogOut aria-hidden="true" size={16} />
                Log out
              </button>
            </div>

            <div className="my-7 border-t border-[#AB784D]/20 dark:border-[#B38A5E]/25" />

            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-[#F3D5A3]/40 p-2 text-[#80552F] dark:bg-[#D4AF7A]/15 dark:text-[#F3D5A3]">
                <ShieldCheck aria-hidden="true" size={19} />
              </div>
              <div>
                <p className="app-accent-label">Account role</p>
                <p className="mt-1 font-medium text-gray-900 dark:text-white">{user.role}</p>
              </div>
            </div>

            <div className="mt-7">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="app-accent-label">Permissions</p>
                  <p className="app-muted-text mt-1 text-sm">Access currently assigned to your account.</p>
                </div>
                <span className="app-chip">{permissions.length} total</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {permissions.length > 0 ? permissions.map((permission) => (
                  <span key={permission} className="app-chip">{permission}</span>
                )) : (
                  <p className="app-muted-text text-sm">No additional permissions assigned.</p>
                )}
              </div>
            </div>
          </section>

          <div className="space-y-5">
            <section className="app-card p-6">
              <div className="mb-5">
                <p className="app-accent-label mb-1">Personalize</p>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h2>
                <p className="app-muted-text mt-1 text-sm">Choose the theme that works best for you.</p>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-[#AB784D]/20 bg-white/40 p-4 dark:border-[#B38A5E]/20 dark:bg-black/10">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-[#F3D5A3]/40 p-2 text-[#80552F] dark:bg-[#D4AF7A]/15 dark:text-[#F3D5A3]">
                    {theme === 'dark' ? <Moon aria-hidden="true" size={18} /> : <Sun aria-hidden="true" size={18} />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{theme === 'dark' ? 'Dark theme' : 'Light theme'}</p>
                    <p className="app-muted-text text-xs">Saved for this browser</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={theme === 'dark'}
                  aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
                  onClick={toggleTheme}
                  className={`relative h-8 w-14 shrink-0 rounded-full border-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF7A] ${theme === 'dark' ? 'border-[#F3D5A3] bg-[#F3D5A3]' : 'border-[#80552F] bg-[#80552F]'}`}
                >
                  <span className={`absolute top-1 h-5 w-5 rounded-full shadow-md ring-1 ring-black/20 transition-transform ${theme === 'dark' ? 'translate-x-6 bg-[#1E1E1E]' : 'translate-x-1 bg-white'}`} />
                </button>
              </div>
            </section>
            <section className="app-card p-6">
              <div className="mb-5">
                <p className="app-accent-label mb-1">Account</p>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Account details</h2>
                <p className="app-muted-text mt-1 text-sm">Your membership and account status.</p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-[#F3D5A3]/40 p-2 text-[#80552F] dark:bg-[#D4AF7A]/20 dark:text-[#F3D5A3]">
                      <ShieldCheck aria-hidden="true" size={18} />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Account status</span>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-[#AB784D]/20 pt-4 dark:border-[#B38A5E]/25">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-[#F3D5A3]/40 p-2 text-[#80552F] dark:bg-[#D4AF7A]/20 dark:text-[#F3D5A3]">
                      <CalendarDays aria-hidden="true" size={18} />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Member since</span>
                  </div>
                  <span className="app-muted-text text-sm">{memberSince}</span>
                </div>
              </div>
            </section>

          </div>
        </div>
      </div>
    </main>
  );
}
