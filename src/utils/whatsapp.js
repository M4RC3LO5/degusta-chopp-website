import { TYPES, BRANDS, getPrice, formatPrice, PROMO_MIN_LITERS } from '../data/products.js';

export function buildWhatsAppMessage(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return '';
  }

  let totalLiters = 0;
  let totalPrice = 0;
  const validItemLines = [];
  let itemCounter = 0;

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const { typeId, brandId, size, qty } = item;

    const type = TYPES.find(t => t.id === typeId);
    const brand = BRANDS.find(b => b.id === brandId);
    const unitPrice = getPrice(typeId, brandId, size);

    if (!type || !brand || unitPrice === null || unitPrice === undefined) {
      continue;
    }

    const itemQty = Number(qty) || 1;
    const lineSubtotal = unitPrice * itemQty;
    const lineLiters = size * itemQty;

    totalPrice += lineSubtotal;
    totalLiters += lineLiters;
    itemCounter += 1;

    validItemLines.push(
      `*${itemCounter}.* ${type.name} — ${brand.name}\n    ${itemQty}x barril de ${size}L ....... ${formatPrice(lineSubtotal)}`
    );
  }

  if (validItemLines.length === 0) {
    return '';
  }

  const itemsFormatted = validItemLines.join('\n\n');
  const promoLine = totalLiters >= PROMO_MIN_LITERS
    ? '✅ *Chopeira inclusa (cortesia)*'
    : 'Locação de chopeira: a combinar';

  return `*🍺 ORÇAMENTO — DEGUSTA CHOPP*
━━━━━━━━━━━━━━━━━━

${itemsFormatted}

━━━━━━━━━━━━━━━━━━
*Total:* ${totalLiters} litros
*Valor:* ${formatPrice(totalPrice)}
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

export function buildWhatsAppUrl(items) {
  const message = buildWhatsAppMessage(items);
  return `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(message)}`;
}
