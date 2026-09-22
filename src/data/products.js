export const BRANDS = [
  { id: 'bru', name: 'Bru', logo: '/logos/bru.webp' },
  { id: 'germania', name: 'Germânia', logo: '/logos/germania.webp' },
  { id: 'brahma', name: 'Brahma', logo: '/logos/brahma.webp' }
];

export const TYPES = [
  {
    id: 'pilsen',
    name: 'Chopp Pilsen',
    abv: '4.5%',
    ibu: '12 IBU',
    image: '/configurator/copo-pilsen.webp',
    description: 'Leve, refrescante e muito cremoso. O clássico indispensável para qualquer churrasco ou celebração.',
    idealFor: 'Churrascos, festas e reuniões familiares.',
    badge: 'MAIS PEDIDO',
    badgeColor: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
    icon: '🍺'
  },
  {
    id: 'escuro',
    name: 'Chopp Escuro',
    abv: '4.8%',
    ibu: '15 IBU',
    image: '/configurator/copo-escuro.webp',
    description: 'Notas sutilmente adocicadas e maltes torrados. Ideal para quem aprecia um chopp marcante e harmonioso.',
    idealFor: 'Noites frias, carnes e eventos noturnos.',
    badge: 'SABOR INCORPADO',
    badgeColor: 'bg-amber-600/20 border-amber-600/40 text-amber-400',
    icon: '🍻'
  },
  {
    id: 'puro-malte',
    name: 'Chopp Puro Malte',
    abv: '5.0%',
    ibu: '18 IBU',
    image: '/configurator/copo-puro-malte.webp',
    description: 'Feito exclusivamente com malte de cevada e lúpulos selecionados. Amargor equilibrado e aroma inconfundível.',
    idealFor: 'Apreciadores de cerveja puro malte.',
    badge: '100% MALTE',
    badgeColor: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
    icon: '🌾'
  },
  {
    id: 'ipa',
    name: 'Chopp IPA',
    abv: '6.2%',
    ibu: '45 IBU',
    image: '/configurator/copo-ipa.webp',
    description: 'Para amantes de lúpulo intenso! Aromas cítricos, amargor presente e colarinho denso e persistente.',
    idealFor: 'Hambúrgueres gourmet e carnes nobres.',
    badge: 'LUPULADO PREMIUM',
    badgeColor: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300',
    icon: '🍃'
  },
  {
    id: 'vinho',
    name: 'Chopp de Vinho',
    abv: '5.5%',
    ibu: '8 IBU',
    image: '/configurator/copo-vinho.webp',
    description: 'A combinação perfeita entre a leveza do chopp e o sabor marcante do vinho tinto de mesa. Doce e refrescante.',
    idealFor: 'Recepções, festas e comemorações.',
    badge: 'SUCESSO DAS FESTAS',
    badgeColor: 'bg-purple-500/20 border-purple-500/40 text-purple-300',
    icon: '🍇'
  }
];

export const SIZES = [
  { liters: 30, image: '/configurator/barril-30.webp' },
  { liters: 50, image: '/configurator/barril-50.webp' }
];

export const PRICES = {
  pilsen: {
    bru: { subtitle: 'Custo-benefício', available: true, 30: 380, 50: 590 },
    germania: { subtitle: 'Tradição artesanal', available: true, 30: 420, 50: 650 },
    brahma: { subtitle: 'Qualidade nacional', available: true, 30: 490, 50: 780 }
  },
  escuro: {
    bru: { subtitle: 'Maltes torrados', available: true, 30: 410, 50: 640 },
    germania: { subtitle: 'Dunkel tradicional', available: true, 30: 450, 50: 690 },
    brahma: { subtitle: 'Black cremoso', available: true, 30: 520, 50: 820 }
  },
  'puro-malte': {
    bru: { subtitle: 'Puro e equilibrado', available: true, 30: 430, 50: 670 },
    germania: { subtitle: 'Puro malte artesanal', available: true, 30: 470, 50: 720 },
    brahma: { subtitle: 'Brahma Duplo Malte', available: true, 30: 550, 50: 850 }
  },
  ipa: {
    bru: { subtitle: 'IPA aromática', available: true, 30: 480, 50: 760 },
    germania: { subtitle: 'IPA especial', available: true, 30: 520, 50: 810 },
    brahma: { subtitle: 'Colorado / IPA', available: true, 30: 590, 50: 920 }
  },
  vinho: {
    bru: { subtitle: 'Grape Beer cremoso', available: true, 30: 440, 50: 690 },
    germania: { subtitle: 'Vinho tradicional', available: true, 30: 480, 50: 740 },
    brahma: { subtitle: 'Seleção especial', available: true, 30: 560, 50: 880 }
  }
};

export const PROMO_MIN_LITERS = 50;
export const MAX_QTY_PER_ITEM = 99;

export function formatPrice(value) {
  if (typeof value !== 'number' || isNaN(value)) return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function getPrice(typeId, brandId, size) {
  const typePrices = PRICES[typeId];
  if (!typePrices) return null;
  const brandPrice = typePrices[brandId];
  if (!brandPrice || !brandPrice.available) return null;
  const val = brandPrice[size];
  return typeof val === 'number' ? val : null;
}
