import { ROLE_LABELS } from './rules.js';
import { storedToPhone } from './settingsRules.js';

// Diff legível do audit_log em português. Funções puras (testadas em historyDiff.test.js).

export const HISTORY_TYPES = [
  { id: 'all', label: 'Todos', tables: null },
  { id: 'preco', label: 'Preço', tables: ['offers'] },
  { id: 'marca', label: 'Marca', tables: ['brands'] },
  { id: 'sabor', label: 'Sabor', tables: ['flavors'] },
  { id: 'config', label: 'Configuração', tables: ['settings'] },
  { id: 'usuario', label: 'Usuário', tables: ['profiles'] }
];

const IGNORED = new Set(['updated_at', 'updated_by']);
const COLOR_LABELS = { amber: 'Âmbar', emerald: 'Verde', yellow: 'Amarelo', purple: 'Roxo', orange: 'Laranja' };
const brl = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v));
const quote = (v) => (v === null || v === undefined || v === '' ? 'vazio' : `"${v}"`);
const activeLabel = (v) => (v ? 'ativo' : 'inativo');

// "brands/<id>.webp?v=123" -> sem o ?v= (só para comparar o arquivo; o texto mostrado é sempre "Imagem trocada").
export function stripVersion(path) {
  return typeof path === 'string' ? path.split('?')[0] : path;
}

// Campos por tabela: { label(entidade) => texto do campo, fmt(valor) => texto do valor }.
// `image: true` = mostra só "Imagem trocada".
function fieldDefs(table) {
  const price = (size) => ({ label: `Preço ${size}L`, fmt: (v) => (v === null || v === undefined ? 'sem preço' : brl(v)) });
  const defs = {
    offers: {
      price_30: price(30),
      price_50: price(50),
      subtitle: { label: 'Subtítulo', fmt: quote },
      active: { label: 'Situação', fmt: activeLabel }
    },
    brands: {
      name: { label: 'Nome', fmt: quote },
      logo_path: { label: 'Logo', image: true },
      active: { label: 'Situação', fmt: activeLabel },
      sort_order: { label: 'Ordem', fmt: String }
    },
    flavors: {
      name: { label: 'Nome', fmt: quote },
      abv: { label: 'ABV', fmt: (v) => `${Number(v).toFixed(1).replace('.', ',')}%` },
      ibu: { label: 'IBU', fmt: String },
      description: { label: 'Descrição', fmt: quote },
      ideal_for: { label: 'Ideal para', fmt: quote },
      badge: { label: 'Selo', fmt: quote },
      badge_color: { label: 'Cor do selo', fmt: (v) => COLOR_LABELS[v] || v },
      image_path: { label: 'Imagem do copo', image: true },
      active: { label: 'Situação', fmt: activeLabel },
      sort_order: { label: 'Ordem', fmt: String }
    },
    settings: {
      whatsapp: { label: 'WhatsApp', fmt: (v) => storedToPhone(v) },
      promo_min_liters: { label: 'Litros mínimos para chopeira grátis', fmt: (v) => `${v}L` },
      business_hours: { label: 'Horário de atendimento', fmt: quote },
      regions: { label: 'Regiões atendidas', fmt: quote },
      payment_info: { label: 'Formas de pagamento', fmt: quote },
      instagram: { label: 'Instagram', fmt: (v) => (v ? `@${v}` : 'vazio') },
      store_lat: { label: 'Latitude da loja (ponto)', fmt: (v) => String(v).replace('.', ',') },
      store_lng: { label: 'Longitude da loja (ponto)', fmt: (v) => String(v).replace('.', ',') },
      store_radius_m: { label: 'Raio do ponto', fmt: (v) => `${v} m` }
    },
    profiles: {
      full_name: { label: 'Nome', fmt: quote },
      username: { label: 'Usuário', fmt: quote },
      role: { label: 'Perfil', fmt: (v) => ROLE_LABELS[v] || v },
      active: { label: 'Acesso', fmt: (v) => (v ? 'ativado' : 'desativado') }
    }
  };
  return defs[table] || {};
}

function entityLabel(row, ctx) {
  const data = row.new_data || row.old_data || {};
  switch (row.table_name) {
    case 'offers': {
      const flavor = ctx.flavors.get(data.flavor_id)?.name || 'sabor removido';
      const brand = ctx.brands.get(data.brand_id)?.name || 'marca removida';
      return `${flavor} · ${brand}`;
    }
    case 'brands':
    case 'flavors':
      return data.name || row.row_id;
    case 'settings':
      return 'Configurações do site';
    case 'profiles':
      return data.full_name || ctx.names.get(row.row_id) || data.username || 'usuário';
    default:
      return row.row_id;
  }
}

const KIND_LABEL = { offers: 'Oferta', brands: 'Marca', flavors: 'Sabor', settings: 'Configurações', profiles: 'Usuário' };

// Devolve { type, entity, lines: string[] }. `lines` nunca é vazio.
export function describeChange(row, ctx) {
  const entity = entityLabel(row, ctx);
  const type = HISTORY_TYPES.find(t => t.tables?.includes(row.table_name))?.id || 'all';
  const base = { type, entity };

  if (row.table_name === 'profiles' && row.action === 'RESET_PASSWORD') {
    return { ...base, lines: [`Senha redefinida de ${entity}`] };
  }

  if (row.action === 'INSERT') {
    const data = row.new_data || {};
    if (row.table_name === 'offers') {
      const parts = [];
      if (data.price_30 != null) parts.push(`30L ${brl(data.price_30)}`);
      if (data.price_50 != null) parts.push(`50L ${brl(data.price_50)}`);
      return { ...base, lines: [`Oferta criada: ${entity}${parts.length ? ` (${parts.join(', ')})` : ''}`] };
    }
    if (row.table_name === 'profiles') {
      return { ...base, lines: [`Usuário criado: ${entity} (${ROLE_LABELS[data.role] || data.role})`] };
    }
    return { ...base, lines: [`${KIND_LABEL[row.table_name] || 'Registro'} criado${row.table_name === 'brands' || row.table_name === 'flavors' ? `: ${entity}` : ''}`] };
  }

  const defs = fieldDefs(row.table_name);
  const oldD = row.old_data || {};
  const newD = row.new_data || {};
  const lines = [];

  for (const key of Object.keys(defs)) {
    if (IGNORED.has(key)) continue;
    const def = defs[key];
    const a = oldD[key];
    const b = newD[key];
    if (def.image) {
      if (a !== b) lines.push(`${def.label} de ${entity}: Imagem trocada`);   // ignora o ?v=: nunca mostra o caminho
      continue;
    }
    if (a === b || (a == null && b == null)) continue;
    if (row.table_name === 'offers' && key.startsWith('price_')) {
      lines.push(`${def.label} de ${entity}: ${def.fmt(a)} → ${def.fmt(b)}`);
    } else {
      lines.push(`${def.label} de ${entity}: ${a == null ? 'vazio' : def.fmt(a)} → ${b == null ? 'vazio' : def.fmt(b)}`);
    }
  }
  if (lines.length === 0) lines.push(`${entity}: salvo sem alteração visível`);
  return { ...base, lines };
}
