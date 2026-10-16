// client/src/pages/Login.jsx

import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';

// Login only checks presence/shape. Password rules are the backend's
// business, so a wrong or weak password surfaces as a normal 401.
const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function Login() {
  const { user, loading, login } = useAuth();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to={location.state?.from?.pathname || '/'} replace />;

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const result = loginSchema.safeParse(form);
    if (!result.success) {
      const errors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0];
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      await login(result.data.email, result.data.password);
      // user is now set, so the <Navigate> above takes over on re-render
    } catch (err) {
      // err.status exists only when the server answered; otherwise it's
      // a network or CORS failure.
      setServerError(
        err.status ? err.message : 'Could not reach the server. Is the backend running?',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-page flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="app-card w-full max-w-sm space-y-4 p-6"
      >
        <div>
          <h1 className="text-3xl text-center font-semibold text-[#f39513] dark:text-white">Trace Lounge Hotel</h1>
          <p className="text-sm text-[#AB784D] text-center dark:text-[#B38A5E]">LOGIN</p>
        </div>

        {serverError && (
          <div
            role="alert"
            className="app-error"
          >
            {serverError}
          </div>
        )}

        <div>
          <label htmlFor="email" className="app-accent-label block text-sm">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            value={form.email}
            onChange={handleChange}
            className="app-input mt-1 w-full"
          />
          {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
        </div>

        <div>
          <label htmlFor="password" className="app-accent-label block text-sm">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={handleChange}
            className="app-input mt-1 w-full"
          />
          {fieldErrors.password && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="app-button-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}