// FONTE ÚNICA de limites e permissões do admin.
// Os valores espelham os `check` de supabase/migrations/0001_schema.sql e 0002_storage.sql.
// Mudou lá? Mude aqui (e vice-versa).

export const USERNAME_DOMAIN = 'usuarios.degustachopp.local';

export const RULES = {
  username: { regex: /^[a-z0-9._-]{3,20}$/, min: 3, max: 20 },
  fullName: { min: 2, max: 60 },
  password: { min: 8 },
  brand: { slug: /^[a-z0-9-]{2,30}$/, name: { min: 2, max: 20 } },
  flavor: {
    slug: /^[a-z0-9-]{2,30}$/,
    name: { min: 2, max: 20 },
    abv: { min: 0, max: 15, step: 0.1 },
    ibu: { min: 0, max: 120 },
    description: { min: 10, max: 120 },
    idealFor: { min: 5, max: 45 },
    badge: { max: 18 },
    badgeColors: ['amber', 'emerald', 'yellow', 'purple', 'orange']
  },
  offer: {
    subtitleMax: 22,
    subtitleWarnAt: 0.9,        // contador âmbar a partir de 90% do limite
    priceMin: 0,                // preço precisa ser > priceMin
    priceMax: 5000,             // e <= priceMax
    sizes: [30, 50],            // litros (fixos nesta fase)
    variationPct: 0.3,          // variação > 30% do valor salvo pede confirmação
    undoSeconds: 10             // janela do "Desfazer" depois de salvar
  },
  settings: {
    whatsapp: /^55[1-9][0-9]{9,10}$/,
    promoMinLiters: { min: 0, max: 500 },
    businessHours: { max: 80 },
    regions: { max: 160 },
    paymentInfo: { max: 120 },
    instagram: /^[a-z0-9._]{1,30}$/,
    storeLat: { min: -90, max: 90 },
    storeLng: { min: -180, max: 180 },
    storeRadiusM: { min: 50, max: 50000 }
  },
  images: {
    bucket: 'catalog',
    bucketMaxBytes: 204800,
    bucketMime: ['image/webp'],
    brandLogo: { ratio: '1:1', width: 400, height: 400, maxBytes: 60 * 1024, minInput: [200, 200] },
    flavorGlass: { ratio: '2:3', width: 400, height: 600, maxBytes: 80 * 1024, minInput: [400, 600] },
    compress: { startQuality: 0.85, step: 0.05, minQuality: 0.5 },   // desce de 0.05 até caber; abaixo de 0.5 recusa
    inputMaxBytes: 5 * 1024 * 1024,
    inputTypes: ['image/jpeg', 'image/png', 'image/webp']
  }
};

export const ROLES = { dono: 'dono', gerente: 'gerente', operador: 'operador' };

export const ROLE_LABELS = { dono: 'Dono', gerente: 'Gerente', operador: 'Operador' };

// Descrição de cada perfil (espelha a tabela de permissões da Fase 1).
export const ROLE_DESCRIPTIONS = {
  dono: 'Acesso total: Marcas, Sabores, Preços, Ponto, Configurações, Histórico e Usuários.',
  gerente: 'Marcas, Sabores, Preços, Ponto (com espelho de todos), Configurações e Histórico. Não gerencia usuários.',
  operador: 'Marcas, Sabores, Preços e o próprio Ponto. Sem Configurações, Histórico e Usuários.'
};

export const USERS_NOTICE = 'Mantenha pelo menos 2 usuários com perfil Dono.';

// Rotas do admin (relativas a /admin) e quem pode acessar. Ordem = ordem da barra inferior.
// `more: true` = vai para o menu "Mais". `hidden: true` = existe como rota, sem item na barra.
export const ADMIN_ROUTES = [
  { path: 'marcas', label: 'Marcas', icon: 'award', roles: ['dono', 'gerente', 'operador'] },
  { path: 'sabores', label: 'Sabores', icon: 'beer', roles: ['dono', 'gerente', 'operador'] },
  { path: 'precos', label: 'Preços', icon: 'tag', roles: ['dono', 'gerente', 'operador'] },
  { path: 'ponto', label: 'Ponto', icon: 'clock', roles: ['dono', 'gerente', 'operador'] },
  { path: 'ponto/espelho', label: 'Espelho de ponto', icon: 'clock', roles: ['dono', 'gerente'], hidden: true },
  { path: 'privacidade-ponto', label: 'Privacidade do ponto', icon: 'shield', roles: ['dono', 'gerente', 'operador'], more: true },
  { path: 'config', label: 'Config.', icon: 'settings', roles: ['dono', 'gerente'], more: true },
  { path: 'historico', label: 'Histórico', icon: 'history', roles: ['dono', 'gerente'], more: true },
  { path: 'usuarios', label: 'Usuários', icon: 'users', roles: ['dono'], more: true }
];

export function routesForRole(role) {
  return ADMIN_ROUTES.filter(r => !r.hidden && r.roles.includes(role));
}

// Barra inferior: { primary, more }. Marcas · Sabores · Preços · Ponto + "Mais" (Card 13: todos os perfis têm
// "Privacidade do ponto" em "Mais"; Config., Histórico e Usuários seguem lá, por perfil).
export function navLayout(role) {
  const items = routesForRole(role);
  return { primary: items.filter(r => !r.more), more: items.filter(r => r.more) };
}

export function canAccess(role, path) {
  return ADMIN_ROUTES.some(r => r.path === path && r.roles.includes(role));
}

// Tela inicial após o login: Preços para todos os perfis (não é mais o 1º item da barra).
// Na Fase 2 dono e gerente passam a ter o Dashboard.
export const HOME_PATH = 'precos';
export function homePathForRole() {
  return HOME_PATH;
}

export function usernameToEmail(username) {
  return `${username}@${USERNAME_DOMAIN}`;
}

export const MESSAGES = {
  badCredentials: 'Usuário ou senha incorretos.',
  inactive: 'Seu acesso está desativado. Fale com o responsável.',
  rateLimited: 'Muitas tentativas. Aguarde alguns minutos.',
  network: 'Não foi possível conectar. Verifique a internet e tente de novo.',
  forgot: 'Esqueceu a senha? Fale com o responsável.'
};
