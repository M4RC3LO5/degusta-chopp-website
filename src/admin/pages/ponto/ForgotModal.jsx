import React, { useState } from 'react';
import { supabase } from '../../supabase';
import Modal from '../../components/Modal';
import { Field, inputClass, primaryBtn } from '../catalog/fields';
import { FORGOT_DAYS, KINDS, KIND_LABELS, REASON_MAX, isoToLocalInput, pontoErrorMessage, validateForgot } from '../../timeTracking';

// "Lancei esquecimento": horário + motivo, só dos últimos 7 dias. Fica sinalizado no espelho.
export default function ForgotModal({ getNow, defaultKind, onClose, onDone }) {
  const [form, setForm] = useState({ kind: defaultKind || 'saida', whenLocal: isoToLocalInput(getNow()), reason: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setServerError(''); };

  const submit = async (e) => {
    e.preventDefault();
    const { errors: errs, iso, reason } = validateForgot(form, getNow());
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    const { data, error } = await supabase.rpc('lancar_esquecimento', { p_kind: form.kind, p_claimed_at: iso, p_reason: reason });
    setBusy(false);
    if (error) { setServerError(pontoErrorMessage(error)); return; }
    onDone(data);
  };

  const min = isoToLocalInput(getNow() - FORGOT_DAYS * 86400000);
  const max = isoToLocalInput(getNow());

  return (
    <Modal title="Lancei esquecimento" onClose={busy ? undefined : onClose}>
      <form onSubmit={submit} noValidate className="space-y-4" data-testid="forgot-form">
        <p className="text-xs text-emerald-200/80">Esqueceu de marcar? Informe o horário e o motivo. Vale para os últimos {FORGOT_DAYS} dias e aparece como “Esquecimento” no espelho. Depois de lançada, a marcação não pode ser editada nem apagada.</p>
        <Field id="forgot-kind" label="Marcação" error={errors.kind}>
          <select id="forgot-kind" value={form.kind} onChange={e => set('kind', e.target.value)} className={inputClass}>
            {KINDS.map(k => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
          </select>
        </Field>
        <Field id="forgot-when" label="Data e hora (horário de Brasília)" error={errors.when}>
          <input id="forgot-when" type="datetime-local" min={min} max={max} value={form.whenLocal} onChange={e => set('whenLocal', e.target.value)} className={inputClass} />
        </Field>
        <Field id="forgot-reason" label="Motivo" max={REASON_MAX} value={form.reason} error={errors.reason}>
          <textarea id="forgot-reason" rows={3} maxLength={REASON_MAX} value={form.reason} onChange={e => set('reason', e.target.value)} className={`${inputClass} h-auto py-3`} />
        </Field>
        {serverError && <p role="alert" data-testid="forgot-error" className="text-sm font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2.5">{serverError}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={onClose} disabled={busy} className="flex-1 h-12 rounded-xl border border-emerald-900/60 bg-[#0d1c10] text-sm font-bold text-emerald-200 disabled:opacity-50">Cancelar</button>
          <button type="submit" disabled={busy} data-testid="forgot-submit" className={`${primaryBtn} flex-1`}>{busy ? 'Lançando…' : 'Lançar'}</button>
        </div>
      </form>
    </Modal>
  );
}
