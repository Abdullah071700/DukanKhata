import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 max-w-lg mx-auto p-3 sm:p-4">
      <div className="bg-gradient-to-r from-navy-900 via-navy-800 to-navy-700 text-white rounded-2xl p-4 shadow-xl border border-slate-700 flex items-center gap-3">
        <span className="text-3xl">🏪</span>
        <div className="flex-1 min-w-0">
          <h4 className="font-head font-bold text-sm">Install DukanKhata</h4>
          <p className="text-xs text-slate-300 truncate">Add to home screen for fast offline-ready access</p>
        </div>
        <button
          onClick={handleInstall}
          className="bg-brand-green hover:bg-emerald-600 text-white font-head font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
        >
          <Download size={14} />
          Install
        </button>
        <button
          onClick={() => setShowBanner(false)}
          className="text-slate-400 hover:text-white p-1"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};
