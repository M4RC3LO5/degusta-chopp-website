// Funções PURAS da tela de Preços (máscara BRL, validação, variação). Limites vêm de rules.js.
import { RULES } from './rules.js';

const { subtitleMax, priceMin, priceMax, sizes, variationPct } = RULES.offer;

export function formatBRL(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// Máscara enquanto digita: só dígitos, "-" inicial (para recusar negativo com mensagem), vírgula como
// separador decimal (até 2 casas) e ponto como milhar. Ponto digitado nunca vira decimal.
export function maskPriceInput(raw) {
  let s = String(raw ?? '').replace(/[^\d.,-]/g, '');
  const negative = s.startsWith('-');
  s = s.replace(/-/g, '');
  let intPart = s;
  let decPart = null;
  const comma = s.indexOf(',');
  if (comma >= 0) {
    intPart = s.slice(0, comma);
    decPart = s.slice(comma + 1).replace(/[.,]/g, '').slice(0, 2);
  }
  intPart = intPart.replace(/\./g, '').replace(/^0+(?=\d)/, '').slice(0, 6);
  if (intPart === '' && decPart !== null) intPart = '0';
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (negative ? '-' : '') + grouped + (decPart !== null ? `,${decPart}` : '');
}

// Texto -> { value: number|null, error: string }. Vazio = "Valor a consultar" no site (value null, sem erro).
export function parsePriceText(text) {
  const t = String(text ?? '').trim();
  if (t === '' || t === '-') return { value: null, error: t === '-' ? 'O preço não pode ser negativo.' : '' };
  const n = Number(t.replace(/\./g, '').replace(',', '.'));
  if (Number.isNaN(n)) return { value: null, error: 'Valor inválido.' };
  if (n < 0) return { value: null, error: 'O preço não pode ser negativo.' };
  if (n <= priceMin) return { value: null, error: 'O preço deve ser maior que zero. Deixe em branco para mostrar "Valor a consultar" no site.' };
  if (n > priceMax) return { value: null, error: `O preço máximo é ${formatBRL(priceMax)}.` };
  return { value: Math.round(n * 100) / 100, error: '' };
}

// number|null -> texto do campo ("590,00"); null -> ""
export function priceToText(value) {
  if (value === null || value === undefined) return '';
  return maskPriceInput(Number(value).toFixed(2).replace('.', ','));
}

// Ao sair do campo: completa os centavos ("590" -> "590,00"), se o valor for válido.
export function finalizePriceText(text) {
  const { value, error } = parsePriceText(text);
  return !error && value !== null ? priceToText(value) : text;
}

export function normalizeSubtitle(text) {
  const t = String(text ?? '').trim();
  return t === '' ? null : t;
}

// draft = { subtitle, text30, text50, active }. Devolve { errors, values }.
export function validateOffer(draft) {
  const errors = {};
  const p30 = parsePriceText(draft.text30);
  const p50 = parsePriceText(draft.text50);
  if (p30.error) errors.p30 = p30.error;
  if (p50.error) errors.p50 = p50.error;
  const subtitle = normalizeSubtitle(draft.subtitle);
  if (subtitle !== null && subtitle.length > subtitleMax) errors.subtitle = `O subtítulo pode ter no máximo ${subtitleMax} caracteres.`;
  // Card 12: os dois preços podem ficar vazios (o site mostra "Valor a consultar").
  return { errors, values: { subtitle, price_30: p30.value, price_50: p50.value, active: Boolean(draft.active) } };
}

const same = (a, b) => (a ?? null) === (b ?? null);

export function isDirty(saved, values) {
  return !(same(saved.subtitle, values.subtitle) && same(saved.price_30, values.price_30)
    && same(saved.price_50, values.price_50) && Boolean(saved.active) === values.active);
}

// Tamanhos cuja variação passa de 30% do valor salvo (ambos precisam existir).
export function bigVariations(saved, values) {
  const out = [];
  for (const size of sizes) {
    const from = saved[`price_${size}`];
    const to = values[`price_${size}`];
    if (from === null || from === undefined || to === null || to === undefined || from <= 0) continue;
    if (Math.abs(to - from) / from > variationPct + 1e-9) out.push({ size, from, to });
  }
  return out;
}

export function variationMessage(changes) {
  if (changes.length === 1) return `Era ${formatBRL(changes[0].from)}, agora ${formatBRL(changes[0].to)}. Confirma?`;
  return changes.map(c => `Barril ${c.size}L: era ${formatBRL(c.from)}, agora ${formatBRL(c.to)}.`).join(' ') + ' Confirma?';
}
