import { useEffect, useState } from 'react';
import HomePage from './components/HomePage';
import MenuPage from './components/MenuPage';
import AboutPage from './components/AboutPage';
import FeedbackPage from './components/FeedbackPage';
import TableQrPage from './components/TableQrPage';

export default function App() {
  const pageFromLocation = () => {
    if (window.location.pathname === '/menu') return 'menu';
    if (window.location.pathname === '/feedback') return 'feedback';
    if (window.location.pathname === '/about') return 'about';
    if (window.location.pathname === '/feedback-admin') return 'feedback-admin';
    if (window.location.pathname === '/table-qr') return 'table-qr';
    return 'home';
  };
  const [page, setCurrentPage] = useState(pageFromLocation);

  const setPage = (nextPage: string) => {
    const routes: Record<string, string> = {
      home: '/', menu: '/menu', about: '/about', feedback: '/feedback',
      'feedback-admin': '/feedback-admin',
      'table-qr': '/table-qr',
    };
    window.history.pushState({}, '', routes[nextPage] || '/');
    setCurrentPage(nextPage);
  };

  useEffect(() => {
    const handlePopState = () => setCurrentPage(pageFromLocation());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const renderPage = () => {
    switch (page) {
      case 'home': return <HomePage setPage={setPage} />;
      case 'menu': return <MenuPage setPage={setPage} />;
      case 'about': return <AboutPage setPage={setPage} />;
      case 'feedback': return <FeedbackPage setPage={setPage} />;
      case 'feedback-admin': return <FeedbackPage setPage={setPage} adminView />;
      case 'table-qr': return <TableQrPage setPage={setPage} />;
      default: return <HomePage setPage={setPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-stone-900 p-2 md:p-4 lg:p-6 font-sans">
      {renderPage()}
    </div>
  );
}
