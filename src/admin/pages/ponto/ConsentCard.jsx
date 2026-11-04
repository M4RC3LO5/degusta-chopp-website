import React from 'react';
import { MapPin } from 'lucide-react';

// Consentimento LGPD para a localização do ponto (1º uso). Recusar não impede de marcar:
// a marcação é aceita e fica sinalizada ("Sem localização").
export default function ConsentCard({ busy, error, onChoose }) {
  return (
    <section className="rounded-3xl bg-[#142718] border border-amber-500/30 p-5 space-y-4" data-testid="consent-card" aria-labelledby="consent-title">
      <div className="flex items-center gap-2 text-amber-300">
        <MapPin className="w-5 h-5" />
        <h2 id="consent-title" className="text-base font-extrabold">Localização no ponto</h2>
      </div>
      <div className="text-sm text-emerald-100/90 space-y-2">
        <p>Para conferir se você está na loja, o app pode pegar a sua localização <strong>só no momento em que você toca para marcar o ponto</strong>.</p>
        <ul className="list-disc pl-5 space-y-1 text-emerald-100/80">
          <li>Guardamos latitude, longitude, precisão e a distância até a loja, junto com aquela marcação.</li>
          <li>Quem vê: você, o Dono e o Gerente. Nada é compartilhado fora da empresa.</li>
          <li>Não acompanhamos você fora do momento da marcação.</li>
          <li>Os registros são guardados por 12 meses e depois apagados pelo Dono.</li>
        </ul>
        <p>Se você não permitir, a marcação é aceita normalmente e fica sinalizada como “Sem localização”. Você pode mudar de ideia depois nesta tela.</p>
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-rose-300">{error}</p>}
      <div className="flex flex-col sm:flex-row gap-3">
        <button type="button" disabled={busy} onClick={() => onChoose('granted')} data-testid="consent-allow"
          className="flex-1 h-12 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-sm font-black uppercase tracking-wide disabled:opacity-50">Permitir localização</button>
        <button type="button" disabled={busy} onClick={() => onChoose('denied')} data-testid="consent-deny"
          className="flex-1 h-12 rounded-xl border border-emerald-900/60 bg-[#0d1c10] text-sm font-bold text-emerald-200 disabled:opacity-50">Não permitir</button>
      </div>
    </section>
  );
}
