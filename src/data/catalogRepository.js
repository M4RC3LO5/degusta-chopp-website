import {
  BRANDS as STATIC_BRANDS,
  TYPES as STATIC_TYPES,
  SIZES,
  PRICES as STATIC_PRICES,
  PROMO_MIN_LITERS as STATIC_PROMO_MIN_LITERS
} from './products.js';

const STATIC_WHATSAPP = '5511991069099';

// Valores atuais do site: servem de fallback se o Supabase falhar ou se um campo vier inválido.
export const STATIC_SETTINGS = {
  businessHours: 'Segunda a Sábado das 08h às 20h',
  regions: 'São Paulo (Capital), Grande SP, Região do ABC, Osasco, Barueri, Alphaville e Guarulhos.',
  paymentInfo: 'Pix, Cartões de Crédito (até 12x) e Débito no momento da entrega.',
  instagram: 'degustachopp'
};

const text = (value, fallback) => (typeof value === 'string' && value.trim() ? value.trim() : fallback);
const LOAD_TIMEOUT_MS = 3000;

const BADGE_COLORS = {
  amber: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
  emerald: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
  yellow: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300',
  purple: 'bg-purple-500/20 border-purple-500/40 text-purple-300',
  orange: 'bg-orange-500/20 border-orange-500/40 text-orange-300'
};

// Fallback: textos, imagens e contatos do products.js, mas SEM nenhum valor.
// Tamanho presente com null = "oferecido, preço a consultar".
export function buildFallbackCatalog() {
  const PRICES = {};
  for (const [typeId, brands] of Object.entries(STATIC_PRICES)) {
    PRICES[typeId] = {};
    for (const [brandId, entry] of Object.entries(brands)) {
      PRICES[typeId][brandId] = {
        subtitle: entry.subtitle,
        available: entry.available,
        ...(30 in entry ? { 30: null } : {}),
        ...(50 in entry ? { 50: null } : {})
      };
    }
  }
  return {
    BRANDS: STATIC_BRANDS.map(b => ({ ...b, fallbackLogo: b.logo })),
    TYPES: STATIC_TYPES.map(t => ({ ...t, fallbackImage: t.image })),
    SIZES,
    PRICES,
    PROMO_MIN_LITERS: STATIC_PROMO_MIN_LITERS,
    whatsapp: STATIC_WHATSAPP,
    settings: { ...STATIC_SETTINGS },
    pricesAvailable: false,
    source: 'fallback'
  };
}

function publicImageUrl(baseUrl, path) {
  return path ? `${baseUrl}/storage/v1/object/public/catalog/${path}` : null;
}

function mapCatalog({ brands, flavors, offers, settings }, baseUrl) {
  const brandById = new Map();
  const BRANDS = brands.map(b => {
    const local = `/logos/${b.slug}.webp`;
    const mapped = {
      id: b.slug,
      name: b.name,
      logo: publicImageUrl(baseUrl, b.logo_path) || local,
      fallbackLogo: local
    };
    brandById.set(b.id, mapped);
    return mapped;
  });

  const flavorById = new Map();
  const mappedFlavors = flavors.map(f => {
    const local = `/configurator/copo-${f.slug}.webp`;
    const staticType = STATIC_TYPES.find(t => t.id === f.slug);
    const mapped = {
      id: f.slug,
      name: f.name,
      abv: `${Number(f.abv).toFixed(1)}%`,
      ibu: `${f.ibu} IBU`,
      image: publicImageUrl(baseUrl, f.image_path) || local,
      fallbackImage: local,
      description: f.description,
      idealFor: f.ideal_for,
      badge: f.badge || null,
      badgeColor: BADGE_COLORS[f.badge_color] || BADGE_COLORS.amber,
      icon: staticType?.icon || '🍺'
    };
    flavorById.set(f.id, mapped);
    return mapped;
  });

  // Só ofertas ativas cujo sabor E marca estão ativos (carregados). Preço vazio não exclui a oferta.
  const PRICES = {};
  for (const o of offers) {
    const flavor = flavorById.get(o.flavor_id);
    const brand = brandById.get(o.brand_id);
    if (!flavor || !brand) continue;
    // Card 12: oferta ativa sem preço continua oferecida nos dois tamanhos; valor null = "Valor a consultar".
    const toPrice = (v) => (v === null || v === undefined ? null : Number(v));
    const entry = { subtitle: o.subtitle || '', available: true, 30: toPrice(o.price_30), 50: toPrice(o.price_50) };
    (PRICES[flavor.id] ||= {})[brand.id] = entry;
  }

  // Sabor sem nenhuma oferta ativa não aparece.
  const TYPES = mappedFlavors.filter(f => PRICES[f.id] && Object.keys(PRICES[f.id]).length > 0);
  if (TYPES.length === 0) throw new Error('catálogo sem ofertas ativas');

  const whatsapp = settings?.whatsapp && /^55[1-9][0-9]{9,10}$/.test(settings.whatsapp)
    ? settings.whatsapp
    : STATIC_WHATSAPP;
  const promo = Number.isInteger(settings?.promo_min_liters) ? settings.promo_min_liters : STATIC_PROMO_MIN_LITERS;

  // Instagram vazio no banco = sem link (o dono removeu); campo ausente/inválido = valor atual do site.
  const instagram = settings && settings.instagram === null
    ? ''
    : (typeof settings?.instagram === 'string' && /^[a-z0-9._]{1,30}$/.test(settings.instagram) ? settings.instagram : STATIC_SETTINGS.instagram);
  const siteSettings = {
    businessHours: text(settings?.business_hours, STATIC_SETTINGS.businessHours),
    regions: text(settings?.regions, STATIC_SETTINGS.regions),
    paymentInfo: text(settings?.payment_info, STATIC_SETTINGS.paymentInfo),
    instagram
  };

  return { BRANDS, TYPES, SIZES, PRICES, PROMO_MIN_LITERS: promo, whatsapp, settings: siteSettings, pricesAvailable: true, source: 'supabase' };
}

// Leitura pública via REST (PostgREST) com fetch nativo: zero dependência no bundle da landing.
// O supabase-js fica reservado ao admin (/admin), que precisa de Auth.
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

async function rest(path, signal) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Accept: 'application/json' },
    signal
  });
  if (!response.ok) throw new Error(`REST ${response.status} em ${path.split('?')[0]}`);
  return response.json();
}

async function fetchFromSupabase(signal) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Supabase não configurado');

  const [brands, flavors, offers, settingsRows] = await Promise.all([
    rest('brands?select=*&active=eq.true&order=sort_order', signal),
    rest('flavors?select=*&active=eq.true&order=sort_order', signal),
    rest('offers?select=*&active=eq.true', signal),
    rest('settings?select=*&id=eq.1', signal)
  ]);

  if (!brands?.length || !flavors?.length || !offers?.length) {
    throw new Error('resposta sem marcas, sabores ou ofertas');
  }
  return mapCatalog({ brands, flavors, offers, settings: settingsRows?.[0] || null }, SUPABASE_URL);
}

/**
 * Carrega o catálogo ativo do Supabase no mesmo formato do products.js
 * (BRANDS, TYPES, PRICES, PROMO_MIN_LITERS) + whatsapp + pricesAvailable.
 * Qualquer erro ou timeout (3 s) devolve o fallback SEM preços.
 */
export async function loadCatalog({ timeoutMs = LOAD_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`timeout de ${timeoutMs}ms`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([fetchFromSupabase(controller.signal), timeout]);
  } catch (err) {
    console.warn('[catalog] fallback', err?.message || err);
    return buildFallbackCatalog();
  } finally {
    clearTimeout(timer);
  }
}
