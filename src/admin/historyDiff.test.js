import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeChange, stripVersion } from './historyDiff.js';

const ctx = {
  flavors: new Map([['f1', { name: 'Pilsen' }]]),
  brands: new Map([['b1', { name: 'Bru' }]]),
  names: new Map([['u1', 'Ana Souza']])
};
const offer = (o, n, action = 'UPDATE') => ({ table_name: 'offers', row_id: 'x', action, old_data: o, new_data: n });
const base = { flavor_id: 'f1', brand_id: 'b1', price_30: 400, price_50: 590, subtitle: 'x', active: true, updated_at: 'a', updated_by: null };

test('preço 50L: diff legível em português', () => {
  const r = describeChange(offer(base, { ...base, price_50: 620, updated_at: 'b', updated_by: 'u1' }), ctx);
  assert.equal(r.lines.length, 1);
  assert.equal(r.lines[0].replace(/ /g, ' '), 'Preço 50L de Pilsen · Bru: R$ 590,00 → R$ 620,00');
  assert.equal(r.type, 'preco');
});

test('updated_at/updated_by são ignorados', () => {
  const r = describeChange(offer(base, { ...base, updated_at: 'z', updated_by: 'u1' }), ctx);
  assert.match(r.lines[0], /sem alteração visível/);
});

test('logo/imagem: "Imagem trocada", sem mostrar o ?v=', () => {
  const brand = (p) => ({ table_name: 'brands', row_id: 'b', action: 'UPDATE', old_data: { name: 'Bru', logo_path: p[0], active: true }, new_data: { name: 'Bru', logo_path: p[1], active: true } });
  const r = describeChange(brand(['brands/a.webp?v=1', 'brands/a.webp?v=2']), ctx);
  assert.deepEqual(r.lines, ['Logo de Bru: Imagem trocada']);
  assert.ok(!r.lines[0].includes('?v'));
  const same = describeChange(brand(['brands/a.webp?v=1', 'brands/a.webp?v=1']), ctx);
  assert.match(same.lines[0], /sem alteração visível/);
  assert.equal(stripVersion('a.webp?v=9'), 'a.webp');
});

test('desativar oferta e desativar acesso de usuário', () => {
  assert.deepEqual(describeChange(offer(base, { ...base, active: false }), ctx).lines, ['Situação de Pilsen · Bru: ativo → inativo']);
  const p = describeChange({ table_name: 'profiles', row_id: 'u1', action: 'UPDATE', old_data: { full_name: 'Ana Souza', role: 'operador', active: true }, new_data: { full_name: 'Ana Souza', role: 'gerente', active: true } }, ctx);
  assert.deepEqual(p.lines, ['Perfil de Ana Souza: Operador → Gerente']);
  assert.equal(p.type, 'usuario');
});

test('configuração: WhatsApp formatado e instagram', () => {
  const r = describeChange({ table_name: 'settings', row_id: '1', action: 'UPDATE', old_data: { whatsapp: '5511991069099', instagram: 'a' }, new_data: { whatsapp: '5511988887777', instagram: null } }, ctx);
  assert.deepEqual(r.lines, ['WhatsApp de Configurações do site: (11) 99106-9099 → (11) 98888-7777', 'Instagram de Configurações do site: @a → vazio']);
});

test('criação de usuário e reset de senha (nunca mostra senha)', () => {
  assert.deepEqual(describeChange({ table_name: 'profiles', row_id: 'u1', action: 'INSERT', old_data: null, new_data: { full_name: 'Ana Souza', role: 'gerente' } }, ctx).lines, ['Usuário criado: Ana Souza (Gerente)']);
  assert.deepEqual(describeChange({ table_name: 'profiles', row_id: 'u1', action: 'RESET_PASSWORD', old_data: {}, new_data: {} }, ctx).lines, ['Senha redefinida de Ana Souza']);
});
