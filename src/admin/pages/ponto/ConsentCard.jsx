import React from 'react';
import { MapPin } from 'lucide-react';

// Consentimento LGPD (1º uso do Ponto). Texto neutro: o colaborador não vê localização, distância nem raio.
// Recusar não impede de marcar. Revisar/retirar depois: Mais → "Privacidade do ponto".
export default function ConsentCard({ busy, error, onChoose }) {
  return (
    <section className="rounded-3xl bg-[#142718] border border-amber-500/30 p-5 space-y-4" data-testid="consent-card" aria-labelledby="consent-title">
      <div className="flex items-center gap-2 text-amber-300">
        <MapPin className="w-5 h-5" aria-hidden="true" />
        <h2 id="consent-title" className="text-base font-extrabold">Localização no ponto</h2>
      </div>
      <div className="text-sm text-emerald-100/90 space-y-2">
        <p><strong>Ao marcar o ponto, registramos a localização do aparelho para conferência interna.</strong></p>
        <ul className="list-disc pl-5 space-y-1 text-emerald-100/80">
          <li>A localização é pega só no momento em que você toca para marcar.</li>
          <li>Quem vê: o Dono e o Gerente. Nada é compartilhado fora da empresa.</li>
          <li>Os registros são guardados por 12 meses e depois apagados pelo Dono.</li>
        </ul>
        <p>Se preferir não permitir, a marcação é aceita normalmente. Você pode mudar de ideia em Mais → Privacidade do ponto.</p>
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-rose-300">{error}</p>}
      <div className="flex flex-col sm:flex-row gap-3">
        <button type="button" disabled={busy} onClick={() => onChoose('granted')} data-testid="consent-allow"
          className="flex-1 min-h-[48px] rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-sm font-black uppercase tracking-wide disabled:opacity-50">Permitir</button>
        <button type="button" disabled={busy} onClick={() => onChoose('denied')} data-testid="consent-deny"
          className="flex-1 min-h-[48px] rounded-xl border border-emerald-900/60 bg-[#0d1c10] text-sm font-bold text-emerald-200 disabled:opacity-50">Não permitir</button>
      </div>
    </section>
  );
}
