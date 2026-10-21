import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Store, LogOut, ShieldCheck, Database, ChevronDown } from 'lucide-react';

interface NavbarProps {
  onOpenBackups: () => void;
  onGoHome: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenBackups, onGoHome }) => {
  const { currentShop, currentRole, userShops, setCurrentShop, user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-xs">
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Brand / Shop Selector */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onGoHome}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-navy-900 to-navy-700 flex items-center justify-center text-white text-xl shadow-sm shrink-0 active:scale-95 transition-transform"
          >
            🏪
          </button>

          <div className="min-w-0">
            {userShops.length > 1 ? (
              <div className="relative inline-block">
                <select
                  value={currentShop?.id || ''}
                  onChange={(e) => {
                    const selected = userShops.find(m => m.shop.id === e.target.value);
                    if (selected) setCurrentShop(selected.shop);
                  }}
                  className="appearance-none font-head font-bold text-base text-navy-900 bg-transparent pr-5 truncate cursor-pointer focus:outline-hidden"
                >
                  {userShops.map(({ shop, role }) => (
                    <option key={shop.id} value={shop.id}>
                      {shop.name} ({role})
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-0 top-1 text-slate-400 pointer-events-none" />
              </div>
            ) : (
              <h1
                onClick={onGoHome}
                className="font-head font-bold text-base text-navy-900 truncate cursor-pointer hover:text-brand-blue transition-colors"
              >
                {currentShop?.name || 'DukanKhata'}
              </h1>
            )}

            <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
              <span className="truncate">{user?.email}</span>
              {currentRole && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                  <ShieldCheck size={10} />
                  {currentRole}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenBackups}
            title="Cloud Backups & Restore"
            className="p-2 rounded-xl text-slate-600 hover:text-navy-900 hover:bg-slate-100 border border-slate-200 active:scale-95 transition-all text-xs font-head font-bold flex items-center gap-1.5"
          >
            <Database size={16} className="text-brand-blue" />
            <span className="hidden sm:inline">Backups</span>
          </button>

          <button
            onClick={() => signOut()}
            title="Sign Out"
            className="p-2 rounded-xl text-brand-red bg-brand-red-light hover:bg-red-100 active:scale-95 transition-all text-xs font-head font-bold flex items-center gap-1"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};
