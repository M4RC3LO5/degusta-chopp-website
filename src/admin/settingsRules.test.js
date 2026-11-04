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

const ok = { whatsapp: '(11) 99999-9999', promoMinLiters: '50', businessHours: 'Seg a Sáb', regions: 'SP', paymentInfo: 'Pix', instagram: '@Degusta' };

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
