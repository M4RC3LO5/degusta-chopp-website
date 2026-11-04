import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { useAuth } from './AuthContext';
import { RULES } from '../rules';

export function passwordStrength(pw) {
  let score = 0;
  if (pw.length >= RULES.password.min) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  if (pw.length < RULES.password.min) return { level: 0, label: 'Muito curta', color: 'bg-rose-500' };
  if (score <= 2) return { level: 1, label: 'Fraca', color: 'bg-orange-500' };
  if (score <= 3) return { level: 2, label: 'Média', color: 'bg-yellow-400' };
  return { level: 3, label: 'Forte', color: 'bg-emerald-400' };
}

// Tela obrigatória do 1º acesso (profiles.must_change_password = true). Sem navegação.
export default function ChangePasswordPage() {
  const { profile, changePassword, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const strength = passwordStrength(password);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (password.length < RULES.password.min) return setError(`A senha precisa ter pelo menos ${RULES.password.min} caracteres.`);
    if (password !== confirm) return setError('A confirmação não é igual à senha.');
    setBusy(true);
    setError('');
    const result = await changePassword(password);
    if (result.error) setError(result.error);
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-[#0a160d] text-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-6 text-center">
          <img src="/logo/logo-simbolo.webp" alt="Degusta Chopp" width={64} height={64} className="h-16 w-16 object-contain" />
          <h1 className="text-xl font-extrabold text-amber-300">Crie sua senha</h1>
          <p className="text-sm text-emerald-100/80">
            Olá, {profile?.full_name}. Para continuar, escolha uma senha só sua.
          </p>
        </div>

        <form onSubmit={submit} className="rounded-3xl bg-[#142718] border border-amber-500/30 shadow-neu-gold p-6 space-y-5" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="new-password" className="text-xs font-bold uppercase tracking-wider text-amber-400">Nova senha</label>
            <div className="relative">
              <input
                id="new-password"
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 pl-4 pr-12 rounded-xl bg-[#0d1c10] border border-emerald-900/60 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                type="button"
                onClick={() => setShow(v => !v)}
                aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute right-1 top-1 h-10 w-10 flex items-center justify-center text-emerald-300 hover:text-amber-300"
              >
                {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="pt-1" aria-live="polite">
              <div className="flex gap-1.5">
                {[1, 2, 3].map(i => (
                  <span key={i} className={`h-1.5 flex-1 rounded-full ${password && strength.level >= i ? strength.color : 'bg-emerald-950'}`} />
                ))}
              </div>
              <p className="text-xs text-emerald-200/80 mt-1.5">
                {password ? `Força: ${strength.label}` : `Mínimo de ${RULES.password.min} caracteres.`}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirm-password" className="text-xs font-bold uppercase tracking-wider text-amber-400">Confirme a senha</label>
            <input
              id="confirm-password"
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-[#0d1c10] border border-emerald-900/60 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black uppercase tracking-wider shadow-gold-glow disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <KeyRound className="w-4 h-4" />
            <span>{busy ? 'Salvando…' : 'Salvar nova senha'}</span>
          </button>
        </form>

        <button type="button" onClick={signOut} className="mt-5 mx-auto block text-xs text-emerald-300 underline">
          Sair
        </button>
      </div>
    </div>
  );
}
