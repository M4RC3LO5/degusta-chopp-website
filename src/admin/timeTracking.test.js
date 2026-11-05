import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  allowedNext, buildMirror, buildTimeCsv, formatDuration, localInputToIso, mirrorCsv, mirrorFetchRange, mirrorFileName,
  mirrorTable, nextStep, spDateKey, spTime, validateForgot, entryFlags, pontoErrorMessage,
  analyzeDay, barGeometry, dayOccurrences, filterDays, formatDistance, formatHM, mirrorSummary, monthLongLabel, pendingInfo, shiftMonth, todayHeading, todayView
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

// ---------- Card 13: redesenho ----------
const NOW = Date.parse('2026-11-05T11:20:14-03:00');   // qui 05/11 (hoje)

test('formatos de tela: "3h 18", distância, mês por extenso, setas do mês', () => {
  assert.equal(formatHM(Date.parse('2026-11-05T11:20:00-03:00') - Date.parse('2026-11-05T08:02:00-03:00')), '3h 18');
  assert.equal(formatHM(0), '0h 00');
  assert.equal(formatDistance(420), '420 m');
  assert.equal(formatDistance(1001), '1,0 km');
  assert.equal(formatDistance(14200), '14 km');
  assert.equal(monthLongLabel('2026-11'), 'Novembro de 2026');
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.equal(todayHeading('2026-11-05'), 'qui, 5 de novembro');
});

test('Ponto: em expediente, trabalhado hoje ao vivo e etapas (feita ✓, próxima, pendente)', () => {
  const v = todayView([e('entrada', '2026-11-05 08:02')], NOW);
  assert.equal(v.status, 'expediente');
  assert.equal(formatHM(v.workedMs), '3h 18');
  assert.deepEqual(v.steps.map(s => [s.label, s.state]), [['Entrada', 'done'], ['Intervalo', 'next'], ['Retorno', 'pending'], ['Saída', 'pending']]);
  assert.equal(v.step.suggested, 'intervalo_inicio');
});

test('Ponto: em intervalo, depois do retorno e fora do expediente após a saída', () => {
  const brk = todayView([e('entrada', '2026-11-05 08:02'), e('intervalo_inicio', '2026-11-05 10:00')], NOW);
  assert.equal(brk.status, 'intervalo');
  assert.equal(formatHM(brk.workedMs), '1h 58');           // o intervalo não conta
  assert.equal(brk.steps.find(s => s.kind === 'intervalo_fim').state, 'next');
  const back = todayView([e('entrada', '2026-11-05 08:02'), e('intervalo_inicio', '2026-11-05 10:00'), e('intervalo_fim', '2026-11-05 10:30')], NOW);
  assert.equal(back.status, 'expediente');
  assert.equal(formatHM(back.workedMs), '2h 48');
  assert.equal(back.steps.find(s => s.kind === 'saida').state, 'next');
  const done = todayView([e('entrada', '2026-11-05 08:02'), e('saida', '2026-11-05 10:02')], NOW);
  assert.equal(done.status, 'fora');
  assert.ok(done.steps.every(s => s.state === 'done' || s.state === 'pending'));   // nada em dourado: o dia terminou
  assert.equal(done.steps.some(s => s.state === 'next'), false);
});

test('Ponto: sem marcação hoje = fora do expediente; dia anterior sem saída gera o alerta', () => {
  const empty = todayView([], NOW);
  assert.equal(empty.status, 'fora');
  assert.equal(empty.hasMarks, false);
  assert.equal(empty.step.suggested, 'entrada');
  const prev = todayView([e('entrada', '2026-11-04 08:00'), e('intervalo_inicio', '2026-11-04 12:00'), e('intervalo_fim', '2026-11-04 22:20')], NOW);
  assert.equal(prev.hasMarks, false);
  const p = pendingInfo(prev.step, NOW);
  assert.equal(p.title, 'Ontem ficou sem Saída');
  assert.equal(p.detail, 'Quarta, 04/11 — última marcação: Fim do intervalo às 22:20.');
  assert.equal(p.kind, 'saida');
  assert.equal(p.whenLocal, '2026-11-04T22:21');           // abre o esquecimento já com a data do dia
  assert.equal(pendingInfo(todayView([], NOW).step, NOW), null);
  // dois dias atrás: título com a data; 23:59 é o teto do mesmo dia
  const old = todayView([e('entrada', '2026-11-03 23:59')], NOW);
  assert.equal(pendingInfo(old.step, NOW).title, '03/11 ficou sem Saída');
  assert.equal(pendingInfo(old.step, NOW).whenLocal, '2026-11-03T23:59');
  // último registro = início do intervalo: o próximo passo válido é o Fim do intervalo
  assert.equal(pendingInfo(todayView([e('entrada', '2026-11-04 08:00'), e('intervalo_inicio', '2026-11-04 12:00')], NOW).step, NOW).kind, 'intervalo_fim');
});

const mirrorDays = (list, month = '2026-11') => buildMirror(list, month).days.map(d => analyzeDay(d, NOW));

test('Espelho: dia completo, hoje em andamento, sem saída e ocorrências (igual ao protótipo)', () => {
  const days = mirrorDays([
    e('entrada', '2026-11-05 08:02'),
    e('entrada', '2026-11-04 08:02'), e('intervalo_inicio', '2026-11-04 12:01'), e('intervalo_fim', '2026-11-04 13:00'), e('saida', '2026-11-04 17:10'),
    e('entrada', '2026-11-03 08:15'), e('intervalo_inicio', '2026-11-03 12:00'), e('intervalo_fim', '2026-11-03 12:58'),
    e('saida', '2026-11-03 17:05', { source: 'esquecimento', claimed_at: new Date(Date.parse('2026-11-03T17:05:00-03:00')).toISOString(), reason: 'saí sem marcar, celular sem bateria', within_radius: null, distance_m: null }),
    e('entrada', '2026-11-02 07:58', { within_radius: false, distance_m: 14200 }), e('intervalo_inicio', '2026-11-02 12:02'), e('intervalo_fim', '2026-11-02 13:01')
  ]);
  const by = Object.fromEntries(days.map(d => [d.date, d]));
  assert.equal(by['2026-11-05'].state, 'andamento');
  assert.equal(formatHM(by['2026-11-05'].liveMs), '3h 18');
  assert.deepEqual(by['2026-11-05'].segments.map(s => s.kind), ['live']);
  assert.equal(by['2026-11-04'].state, 'completo');
  assert.equal(formatHM(by['2026-11-04'].workedMs), '8h 09');
  assert.equal(by['2026-11-02'].state, 'sem_saida');
  assert.equal(formatHM(by['2026-11-02'].liveMs), '4h 04');   // só o que fechou
  assert.deepEqual(by['2026-11-02'].segments.map(s => s.kind), ['ok', 'warn']);
  assert.deepEqual(by['2026-11-02'].occurrences.map(o => o.text), ['Sem saída', 'Entrada a 14 km da loja']);
  assert.deepEqual(by['2026-11-03'].occurrences.map(o => [o.tone, o.text]), [['info', 'Esquecimento (Saída): “saí sem marcar, celular sem bateria”']]);
  assert.deepEqual(by['2026-11-04'].occurrences, []);
  assert.deepEqual(by['2026-11-04'].breaks.map(b => [spTime(b.startMs), spTime(b.endMs)]), [['12:01', '13:00']]);
  // marcação esquecida: `forgot`; fora do raio: `loc` (laranja), nunca os dois no mesmo asterisco
  assert.equal(by['2026-11-03'].marks[3].items[0].forgot, true);
  assert.equal(by['2026-11-02'].marks[0].items[0].loc, true);
  // totais: 23h 23 no mês, média dos dias completos, para conferir = nº de ocorrências
  const sum = mirrorSummary(days);
  assert.equal(formatHM(sum.workedMs), '23h 23');
  assert.equal(formatHM(sum.avgDayMs), '8h 01');   // (8h09 + 7h52) / 2 = 8h00,5 -> arredonda
  assert.equal(formatHM(sum.avgBreakMs), '0h 59');
  assert.equal(sum.toCheck, 3);
  assert.equal(sum.incomplete, 1);
  // filtros
  assert.deepEqual(filterDays(days, 'todos').length, 4);
  assert.deepEqual(filterDays(days, 'conferir').map(d => d.date).sort(), ['2026-11-02', '2026-11-03']);
  assert.deepEqual(filterDays(days, 'incompletos').map(d => d.date), ['2026-11-02']);
});

test('Espelho: sem localização vira ocorrência; média vazia quando não há dia completo', () => {
  const days = mirrorDays([e('entrada', '2026-11-05 08:00', { within_radius: null, distance_m: null })]);
  assert.deepEqual(days[0].occurrences.map(o => o.text), ['Entrada sem localização']);
  const sum = mirrorSummary(days);
  assert.equal(sum.avgDayMs, null);
  assert.equal(sum.avgBreakMs, null);
});

test('linha do tempo 06h–24h: posição e corte nas pontas', () => {
  const g = barGeometry({ startMs: Date.parse('2026-11-04T12:00:00-03:00'), endMs: Date.parse('2026-11-04T15:00:00-03:00') }, '2026-11-04');
  assert.equal(g.left, 33.33333333333333);
  assert.equal(Math.round(g.width * 100) / 100, 16.67);
  const early = barGeometry({ startMs: Date.parse('2026-11-04T05:00:00-03:00'), endMs: Date.parse('2026-11-04T07:00:00-03:00') }, '2026-11-04');
  assert.equal(early.left, 0);
  assert.equal(Math.round(early.width * 100) / 100, 5.56);   // só 06h–07h
  assert.equal(barGeometry({ startMs: Date.parse('2026-11-04T03:00:00-03:00'), endMs: Date.parse('2026-11-04T05:00:00-03:00') }, '2026-11-04'), null);
});

test('dayOccurrences: hoje em aberto não é "sem saída"', () => {
  const list = [e('entrada', '2026-11-05 08:00')];
  assert.deepEqual(dayOccurrences(list, '2026-11-05', NOW), []);
  assert.deepEqual(dayOccurrences(list, '2026-11-05', NOW + 86400000).map(o => o.text), ['Sem saída']);
});
