import { FormEvent, useState } from 'react';
import NavBar from './NavBar';
import FeedbackAdminView from './FeedbackAdminView';
import MenuAdminView from './MenuAdminView';

interface AdminPageProps {
  setPage: (page: string) => void;
}

type AdminTab = 'feedback' | 'menu';

export default function AdminPage({ setPage }: AdminPageProps) {
  const [staffToken, setStaffToken] = useState(() => sessionStorage.getItem('feedbackStaffToken') || '');
  const [tokenInput, setTokenInput] = useState(() => sessionStorage.getItem('feedbackStaffToken') || '');
  const [tab, setTab] = useState<AdminTab>('feedback');
  const [error, setError] = useState('');

  const handleStaffAccess = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = tokenInput.trim();
    if (!token) return;
    sessionStorage.setItem('feedbackStaffToken', token);
    setError('');
    setStaffToken(token);
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
        {!staffToken ? (
          <form onSubmit={handleStaffAccess} className="bg-white border border-stone-200 rounded-2xl p-8 text-center shadow-sm">
            <h2 className="font-forum text-2xl text-stone-900 mb-2">Staff access</h2>
            <p className="text-stone-600 text-sm mb-6">Enter the staff token to manage feedback and the menu.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <label htmlFor="staff-token" className="sr-only">Staff access token</label>
              <input
                id="staff-token"
                name="staffToken"
                type="password"
                autoComplete="current-password"
                required
                value={tokenInput}
                onChange={(event) => setTokenInput(event.target.value)}
                placeholder="Staff access token"
                className="min-w-0 flex-1 px-4 py-3 rounded-xl border border-stone-200 focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-none"
              />
              <button className="bg-stone-900 text-white px-6 py-3 rounded-xl font-bold tracking-widest uppercase text-sm">Unlock</button>
            </div>
            {error && <p role="alert" className="text-red-700 mt-4">{error}</p>}
          </form>
        ) : (
          <>
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
              <FeedbackAdminView setPage={setPage} staffToken={staffToken} />
            ) : (
              <MenuAdminView staffToken={staffToken} />
            )}
          </>
        )}
      </section>
    </main>
  );
}
