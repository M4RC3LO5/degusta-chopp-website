// node --test src/admin/catalogRules.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatKB, nextSortOrder, normalizeBadge, plural, qualitySteps, reorder, slugify, toFlavorRow, validateBrand, validateFlavor, validateImageFile } from './catalogRules.js';
import { RULES } from './rules.js';

test('slug: sem acento, minúsculo, hífen, até 30 caracteres', () => {
  assert.equal(slugify('Germânia'), 'germania');
  assert.equal(slugify('  Chopp de Vinho!! '), 'chopp-de-vinho');
  assert.equal(slugify('Teste Marca'), 'teste-marca');
  assert.equal(slugify('Açaí & Cia'), 'acai-cia');
  assert.equal(slugify('a'.repeat(40)).length, 30);
  assert.equal(slugify('x'.repeat(29) + ' yy'), 'x'.repeat(29));      // não termina em hífen
  assert.equal(slugify('!!!'), '');
  assert.ok(RULES.brand.slug.test(slugify('Teste Marca')));
});

test('imagem: tipo, tamanho e dimensões mínimas com as mensagens do card', () => {
  const ok = { type: 'image/jpeg', size: 4 * 1024 * 1024, width: 4000, height: 3000 };
  assert.equal(validateImageFile(ok, RULES.images.flavorGlass), '');
  assert.equal(validateImageFile({ ...ok, type: 'image/gif' }, RULES.images.flavorGlass), 'Use JPG, PNG ou WEBP.');
  assert.equal(validateImageFile({ ...ok, type: 'application/pdf' }, RULES.images.brandLogo), 'Use JPG, PNG ou WEBP.');
  assert.match(validateImageFile({ ...ok, size: 5 * 1024 * 1024 + 1 }, RULES.images.brandLogo), /máximo 5 MB/);
  assert.equal(validateImageFile({ ...ok, size: 5 * 1024 * 1024 }, RULES.images.brandLogo), '');   // 5 MB exatos passam
  assert.equal(validateImageFile({ ...ok, width: 199, height: 500 }, RULES.images.brandLogo), 'Imagem muito pequena: mínimo 200×200 px.');
  assert.equal(validateImageFile({ ...ok, width: 200, height: 200 }, RULES.images.brandLogo), '');
  assert.equal(validateImageFile({ ...ok, width: 399, height: 900 }, RULES.images.flavorGlass), 'Imagem muito pequena: mínimo 400×600 px.');
  assert.equal(validateImageFile({ ...ok, width: 400, height: 599 }, RULES.images.flavorGlass), 'Imagem muito pequena: mínimo 400×600 px.');
});

test('compressão: 0.85 descendo de 0.05 até 0.5', () => {
  assert.deepEqual(qualitySteps(), [0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5]);
  assert.equal(formatKB(81920), '80 KB');
});

test('regras de imagem do card em rules.js', () => {
  const { brandLogo, flavorGlass, bucketMaxBytes } = RULES.images;
  assert.deepEqual([brandLogo.width, brandLogo.height, brandLogo.maxBytes], [400, 400, 60 * 1024]);
  assert.deepEqual([flavorGlass.width, flavorGlass.height, flavorGlass.maxBytes], [400, 600, 80 * 1024]);
  assert.equal(bucketMaxBytes, 204800);
});

test('marca: nome 2 a 20; 21 caracteres é recusado', () => {
  assert.deepEqual(validateBrand({ name: 'Bru' }), {});
  assert.ok(validateBrand({ name: 'A' }).name);
  assert.ok(validateBrand({ name: 'x'.repeat(21) }).name);
  assert.deepEqual(validateBrand({ name: 'x'.repeat(20) }), {});
  assert.ok(validateBrand({ name: '!!' }).name);
});

test('sabor: limites de nome, ABV (0-15, passo 0,1), IBU inteiro, textos e selo', () => {
  const ok = { name: 'Chopp IPA', abv: '6,2', ibu: '45', description: 'x'.repeat(30), idealFor: 'Churrasco', badge: 'novo', badgeColor: 'amber' };
  assert.deepEqual(validateFlavor(ok), {});
  assert.ok(validateFlavor({ ...ok, name: 'x'.repeat(21) }).name);
  assert.ok(validateFlavor({ ...ok, abv: '15,1' }).abv);
  assert.ok(validateFlavor({ ...ok, abv: '-1' }).abv);
  assert.ok(validateFlavor({ ...ok, abv: '4,55' }).abv);
  assert.deepEqual(validateFlavor({ ...ok, abv: '15' }), {});
  assert.deepEqual(validateFlavor({ ...ok, abv: '0' }), {});
  assert.ok(validateFlavor({ ...ok, ibu: '121' }).ibu);
  assert.ok(validateFlavor({ ...ok, ibu: '12,5' }).ibu);
  assert.ok(validateFlavor({ ...ok, ibu: '' }).ibu);
  assert.deepEqual(validateFlavor({ ...ok, ibu: '120' }), {});
  assert.ok(validateFlavor({ ...ok, description: 'curta' }).description);
  assert.ok(validateFlavor({ ...ok, description: 'x'.repeat(121) }).description);
  assert.ok(validateFlavor({ ...ok, idealFor: 'abc' }).idealFor);
  assert.ok(validateFlavor({ ...ok, idealFor: 'x'.repeat(46) }).idealFor);
  assert.ok(validateFlavor({ ...ok, badgeColor: 'pink' }).badgeColor);
});

test('selo: maiúsculas automáticas, até 18; linha do banco', () => {
  assert.equal(normalizeBadge('lançamento'), 'LANÇAMENTO');
  assert.equal(normalizeBadge('x'.repeat(30)).length, 18);
  const row = toFlavorRow({ name: ' Teste ', abv: '5,5', ibu: '20', description: ' descrição longa ', idealFor: ' Festas ', badge: ' novo ', badgeColor: 'purple' });
  assert.deepEqual(row, { name: 'Teste', abv: 5.5, ibu: 20, description: 'descrição longa', ideal_for: 'Festas', badge: 'NOVO', badge_color: 'purple' });
  assert.equal(toFlavorRow({ name: 'Teste', abv: '5', ibu: '1', description: 'x'.repeat(10), idealFor: 'x'.repeat(5), badge: '  ', badgeColor: 'amber' }).badge, null);
});

test('ordem: setas ↑↓ trocam vizinhos e só devolvem o que mudou', () => {
  const items = [{ id: 'a', sort_order: 1 }, { id: 'b', sort_order: 2 }, { id: 'c', sort_order: 3 }];
  const byId = (rows) => [...rows].sort((x, y) => x.id.localeCompare(y.id));
  assert.deepEqual(byId(reorder(items, 'c', -1)), [{ id: 'b', from: 2, sort_order: 3 }, { id: 'c', from: 3, sort_order: 2 }]);
  assert.deepEqual(byId(reorder(items, 'a', +1)), [{ id: 'a', from: 1, sort_order: 2 }, { id: 'b', from: 2, sort_order: 1 }]);
  assert.deepEqual(reorder(items, 'a', -1), []);
  assert.deepEqual(reorder(items, 'c', +1), []);
  assert.deepEqual(reorder(items, 'zz', 1), []);
  const ties = [{ id: 'a', sort_order: 0 }, { id: 'b', sort_order: 0 }, { id: 'c', sort_order: 0 }];
  assert.equal(reorder(ties, 'c', -1).length > 0, true);   // empates são resolvidos renumerando
  assert.equal(nextSortOrder(items), 4);
  assert.equal(nextSortOrder([]), 1);
});

test('plural', () => {
  assert.equal(plural(1, 'sabor', 'sabores'), '1 sabor');
  assert.equal(plural(5, 'sabor', 'sabores'), '5 sabores');
});
