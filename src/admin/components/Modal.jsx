import React, { useEffect, useRef } from 'react';

// Modal simples e acessível: fecha no Esc e ao tocar fora (quando `onClose` é dado).
export default function Modal({ title, onClose, children, labelledBy = 'modal-title' }) {
  const ref = useRef(null);
  // onClose muda a cada render do pai (ex.: o relógio do Ponto re-renderiza a cada 1 s).
  // Guardar em ref evita re-executar o efeito, que roubava o foco e fechava selects/date pickers abertos.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Foco no diálogo só ao abrir.
  useEffect(() => { ref.current?.focus(); }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && onCloseRef.current) onCloseRef.current(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-[#0a160d]/85 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="relative w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#142718] border border-amber-500/30 shadow-neu-gold p-5 sm:p-6 focus:outline-none"
      >
        <h2 id={labelledBy} className="text-base font-extrabold text-amber-300 mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmLabel, danger = false, busy = false, error = '', onConfirm, onCancel }) {
  return (
    <Modal title={title} onClose={busy ? undefined : onCancel} labelledBy="confirm-title">
      <p className="text-sm text-emerald-100/90 mb-4">{message}</p>
      {error && <p role="alert" className="text-sm font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2.5 mb-4">{error}</p>}
      <div className="flex gap-3">
        <button type="button" onClick={onCancel} disabled={busy} className="flex-1 h-12 rounded-xl border border-emerald-900/60 bg-[#0d1c10] text-sm font-bold text-emerald-200 disabled:opacity-50">
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={`flex-1 h-12 rounded-xl text-sm font-black uppercase tracking-wide disabled:opacity-50 ${danger ? 'bg-rose-500 text-slate-950' : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950'}`}
        >
          {busy ? 'Aguarde…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
