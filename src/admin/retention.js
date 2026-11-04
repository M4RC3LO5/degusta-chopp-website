import { HISTORY_TYPES } from './historyDiff.js';

// Retenção do Histórico (Card 10). Funções puras, testadas em retention.test.js.
// Meses chegam do banco (RPC audit_months) como 'AAAA-MM-01'. O fuso de São Paulo é fixo (UTC-3, sem horário de verão).

export const RETENTION_MONTHS = 12;   // espelha public.audit_months() (0005_audit_retention.sql)
export const CSV_SEPARATOR = ';';

export const monthLabel = (iso) => `${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

export function periodLabel(months) {
  const list = months.map(m => m.month).sort();
  return list.length <= 1 ? monthLabel(list[0]) : `${monthLabel(list[0])} a ${monthLabel(list[list.length - 1])}`;
}

export const monthStartIso = (iso) => `${iso.slice(0, 7)}-01T00:00:00-03:00`;
export function nextMonthStartIso(iso) {
  let y = Number(iso.slice(0, 4));
  let m = Number(iso.slice(5, 7)) + 1;
  if (m === 13) { y += 1; m = 1; }
  return `${y}-${String(m).padStart(2, '0')}-01T00:00:00-03:00`;
}

export const closedMonths = (months) => months.filter(m => !m.is_current);
export const oldMonths = (months) => months.filter(m => m.older_than_12m);

// Texto que a pessoa digita para confirmar: o mês (03/2026) ou APAGAR para o lote.
export const confirmWord = (scope) => (scope.kind === 'all' ? 'APAGAR' : monthLabel(scope.months[0].month));
export const confirmMatches = (typed, scope) => String(typed || '').trim().toUpperCase() === confirmWord(scope);

export const scopeKey = (scope) => scope.months.map(m => `${m.month}:${m.row_count}`).join('|');
export const scopeRows = (scope) => scope.months.reduce((n, m) => n + Number(m.row_count), 0);

export function csvFileName(scope) {
  const list = scope.months.map(m => m.month.slice(0, 7)).sort();
  return `historico-degusta-${list.length === 1 ? list[0] : `${list[0]}_a_${list[list.length - 1]}`}.csv`;
}

const ACTIONS = { INSERT: 'Criação', UPDATE: 'Alteração', DELETE: 'Exclusão' };
const typeLabel = (table) => HISTORY_TYPES.find(t => t.tables?.includes(table))?.label || table;
const dateTime = (iso) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(',', '');

// Célula CSV: aspas duplicadas, e prefixo ' contra fórmula (=, +, -, @) quando abrir no Excel.
export function csvCell(value) {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const CSV_HEADER = ['Data e hora', 'Pessoa', 'Tipo', 'Ação', 'O que mudou', 'Registro (ID)', 'Dados antes (JSON)', 'Dados depois (JSON)'];

// rows = linhas do audit_log; describe(row) => string[] (linhas em português); who(row) => nome.
export function buildCsv(rows, { describe, who }) {
  const out = [CSV_HEADER.map(csvCell).join(CSV_SEPARATOR)];
  for (const row of rows) {
    out.push([
      dateTime(row.changed_at),
      who(row),
      typeLabel(row.table_name),
      ACTIONS[row.action] || row.action,
      describe(row).join(' | '),
      row.row_id,
      row.old_data ? JSON.stringify(row.old_data) : '',
      row.new_data ? JSON.stringify(row.new_data) : ''
    ].map(csvCell).join(CSV_SEPARATOR));
  }
  return `﻿${out.join('\r\n')}\r\n`;
}

export function purgeErrorMessage(error) {
  if (error?.code === '42501') return 'Só o Dono pode apagar o histórico.';
  if (error?.code === '22023') return 'O mês corrente nunca é apagado.';
  if (error?.code === 'P0002') return 'Esse mês não tem registros.';
  return 'Não foi possível apagar agora. Nada foi alterado neste passo; tente de novo.';
}

// Aviso único do Dono no login (Histórico e/ou Ponto). items = [{ label: 'Histórico' | 'Ponto', from: 'MM/AAAA', to: 'MM/AAAA' }].
export function retentionMessage(items) {
  const range = (i) => `de ${i.from} a ${i.to}`;
  if (items.length === 1) return `Há registros ${items[0].label === 'Ponto' ? 'do Ponto' : 'do Histórico'} com mais de 12 meses (${range(items[0])}). Deseja apagar?`;
  return `Há registros com mais de 12 meses: ${items.map(i => `${i.label} (${range(i)})`).join(' e ')}. Deseja apagar?`;
}

export const KEEP_FILES_NOTE = 'Guarde os arquivos baixados por 5 anos.';
