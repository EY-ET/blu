import { FormEvent, useEffect, useState } from 'react';
import NavBar from './NavBar';
import { Send, Star } from 'lucide-react';

interface FeedbackPageProps {
  setPage: (page: string) => void;
  adminView?: boolean;
}

interface FeedbackEntry {
  id: string;
  name: string;
  email: string | null;
  rating: number;
  message: string;
  createdAt: string;
}

export default function FeedbackPage({ setPage, adminView = false }: FeedbackPageProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [staffToken, setStaffToken] = useState(() => sessionStorage.getItem('feedbackStaffToken') || '');
  const [summary, setSummary] = useState<{ total: number; averageRating: number | null } | null>(null);

  useEffect(() => {
    if (!adminView || !staffToken) return;
    fetch('/api/feedback?limit=100', { headers: { Authorization: `Bearer ${staffToken}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error('Feedback could not be loaded.');
        return response.json();
      })
      .then((data) => {
        setEntries(data.entries);
        setSummary(data.summary);
      })
      .catch((loadError: Error) => setError(loadError.message));
  }, [adminView, staffToken]);

  const handleStaffAccess = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const token = String(formData.get('staffToken') || '').trim();
    sessionStorage.setItem('feedbackStaffToken', token);
    setError('');
    setEntries([]);
    setStaffToken(token);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    const formElement = e.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name'),
          email: form.get('email'),
          message: form.get('message'),
          rating,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Feedback could not be submitted.');
      setSubmitted(true);
      formElement.reset();
      setRating(0);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Feedback could not be submitted.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-12 h-full min-h-[calc(100vh-2rem)]">
      {/* Left Hero - Fixed on Desktop */}
      <div className="relative w-full lg:w-[40%] rounded-3xl overflow-hidden h-[40vh] lg:h-[calc(100vh-3rem)] lg:sticky lg:top-6">
        <img 
          src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=2070&auto=format&fit=crop" 
          alt="Fresh Salad" 
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover" 
        />
        <div className="absolute inset-0 bg-black/30"></div>
        
        <div className="absolute top-4 left-4 md:top-6 md:left-6 z-10">
          <NavBar setPage={setPage} compact={true} />
        </div>

        <div className="absolute bottom-8 md:bottom-12 left-0 w-full text-center z-10 px-4">
          <h1 className="font-forum text-4xl sm:text-5xl md:text-7xl lg:text-8xl text-white tracking-widest break-words">FEEDBACK</h1>
        </div>
      </div>

      {/* Right Content */}
      <div className="w-full lg:w-[60%] py-8 lg:py-16 lg:pr-8 xl:pr-16 flex items-center justify-center">
        <div className="w-full max-w-xl bg-white p-6 sm:p-8 md:p-12 rounded-3xl shadow-sm border border-stone-100">
          {adminView ? (
            <div>
              <div className="mb-8 text-center">
                <h2 className="font-forum text-3xl md:text-4xl text-stone-900 mb-3">Laphto Mall Feedback</h2>
                {summary && <p className="text-stone-600">{summary.total} submissions · Average rating: {summary.averageRating ?? 'N/A'} / 5</p>}
                {staffToken && <a href="/api/feedback/export.csv" onClick={(event) => {
                  event.preventDefault();
                  fetch('/api/feedback/export.csv', { headers: { Authorization: `Bearer ${staffToken}` } })
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
                    .catch((downloadError: Error) => setError(downloadError.message));
                }} className="inline-block mt-4 underline">Download CSV</a>}
                {staffToken && <button type="button" onClick={() => setPage('table-qr')} className="block mx-auto mt-3 underline">Create table menu QR</button>}
              </div>
              <form onSubmit={handleStaffAccess} className="flex gap-2 mb-6">
                <label htmlFor="staff-token" className="sr-only">Staff access token</label>
                <input id="staff-token" name="staffToken" type="password" autoComplete="current-password" required placeholder="Staff access token" defaultValue={staffToken} className="min-w-0 flex-1 px-4 py-3 rounded-xl border border-stone-200" />
                <button className="bg-stone-900 text-white px-5 rounded-xl">Load</button>
              </form>
              {error && <p role="alert" className="text-red-700 mb-4">{error}</p>}
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
                {!entries.length && !error && <p className="text-stone-500 text-center">No feedback has been submitted yet.</p>}
              </div>
            </div>
          ) : submitted ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Send size={32} />
              </div>
              <h2 className="font-forum text-3xl md:text-4xl text-stone-900 mb-4 tracking-wide">Thank You!</h2>
              <p className="text-stone-600 text-base md:text-lg">Your feedback helps us improve and serve you better at Blu Kitchen.</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-8 md:mb-10">
                <h2 className="font-forum text-2xl sm:text-3xl md:text-4xl text-stone-900 mb-3 md:mb-4 tracking-wide break-words">We'd love to hear from you</h2>
                <p className="text-stone-600 text-sm md:text-base break-words">Please share your experience at Blu Kitchen, Laphto Mall.</p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div>
                  <label className="block text-sm font-bold tracking-widest uppercase text-stone-500 mb-2">How was your experience?</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        aria-label={`Rate ${star} out of 5 stars`}
                        aria-pressed={rating === star}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                        className="focus:outline-none transition-transform hover:scale-110"
                      >
                        <Star 
                          size={32} 
                          className={`${
                            star <= (hoveredRating || rating) 
                              ? 'fill-yellow-400 text-yellow-400' 
                              : 'text-stone-300'
                          } transition-colors`} 
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-bold tracking-widest uppercase text-stone-500 mb-2">Name</label>
                    <input 
                      type="text" 
                      id="name"
                      name="name"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-none transition-colors bg-stone-50/50"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-bold tracking-widest uppercase text-stone-500 mb-2">Email</label>
                    <input 
                      type="email" 
                      id="email"
                      name="email"
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-none transition-colors bg-stone-50/50"
                      placeholder="Your email (optional)"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-bold tracking-widest uppercase text-stone-500 mb-2">Comments</label>
                  <textarea 
                    id="message"
                    name="message"
                    rows={5}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-none transition-colors bg-stone-50/50 resize-none"
                    placeholder="Tell us about your food, service, and atmosphere..."
                  ></textarea>
                </div>

                {error && <p role="alert" className="text-red-700" aria-live="polite">{error}</p>}
                <button
                  type="submit"
                  disabled={rating === 0 || isSubmitting}
                  className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold tracking-widest uppercase hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4 flex items-center justify-center gap-2"
                >
                  <span>{isSubmitting ? 'Submitting…' : 'Submit Feedback'}</span>
                  <Send size={18} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
