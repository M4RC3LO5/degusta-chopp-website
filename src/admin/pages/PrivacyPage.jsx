import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { consentOf, saveConsent } from './ponto/consent';

// Mais → "Privacidade do ponto": revisar ou retirar o consentimento da localização (LGPD).
export default function PrivacyPage() {
  const { session } = useAuth();
  const consent = consentOf(session);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);   // { kind: 'ok' | 'error', text }

  const choose = async (choice) => {
    setBusy(true);
    setMessage(null);
    const { error } = await saveConsent(choice, Date.now());
    setBusy(false);
    if (error) { setMessage({ kind: 'error', text: 'Não foi possível salvar sua escolha. Tente de novo.' }); return; }
    setMessage({ kind: 'ok', text: choice === 'granted' ? 'Pronto: a localização será registrada nas próximas marcações.' : 'Pronto: a localização não será mais registrada. Você continua marcando normalmente.' });
  };

  const granted = consent?.choice === 'granted';
  const label = !consent ? 'Ainda não respondido' : granted ? 'Permitido' : 'Não permitido';

  return (
    <section className="space-y-4 max-w-xl">
      <h1 className="text-[26px] font-extrabold text-amber-100">Privacidade do ponto</h1>

      <div className="rounded-3xl bg-[#142718] border border-[#234129] p-5 space-y-4" data-testid="privacy-card">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-extrabold text-amber-300"><ShieldCheck className="w-5 h-5" aria-hidden="true" /> Localização nas marcações</p>
          <span data-testid="privacy-status" className={`px-3 py-1 rounded-full text-[13px] font-bold border ${granted ? 'text-green-300 bg-green-400/10 border-green-400/35' : 'text-[#cfe3d3] bg-[#0f1f12] border-[#2c4a32]'}`}>{label}</span>
        </div>
        <p className="text-sm text-emerald-100/90">Ao marcar o ponto, registramos a localização do aparelho para conferência interna.</p>
        <ul className="list-disc pl-5 space-y-1 text-sm text-emerald-100/80">
          <li>A localização é pega só no momento em que você toca para marcar.</li>
          <li>Quem vê: o Dono e o Gerente.</li>
          <li>Os registros são guardados por 12 meses e depois apagados pelo Dono.</li>
        </ul>
        {message && <p role={message.kind === 'error' ? 'alert' : 'status'} className={`text-sm font-semibold rounded-xl px-3 py-2.5 border ${message.kind === 'error' ? 'text-rose-300 bg-rose-500/10 border-rose-500/30' : 'text-emerald-200 bg-emerald-500/10 border-emerald-500/30'}`}>{message.text}</p>}
        <div className="flex flex-col sm:flex-row gap-3">
          <button type="button" disabled={busy || granted} onClick={() => choose('granted')} data-testid="privacy-allow"
            className="flex-1 min-h-[48px] rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-sm font-black disabled:opacity-40">Permitir localização</button>
          <button type="button" disabled={busy || (consent && !granted)} onClick={() => choose('denied')} data-testid="privacy-deny"
            className="flex-1 min-h-[48px] rounded-xl border border-emerald-900/60 bg-[#0d1c10] text-sm font-bold text-emerald-200 disabled:opacity-40">Retirar consentimento</button>
        </div>
      </div>
    </section>
  );
}
