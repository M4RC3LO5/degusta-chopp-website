import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Clock, FileText, MapPin } from 'lucide-react';
import { supabase, adminConfigured } from '../supabase';
import { useAuth } from '../auth/AuthContext';
import ConsentCard from './ponto/ConsentCard';
import ForgotModal from './ponto/ForgotModal';
import {
  KIND_LABELS, dateLabel, dateShort, effectiveMs, entryFlags, flagText, nextStep, pontoErrorMessage, sortEntries, spDateKey, spTime, spTimeSeconds, FLAG_LABELS
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

// Hora do servidor: o cabeçalho Date da resposta do Supabase (o /rest/v1 expõe Date no CORS; o /auth/v1 não) (o relógio do aparelho não conta).
async function fetchServerOffset() {
  try {
    const t0 = Date.now();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/settings?select=id&limit=1`, { headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY } });
    const header = res.headers.get('date');
    if (!header) return null;
    const rtt = Date.now() - t0;
    return Date.parse(header) + rtt / 2 + 500 - Date.now();   // Date tem precisão de 1 s: +0,5 s centraliza o erro
  } catch { return null; }
}

const consentOf = (session) => session?.user?.user_metadata?.ponto_geo || null;

export default function PontoPage() {
  const { profile, session } = useAuth();
  const canMirror = profile.role === 'dono' || profile.role === 'gerente';
  const [entries, setEntries] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [consent, setConsent] = useState(() => consentOf(session));
  const [consentBusy, setConsentBusy] = useState(false);
  const [consentError, setConsentError] = useState('');
  const [editConsent, setEditConsent] = useState(false);
  const [synced, setSynced] = useState(false);
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);      // { kind: 'ok' | 'error', text, detail }
  const [forgot, setForgot] = useState(null);      // kind padrão do modal
  const offsetRef = useRef(0);
  const getNow = useCallback(() => Date.now() + offsetRef.current, []);

  const applyOffset = useCallback((value) => { offsetRef.current = value; }, []);

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
    fetchServerOffset().then(o => { if (alive && o !== null) { applyOffset(o); setSynced(true); } });
    return () => { alive = false; };
  }, [applyOffset]);
  useEffect(() => { const t = setInterval(() => setTick(n => n + 1), 1000); return () => clearInterval(t); }, []);

  const choose = async (choice) => {
    setConsentBusy(true);
    setConsentError('');
    const value = { v: 1, choice, at: new Date(getNow()).toISOString() };
    const { error } = await supabase.auth.updateUser({ data: { ponto_geo: value } });
    setConsentBusy(false);
    if (error) { setConsentError('Não foi possível salvar sua escolha. Tente de novo.'); return; }
    setConsent(value);
    setEditConsent(false);
  };

  const mark = async (kind) => {
    setBusy(true);
    setResult(null);
    const pos = consent?.choice === 'granted' ? await getPosition() : null;
    const { data, error } = await supabase.rpc('registrar_ponto', {
      p_kind: kind,
      p_lat: pos ? Number(pos.lat.toFixed(6)) : null,
      p_lng: pos ? Number(pos.lng.toFixed(6)) : null,
      p_accuracy: pos ? Number(pos.accuracy.toFixed(1)) : null
    });
    if (error) { setResult({ kind: 'error', text: pontoErrorMessage(error) }); await load(); setBusy(false); return; }
    const serverMs = Date.parse(data.recorded_at);
    applyOffset(serverMs - Date.now());
    setSynced(true);
    const skew = Math.abs(Date.now() - serverMs);
    const flags = entryFlags(data);
    await load();   // lista e próximo passo atualizados antes de mostrar o resultado
    setResult({
      kind: 'ok',
      text: `${KIND_LABELS[data.kind]} registrada às ${spTimeSeconds(serverMs)}.`,
      detail: [
        'Hora do servidor.',
        skew > 60000 ? 'O relógio do seu aparelho está diferente; vale a hora do servidor.' : '',
        flags.length ? `Marcação sinalizada: ${flagText(data)}.` : ''
      ].filter(Boolean).join(' ')
    });
    setBusy(false);
  };

  void tick;
  const nowMs = getNow();
  const today = spDateKey(nowMs);

  if (!adminConfigured) return null;
  if (!consent || editConsent) {
    return (
      <section className="space-y-5">
        <h1 className="text-xl font-extrabold text-amber-300">Ponto</h1>
        <ConsentCard busy={consentBusy} error={consentError} onChoose={choose} />
        {editConsent && <button type="button" onClick={() => setEditConsent(false)} className="text-xs font-bold text-emerald-200 underline min-h-[44px]">Voltar sem mudar</button>}
      </section>
    );
  }

  const sorted = entries ? sortEntries(entries) : [];
  const step = entries ? nextStep(entries, nowMs) : null;
  const todays = sorted.filter(e => spDateKey(effectiveMs(e)) === today);
  const before = sorted.filter(e => !todays.includes(e)).slice(-1)[0] || null;
  const granted = consent.choice === 'granted';

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold text-amber-300">Ponto</h1>
        {canMirror && (
          <Link to="/ponto/espelho" data-testid="link-espelho" className="min-h-[44px] px-4 rounded-xl border border-amber-500/40 bg-[#142718] text-xs font-bold text-amber-300 flex items-center gap-2">
            <FileText className="w-4 h-4" /> Espelho de ponto
          </Link>
        )}
      </div>

      <div className="rounded-3xl bg-[#142718] border border-emerald-900/60 p-5 text-center space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-200/70">{dateLabel(today)}</p>
        <p className="text-5xl font-black text-slate-100 tabular-nums" data-testid="clock" aria-live="off">{spTimeSeconds(nowMs)}</p>
        <p className="text-xs text-emerald-200/70" data-testid="clock-source">
          {synced ? 'Hora do servidor (Brasília)' : 'Hora do aparelho; a marcação usa sempre a hora do servidor'}
        </p>
      </div>

      {loadError && <p role="alert" className="text-sm font-semibold text-rose-300">{loadError}</p>}
      {!entries && !loadError && <p className="text-sm text-emerald-200/70" role="status">Carregando…</p>}

      {step?.openFrom && (
        <p role="status" data-testid="open-day" className="text-sm font-semibold text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2.5">
          Falta a saída de {dateLabel(step.openFrom)}. Marque a Entrada de hoje; se quiser completar o dia anterior, use “Lancei esquecimento” (até 7 dias).
        </p>
      )}

      {step && (
        <div className="space-y-3">
          <button type="button" onClick={() => mark(step.suggested)} disabled={busy} data-testid="mark-main"
            className="w-full min-h-[88px] rounded-3xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-xl font-black uppercase tracking-wide shadow-gold-glow disabled:opacity-60 flex items-center justify-center gap-3">
            <Clock className="w-7 h-7" /> {busy ? 'Registrando…' : KIND_LABELS[step.suggested]}
          </button>
          {step.alternatives.map(k => (
            <button key={k} type="button" onClick={() => mark(k)} disabled={busy} data-testid={`mark-alt-${k}`}
              className="w-full min-h-[56px] rounded-2xl border border-amber-500/40 bg-[#142718] text-sm font-bold text-amber-300 disabled:opacity-60">
              {KIND_LABELS[k]}
            </button>
          ))}
          <p className="text-xs text-center text-emerald-200/70 flex items-center justify-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            {granted ? 'A localização será capturada ao tocar.' : 'Sem localização: a marcação é aceita e fica sinalizada.'}
            {' '}
            <button type="button" onClick={() => setEditConsent(true)} data-testid="change-consent" className="underline font-bold min-h-[44px]">Alterar</button>
          </p>
        </div>
      )}

      {result && (
        <div role={result.kind === 'error' ? 'alert' : 'status'} data-testid="mark-result"
          className={`rounded-xl px-3 py-2.5 border text-sm font-semibold ${result.kind === 'error' ? 'text-rose-300 bg-rose-500/10 border-rose-500/30' : 'text-emerald-200 bg-emerald-500/10 border-emerald-500/30'}`}>
          <p>{result.text}</p>
          {result.detail && <p className="text-xs font-normal mt-1 opacity-90">{result.detail}</p>}
        </div>
      )}

      <div className="rounded-2xl bg-[#142718] border border-emerald-900/60 p-4 space-y-2">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5"><ClipboardList className="w-4 h-4" /> Marcações de hoje</h2>
        {entries && todays.length === 0 && <p className="text-sm text-emerald-200/70" data-testid="today-empty">Nenhuma marcação hoje.</p>}
        <ul className="space-y-1.5" data-testid="today-list">
          {todays.map(e => (
            <li key={e.id} className="flex items-center justify-between gap-3 text-sm" data-testid="today-item">
              <span className="font-bold text-slate-100">{KIND_LABELS[e.kind]}</span>
              <span className="flex items-center gap-2 min-w-0">
                {entryFlags(e).map(f => <span key={f} className="text-[11px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-full px-2 py-0.5">{FLAG_LABELS[f]}</span>)}
                <span className="tabular-nums text-emerald-100/90">{spTime(effectiveMs(e))}</span>
              </span>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setForgot(step?.suggested || 'saida')} data-testid="open-forgot"
          className="w-full min-h-[48px] mt-2 rounded-xl border border-emerald-900/60 bg-[#0d1c10] text-sm font-bold text-emerald-200 hover:text-amber-300">
          Lancei esquecimento
        </button>
        {before && (
          <p className="text-xs text-emerald-200/60">Última marcação anterior: {KIND_LABELS[before.kind]} em {dateShort(spDateKey(effectiveMs(before)))} às {spTime(effectiveMs(before))}.</p>
        )}
      </div>

      {forgot && (
        <ForgotModal
          getNow={getNow}
          defaultKind={forgot}
          onClose={() => setForgot(null)}
          onDone={async (row) => {
            setForgot(null);
            await load();
            setResult({ kind: 'ok', text: `${KIND_LABELS[row.kind]} lançada como esquecimento (${dateShort(spDateKey(effectiveMs(row)))} ${spTime(effectiveMs(row))}).`, detail: 'Fica sinalizada como “Esquecimento” no espelho.' });
          }}
        />
      )}
    </section>
  );
}
