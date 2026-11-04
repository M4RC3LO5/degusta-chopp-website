import { test } from 'node:test';
import assert from 'node:assert/strict';
import { maskPhone, phoneToStored, storedToPhone, validateSettings, normalizeInstagram } from './settingsRules.js';

test('máscara e conversão do WhatsApp', () => {
  assert.equal(maskPhone('11999999999'), '(11) 99999-9999');
  assert.equal(maskPhone('1134567890'), '(11) 3456-7890');
  assert.equal(maskPhone('119'), '(11) 9');
  assert.equal(phoneToStored('(11) 99999-9999'), '5511999999999');
  assert.equal(storedToPhone('5511991069099'), '(11) 99106-9099');
});

const ok = { whatsapp: '(11) 99999-9999', promoMinLiters: '50', businessHours: 'Seg a Sáb', regions: 'SP', paymentInfo: 'Pix', instagram: '@Degusta', storeLat: '-23,644057', storeLng: '-46.494256', storeRadiusM: '200' };

test('validação do formulário', () => {
  const r = validateSettings(ok);
  assert.deepEqual(r.errors, {});
  assert.equal(r.values.whatsapp, '5511999999999');
  assert.equal(r.values.instagram, 'degusta');
  assert.ok(validateSettings({ ...ok, whatsapp: '(11) 9999' }).errors.whatsapp);
  assert.ok(validateSettings({ ...ok, whatsapp: '(01) 99999-9999' }).errors.whatsapp);
  assert.ok(validateSettings({ ...ok, promoMinLiters: '501' }).errors.promoMinLiters);
  assert.ok(validateSettings({ ...ok, promoMinLiters: '' }).errors.promoMinLiters);
  assert.equal(validateSettings({ ...ok, promoMinLiters: '0' }).errors.promoMinLiters, undefined);
  assert.ok(validateSettings({ ...ok, businessHours: 'x'.repeat(81) }).errors.businessHours);
  assert.ok(validateSettings({ ...ok, regions: 'x'.repeat(161) }).errors.regions);
  assert.ok(validateSettings({ ...ok, paymentInfo: 'x'.repeat(121) }).errors.paymentInfo);
  assert.ok(validateSettings({ ...ok, instagram: 'a b' }).errors.instagram);
  assert.equal(validateSettings({ ...ok, instagram: '' }).values.instagram, null);
  assert.equal(normalizeInstagram('@@Foo'), 'foo');
});

test('localização da loja e raio', () => {
  const r = validateSettings(ok);
  assert.equal(r.values.store_lat, -23.644057);
  assert.equal(r.values.store_lng, -46.494256);
  assert.equal(r.values.store_radius_m, 200);
  assert.ok(validateSettings({ ...ok, storeLat: '91' }).errors.storeLat);
  assert.ok(validateSettings({ ...ok, storeLng: '-181' }).errors.storeLng);
  assert.ok(validateSettings({ ...ok, storeLat: '-23,1234567' }).errors.storeLat);
  assert.ok(validateSettings({ ...ok, storeRadiusM: '49' }).errors.storeRadiusM);
  assert.ok(validateSettings({ ...ok, storeRadiusM: '50001' }).errors.storeRadiusM);
  assert.equal(validateSettings({ ...ok, storeRadiusM: '50' }).errors.storeRadiusM, undefined);
});
