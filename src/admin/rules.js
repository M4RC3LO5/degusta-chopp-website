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
  offer: { subtitleMax: 22, priceMin: 0, priceMax: 5000 },
  settings: {
    whatsapp: /^55[1-9][0-9]{9,10}$/,
    promoMinLiters: { min: 0, max: 500 },
    businessHours: { max: 80 },
    regions: { max: 160 },
    paymentInfo: { max: 120 },
    instagram: /^[a-z0-9._]{1,30}$/
  },
  images: {
    bucket: 'catalog',
    bucketMaxBytes: 204800,
    bucketMime: ['image/webp'],
    brandLogo: { ratio: '1:1', width: 400, height: 400, maxBytes: 60 * 1024, minInput: [200, 200] },
    flavorGlass: { ratio: '2:3', width: 400, height: 600, maxBytes: 80 * 1024, minInput: [400, 600] },
    inputMaxBytes: 5 * 1024 * 1024,
    inputTypes: ['image/jpeg', 'image/png', 'image/webp']
  }
};

export const ROLES = { dono: 'dono', gerente: 'gerente', operador: 'operador' };

export const ROLE_LABELS = { dono: 'Dono', gerente: 'Gerente', operador: 'Operador' };

// Rotas do admin (relativas a /admin) e quem pode acessar. Ordem = ordem da barra inferior.
export const ADMIN_ROUTES = [
  { path: 'precos', label: 'Preços', icon: 'tag', roles: ['dono', 'gerente', 'operador'] },
  { path: 'catalogo', label: 'Catálogo', icon: 'beer', roles: ['dono', 'gerente', 'operador'] },
  { path: 'config', label: 'Config.', icon: 'settings', roles: ['dono', 'gerente'] },
  { path: 'historico', label: 'Histórico', icon: 'history', roles: ['dono', 'gerente'] },
  { path: 'usuarios', label: 'Usuários', icon: 'users', roles: ['dono'] }
];

export function routesForRole(role) {
  return ADMIN_ROUTES.filter(r => r.roles.includes(role));
}

export function canAccess(role, path) {
  return ADMIN_ROUTES.some(r => r.path === path && r.roles.includes(role));
}

// Home por perfil. Na Fase 2 dono e gerente passam a ter o Dashboard.
export function homePathForRole(role) {
  return routesForRole(role)[0]?.path || 'precos';
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
