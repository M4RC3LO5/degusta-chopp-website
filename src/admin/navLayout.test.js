import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccess, homePathForRole, navLayout } from './rules.js';

const paths = (list) => list.map(r => r.path);

test('barra inferior: até 5 itens ficam todos visíveis; com 6+ os menos usados vão para "Mais"', () => {
  assert.deepEqual(paths(navLayout('operador').primary), ['precos', 'catalogo', 'ponto']);
  assert.deepEqual(navLayout('operador').more, []);
  assert.deepEqual(paths(navLayout('gerente').primary), ['precos', 'catalogo', 'ponto', 'config', 'historico']);
  assert.deepEqual(navLayout('gerente').more, []);
  const dono = navLayout('dono');
  assert.deepEqual(paths(dono.primary), ['precos', 'catalogo', 'ponto']);
  assert.deepEqual(paths(dono.more), ['config', 'historico', 'usuarios']);
});

test('Ponto fica visível para todos; espelho só dono/gerente, sem item na barra', () => {
  for (const role of ['dono', 'gerente', 'operador']) {
    assert.ok(paths(navLayout(role).primary).includes('ponto'), role);
    assert.ok(canAccess(role, 'ponto'));
  }
  assert.ok(canAccess('dono', 'ponto/espelho'));
  assert.ok(canAccess('gerente', 'ponto/espelho'));
  assert.equal(canAccess('operador', 'ponto/espelho'), false);
  for (const role of ['dono', 'gerente']) assert.ok(!paths([...navLayout(role).primary, ...navLayout(role).more]).includes('ponto/espelho'));
  assert.equal(homePathForRole('operador'), 'precos');
});
