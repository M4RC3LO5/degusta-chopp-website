// node --test src/utils/whatsapp.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWhatsAppMessage } from './whatsapp.js';

const nb = (s) => s.replace(/\u00a0/g, ' ');
const catalog = (pricesAvailable = true) => ({
  TYPES: [{ id: 'pilsen', name: 'Chopp Pilsen' }],
  BRANDS: [{ id: 'bru', name: 'Bru' }, { id: 'heineken', name: 'Heineken' }],
  PRICES: {
    pilsen: {
      bru: { subtitle: '', available: true, 30: 100, 50: null },          // 50L sem preço
      heineken: { subtitle: '', available: true, 30: null, 50: null }     // marca inteira sem preço
    }
  },
  PROMO_MIN_LITERS: 50,
  pricesAvailable
});

test('item sem preço entra na mensagem como "Valor a consultar"; o valor soma só o que tem preço', () => {
  const msg = nb(buildWhatsAppMessage([
    { typeId: 'pilsen', brandId: 'bru', size: 30, qty: 2 },
    { typeId: 'pilsen', brandId: 'bru', size: 50, qty: 1 }
  ], catalog()));
  assert.match(msg, /2x barril de 30L \.+ R\$ 200,00/);
  assert.match(msg, /1x barril de 50L \.+ Valor a consultar/);
  assert.match(msg, /\*Valor:\* R\$ 200,00 \(\+ itens a consultar\)/);
  assert.match(msg, /\*Total:\* 110 litros/);
});

test('todos os itens sem preço: Valor a consultar (sem somar R$ 0,00)', () => {
  const msg = buildWhatsAppMessage([{ typeId: 'pilsen', brandId: 'heineken', size: 30, qty: 1 }], catalog());
  assert.match(msg, /\*Valor:\* Valor a consultar/);
  assert.doesNotMatch(msg, /R\$ 0,00/);
});

test('todos com preço: igual a antes (sem sufixo)', () => {
  const msg = nb(buildWhatsAppMessage([{ typeId: 'pilsen', brandId: 'bru', size: 30, qty: 1 }], catalog()));
  assert.match(msg, /\*Valor:\* R\$ 100,00\n/);
  assert.doesNotMatch(msg, /consultar/);
});

test('fallback (Supabase fora): sem valores, "Valores a confirmar"', () => {
  const msg = buildWhatsAppMessage([{ typeId: 'pilsen', brandId: 'bru', size: 30, qty: 1 }], catalog(false));
  assert.match(msg, /\*Valor:\* Valores a confirmar/);
  assert.doesNotMatch(msg, /R\$/);
});
