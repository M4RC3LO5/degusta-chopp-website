import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from './AuthContext';
import { MESSAGES } from '../rules';

export default function LoginPage() {
  const { status, signIn, notice, clearNotice } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (status === 'ready') return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    clearNotice();
    const result = await signIn(username, password);
    if (result.error) setError(result.error);
    setBusy(false);
  };

  const message = error || notice;

  return (
    <div className="min-h-screen bg-[#0a160d] text-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <img src="/logo/logo-simbolo.webp" alt="Degusta Chopp" width={72} height={72} className="h-[72px] w-[72px] object-contain" />
          <h1 className="text-xl font-extrabold text-amber-300 tracking-wide">Degusta Admin</h1>
        </div>

        <form onSubmit={submit} className="rounded-3xl bg-[#142718] border border-amber-500/30 shadow-neu-gold p-6 space-y-5" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="username" className="text-xs font-bold uppercase tracking-wider text-amber-400">Usuário</label>
            <input
              id="username"
              name="username"
              type="text"
              inputMode="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={20}
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              className="w-full h-12 px-4 rounded-xl bg-[#0d1c10] border border-emerald-900/60 text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-amber-400">Senha</label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 pl-4 pr-12 rounded-xl bg-[#0d1c10] border border-emerald-900/60 text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute right-1 top-1 h-10 w-10 flex items-center justify-center text-emerald-300 hover:text-amber-300"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {message && (
            <p role="alert" className="text-sm font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2.5">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black uppercase tracking-wider shadow-gold-glow disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{busy ? 'Entrando…' : 'Entrar'}</span>
          </button>

          <p className="text-xs text-emerald-200/70 text-center">{MESSAGES.forgot}</p>
        </form>
      </div>
    </div>
  );
}
