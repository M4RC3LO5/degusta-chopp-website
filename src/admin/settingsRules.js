import { RULES } from './rules.js';

// Funções puras da tela Configurações (testadas em settingsRules.test.js).

// Só dígitos, sem o código do país, no máximo 11 (DDD + 9 dígitos).
export function nationalDigits(input) {
  let d = String(input ?? '').replace(/\D/g, '');
  return d.slice(0, 11);
}

// "11999999999" -> "(11) 99999-9999"; fixo "1134567890" -> "(11) 3456-7890"; parcial é mascarado aos poucos.
export function maskPhone(input) {
  const d = nationalDigits(input);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// "(11) 99999-9999" -> "5511999999999"
export function phoneToStored(masked) {
  return `55${nationalDigits(masked)}`;
}

// "5511999999999" -> "(11) 99999-9999"
export function storedToPhone(stored) {
  return maskPhone(String(stored ?? '').replace(/^55/, ''));
}

// Coordenada digitada ("-23,644057"): até 6 casas, dentro da faixa; null se inválida.
export function parseCoord(input, min, max) {
  const s = String(input ?? '').trim().replace(',', '.');
  if (!/^-?\d{1,3}(\.\d{1,6})?$/.test(s)) return null;
  const n = Number(s);
  return n >= min && n <= max ? n : null;
}

// Coordenada para os campos de Config: 6 casas, vírgula decimal.
export const fmtCoord = (n) => Number(n).toFixed(6).replace('.', ',');

export function normalizeInstagram(input) {
  return String(input ?? '').trim().replace(/^@+/, '').toLowerCase();
}

// Valida e normaliza o formulário. Devolve { errors, values } (values só é confiável sem erros).
export function validateSettings(form) {
  const S = RULES.settings;
  const errors = {};

  const whatsapp = phoneToStored(form.whatsapp);
  if (!S.whatsapp.test(whatsapp)) errors.whatsapp = 'Informe DDD + número. Ex.: (11) 99999-9999.';

  const raw = String(form.promoMinLiters ?? '').trim();
  const liters = Number(raw);
  if (raw === '' || !/^\d+$/.test(raw) || liters < S.promoMinLiters.min || liters > S.promoMinLiters.max) {
    errors.promoMinLiters = `Use um número inteiro de ${S.promoMinLiters.min} a ${S.promoMinLiters.max}.`;
  }

  const hours = String(form.businessHours ?? '').trim();
  if (!hours) errors.businessHours = 'Informe o horário de atendimento.';
  else if (hours.length > S.businessHours.max) errors.businessHours = `Máximo de ${S.businessHours.max} caracteres.`;

  const regions = String(form.regions ?? '').trim();
  if (!regions) errors.regions = 'Informe as regiões atendidas.';
  else if (regions.length > S.regions.max) errors.regions = `Máximo de ${S.regions.max} caracteres.`;

  const payment = String(form.paymentInfo ?? '').trim();
  if (!payment) errors.paymentInfo = 'Informe as formas de pagamento.';
  else if (payment.length > S.paymentInfo.max) errors.paymentInfo = `Máximo de ${S.paymentInfo.max} caracteres.`;

  const instagram = normalizeInstagram(form.instagram);
  if (instagram && !S.instagram.test(instagram)) errors.instagram = 'Use só letras minúsculas, números, ponto e _ (até 30), sem @.';

  const lat = parseCoord(form.storeLat, S.storeLat.min, S.storeLat.max);
  if (lat === null) errors.storeLat = 'Latitude entre -90 e 90, até 6 casas decimais. Ex.: -23,644057.';
  const lng = parseCoord(form.storeLng, S.storeLng.min, S.storeLng.max);
  if (lng === null) errors.storeLng = 'Longitude entre -180 e 180, até 6 casas decimais. Ex.: -46,494256.';
  const radiusRaw = String(form.storeRadiusM ?? '').trim();
  const radius = Number(radiusRaw);
  if (!/^\d+$/.test(radiusRaw) || radius < S.storeRadiusM.min || radius > S.storeRadiusM.max) {
    errors.storeRadiusM = `Use um número inteiro de ${S.storeRadiusM.min} a ${S.storeRadiusM.max} metros.`;
  }

  return {
    errors,
    values: {
      whatsapp,
      promo_min_liters: liters,
      business_hours: hours,
      regions,
      payment_info: payment,
      instagram: instagram || null,
      store_lat: lat,
      store_lng: lng,
      store_radius_m: radius
    }
  };
}

export function settingsToForm(row) {
  return {
    whatsapp: storedToPhone(row.whatsapp),
    promoMinLiters: String(row.promo_min_liters),
    businessHours: row.business_hours,
    regions: row.regions,
    paymentInfo: row.payment_info,
    instagram: row.instagram || '',
    storeLat: String(row.store_lat ?? '').replace('.', ','),
    storeLng: String(row.store_lng ?? '').replace('.', ','),
    storeRadiusM: String(row.store_radius_m ?? '')
  };
}

export function waTestUrl(masked) {
  return `https://wa.me/${phoneToStored(masked)}?text=${encodeURIComponent('Teste de WhatsApp — painel Degusta Chopp.')}`;
}
