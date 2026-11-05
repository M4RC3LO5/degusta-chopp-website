import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Check, Circle, Clock, Coffee, FileText, LogIn, LogOut, RotateCcw } from 'lucide-react';
import { supabase, adminConfigured } from '../supabase';
import { useAuth } from '../auth/AuthContext';
import ConsentCard from './ponto/ConsentCard';
import ForgotModal from './ponto/ForgotModal';
import { consentOf, saveConsent } from './ponto/consent';
import { fetchServerOffset } from '../serverTime';
import {
  ACTION_LABELS, KIND_LABELS, TOAST_LABELS, dateShort, effectiveMs, formatHM, pendingInfo, pontoErrorMessage, spDateKey, spTime, spTimeSeconds, todayHeading, todayView
} from '../timeTracking';

const GEO_OPTIONS = { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 };
const getPosition = () => new Promise((resolve) => {
  if (!navigator.geolocation) { resolve(null); return; }
  navigator.geolocation.getCurrentPosition(
    (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
    () => resolve(null),
    GEO_OPTIONS
  );
});

const ACTION_ICONS = { entrada: LogIn, intervalo_inicio: Coffee, intervalo_fim: RotateCcw, saida: LogOut };
const STATUS = {
  expediente: { label: 'Em expediente', pill: 'bg-green-400/10 border-green-400/35 text-green-300', dot: 'bg-green-400' },
  intervalo: { label: 'Em intervalo', pill: 'bg-amber-400/10 border-amber-400/40 text-amber-300', dot: 'bg-amber-400' },
  fora: { label: 'Fora do expediente', pill: 'bg-[#0f1f12] border-[#2c4a32] text-[#cfe3d3]', dot: 'bg-[#8aa592]' }
};
const TOAST_MS = 4500;

// Etapa do dia: feita (✓ + horário) · próxima (dourado) · pendente (tracejada).
function StepItem({ step }) {
  const base = 'flex flex-col items-center gap-1.5 px-1 py-2.5 rounded-2xl';
  if (step.state === 'done') {
    return (
      <li data-testid="step" data-state="done" className={`${base} bg-green-400/10 border border-green-400/30`}>
        <Check className="w-[18px] h-[18px] text-green-400" strokeWidth={2.5} aria-hidden="true" />
        <span className="text-[11px] font-bold text-[#9fb8a5]">{step.label}</span>
        <span className="text-[15px] font-extrabold text-[#e7efe8] tabular-nums">{spTime(step.timeMs)}</span>
      </li>
    );
  }
  if (step.state === 'next') {
    return (
      <li data-testid="step" data-state="next" aria-current="step" className={`${base} bg-amber-500/10 border-[1.5px] border-amber-500`}>
        <Clock className="w-[18px] h-[18px] text-amber-400" strokeWidth={2.5} aria-hidden="true" />
        <span className="text-[11px] font-bold text-amber-400">{step.label}</span>
        <span className="text-[15px] font-extrabold text-amber-400">agora</span>
      </li>
    );
  }
  return (
    <li data-testid="step" data-state="pending" className={`${base} bg-[#0f1f12] border border-dashed border-[#2c4a32]`}>
      <Circle className="w-[18px] h-[18px] text-[#5f7d66]" aria-hidden="true" />
      <span className="text-[11px] font-bold text-[#9fb8a5]">{step.label}</span>
      <span className="text-[15px] font-extrabold text-[#5f7d66]">--:--</span>
    </li>
  );
}

export default function PontoPage() {
  const { profile, session } = useAuth();
  const canMirror = profile.role === 'dono' || profile.role === 'gerente';
  const [entries, setEntries] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [consent, setConsent] = useState(() => consentOf(session));
  const [consentBusy, setConsentBusy] = useState(false);
  const [consentError, setConsentError] = useState('');
  const [synced, setSynced] = useState(false);
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);                // { kind: 'ok' | 'error', text }
  const [forgot, setForgot] = useState(null);              // { kind, whenLocal } do modal "Esqueci de marcar"
  const [pendingHidden, setPendingHidden] = useState(false);
  const offsetRef = useRef(0);
  const toastTimer = useRef(null);
  const getNow = useCallback(() => Date.now() + offsetRef.current, []);

  const showToast = useCallback((next) => {
    clearTimeout(toastTimer.current);
    setToast(next);
    if (next && next.kind === 'ok') toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('time_entries').select('*').eq('user_id', profile.id)
      .order('recorded_at', { ascending: false }).limit(40);
    if (error) { setLoadError('Não foi possível carregar suas marcações.'); return; }
    setLoadError('');
    setEntries(data);
  }, [profile.id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    let alive = true;
    fetchServerOffset().then(o => { if (alive && o !== null) { offsetRef.current = o; setSynced(true); } });
    return () => { alive = false; };
  }, []);
  useEffect(() => { const t = setInterval(() => setTick(n => n + 1), 1000); return () => clearInterval(t); }, []);

  const choose = async (choice) => {
    setConsentBusy(true);
    setConsentError('');
    const { value, error } = await saveConsent(choice, getNow());
    setConsentBusy(false);
    if (error) { setConsentError('Não foi possível salvar sua escolha. Tente de novo.'); return; }
    setConsent(value);
  };

  // A captura da localização é a mesma de antes; o colaborador só não vê o resultado (nem distância, nem raio).
  const mark = async (kind) => {
    setBusy(true);
    showToast(null);
    const pos = consent?.choice === 'granted' ? await getPosition() : null;
    const { data, error } = await supabase.rpc('registrar_ponto', {
      p_kind: kind,
      p_lat: pos ? Number(pos.lat.toFixed(6)) : null,
      p_lng: pos ? Number(pos.lng.toFixed(6)) : null,
      p_accuracy: pos ? Number(pos.accuracy.toFixed(1)) : null
    });
    if (error) { showToast({ kind: 'error', text: pontoErrorMessage(error) }); await load(); setBusy(false); return; }
    const serverMs = Date.parse(data.recorded_at);
    offsetRef.current = serverMs - Date.now();
    setSynced(true);
    await load();   // etapas e próximo passo atualizados antes do aviso
    showToast({ kind: 'ok', text: `${TOAST_LABELS[data.kind]} às ${spTime(serverMs)}` });
    setBusy(false);
  };

  void tick;
  const nowMs = getNow();
  const today = spDateKey(nowMs);

  if (!adminConfigured) return null;
  if (!consent) {
    return (
      <section className="space-y-5">
        <h1 className="text-[26px] font-extrabold text-amber-100">Ponto</h1>
        <ConsentCard busy={consentBusy} error={consentError} onChoose={choose} />
      </section>
    );
  }

  const view = entries ? todayView(entries, nowMs) : null;
  const step = view?.step || null;
  const pending = step ? pendingInfo(step, nowMs) : null;
  const status = view ? STATUS[view.status] : null;
  const Icon = step ? ACTION_ICONS[step.suggested] : null;
  const sinceText = view?.hasMarks ? (view.status === 'fora' ? `encerrado às ${spTime(view.sinceMs)}` : `desde ${spTime(view.sinceMs)}`) : '';

  return (
    <section className="space-y-4 max-w-xl mx-auto">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-[26px] font-extrabold text-amber-100">Ponto</h1>
        <span className="text-[13px] font-semibold text-[#9fb8a5]" data-testid="today-heading">{todayHeading(today)}</span>
      </div>

      {loadError && <p role="alert" className="text-sm font-semibold text-rose-300">{loadError}</p>}
      {!entries && !loadError && <p className="text-sm text-[#9fb8a5]" role="status">Carregando…</p>}

      {pending && !pendingHidden && (
        <section aria-label="Pendência" data-testid="pending-alert" className="flex flex-col gap-3 p-4 rounded-[20px] bg-orange-400/10 border border-orange-400/45">
          <div className="flex gap-3 items-start">
            <AlertTriangle className="w-[22px] h-[22px] text-orange-400 shrink-0 mt-px" aria-hidden="true" />
            <div className="flex flex-col gap-1">
              <span className="text-[15px] font-extrabold text-orange-200">{pending.title}</span>
              <span className="text-[13px] leading-snug text-[#e7d3c2]">{pending.detail}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setForgot({ kind: pending.kind, whenLocal: pending.whenLocal })} data-testid="pending-inform"
              className="min-h-[44px] rounded-xl bg-orange-400 text-[#1f0f02] text-sm font-extrabold">Informar saída</button>
            <button type="button" onClick={() => setPendingHidden(true)} data-testid="pending-dismiss"
              className="min-h-[44px] rounded-xl bg-transparent border border-orange-400/45 text-orange-200 text-sm font-bold">Agora não</button>
          </div>
        </section>
      )}

      {view && (
        <section aria-label="Situação agora" data-testid="status-card" className="bg-[#142718] border border-[#234129] rounded-3xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <span data-testid="status-pill" className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[13px] font-bold ${status.pill}`}>
              <span className={`w-2 h-2 rounded-full ${status.dot}`} aria-hidden="true" />
              {status.label}
            </span>
            {view.hasMarks
              ? <span className="text-[13px] font-semibold text-[#9fb8a5]" data-testid="status-since">{sinceText}</span>
              : <span className="text-xl font-bold text-[#e7efe8] tabular-nums" data-testid="clock" aria-live="off">{spTimeSeconds(nowMs)}</span>}
          </div>

          {view.hasMarks ? (
            <>
              <div className="flex items-end justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold tracking-wider text-[#9fb8a5]">TRABALHADO HOJE</span>
                  <span className="text-[44px] leading-none font-extrabold text-amber-100 tabular-nums" data-testid="worked-today">{formatHM(view.workedMs)}</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs font-bold tracking-wider text-[#9fb8a5]">{synced ? 'HORA OFICIAL' : 'HORA DO APARELHO'}</span>
                  <span className="text-xl font-bold text-[#e7efe8] tabular-nums" data-testid="clock" aria-live="off">{spTimeSeconds(nowMs)}</span>
                </div>
              </div>
              <ol aria-label="Marcações de hoje" data-testid="steps" className="grid grid-cols-4 gap-2">
                {view.steps.map(s => <StepItem key={s.kind} step={s} />)}
              </ol>
            </>
          ) : (
            <p className="text-sm leading-relaxed text-[#b9cfbf]" data-testid="no-marks">Nenhuma marcação hoje. Comece pela entrada.</p>
          )}
        </section>
      )}

      {step && (
        <div className="space-y-2">
          <button type="button" onClick={() => mark(step.suggested)} disabled={busy} data-testid="mark-main"
            className="w-full min-h-[96px] rounded-3xl bg-gradient-to-b from-amber-400 to-amber-500 text-[#1a1205] flex flex-col items-center justify-center gap-1 shadow-[0_10px_30px_rgba(245,158,11,0.25)] disabled:opacity-60">
            <span className="inline-flex items-center gap-2.5 text-[22px] font-extrabold">
              <Icon className="w-6 h-6" strokeWidth={2.5} aria-hidden="true" />
              {busy ? 'Registrando…' : ACTION_LABELS[step.suggested]}
            </span>
            <span className="text-[13px] font-semibold text-[#5a3d06]" data-testid="mark-hint">Toque uma vez · registra {spTime(nowMs)}</span>
          </button>
        </div>
      )}

      <div className="flex flex-col items-center">
        {step?.alternatives.map(k => (
          <button key={k} type="button" onClick={() => mark(k)} disabled={busy} data-testid={`mark-alt-${k}`}
            className="inline-flex items-center min-h-[44px] px-3 text-sm font-bold text-amber-300 disabled:opacity-60">
            {k === 'saida' ? 'Registrar saída sem intervalo' : ACTION_LABELS[k]}
          </button>
        ))}
        <button type="button" onClick={() => setForgot({ kind: pending ? pending.kind : (step?.suggested || 'saida'), whenLocal: undefined })} data-testid="open-forgot"
          className="inline-flex items-center min-h-[44px] px-3 text-sm font-bold text-[#9fb8a5] underline underline-offset-4 hover:text-amber-300">
          Esqueci de marcar
        </button>
        {canMirror && (
          <Link to="/ponto/espelho" data-testid="link-espelho" className="inline-flex items-center gap-2 min-h-[44px] px-3 text-sm font-bold text-amber-300">
            <FileText className="w-4 h-4" aria-hidden="true" /> Espelho de ponto
          </Link>
        )}
      </div>

      {toast && (
        <div role={toast.kind === 'error' ? 'alert' : 'status'} data-testid="toast"
          className={`fixed left-4 right-4 bottom-24 z-50 mx-auto max-w-sm rounded-2xl px-4 py-3 text-sm font-bold shadow-lg flex items-center gap-2 border ${toast.kind === 'error' ? 'bg-[#2a1215] border-rose-500/50 text-rose-200' : 'bg-[#142718] border-green-400/40 text-green-200'}`}>
          {toast.kind === 'ok' ? <Check className="w-4 h-4 text-green-400 shrink-0" strokeWidth={3} aria-hidden="true" /> : <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />}
          <span className="flex-1">{toast.text}</span>
          {toast.kind === 'error' && <button type="button" onClick={() => setToast(null)} className="min-h-[44px] min-w-[44px] -my-3 -mr-2 text-xs font-bold underline">Fechar</button>}
        </div>
      )}

      {forgot && (
        <ForgotModal
          getNow={getNow}
          defaultKind={forgot.kind}
          defaultWhenLocal={forgot.whenLocal}
          onClose={() => setForgot(null)}
          onDone={async (row) => {
            setForgot(null);
            await load();
            showToast({ kind: 'ok', text: `${KIND_LABELS[row.kind]} lançada: ${dateShort(spDateKey(effectiveMs(row)))} às ${spTime(effectiveMs(row))}` });
          }}
        />
      )}
    </section>
  );
}
