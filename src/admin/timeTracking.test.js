import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  allowedNext, buildMirror, buildTimeCsv, formatDuration, localInputToIso, mirrorCsv, mirrorFetchRange, mirrorFileName,
  mirrorTable, nextStep, spDateKey, spTime, validateForgot, entryFlags, pontoErrorMessage
} from './timeTracking.js';
import { buildPdf } from './pdf.js';
import { parseCoord } from './settingsRules.js';

let id = 0;
// hora local de São Paulo "2026-11-03 08:00" -> entrada do banco
const e = (kind, local, extra = {}) => {
  const iso = new Date(Date.parse(`${local.replace(' ', 'T')}:00-03:00`)).toISOString();
  return { id: ++id, user_id: 'u1', kind, recorded_at: iso, source: 'app', claimed_at: null, reason: null, within_radius: true, distance_m: 10, accuracy_m: 12, lat: -23.6, lng: -46.4, ...extra };
};

test('fuso de São Paulo: dia e hora locais', () => {
  const ms = Date.parse('2026-11-04T02:30:00Z');          // 23:30 do dia 03 em SP
  assert.equal(spDateKey(ms), '2026-11-03');
  assert.equal(spTime(ms), '23:30');
});

test('sequência válida (espelha o banco)', () => {
  assert.deepEqual(allowedNext(null), ['entrada']);
  assert.deepEqual(allowedNext('saida'), ['entrada']);
  assert.deepEqual(allowedNext('entrada'), ['intervalo_inicio', 'saida']);
  assert.deepEqual(allowedNext('intervalo_inicio'), ['intervalo_fim']);
  assert.deepEqual(allowedNext('intervalo_fim'), ['saida']);
});

test('próximo passo: dia anterior em aberto sugere nova Entrada', () => {
  const now = Date.parse('2026-11-04T12:00:00-03:00');
  assert.equal(nextStep([], now).suggested, 'entrada');
  assert.equal(nextStep([e('entrada', '2026-11-04 08:00')], now).suggested, 'intervalo_inicio');
  const open = nextStep([e('entrada', '2026-11-03 08:00')], now);
  assert.equal(open.suggested, 'entrada');
  assert.equal(open.openFrom, '2026-11-03');
});

test('espelho: horas trabalhadas, intervalo, incompleto e sinalizadas', () => {
  const list = [
    e('entrada', '2026-11-03 08:00'), e('intervalo_inicio', '2026-11-03 12:00'),
    e('intervalo_fim', '2026-11-03 13:00', { within_radius: false, distance_m: 350 }), e('saida', '2026-11-03 18:30', { within_radius: null, lat: null, lng: null, distance_m: null }),
    e('entrada', '2026-11-04 08:10'),
    e('entrada', '2026-10-31 08:00')                                 // outro mês: fora
  ];
  const m = buildMirror(list, '2026-11');
  assert.equal(m.days.length, 2);
  assert.equal(formatDuration(m.days[0].workedMs), '9h30');         // 4h + 5h30
  assert.equal(formatDuration(m.days[0].breakMs), '1h00');
  assert.equal(m.days[0].incomplete, false);
  assert.equal(m.days[1].incomplete, true);
  assert.equal(m.totals.flagged, 2);                                 // fora do raio + sem localização
  assert.deepEqual(m.flagged.map(x => entryFlags(x)[0]), ['fora_raio', 'sem_localizacao']);
});

test('esquecimento entra no dia do horário informado e fica sinalizado', () => {
  const forgot = e('saida', '2026-11-04 09:00', { source: 'esquecimento', claimed_at: new Date('2026-11-03T21:00:00-03:00').toISOString(), reason: 'Esqueci de bater', within_radius: null });
  const m = buildMirror([e('entrada', '2026-11-03 08:00'), forgot], '2026-11');
  assert.equal(m.days.length, 1);
  assert.equal(m.days[0].date, '2026-11-03');
  assert.equal(formatDuration(m.days[0].workedMs), '13h00');
  assert.deepEqual(entryFlags(forgot), ['esquecimento']);
});

test('faixa de busca cobre esquecimento lançado até 7 dias depois do mês', () => {
  const r = mirrorFetchRange('2026-11');
  assert.equal(r.from, '2026-11-01T00:00:00-03:00');
  assert.equal(r.to, '2026-12-09T03:00:00.000Z');
});

test('CSV e PDF exportam o mesmo conteúdo do espelho', () => {
  const list = [
    e('entrada', '2026-11-03 08:00'), e('intervalo_inicio', '2026-11-03 12:00'),
    e('intervalo_fim', '2026-11-03 13:00'), e('saida', '2026-11-03 18:30', { within_radius: false, distance_m: 350 })
  ];
  const table = mirrorTable(buildMirror(list, '2026-11'), 'Ana Çarvalho');
  const csv = mirrorCsv(table);
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.ok(csv.includes('Espelho de ponto — Ana Çarvalho'));
  assert.ok(csv.includes('03/11/2026;ter;08:00;12:00;13:00;18:30*;9h30;1h00;Sinalizado'));

  const pdf = buildPdf(table);
  assert.equal(String.fromCharCode(...pdf.slice(0, 5)), '%PDF-');
  const dir = mkdtempSync(join(tmpdir(), 'pdf-'));
  const file = join(dir, 'e.pdf');
  writeFileSync(file, pdf);
  let txt = '';
  try { txt = execFileSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf8' }); } catch { return; }   // sem pdftotext: só valida o cabeçalho
  const flat = txt.replace(/\s+/g, ' ');
  for (const piece of [table.title, table.subtitle, ...table.columns, ...table.rows.flat(), ...table.totals, table.flaggedTitle, ...table.flagged]) {
    assert.ok(flat.includes(piece.replace(/\s+/g, ' ')), `PDF sem: ${piece}`);
  }
});

test('CSV do período (retenção): BOM, ; e localização', () => {
  const csv = buildTimeCsv([e('entrada', '2026-11-03 08:00', { within_radius: false, distance_m: 350 })], () => 'Ana');
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.ok(csv.slice(1).split('\r\n')[0].startsWith('Colaborador;Marcação;Origem'));
  assert.ok(csv.includes('Ana;Entrada;Aplicativo;03/11/2026 08:00:00;'));
  assert.ok(csv.includes('Não;Fora do raio (350 m da loja, precisão ±12 m)'));
  // coordenadas negativas ficam como número (vírgula decimal), sem o ' da proteção de fórmula
  assert.ok(csv.includes(';-23,6;-46,4;12;350;Não;'));
  assert.ok(!csv.includes("'-23"));
  // texto livre (motivo) que começa com = continua protegido
  assert.ok(buildTimeCsv([e('entrada', '2026-11-03 08:00', { source: 'esquecimento', claimed_at: '2026-11-03T10:00:00Z', reason: '=1+1', lat: null, lng: null, within_radius: null })], () => 'Ana').includes("'=1+1"));
});

test('validação do esquecimento: 7 dias, futuro e motivo', () => {
  const now = Date.parse('2026-11-04T12:00:00-03:00');
  const ok = validateForgot({ kind: 'saida', whenLocal: '2026-11-03T18:00', reason: 'Esqueci' }, now);
  assert.deepEqual(ok.errors, {});
  assert.ok(validateForgot({ kind: 'saida', whenLocal: '2026-10-27T18:00', reason: 'Esqueci' }, now).errors.when);
  assert.ok(validateForgot({ kind: 'saida', whenLocal: '2026-11-04T13:00', reason: 'Esqueci' }, now).errors.when);
  assert.ok(validateForgot({ kind: 'saida', whenLocal: '2026-11-03T18:00', reason: 'ab' }, now).errors.reason);
  assert.ok(validateForgot({ kind: 'saida', whenLocal: '2026-11-03T18:00', reason: 'x'.repeat(121) }, now).errors.reason);
  assert.equal(localInputToIso('2026-11-03T18:00'), '2026-11-03T21:00:00.000Z');
});

test('utilidades', () => {
  assert.equal(parseCoord('-23,644057', -90, 90), -23.644057);
  assert.equal(parseCoord('91', -90, 90), null);
  assert.equal(parseCoord('abc', -90, 90), null);
  assert.equal(mirrorFileName('Ana Çarvalho', '2026-11', 'csv'), 'espelho-ponto-ana-carvalho-2026-11.csv');
  assert.equal(pontoErrorMessage({ code: '22023', message: 'O horário não pode estar no futuro.' }), 'O horário não pode estar no futuro.');
  assert.match(pontoErrorMessage({ code: 'XX' }), /Não foi possível/);
});
