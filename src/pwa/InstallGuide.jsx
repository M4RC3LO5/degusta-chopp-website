import React, { useEffect } from 'react';
import { X, Plus } from 'lucide-react';

// Guia de 2 passos quando o navegador não libera o prompt nativo: iPhone/iPad (sempre), Android e computador (às vezes).
function ShareIcon({ className = 'w-6 h-6' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 15V3M8 7l4-4 4 4" />
      <path d="M7 11H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1" />
    </svg>
  );
}

function DotsIcon({ className = 'w-6 h-6' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
    </svg>
  );
}

const COPY = {
  ios: {
    title: (app) => `Instalar ${app} no iPhone`,
    intro: 'Abra esta página no Safari e siga os 2 passos:',
    s1: <>Toque em <span className="text-amber-300">Compartilhar</span></>,
    s1hint: 'O ícone fica na barra inferior do Safari (no iPad, no alto da tela).',
    s2: <>Escolha <span className="text-amber-300">Adicionar à Tela de Início</span></>,
    s2hint: 'Role o menu para baixo, se precisar, e toque em “Adicionar”.',
    s2label: 'Adicionar à Tela de Início'
  },
  android: {
    title: (app) => `Instalar ${app} no Android`,
    intro: 'No Chrome, siga os 2 passos:',
    s1: <>Toque no menu <span className="text-amber-300">⋮</span></>,
    s1hint: 'Os três pontinhos no canto superior direito do Chrome.',
    s2: <>Escolha <span className="text-amber-300">Instalar app</span></>,
    s2hint: 'Em alguns celulares aparece “Adicionar à tela inicial” → “Instalar”. Se já estiver instalado, abra pelo ícone na tela de aplicativos.',
    s2label: 'Instalar app'
  },
  desktop: {
    title: (app) => `Instalar ${app} no computador`,
    intro: 'No Chrome ou no Edge, siga os 2 passos:',
    s1: <>Abra o menu <span className="text-amber-300">⋮</span> do navegador</>,
    s1hint: 'Ou clique no ícone de instalar, no fim da barra de endereço.',
    s2: <>Escolha <span className="text-amber-300">Instalar</span></>,
    s2hint: 'No Chrome: “Transmitir, salvar e compartilhar” → “Instalar página como app”. O atalho vai para a área de trabalho.',
    s2label: 'Instalar'
  }
};

export default function InstallGuide({ appName, variant = 'ios', onClose, onDismiss }) {
  const c = COPY[variant] || COPY.ios;
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-[#0a160d]/60 backdrop-blur-[2px] p-3" role="dialog" aria-modal="true" aria-labelledby="install-guide-title" onClick={onClose}>
      <div className="relative w-full max-w-sm rounded-3xl bg-[#142718] border border-amber-500/30 shadow-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-slate-100" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} aria-label="Fechar" className="absolute right-2 top-2 h-11 w-11 flex items-center justify-center text-emerald-200 hover:text-amber-300">
          <X className="w-5 h-5" />
        </button>
        <h2 id="install-guide-title" className="text-lg font-extrabold text-amber-300 pr-10">{c.title(appName)}</h2>
        <p className="text-xs text-emerald-200/80 mt-1">{c.intro}</p>

        <ol className="mt-4 space-y-4">
          <li className="flex gap-3">
            <span className="h-7 w-7 shrink-0 rounded-full bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center">1</span>
            <div className="min-w-0">
              <p className="text-sm font-bold">{c.s1}</p>
              <p className="text-xs text-emerald-200/80 mt-0.5">{c.s1hint}</p>
              {variant === 'ios' ? (
              /* Ilustração: barra inferior do Safari com o ícone de Compartilhar destacado */
              <div className="mt-2 rounded-xl bg-[#0d1c10] border border-emerald-900/60 px-3 py-2.5 flex items-center justify-around text-emerald-200/60" aria-hidden="true">
                <span className="text-lg leading-none">‹</span>
                <span className="text-lg leading-none">›</span>
                <span className="relative flex items-center justify-center h-9 w-9 rounded-lg bg-amber-500/15 ring-2 ring-amber-400 text-amber-300 animate-pulse">
                  <ShareIcon />
                </span>
                <span className="w-5 h-5 border-2 border-current rounded-[4px]" />
                <span className="w-5 h-5 border-2 border-current rounded-[4px] opacity-70" />
              </div>
              ) : (
              /* Ilustração: barra de endereço do Chrome com o menu ⋮ destacado */
              <div className="mt-2 rounded-xl bg-[#0d1c10] border border-emerald-900/60 px-3 py-2.5 flex items-center gap-2 text-emerald-200/60" aria-hidden="true">
                <span className="flex-1 h-7 rounded-full bg-[#142718] border border-emerald-900/60 px-3 text-[11px] flex items-center truncate">degusta…</span>
                <span className="flex items-center justify-center h-9 w-9 rounded-lg bg-amber-500/15 ring-2 ring-amber-400 text-amber-300 animate-pulse">
                  <DotsIcon className="w-5 h-5" />
                </span>
              </div>
              )}
            </div>
          </li>
          <li className="flex gap-3">
            <span className="h-7 w-7 shrink-0 rounded-full bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center">2</span>
            <div className="min-w-0">
              <p className="text-sm font-bold">{c.s2}</p>
              <p className="text-xs text-emerald-200/80 mt-0.5">{c.s2hint}</p>
              <div className="mt-2 rounded-xl bg-[#0d1c10] border border-emerald-900/60 px-3 py-2.5 flex items-center justify-between text-sm" aria-hidden="true">
                <span className="font-semibold text-slate-100">{c.s2label}</span>
                <span className="h-7 w-7 rounded-md border-2 border-amber-400 text-amber-300 flex items-center justify-center"><Plus className="w-4 h-4" /></span>
              </div>
            </div>
          </li>
        </ol>

        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onDismiss} className="flex-1 h-12 rounded-xl border border-emerald-900/60 bg-[#0d1c10] text-sm font-bold text-emerald-200 hover:text-amber-300">Agora não</button>
          <button type="button" onClick={onClose} className="flex-1 h-12 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-sm font-black">Entendi</button>
        </div>
      </div>
    </div>
  );
}
