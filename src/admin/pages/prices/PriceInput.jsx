import React from 'react';
import { finalizePriceText, maskPriceInput } from '../../pricing';

// Campo de preço com máscara BRL: teclado numérico (decimal), vírgula para centavos, vazio = indisponível.
export default function PriceInput({ id, label, value, onChange, error, disabled }) {
  const errorId = `${id}-error`;
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-1 lg:sr-only">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-emerald-300 pointer-events-none">R$</span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="—"
          disabled={disabled}
          value={value}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => onChange(maskPriceInput(e.target.value))}
          onBlur={() => onChange(finalizePriceText(value))}
          className={`w-full h-11 pl-9 pr-2 rounded-xl bg-[#0d1c10] border text-slate-100 text-right font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50 ${error ? 'border-rose-500/70' : 'border-emerald-900/60'}`}
        />
      </div>
      {error && <p id={errorId} role="alert" className="text-xs font-semibold text-rose-300 mt-1">{error}</p>}
    </div>
  );
}
