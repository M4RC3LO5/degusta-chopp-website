import {
  TYPES as STATIC_TYPES,
  BRANDS as STATIC_BRANDS,
  PRICES as STATIC_PRICES,
  PROMO_MIN_LITERS as STATIC_PROMO_MIN_LITERS,
  getPrice,
  isOffered,
  formatPrice
} from '../data/products.js';

// `catalog` vem do CatalogContext. Sem ele (scripts/testes) usa o products.js estático, com preços.
const STATIC_CATALOG = {
  TYPES: STATIC_TYPES,
  BRANDS: STATIC_BRANDS,
  PRICES: STATIC_PRICES,
  PROMO_MIN_LITERS: STATIC_PROMO_MIN_LITERS,
  pricesAvailable: true,
  whatsapp: '5511991069099'
};

export function buildWhatsAppMessage(items, catalog = STATIC_CATALOG) {
  const { TYPES, BRANDS, PRICES, PROMO_MIN_LITERS, pricesAvailable } = catalog;
  if (!Array.isArray(items) || items.length === 0) {
    return '';
  }

  let totalLiters = 0;
  let totalPrice = 0;
  let pricedCount = 0;
  let hasUnpriced = false;
  const validItemLines = [];
  let itemCounter = 0;

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const { typeId, brandId, size, qty } = item;

    const type = TYPES.find(t => t.id === typeId);
    const brand = BRANDS.find(b => b.id === brandId);
    const unitPrice = getPrice(typeId, brandId, size, PRICES);

    if (!type || !brand || !isOffered(PRICES, typeId, brandId, size)) {
      continue;
    }
    const itemQty = Number(qty) || 1;
    const lineLiters = size * itemQty;

    totalLiters += lineLiters;
    itemCounter += 1;

    if (pricesAvailable && unitPrice === null) {
      // Card 12: oferta ativa sem preço entra na mensagem como "Valor a consultar" e fora da soma.
      hasUnpriced = true;
      validItemLines.push(
        `*${itemCounter}.* ${type.name} — ${brand.name}\n    ${itemQty}x barril de ${size}L ....... Valor a consultar`
      );
    } else if (pricesAvailable) {
      const lineSubtotal = unitPrice * itemQty;
      totalPrice += lineSubtotal;
      pricedCount += 1;
      validItemLines.push(
        `*${itemCounter}.* ${type.name} — ${brand.name}\n    ${itemQty}x barril de ${size}L ....... ${formatPrice(lineSubtotal)}`
      );
    } else {
      validItemLines.push(
        `*${itemCounter}.* ${type.name} — ${brand.name}\n    ${itemQty}x barril de ${size}L`
      );
    }
  }

  if (validItemLines.length === 0) {
    return '';
  }

  const itemsFormatted = validItemLines.join('\n\n');
  let valueLine = 'Valores a confirmar';
  if (pricesAvailable) {
    if (!hasUnpriced) valueLine = formatPrice(totalPrice);
    else valueLine = pricedCount > 0 ? `${formatPrice(totalPrice)} (+ itens a consultar)` : 'Valor a consultar';
  }
  const promoLine = totalLiters >= PROMO_MIN_LITERS
    ? '✅ *Chopeira inclusa (cortesia)*'
    : 'Locação de chopeira: a combinar';

  return `*🍺 ORÇAMENTO — DEGUSTA CHOPP*
━━━━━━━━━━━━━━━━━━

${itemsFormatted}

━━━━━━━━━━━━━━━━━━
*Total:* ${totalLiters} litros
*Valor:* ${valueLine}
${promoLine}
━━━━━━━━━━━━━━━━━━

📅 Data do evento:
📍 Endereço de entrega:
🕐 Horário:${WHATSAPP_SIGNATURE}`;
}

export const WHATSAPP_SIGNATURE = '\n\n---\n_Enviado pelo site degustachopp_';

// Fallback seguro para Node.js (scripts) vs Vite
const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
export const WHATSAPP_NUMBER = env.VITE_WHATSAPP_NUMBER || '5511991069099';

export function buildWhatsAppUrl(items, catalog = STATIC_CATALOG) {
  const message = buildWhatsAppMessage(items, catalog);
  const phone = catalog.whatsapp || WHATSAPP_NUMBER;
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
}
