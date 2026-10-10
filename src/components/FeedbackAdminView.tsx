import { useEffect, useState } from 'react';
import { SessionExpiredError, authedFetch } from '../lib/adminAuth';

interface FeedbackEntry {
  id: string;
  name: string;
  email: string | null;
  rating: number;
  message: string;
  createdAt: string;
}

interface FeedbackAdminViewProps {
  setPage: (page: string) => void;
  onSessionExpired: () => void;
}

export default function FeedbackAdminView({ setPage, onSessionExpired }: FeedbackAdminViewProps) {
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [summary, setSummary] = useState<{ total: number; averageRating: number | null } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    authedFetch('/api/feedback?limit=100')
      .then(async (response) => {
        if (!response.ok) throw new Error('Feedback could not be loaded.');
        return response.json();
      })
      .then((data) => {
        if (!active) return;
        setEntries(data.entries);
        setSummary(data.summary);
      })
      .catch((loadError: Error) => {
        if (!active) return;
        if (loadError instanceof SessionExpiredError) onSessionExpired();
        else setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [onSessionExpired]);

  return (
    <div>
      <div className="mb-8 text-center">
        <h2 className="font-forum text-3xl md:text-4xl text-stone-900 mb-3">Laphto Mall Feedback</h2>
        {summary && <p className="text-stone-600">{summary.total} submissions · Average rating: {summary.averageRating ?? 'N/A'} / 5</p>}
        <a href="/api/feedback/export.csv" onClick={(event) => {
          event.preventDefault();
          authedFetch('/api/feedback/export.csv')
            .then(async (response) => {
              if (!response.ok) throw new Error('CSV export failed.');
              const blob = await response.blob();
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = 'laphto-mall-feedback.csv';
              link.click();
              window.setTimeout(() => URL.revokeObjectURL(url), 1000);
            })
            .catch((downloadError: Error) => {
              if (downloadError instanceof SessionExpiredError) onSessionExpired();
              else setError(downloadError.message);
            });
        }} className="inline-block mt-4 underline">Download CSV</a>
        <button type="button" onClick={() => setPage('table-qr')} className="block mx-auto mt-3 underline">Create table menu QR</button>
      </div>
      {error && <p role="alert" className="text-red-700 mb-4">{error}</p>}
      {loading && <p className="text-stone-500 text-center">Loading submissions…</p>}
      <div className="flex flex-col gap-4 max-h-[65vh] overflow-y-auto">
        {entries.map((entry) => (
          <article key={entry.id} className="border border-stone-200 rounded-xl p-4">
            <div className="flex justify-between gap-4">
              <strong>{entry.name}</strong>
              <span aria-label={`${entry.rating} out of 5 stars`}>{'★'.repeat(entry.rating)}{'☆'.repeat(5 - entry.rating)}</span>
            </div>
            <p className="text-sm text-stone-500 mt-1">{entry.email || 'No email'} · {new Date(entry.createdAt).toLocaleString()}</p>
            <p className="mt-3 whitespace-pre-wrap">{entry.message}</p>
          </article>
        ))}
        {!entries.length && !error && !loading && <p className="text-stone-500 text-center">No feedback has been submitted yet.</p>}
      </div>
    </div>
  );
}
