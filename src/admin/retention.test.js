import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCsv, closedMonths, confirmMatches, confirmWord, csvCell, csvFileName, monthLabel, monthStartIso, nextMonthStartIso, oldMonths, periodLabel, retentionMessage, scopeRows } from './retention.js';

const m = (month, n, extra = {}) => ({ month, row_count: n, older_than_12m: false, is_current: false, ...extra });

test('rótulos de mês e período', () => {
  assert.equal(monthLabel('2025-01-01'), '01/2025');
  assert.equal(periodLabel([m('2025-03-01', 1), m('2025-01-01', 2)]), '01/2025 a 03/2025');
  assert.equal(periodLabel([m('2025-01-01', 1)]), '01/2025');
});

test('limites do mês em UTC-3, inclusive virada de ano', () => {
  assert.equal(monthStartIso('2025-01-01'), '2025-01-01T00:00:00-03:00');
  assert.equal(nextMonthStartIso('2025-01-01'), '2025-02-01T00:00:00-03:00');
  assert.equal(nextMonthStartIso('2025-12-01'), '2026-01-01T00:00:00-03:00');
});

test('mês corrente nunca entra no lote; só >12 meses entram no aviso', () => {
  const list = [m('2025-01-01', 3, { older_than_12m: true }), m('2026-10-01', 4), m('2026-11-01', 5, { is_current: true })];
  assert.deepEqual(closedMonths(list).map(x => x.month), ['2025-01-01', '2026-10-01']);
  assert.deepEqual(oldMonths(list).map(x => x.month), ['2025-01-01']);
  assert.equal(scopeRows({ months: closedMonths(list) }), 7);
});

test('confirmação: mês ou APAGAR', () => {
  const one = { kind: 'month', months: [m('2026-03-01', 1)] };
  const all = { kind: 'all', months: [m('2026-03-01', 1)] };
  assert.equal(confirmWord(one), '03/2026');
  assert.ok(confirmMatches(' 03/2026 ', one));
  assert.ok(!confirmMatches('3/2026', one));
  assert.ok(!confirmMatches('APAGAR', one));
  assert.ok(confirmMatches('apagar', all));
  assert.ok(!confirmMatches('03/2026', all));
});

test('nome do arquivo', () => {
  assert.equal(csvFileName({ months: [m('2025-01-01', 1)] }), 'historico-degusta-2025-01.csv');
  assert.equal(csvFileName({ months: [m('2025-03-01', 1), m('2025-01-01', 1)] }), 'historico-degusta-2025-01_a_2025-03.csv');
});

test('célula CSV: aspas, separador, quebra de linha e fórmula', () => {
  assert.equal(csvCell('a;b'), '"a;b"');
  assert.equal(csvCell('diz "oi"'), '"diz ""oi"""');
  assert.equal(csvCell('x\ny'), '"x\ny"');
  assert.equal(csvCell('=1+1'), "'=1+1");
  assert.equal(csvCell(null), '');
  assert.equal(csvCell('Preço 30L'), 'Preço 30L');
});

test('CSV: BOM, separador ;, CRLF, colunas em português e acentos preservados', () => {
  const rows = [{ changed_at: '2025-01-15T15:30:00Z', table_name: 'offers', row_id: 'abc', action: 'UPDATE', changed_by: 'u1', old_data: { price_30: 1 }, new_data: { price_30: 2 } }];
  const csv = buildCsv(rows, { describe: () => ['Preço 30L: R$ 1,00 → R$ 2,00', 'Situação: ativo'], who: () => 'Teste Dono' });
  assert.ok(csv.startsWith('﻿Data e hora;Pessoa;Tipo;Ação;'));
  const lines = csv.trim().split('\r\n');
  assert.equal(lines.length, 2);
  assert.ok(lines[1].startsWith('15/01/2025 12:30:00;Teste Dono;Preço;Alteração;Preço 30L: R$ 1,00 → R$ 2,00 | Situação: ativo;abc;'));
  assert.ok(lines[1].includes('"{""price_30"":1}"'));
});

test('aviso único de retenção: Histórico, Ponto ou os dois', () => {
  const h = { label: 'Histórico', from: '01/2025', to: '03/2025' };
  const p = { label: 'Ponto', from: '02/2025', to: '02/2025' };
  assert.equal(retentionMessage([h]), 'Há registros do Histórico com mais de 12 meses (de 01/2025 a 03/2025). Deseja apagar?');
  assert.equal(retentionMessage([p]), 'Há registros do Ponto com mais de 12 meses (de 02/2025 a 02/2025). Deseja apagar?');
  assert.equal(retentionMessage([h, p]), 'Há registros com mais de 12 meses: Histórico (de 01/2025 a 03/2025) e Ponto (de 02/2025 a 02/2025). Deseja apagar?');
});
