import React from 'react';
import { RULES } from '../../rules';

export const inputClass = 'w-full h-12 px-4 rounded-xl bg-[#0d1c10] border border-emerald-900/60 text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400';
export const primaryBtn = 'h-12 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black uppercase tracking-wide shadow-gold-glow disabled:opacity-50 disabled:shadow-none';

// Contador n/max: âmbar a partir de 90% do limite.
export function Counter({ value, max, testId }) {
  const n = String(value ?? '').length;
  const warn = n >= max * RULES.offer.subtitleWarnAt;
  return <span data-testid={testId} className={`text-xs ${warn ? 'text-amber-300 font-bold' : 'text-emerald-200/60'}`}>{n}/{max}</span>;
}

export function Field({ id, label, max, value, error, hint, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-end justify-between gap-3">
        <label htmlFor={id} className="text-xs font-bold uppercase tracking-wider text-amber-400">{label}</label>
        {max ? <Counter value={value} max={max} testId={`${id}-counter`} /> : null}
      </div>
      {children}
      {error ? <p role="alert" className="text-xs font-semibold text-rose-300">{error}</p> : hint ? <p className="text-xs text-emerald-200/60">{hint}</p> : null}
    </div>
  );
}

export function Switch({ checked, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className="min-h-[44px] flex items-center gap-2">
      <span className={`relative inline-block w-12 h-7 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-slate-600'}`}>
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
      <span className="text-xs font-bold text-emerald-100/90">{checked ? 'Ativa' : 'Inativa'}</span>
    </button>
  );
}
