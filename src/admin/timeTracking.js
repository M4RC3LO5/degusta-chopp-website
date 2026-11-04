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
