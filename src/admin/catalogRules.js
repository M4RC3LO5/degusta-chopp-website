// Funções PURAS do Catálogo (slug, validação de imagem e de texto, ordem). Limites vêm de rules.js.
import { RULES } from './rules.js';

const KB = 1024;

// "Germânia Premium" -> "germania-premium" (sem acento; só a-z, 0-9 e hífen; até 30 caracteres)
export function slugify(name) {
  return String(name ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
    .replace(/-+$/g, '');
}

export function formatKB(bytes) {
  return `${Math.round(bytes / KB)} KB`;
}

// Valida o arquivo escolhido (tipo, tamanho e dimensões) ANTES do recorte. Devolve a mensagem ou ''.
export function validateImageFile({ type, size, width, height }, spec) {
  const { inputTypes, inputMaxBytes } = RULES.images;
  if (!inputTypes.includes(type)) return 'Use JPG, PNG ou WEBP.';
  if (size > inputMaxBytes) return `Arquivo grande demais: máximo ${Math.round(inputMaxBytes / KB / KB)} MB.`;
  const [minW, minH] = spec.minInput;
  if (width < minW || height < minH) return `Imagem muito pequena: mínimo ${minW}×${minH} px.`;
  return '';
}

// Qualidades tentadas, na ordem: 0.85, 0.80, ... 0.50
export function qualitySteps() {
  const { startQuality, step, minQuality } = RULES.images.compress;
  const out = [];
  for (let q = startQuality; q >= minQuality - 1e-9; q -= step) out.push(Math.round(q * 100) / 100);
  return out;
}

export function normalizeBadge(text) {
  return String(text ?? '').toUpperCase().slice(0, RULES.flavor.badge.max);
}

const len = (s) => String(s ?? '').trim().length;

export function validateBrand({ name }) {
  const errors = {};
  const { min, max } = RULES.brand.name;
  if (len(name) < min) errors.name = `O nome precisa ter pelo menos ${min} caracteres.`;
  else if (len(name) > max) errors.name = `O nome pode ter no máximo ${max} caracteres.`;
  else if (!RULES.brand.slug.test(slugify(name))) errors.name = 'Use letras ou números no nome.';
  return errors;
}

export function validateFlavor({ name, abv, ibu, description, idealFor, badge, badgeColor }) {
  const errors = {};
  const f = RULES.flavor;
  if (len(name) < f.name.min) errors.name = `O nome precisa ter pelo menos ${f.name.min} caracteres.`;
  else if (len(name) > f.name.max) errors.name = `O nome pode ter no máximo ${f.name.max} caracteres.`;
  else if (!f.slug.test(slugify(name))) errors.name = 'Use letras ou números no nome.';
  const abvN = Number(String(abv).replace(',', '.'));
  if (String(abv).trim() === '' || Number.isNaN(abvN) || abvN < f.abv.min || abvN > f.abv.max) errors.abv = `O teor alcoólico deve ficar entre ${f.abv.min} e ${f.abv.max}.`;
  else if (Math.abs(abvN * 10 - Math.round(abvN * 10)) > 1e-9) errors.abv = 'Use no máximo uma casa decimal (passo de 0,1).';
  const ibuN = Number(ibu);
  if (String(ibu).trim() === '' || !Number.isInteger(ibuN) || ibuN < f.ibu.min || ibuN > f.ibu.max) errors.ibu = `O IBU deve ser um número inteiro entre ${f.ibu.min} e ${f.ibu.max}.`;
  if (len(description) < f.description.min) errors.description = `A descrição precisa ter pelo menos ${f.description.min} caracteres.`;
  else if (len(description) > f.description.max) errors.description = `A descrição pode ter no máximo ${f.description.max} caracteres.`;
  if (len(idealFor) < f.idealFor.min) errors.idealFor = `Preencha com pelo menos ${f.idealFor.min} caracteres.`;
  else if (len(idealFor) > f.idealFor.max) errors.idealFor = `Pode ter no máximo ${f.idealFor.max} caracteres.`;
  if (String(badge ?? '').length > f.badge.max) errors.badge = `O selo pode ter no máximo ${f.badge.max} caracteres.`;
  if (!f.badgeColors.includes(badgeColor)) errors.badgeColor = 'Escolha uma cor.';
  return errors;
}

export function toFlavorRow({ name, abv, ibu, description, idealFor, badge, badgeColor }) {
  return {
    name: name.trim(),
    abv: Math.round(Number(String(abv).replace(',', '.')) * 10) / 10,
    ibu: Number(ibu),
    description: description.trim(),
    ideal_for: idealFor.trim(),
    badge: String(badge ?? '').trim() === '' ? null : normalizeBadge(badge).trim(),
    badge_color: badgeColor
  };
}

export function nextSortOrder(items) {
  return items.reduce((m, i) => Math.max(m, i.sort_order ?? 0), 0) + 1;
}

// Move o item uma posição (dir = -1 sobe, +1 desce) e devolve só as linhas cuja ordem mudou.
// A lista é renumerada 1..n (resolve empates antigos).
export function reorder(items, id, dir) {
  const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
  const from = sorted.findIndex(i => i.id === id);
  const to = from + dir;
  if (from < 0 || to < 0 || to >= sorted.length) return [];
  [sorted[from], sorted[to]] = [sorted[to], sorted[from]];
  return sorted.map((item, idx) => ({ id: item.id, from: item.sort_order, sort_order: idx + 1 })).filter(r => r.from !== r.sort_order);
}

export function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}
