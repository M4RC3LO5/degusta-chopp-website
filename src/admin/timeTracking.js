import { monthStartIso, nextMonthStartIso, csvCell, CSV_SEPARATOR } from './retention.js';

// Ponto dos colaboradores (Card 11). Funções puras, testadas em timeTracking.test.js.
// Fuso fixo de São Paulo (UTC-3, sem horário de verão), o mesmo de retention.js e das RPCs.
// Controle interno: não substitui ponto certificado (REP-P / Portaria 671).

export const SP_OFFSET_MS = -3 * 3600 * 1000;
export const FORGOT_DAYS = 7;
export const REASON_MAX = 120;
export const REASON_MIN = 3;

export const KINDS = ['entrada', 'intervalo_inicio', 'intervalo_fim', 'saida'];
export const KIND_LABELS = {
  entrada: 'Entrada',
  intervalo_inicio: 'Início do intervalo',
  intervalo_fim: 'Fim do intervalo',
  saida: 'Saída'
};
export const FLAG_LABELS = { esquecimento: 'Esquecimento', fora_raio: 'Fora do raio', sem_localizacao: 'Sem localização' };

// ---------- Tempo (São Paulo) ----------
const sp = (ms) => new Date(ms + SP_OFFSET_MS);
const p2 = (n) => String(n).padStart(2, '0');
export const effectiveMs = (e) => Date.parse(e.claimed_at || e.recorded_at);
export const spDateKey = (ms) => { const d = sp(ms); return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`; };
export const spMonthKey = (ms) => spDateKey(ms).slice(0, 7);
export const spTime = (ms) => { const d = sp(ms); return `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`; };
export const spTimeSeconds = (ms) => { const d = sp(ms); return `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}`; };
export const dateLabel = (key) => `${key.slice(8, 10)}/${key.slice(5, 7)}/${key.slice(0, 4)}`;
export const dateShort = (key) => `${key.slice(8, 10)}/${key.slice(5, 7)}`;
const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const weekdayLabel = (key) => WEEKDAYS[new Date(`${key}T12:00:00-03:00`).getUTCDay()];
export const monthKeyLabel = (key) => `${key.slice(5, 7)}/${key.slice(0, 4)}`;

// "8h05" (minutos truncados). Negativo vira 0.
export function formatDuration(ms) {
  const mins = Math.max(0, Math.floor(ms / 60000));
  return `${Math.floor(mins / 60)}h${p2(mins % 60)}`;
}

// Valor do <input type="datetime-local"> ("2026-11-04T08:30") interpretado como horário de São Paulo -> ISO.
export function localInputToIso(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value || '')) return null;
  const ms = Date.parse(`${value}:00-03:00`);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}
export const isoToLocalInput = (ms) => `${spDateKey(ms)}T${spTime(ms)}`;

// ---------- Sequência ----------
// Espelha public._time_next_ok() (0006_time_tracking.sql).
export function allowedNext(prev) {
  if (!prev || prev === 'saida') return ['entrada'];
  if (prev === 'entrada') return ['intervalo_inicio', 'saida'];
  if (prev === 'intervalo_inicio') return ['intervalo_fim'];
  if (prev === 'intervalo_fim') return ['saida'];
  return [];
}

export const sortEntries = (entries) => [...entries].sort((a, b) => effectiveMs(a) - effectiveMs(b) || a.id - b.id);

// Estado do botão grande: próximo passo sugerido, e aviso se o dia anterior ficou em aberto.
// `nowMs` = hora do servidor (estimada).
export function nextStep(entries, nowMs) {
  const sorted = sortEntries(entries);
  const last = sorted[sorted.length - 1] || null;
  if (!last) return { last: null, suggested: 'entrada', alternatives: [], openFrom: null };
  const openFromPast = last.kind !== 'saida' && spDateKey(effectiveMs(last)) < spDateKey(nowMs);
  if (openFromPast) return { last, suggested: 'entrada', alternatives: [], openFrom: spDateKey(effectiveMs(last)) };
  const [suggested, ...alternatives] = allowedNext(last.kind);
  return { last, suggested, alternatives, openFrom: null };
}

export function entryFlags(e) {
  if (e.source === 'esquecimento') return ['esquecimento'];
  if (e.within_radius === false) return ['fora_raio'];
  if (e.within_radius === null || e.within_radius === undefined) return ['sem_localizacao'];
  return [];
}

export function flagText(e) {
  const f = entryFlags(e)[0];
  if (!f) return '';
  if (f === 'fora_raio') return `${FLAG_LABELS[f]} (${e.distance_m} m da loja${e.accuracy_m != null ? `, precisão ±${Math.round(e.accuracy_m)} m` : ''})`;
  if (f === 'esquecimento') return `${FLAG_LABELS[f]}: ${e.reason}`;
  return FLAG_LABELS[f];
}

// ---------- Espelho mensal ----------
// Intervalo de busca no banco: recorded_at nunca é anterior ao horário efetivo, e o esquecimento
// é lançado em até 7 dias; então as marcações do mês estão em [início do mês, início do próximo + 8 dias).
export function mirrorFetchRange(monthKey) {
  const from = monthStartIso(`${monthKey}-01`);
  const to = new Date(Date.parse(nextMonthStartIso(`${monthKey}-01`)) + (FORGOT_DAYS + 1) * 86400000).toISOString();
  return { from, to };
}

// Um dia: entrada abre o turno, início do intervalo fecha o trecho trabalhado, fim do intervalo reabre, saída fecha.
function dayTotals(sorted) {
  let open = null;       // início do trecho trabalhado em andamento
  let breakStart = null;
  let worked = 0;
  let pause = 0;
  for (const e of sorted) {
    const t = effectiveMs(e);
    if (e.kind === 'entrada') open = t;
    else if (e.kind === 'intervalo_inicio') { if (open !== null) { worked += t - open; open = null; } breakStart = t; }
    else if (e.kind === 'intervalo_fim') { if (breakStart !== null) { pause += t - breakStart; breakStart = null; } open = t; }
    else if (e.kind === 'saida') { if (open !== null) { worked += t - open; open = null; } breakStart = null; }
  }
  const last = sorted[sorted.length - 1];
  return { workedMs: worked, breakMs: pause, incomplete: !last || last.kind !== 'saida' };
}

export function buildMirror(entries, monthKey) {
  const inMonth = sortEntries(entries).filter(e => spMonthKey(effectiveMs(e)) === monthKey);
  const byDay = new Map();
  for (const e of inMonth) {
    const key = spDateKey(effectiveMs(e));
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(e);
  }
  const days = [...byDay.entries()].map(([date, list]) => ({ date, entries: list, ...dayTotals(list), flagged: list.filter(e => entryFlags(e).length) }));
  const flaggedEntries = inMonth.filter(e => entryFlags(e).length);
  return {
    month: monthKey,
    days,
    flagged: flaggedEntries,
    totals: {
      workedMs: days.reduce((n, d) => n + d.workedMs, 0),
      breakMs: days.reduce((n, d) => n + d.breakMs, 0),
      days: days.length,
      incompleteDays: days.filter(d => d.incomplete).length,
      flagged: flaggedEntries.length
    }
  };
}

// ---------- Redesenho (Card 13): visão do dia, linha do tempo, ocorrências ----------
// Formato de tela "3h 18" (CSV/PDF continuam com formatDuration: "3h18").
export function formatHM(ms) {
  const mins = Math.max(0, Math.floor(ms / 60000));
  return `${Math.floor(mins / 60)}h ${p2(mins % 60)}`;
}

const WEEKDAYS_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const dayOfWeek = (key) => new Date(`${key}T12:00:00-03:00`).getUTCDay();
export const weekdayFullLabel = (key) => WEEKDAYS_FULL[dayOfWeek(key)];
// "qui, 5 de novembro"
export const todayHeading = (key) => `${weekdayLabel(key)}, ${Number(key.slice(8, 10))} de ${MONTHS[Number(key.slice(5, 7)) - 1]}`;
// "Novembro de 2026"
export const monthLongLabel = (monthKey) => { const m = MONTHS[Number(monthKey.slice(5, 7)) - 1]; return `${m[0].toUpperCase()}${m.slice(1)} de ${monthKey.slice(0, 4)}`; };
export function shiftMonth(monthKey, delta) {
  const idx = Number(monthKey.slice(0, 4)) * 12 + Number(monthKey.slice(5, 7)) - 1 + delta;
  return `${Math.floor(idx / 12)}-${p2((idx % 12) + 1)}`;
}
export const previousDayKey = (key) => spDateKey(Date.parse(`${key}T12:00:00-03:00`) - 86400000);
const dayStartMs = (key) => Date.parse(`${key}T00:00:00-03:00`);

// Rótulos de toast, da pessoa que marca (sem localização/distância).
export const TOAST_LABELS = { entrada: 'Entrada registrada', intervalo_inicio: 'Intervalo iniciado', intervalo_fim: 'Retorno registrado', saida: 'Saída registrada' };
// Botão grande: a PRÓXIMA ação.
export const ACTION_LABELS = { entrada: 'Registrar entrada', intervalo_inicio: 'Iniciar intervalo', intervalo_fim: 'Voltar do intervalo', saida: 'Registrar saída' };
// Etapas do dia, na ordem.
export const STEP_LABELS = { entrada: 'Entrada', intervalo_inicio: 'Intervalo', intervalo_fim: 'Retorno', saida: 'Saída' };

export const OPEN_STUB_MS = 90 * 60000;   // trecho sem fim conhecido (dia passado sem Saída): só um "toco" visual na linha do tempo

// Trechos trabalhados de um dia, a partir das marcações ordenadas. `nowMs` = hora do servidor.
// kind: 'ok' (fechado) · 'live' (em andamento, hoje) · 'warn' (aberto num dia que já passou: sem Saída).
// liveMs soma o trecho em andamento de hoje; workedMs só os trechos fechados (o mesmo cálculo do CSV/PDF).
export function dayTimeline(entries, dayKey, nowMs) {
  const sorted = sortEntries(entries);
  const segments = [];
  let open = null;
  for (const e of sorted) {
    const t = effectiveMs(e);
    if (e.kind === 'entrada' || e.kind === 'intervalo_fim') open = t;
    else if ((e.kind === 'intervalo_inicio' || e.kind === 'saida') && open !== null) { segments.push({ startMs: open, endMs: t, kind: 'ok' }); open = null; }
  }
  const today = spDateKey(nowMs) === dayKey;
  let liveMs = segments.reduce((n, s) => n + (s.endMs - s.startMs), 0);
  const workedMs = liveMs;
  if (open !== null) {
    if (today) { const end = Math.max(open, nowMs); segments.push({ startMs: open, endMs: end, kind: 'live' }); liveMs += end - open; }
    else segments.push({ startMs: open, endMs: open + OPEN_STUB_MS, kind: 'warn' });
  }
  return { segments, workedMs, liveMs, hasOpen: open !== null, today };
}

// Janela da linha do tempo: 06h–24h. Devolve { left, width } em % (cortado nas pontas).
export function barGeometry(seg, dayKey) {
  const base = dayStartMs(dayKey);
  const s = Math.max(6, (seg.startMs - base) / 3600000);
  const e = Math.min(24, (seg.endMs - base) / 3600000);
  if (e <= s) return null;
  return { left: ((s - 6) / 18) * 100, width: ((e - s) / 18) * 100 };
}

export function formatDistance(m) {
  const n = Number(m);
  if (!Number.isFinite(n)) return '';
  if (n < 1000) return `${Math.round(n)} m`;
  const km = n / 1000;
  return `${km < 10 ? km.toFixed(1).replace('.', ',') : Math.round(km)} km`;
}

// Pares de intervalo do dia: [{ start, end|null }]
export function dayBreaks(entries) {
  const out = [];
  for (const e of sortEntries(entries)) {
    if (e.kind === 'intervalo_inicio') out.push({ startMs: effectiveMs(e), endMs: null });
    else if (e.kind === 'intervalo_fim' && out.length && out[out.length - 1].endMs === null) out[out.length - 1].endMs = effectiveMs(e);
  }
  return out;
}

// Ocorrências do dia (etiquetas no espelho): sem saída, fora do raio (com distância), sem localização, esquecimento (com o motivo).
// tone: 'warn' (laranja) · 'info' (azul).
export function dayOccurrences(entries, dayKey, nowMs) {
  const sorted = sortEntries(entries);
  const out = [];
  const last = sorted[sorted.length - 1];
  const today = spDateKey(nowMs) === dayKey;
  if (last && last.kind !== 'saida' && !today) out.push({ key: 'sem_saida', tone: 'warn', text: 'Sem saída' });
  for (const e of sorted) {
    const f = entryFlags(e)[0];
    if (f === 'esquecimento') out.push({ key: `esq-${e.id}`, tone: 'info', text: `Esquecimento (${KIND_LABELS[e.kind]}): “${e.reason}”` });
    else if (f === 'fora_raio') out.push({ key: `raio-${e.id}`, tone: 'warn', text: `${KIND_LABELS[e.kind]} a ${formatDistance(e.distance_m)} da loja` });
    else if (f === 'sem_localizacao') out.push({ key: `loc-${e.id}`, tone: 'warn', text: `${KIND_LABELS[e.kind]} sem localização` });
  }
  return out;
}

// Dia do espelho com tudo que a tela precisa.
export function analyzeDay(day, nowMs) {
  const tl = dayTimeline(day.entries, day.date, nowMs);
  const occurrences = dayOccurrences(day.entries, day.date, nowMs);
  const state = !day.incomplete ? 'completo' : (tl.today ? 'andamento' : 'sem_saida');
  const locFlagged = new Set(day.entries.filter(e => ['fora_raio', 'sem_localizacao'].includes(entryFlags(e)[0])).map(e => e.id));
  const marks = KINDS.map(kind => ({
    kind,
    items: day.entries.filter(e => e.kind === kind).map(e => ({ time: spTime(effectiveMs(e)), forgot: e.source === 'esquecimento', loc: locFlagged.has(e.id) }))
  }));
  return {
    date: day.date, today: tl.today, state, segments: tl.segments, workedMs: tl.workedMs, liveMs: tl.liveMs,
    breakMs: day.breakMs, breaks: dayBreaks(day.entries), marks, occurrences
  };
}

export const FILTERS = ['todos', 'conferir', 'incompletos'];
export function filterDays(days, filter) {
  if (filter === 'conferir') return days.filter(d => d.occurrences.length > 0);
  if (filter === 'incompletos') return days.filter(d => d.state === 'sem_saida');
  return days;
}

const roundMin = (ms) => Math.round(ms / 60000) * 60000;

// Totais do topo. "Dia completo" = dia com Saída. Horas no mês inclui o que está em andamento hoje.
export function mirrorSummary(days) {
  const complete = days.filter(d => d.state === 'completo');
  const withBreak = complete.filter(d => d.breakMs > 0);
  const sum = (list, f) => list.reduce((n, d) => n + f(d), 0);
  return {
    workedMs: sum(days, d => d.liveMs),
    // médias arredondadas ao minuto mais próximo (os totais truncam)
    avgDayMs: complete.length ? roundMin(sum(complete, d => d.workedMs) / complete.length) : null,
    avgBreakMs: withBreak.length ? roundMin(sum(withBreak, d => d.breakMs) / withBreak.length) : null,
    toCheck: sum(days, d => d.occurrences.length),
    incomplete: days.filter(d => d.state === 'sem_saida').length
  };
}

// Dias do espelho do mais recente para o mais antigo.
export const newestFirst = (days) => [...days].sort((a, b) => (a.date < b.date ? 1 : -1));

// ---------- Tela do Ponto (colaborador) ----------
// Situação agora + etapas do dia. `entries` = todas as marcações da pessoa (as mais recentes).
export function todayView(entries, nowMs) {
  const sorted = sortEntries(entries);
  const today = spDateKey(nowMs);
  const todays = sorted.filter(e => spDateKey(effectiveMs(e)) === today);
  const step = nextStep(entries, nowMs);
  if (todays.length === 0) return { status: 'fora', sinceMs: null, hasMarks: false, workedMs: 0, steps: [], step, todays };
  const last = todays[todays.length - 1];
  const status = last.kind === 'saida' ? 'fora' : last.kind === 'intervalo_inicio' ? 'intervalo' : 'expediente';
  // Etapas: o ciclo mais recente do dia (a partir da última Entrada).
  let from = 0;
  for (let i = todays.length - 1; i >= 0; i -= 1) if (todays[i].kind === 'entrada') { from = i; break; }
  const cycle = todays.slice(from);
  const nextKind = last.kind === 'saida' ? null : step.suggested;
  const steps = KINDS.map(kind => {
    const hit = cycle.filter(e => e.kind === kind).slice(-1)[0];
    return { kind, label: STEP_LABELS[kind], timeMs: hit ? effectiveMs(hit) : null, state: hit ? 'done' : (kind === nextKind ? 'next' : 'pending') };
  });
  const tl = dayTimeline(todays, today, nowMs);
  return { status, sinceMs: effectiveMs(last), hasMarks: true, workedMs: tl.liveMs, steps, step, todays };
}

// Dia anterior sem Saída: texto do alerta e padrão do "Informar saída".
export function pendingInfo(step, nowMs) {
  if (!step?.openFrom || !step.last) return null;
  const day = step.openFrom;
  const lastMs = effectiveMs(step.last);
  const title = day === previousDayKey(spDateKey(nowMs)) ? 'Ontem ficou sem Saída' : `${dateShort(day)} ficou sem Saída`;
  const detail = `${weekdayFullLabel(day)}, ${dateShort(day)} — última marcação: ${KIND_LABELS[step.last.kind]} às ${spTime(lastMs)}.`;
  // Sugestão: 1 min depois da última marcação, sem passar das 23:59 do mesmo dia.
  const cap = Date.parse(`${day}T23:59:00-03:00`);
  const kind = step.last.kind === 'intervalo_inicio' ? 'intervalo_fim' : 'saida';
  return { day, title, detail, kind, whenLocal: isoToLocalInput(Math.min(lastMs + 60000, cap)) };
}

// Modelo único de tabela: CSV e PDF saem daqui, então têm o mesmo conteúdo.
export const MIRROR_COLUMNS = ['Data', 'Dia', 'Entrada', 'Início do intervalo', 'Fim do intervalo', 'Saída', 'Horas trabalhadas', 'Intervalo', 'Situação'];

const timesOf = (day, kind) => day.entries.filter(e => e.kind === kind).map(e => `${spTime(effectiveMs(e))}${entryFlags(e).length ? '*' : ''}`).join(' / ');

export function mirrorTable(mirror, personName) {
  const rows = mirror.days.map(d => [
    dateLabel(d.date), weekdayLabel(d.date),
    ...KINDS.map(k => timesOf(d, k)),
    formatDuration(d.workedMs), formatDuration(d.breakMs),
    d.incomplete ? 'Incompleto' : (d.flagged.length ? 'Sinalizado' : 'OK')
  ]);
  const t = mirror.totals;
  return {
    title: `Espelho de ponto — ${personName}`,
    subtitle: `Mês ${monthKeyLabel(mirror.month)} · Degusta Chopp · controle interno`,
    columns: MIRROR_COLUMNS,
    rows,
    totals: [
      `Dias com marcação: ${t.days}`,
      `Total de horas trabalhadas: ${formatDuration(t.workedMs)}`,
      `Total de intervalo: ${formatDuration(t.breakMs)}`,
      `Dias incompletos: ${t.incompleteDays}`,
      `Marcações sinalizadas: ${t.flagged}`
    ],
    flaggedTitle: 'Marcações sinalizadas (* na tabela)',
    flagged: mirror.flagged.map(e => `${dateLabel(spDateKey(effectiveMs(e)))} ${spTime(effectiveMs(e))} — ${KIND_LABELS[e.kind]} — ${flagText(e)}`),
    note: 'Horários gravados pelo servidor. Localização capturada com consentimento. Guarde este arquivo por 5 anos.'
  };
}

export function mirrorCsv(table) {
  const line = (cells) => cells.map(csvCell).join(CSV_SEPARATOR);
  const out = [line([table.title]), line([table.subtitle]), line(table.columns), ...table.rows.map(line)];
  out.push('', ...table.totals.map(x => line([x])));
  if (table.flagged.length) out.push('', line([table.flaggedTitle]), ...table.flagged.map(x => line([x])));
  out.push('', line([table.note]));
  return `﻿${out.join('\r\n')}\r\n`;
}

export function mirrorFileName(personName, monthKey, ext) {
  const slug = personName.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `espelho-ponto-${slug || 'colaborador'}-${monthKey}.${ext}`;
}

// ---------- Retenção: CSV do período (todas as marcações do mês, todos os colaboradores) ----------
export const TIME_CSV_HEADER = ['Colaborador', 'Marcação', 'Origem', 'Horário efetivo', 'Registrado no servidor em', 'Motivo (esquecimento)', 'Latitude', 'Longitude', 'Precisão (m)', 'Distância da loja (m)', 'Dentro do raio', 'Sinalização'];
const dtFull = (ms) => `${dateLabel(spDateKey(ms))} ${spTimeSeconds(ms)}`;

// Número em célula de CSV: vírgula decimal (Excel pt-BR) e SEM a proteção de fórmula do csvCell
// (que prefixaria ' em "-23,64"). Só passa valor que é número de verdade.
const numCell = (v) => (v === null || v === undefined || v === '' ? '' : (/^-?\d+(\.\d+)?$/.test(String(v)) ? String(v).replace('.', ',') : csvCell(v)));

export function buildTimeCsv(rows, who) {
  const out = [TIME_CSV_HEADER.map(csvCell).join(CSV_SEPARATOR)];
  for (const e of rows) {
    out.push([
      csvCell(who(e.user_id)), KIND_LABELS[e.kind], e.source === 'app' ? 'Aplicativo' : 'Esquecimento',
      dtFull(effectiveMs(e)), dtFull(Date.parse(e.recorded_at)), csvCell(e.reason || ''),
      numCell(e.lat), numCell(e.lng), numCell(e.accuracy_m), numCell(e.distance_m),
      e.within_radius === null || e.within_radius === undefined ? '' : (e.within_radius ? 'Sim' : 'Não'),
      csvCell(flagText(e))
    ].join(CSV_SEPARATOR));
  }
  return `﻿${out.join('\r\n')}\r\n`;
}

export function timeCsvFileName(scope) {
  const list = scope.months.map(m => m.month.slice(0, 7)).sort();
  return `ponto-degusta-${list.length === 1 ? list[0] : `${list[0]}_a_${list[list.length - 1]}`}.csv`;
}

// ---------- Localização / formulário ----------
export function validateForgot({ kind, whenLocal, reason }, nowMs) {
  const errors = {};
  if (!KINDS.includes(kind)) errors.kind = 'Escolha a marcação.';
  const iso = localInputToIso(whenLocal);
  if (!iso) errors.when = 'Informe a data e a hora.';
  else {
    const ms = Date.parse(iso);
    if (ms > nowMs) errors.when = 'O horário não pode estar no futuro.';
    else if (ms < nowMs - FORGOT_DAYS * 86400000) errors.when = `Só é possível lançar dos últimos ${FORGOT_DAYS} dias.`;
  }
  const r = String(reason || '').trim();
  if (r.length < REASON_MIN) errors.reason = `Informe o motivo (mínimo ${REASON_MIN} caracteres).`;
  else if (r.length > REASON_MAX) errors.reason = `Máximo de ${REASON_MAX} caracteres.`;
  return { errors, iso, reason: r };
}

export function pontoErrorMessage(error) {
  if (error?.code === '42501') return 'Sem permissão. Entre de novo.';
  if ((error?.code === '22023' || error?.code === '55000') && error.message) return error.message;
  return 'Não foi possível registrar agora. Verifique a internet e tente de novo.';
}
