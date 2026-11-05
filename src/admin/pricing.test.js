// node --test src/admin/pricing.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bigVariations, finalizePriceText, formatBRL, isDirty, maskPriceInput, parsePriceText, priceToText, validateOffer, variationMessage } from './pricing.js';

const nb = (s) => s.replace(/ /g, ' ');

test('máscara: dígitos, milhar, vírgula decimal (2 casas), ponto nunca é decimal', () => {
  assert.equal(maskPriceInput('590'), '590');
  assert.equal(maskPriceInput('1234'), '1.234');
  assert.equal(maskPriceInput('1234567'), '123.456');           // limita a 6 dígitos inteiros
  assert.equal(maskPriceInput('59,9'), '59,9');
  assert.equal(maskPriceInput('59,999'), '59,99');
  assert.equal(maskPriceInput(',5'), '0,5');
  assert.equal(maskPriceInput('007'), '7');
  assert.equal(maskPriceInput('abc12x'), '12');
  assert.equal(maskPriceInput('-5'), '-5');
  assert.equal(maskPriceInput('59.9'), '599');
  assert.equal(maskPriceInput(''), '');
});

test('parse: vazio = valor a consultar; 0, -5 e 9999 são recusados com mensagem clara', () => {
  assert.deepEqual(parsePriceText(''), { value: null, error: '' });
  assert.equal(parsePriceText('590,5').value, 590.5);
  assert.equal(parsePriceText('1.234,56').value, 1234.56);
  assert.equal(parsePriceText('5.000').value, 5000);            // limite incluso
  assert.match(parsePriceText('0').error, /maior que zero/);
  assert.match(parsePriceText('0,00').error, /maior que zero/);
  assert.match(parsePriceText('-5').error, /negativo/);
  assert.match(parsePriceText('-').error, /negativo/);
  assert.match(nb(parsePriceText('9999').error), /máximo é R\$ 5\.000,00/);
  assert.match(parsePriceText('5.000,01').error, /máximo/);
});

test('texto <-> número e finalização dos centavos', () => {
  assert.equal(priceToText(590), '590,00');
  assert.equal(priceToText(1234.5), '1.234,50');
  assert.equal(priceToText(null), '');
  assert.equal(finalizePriceText('590'), '590,00');
  assert.equal(finalizePriceText('59,9'), '59,90');
  assert.equal(finalizePriceText('0'), '0');                    // inválido: não mexe
  assert.equal(finalizePriceText(''), '');
});

test('validateOffer: os dois preços podem ficar vazios (valor a consultar); um tamanho só é válido', () => {
  const empty = validateOffer({ subtitle: 'x', text30: '', text50: '', active: true });
  assert.deepEqual(empty.errors, {});
  assert.deepEqual(empty.values, { subtitle: 'x', price_30: null, price_50: null, active: true });
  assert.equal(validateOffer({ subtitle: 'x', text30: '', text50: '', active: false }).errors.prices, undefined);
  const one = validateOffer({ subtitle: ' Só 50L ', text30: '', text50: '700', active: true });
  assert.deepEqual(one.errors, {});
  assert.deepEqual(one.values, { subtitle: 'Só 50L', price_30: null, price_50: 700, active: true });
  assert.ok(validateOffer({ subtitle: '', text30: '0', text50: '10', active: true }).errors.p30);
  assert.equal(validateOffer({ subtitle: '', text30: '10', text50: '10', active: true }).values.subtitle, null);
  assert.ok(validateOffer({ subtitle: 'x'.repeat(23), text30: '10', text50: '', active: true }).errors.subtitle);
  assert.equal(validateOffer({ subtitle: 'x'.repeat(22), text30: '10', text50: '', active: true }).errors.subtitle, undefined);
});

test('variação > 30%: 590 -> 59 pede confirmação com a mensagem do card; 30% exatos não', () => {
  const saved = { price_30: 380, price_50: 590 };
  const big = bigVariations(saved, { price_30: 380, price_50: 59 });
  assert.equal(big.length, 1);
  assert.equal(nb(variationMessage(big)), 'Era R$ 590,00, agora R$ 59,00. Confirma?');
  assert.equal(bigVariations(saved, { price_30: 380, price_50: 767 }).length, 0);          // +30% exato
  assert.equal(bigVariations(saved, { price_30: 380, price_50: 767.01 }).length, 1);
  assert.equal(bigVariations(saved, { price_30: 380, price_50: 413 }).length, 0);          // -30% exato
  assert.equal(bigVariations(saved, { price_30: 266, price_50: 590 }).length, 0);          // -30% exato
  assert.equal(bigVariations(saved, { price_30: 265.99, price_50: 590 }).length, 1);
  assert.equal(bigVariations({ price_30: null, price_50: 590 }, { price_30: 9999, price_50: 590 }).length, 0); // sem valor salvo
  assert.equal(bigVariations(saved, { price_30: null, price_50: 590 }).length, 0);         // limpar não é "variação"
  const two = bigVariations(saved, { price_30: 38, price_50: 59 });
  assert.match(nb(variationMessage(two)), /Barril 30L: era R\$ 380,00, agora R\$ 38,00\. Barril 50L: era R\$ 590,00, agora R\$ 59,00\. Confirma\?$/);
});

test('isDirty compara valores normalizados', () => {
  const saved = { subtitle: 'A', price_30: 1, price_50: null, active: true };
  assert.equal(isDirty(saved, { subtitle: 'A', price_30: 1, price_50: null, active: true }), false);
  assert.equal(isDirty(saved, { subtitle: null, price_30: 1, price_50: null, active: true }), true);
  assert.equal(isDirty(saved, { subtitle: 'A', price_30: 1, price_50: null, active: false }), true);
  assert.equal(isDirty({ ...saved, subtitle: null }, { subtitle: null, price_30: 1, price_50: null, active: true }), false);
});

test('formatBRL', () => assert.equal(nb(formatBRL(590)), 'R$ 590,00'));
