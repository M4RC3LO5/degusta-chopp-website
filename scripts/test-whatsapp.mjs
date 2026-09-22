import { buildWhatsAppMessage } from '../src/utils/whatsapp.js';

console.log('--- (a) 1 item: pilsen / bru / 30L / qty 1 (sem promo) ---');
console.log(buildWhatsAppMessage([{ typeId: 'pilsen', brandId: 'bru', size: 30, qty: 1 }]));
console.log('\n--------------------------------------------------\n');

console.log('--- (b) 1 item: pilsen / bru / 50L / qty 1 (com promo) ---');
console.log(buildWhatsAppMessage([{ typeId: 'pilsen', brandId: 'bru', size: 50, qty: 1 }]));
console.log('\n--------------------------------------------------\n');

console.log('--- (c) 2 itens: pilsen / bru / 30L / qty 1 + vinho / germania / 50L / qty 1 (com promo) ---');
console.log(buildWhatsAppMessage([
  { typeId: 'pilsen', brandId: 'bru', size: 30, qty: 1 },
  { typeId: 'vinho', brandId: 'germania', size: 50, qty: 1 }
]));
console.log('\n--------------------------------------------------\n');

console.log('--- (d) 1 item: ipa / brahma / 50L / qty 3 ---');
console.log(buildWhatsAppMessage([{ typeId: 'ipa', brandId: 'brahma', size: 50, qty: 3 }]));
console.log('\n--------------------------------------------------\n');

console.log('--- (e) array vazio ---');
const emptyResult = buildWhatsAppMessage([]);
console.log(`Resultado array vazio: "${emptyResult}" (tamanho: ${emptyResult.length})`);
console.log('\n--------------------------------------------------\n');
