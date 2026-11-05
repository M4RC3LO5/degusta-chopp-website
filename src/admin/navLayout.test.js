import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccess, homePathForRole, navLayout } from './rules.js';

const paths = (list) => list.map(r => r.path);

test('barra inferior: até 5 itens ficam todos visíveis; com 6+ os menos usados vão para "Mais"', () => {
  // Ordem pedida no Card 12: Marcas, Sabores, Preços, Ponto; o resto em "Mais".
  assert.deepEqual(paths(navLayout('operador').primary), ['marcas', 'sabores', 'precos', 'ponto']);
  assert.deepEqual(navLayout('operador').more, []);
  const gerente = navLayout('gerente');
  assert.deepEqual(paths(gerente.primary), ['marcas', 'sabores', 'precos', 'ponto']);
  assert.deepEqual(paths(gerente.more), ['config', 'historico']);
  const dono = navLayout('dono');
  assert.deepEqual(paths(dono.primary), ['marcas', 'sabores', 'precos', 'ponto']);
  assert.deepEqual(paths(dono.more), ['config', 'historico', 'usuarios']);
});

test('Catálogo separado: Marcas e Sabores com as mesmas permissões de antes; /catalogo não é rota da barra', () => {
  for (const role of ['dono', 'gerente', 'operador']) {
    assert.ok(canAccess(role, 'marcas'), role);
    assert.ok(canAccess(role, 'sabores'), role);
    assert.ok(canAccess(role, 'precos'), role);
    assert.equal(homePathForRole(role), 'precos');          // tela inicial continua Preços
  }
  assert.equal(canAccess('operador', 'config'), false);
  assert.equal(canAccess('operador', 'usuarios'), false);
  assert.equal(canAccess('gerente', 'usuarios'), false);
  assert.equal(canAccess('dono', 'catalogo'), false);       // o redirecionamento é da rota, não uma página
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
