import React, { useState } from 'react';
import { supabase, explainError, isConfigured } from '../lib/supabase';
import { Store, Lock, Mail, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const [tab, setTab] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const validatePassword = (pwd: string) => {
    if (pwd.length < 6) return 'Password must be at least 6 characters.';
    if (!/[a-zA-Z]/.test(pwd)) return 'Password must include at least one letter.';
    if (!/[0-9]/.test(pwd)) return 'Password must include at least one number.';
    if (!/[^a-zA-Z0-9]/.test(pwd)) return 'Password must include at least one special character (@#$!% etc).';
    return null;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(explainError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim() || !email.trim() || !password.trim()) {
      setErrorMsg('Please fill in all fields (Shop Name, Email, Password).');
      return;
    }

    const pwdErr = validatePassword(password);
    if (pwdErr) {
      setErrorMsg(pwdErr);
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            shop_name: shopName.trim(),
          },
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      if (!data.session) {
        setSuccessMsg(
          'Account created successfully! We sent a confirmation link to your email. Please verify your email before signing in.'
        );
        setTab('login');
      } else {
        setSuccessMsg('Account created! Logging in...');
      }
    } catch (err: any) {
      setErrorMsg(explainError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter your account email address.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });

      if (error) throw error;

      setSuccessMsg('Password reset instructions have been sent to your email.');
    } catch (err: any) {
      setErrorMsg(explainError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy-900 via-navy-800 to-navy-700 flex flex-col justify-center items-center px-4 py-8">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 text-4xl mb-3 shadow-lg shadow-black/20">
          🏪
        </div>
        <h1 className="font-head text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          DukanKhata
        </h1>
        <p className="text-sm sm:text-base text-slate-300 font-medium mt-1">
          Supplier Bill & Payment Manager for Shopkeepers
        </p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/40">
        {!isConfigured && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3">
            <AlertCircle size={18} className="shrink-0 mt-0.5 text-amber-400" />
            <div>
              <p className="font-bold">Supabase Not Configured</p>
              <p className="mt-1">
                Set <code className="bg-black/30 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> and{' '}
                <code className="bg-black/30 px-1 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code> in{' '}
                <code className="bg-black/30 px-1 py-0.5 rounded">.env.local</code>.
              </p>
            </div>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex bg-white/10 p-1 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => { setTab('login'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-2.5 rounded-xl font-head font-bold text-sm transition-all ${
              tab === 'login'
                ? 'bg-brand-green text-white shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => { setTab('signup'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-2.5 rounded-xl font-head font-bold text-sm transition-all ${
              tab === 'signup'
                ? 'bg-brand-green text-white shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-200 text-xs sm:text-sm flex items-start gap-2.5">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 text-xs sm:text-sm flex items-start gap-2.5">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Content */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="shopkeeper@example.com"
                  required
                  autoComplete="email"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-hidden focus:border-brand-green focus:ring-1 focus:ring-brand-green transition-all text-sm"
                />
                <Mail size={18} className="absolute right-3.5 top-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => { setTab('forgot'); setErrorMsg(''); setSuccessMsg(''); }}
                  className="text-xs text-brand-green hover:underline font-medium"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-hidden focus:border-brand-green focus:ring-1 focus:ring-brand-green transition-all text-sm"
                />
                <Lock size={18} className="absolute right-3.5 top-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-brand-green hover:bg-emerald-600 text-white font-head font-bold text-base shadow-lg shadow-emerald-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                '🔓 Sign In'
              )}
            </button>
          </form>
        )}

        {tab === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Shop Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="e.g. Sharma Provision Store"
                  required
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-hidden focus:border-brand-green focus:ring-1 focus:ring-brand-green transition-all text-sm"
                />
                <Store size={18} className="absolute right-3.5 top-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="shopkeeper@example.com"
                  required
                  autoComplete="email"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-hidden focus:border-brand-green focus:ring-1 focus:ring-brand-green transition-all text-sm"
                />
                <Mail size={18} className="absolute right-3.5 top-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 chars (letter + number + symbol)"
                  required
                  autoComplete="new-password"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-hidden focus:border-brand-green focus:ring-1 focus:ring-brand-green transition-all text-sm"
                />
                <Lock size={18} className="absolute right-3.5 top-3.5 text-slate-400 pointer-events-none" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Must include: letters, numbers & special character (e.g. @#$!)
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-brand-green hover:bg-emerald-600 text-white font-head font-bold text-base shadow-lg shadow-emerald-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                '✅ Create Shop Account'
              )}
            </button>
          </form>
        )}

        {tab === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <p className="text-xs text-slate-300 mb-3">
              Enter your registered shop email. We will send you a secure password reset link.
            </p>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="shopkeeper@example.com"
                  required
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-hidden focus:border-brand-green focus:ring-1 focus:ring-brand-green transition-all text-sm"
                />
                <Mail size={18} className="absolute right-3.5 top-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-brand-blue hover:bg-blue-600 text-white font-head font-bold text-base shadow-lg shadow-blue-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Send Reset Link'
              )}
            </button>

            <button
              type="button"
              onClick={() => { setTab('login'); setErrorMsg(''); setSuccessMsg(''); }}
              className="w-full text-center text-xs text-slate-400 hover:text-white font-medium py-1"
            >
              ← Back to Sign In
            </button>
          </form>
        )}
      </div>

      <p className="text-xs text-slate-400 mt-6 text-center">
        DukanKhata • Cloud Synchronized & Secured with Row Level Security
      </p>
    </div>
  );
};
