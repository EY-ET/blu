import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import NavBar from './NavBar';

interface TableQrPageProps {
  setPage: (page: string) => void;
}

export default function TableQrPage({ setPage }: TableQrPageProps) {
  const [image, setImage] = useState('');
  const [error, setError] = useState('');
  const menuUrl = `${window.location.origin}/menu`;

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(menuUrl, { width: 360, margin: 2, errorCorrectionLevel: 'H' })
      .then((dataUrl) => { if (active) setImage(dataUrl); })
      .catch(() => { if (active) setError('The menu QR code could not be generated.'); });
    return () => { active = false; };
  }, [menuUrl]);

  return (
    <main className="min-h-[calc(100vh-2rem)] flex flex-col">
      <div className="relative rounded-3xl overflow-hidden min-h-[24vh] bg-stone-900 text-white p-6 md:p-10">
        <NavBar setPage={setPage} />
        <div className="mt-12 md:mt-16 max-w-2xl">
          <p className="uppercase tracking-[0.25em] text-sm text-white/70">Blu Kitchen · Laphto Mall</p>
          <h1 className="font-forum text-4xl md:text-6xl mt-3">Table Menu QR</h1>
          <p className="mt-3 text-white/75">Print this code for tables. It opens the menu on this deployed site.</p>
        </div>
      </div>
      <section className="flex-1 flex flex-col items-center justify-center text-center py-10">
        {error ? <p role="alert" className="text-red-700">{error}</p> : image ? (
          <>
            <img src={image} alt={`QR code linking to ${menuUrl}`} className="w-72 h-72 md:w-96 md:h-96 bg-white p-3 rounded-2xl shadow-sm border border-stone-200" />
            <p className="mt-5 text-stone-600 break-all px-4">{menuUrl}</p>
            <div className="flex gap-3 mt-6">
              <a href={image} download="blu-kitchen-menu-qr.png" className="bg-stone-900 text-white rounded-xl px-6 py-3">Download QR</a>
              <a href="/menu" className="border border-stone-300 rounded-xl px-6 py-3">Open menu</a>
            </div>
          </>
        ) : <p className="text-stone-500">Preparing QR code…</p>}
      </section>
    </main>
  );
}
