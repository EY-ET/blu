import { FormEvent, useState } from 'react';
import NavBar from './NavBar';
import FeedbackAdminView from './FeedbackAdminView';
import MenuAdminView from './MenuAdminView';
import { AdminSession, login, logout } from '../lib/adminAuth';

interface AdminPageProps {
  setPage: (page: string) => void;
}

type AdminTab = 'feedback' | 'menu';

export default function AdminPage({ setPage }: AdminPageProps) {
  const [session, setSessionState] = useState<AdminSession | null>(() => {
    const existing = sessionStorage.getItem('bluAdminSession');
    return existing ? (JSON.parse(existing) as AdminSession) : null;
  });
  const [tab, setTab] = useState<AdminTab>('feedback');
  const [error, setError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  const handleSessionExpired = () => setSessionState(null);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');
    if (!email || !password) return;
    setSigningIn(true);
    setError('');
    try {
      const activeSession = await login(email, password);
      setSessionState(activeSession);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Sign-in failed.');
    } finally {
      setSigningIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setSessionState(null);
    setTab('feedback');
  };

  return (
    <main className="min-h-[calc(100vh-2rem)] flex flex-col">
      <div className="relative rounded-3xl overflow-hidden min-h-[24vh] bg-stone-900 text-white p-6 md:p-10">
        <NavBar setPage={setPage} />
        <div className="mt-12 md:mt-16 max-w-2xl">
          <p className="uppercase tracking-[0.25em] text-sm text-white/70">Blu Kitchen · Laphto Mall</p>
          <h1 className="font-forum text-4xl md:text-6xl mt-3">Staff Admin</h1>
          <p className="mt-3 text-white/75">Review guest feedback and manage the live menu.</p>
        </div>
      </div>

      <section className="flex-1 w-full max-w-3xl mx-auto px-4 py-8">
        {!session ? (
          <form onSubmit={handleLogin} className="bg-white border border-stone-200 rounded-2xl p-8 text-center shadow-sm">
            <h2 className="font-forum text-2xl text-stone-900 mb-2">Admin sign-in</h2>
            <p className="text-stone-600 text-sm mb-6">Sign in with your admin account.</p>
            <div className="flex flex-col gap-3 max-w-sm mx-auto">
              <label htmlFor="admin-email" className="sr-only">Email</label>
              <input
                id="admin-email"
                name="email"
                type="email"
                autoComplete="username"
                required
                placeholder="Email"
                className="px-4 py-3 rounded-xl border border-stone-200 focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-none"
              />
              <label htmlFor="admin-password" className="sr-only">Password</label>
              <input
                id="admin-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="Password"
                className="px-4 py-3 rounded-xl border border-stone-200 focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-none"
              />
              <button
                type="submit"
                disabled={signingIn}
                className="bg-stone-900 text-white px-6 py-3 rounded-xl font-bold tracking-widest uppercase text-sm hover:bg-stone-800 transition-colors disabled:opacity-50"
              >
                {signingIn ? 'Signing in…' : 'Sign in'}
              </button>
            </div>
            {error && <p role="alert" className="text-red-700 mt-4">{error}</p>}
          </form>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
              <p className="text-sm text-stone-500">Signed in as <strong className="text-stone-900">{session.email}</strong></p>
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 text-sm hover:border-stone-900 hover:text-stone-900 transition-colors"
              >
                Sign out
              </button>
            </div>
            <div className="flex justify-center gap-2 mb-8">
              {(['feedback', 'menu'] as AdminTab[]).map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setTab(name)}
                  className={`px-6 py-2.5 rounded-full border text-xs font-bold tracking-widest uppercase transition-colors ${
                    tab === name
                      ? 'border-stone-900 bg-stone-900 text-white'
                      : 'border-stone-300 text-stone-600 hover:border-stone-900 hover:text-stone-900'
                  }`}
                >
                  {name === 'feedback' ? 'Feedback' : 'Menu'}
                </button>
              ))}
            </div>
            {tab === 'feedback' ? (
              <FeedbackAdminView setPage={setPage} onSessionExpired={handleSessionExpired} />
            ) : (
              <MenuAdminView onSessionExpired={handleSessionExpired} />
            )}
          </>
        )}
      </section>
    </main>
  );
}
