// Regras de negócio da Edge Function admin-users, com dependências injetadas (Deps).
// index.ts liga as dependências reais (Supabase). Os testes usam dependências em memória.
// Nenhuma senha é registrada em log ou em audit_log.

export type Role = 'dono' | 'gerente' | 'operador';
export const ROLES: readonly Role[] = ['dono', 'gerente', 'operador'];

export const USERNAME_DOMAIN = 'usuarios.degustachopp.local';
const USERNAME_RE = /^[a-z0-9._-]{3,20}$/;                       // = profiles.username check
const FULL_NAME = { min: 2, max: 60 };                           // = profiles.full_name check
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ProfileRow {
  id: string;
  username: string;
  full_name: string;
  role: Role;
  active: boolean;
  must_change_password: boolean;
  created_at?: string;
}

export interface AuditEntry {
  table_name: 'profiles';
  row_id: string;
  action: 'INSERT' | 'UPDATE' | 'RESET_PASSWORD';
  changed_by: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
}

export interface Deps {
  verifyToken(jwt: string): Promise<string | null>;               // id do usuário dono do JWT, ou null
  getProfile(id: string): Promise<ProfileRow | null>;
  getProfileByUsername(username: string): Promise<ProfileRow | null>;
  countActiveOwners(excludeId?: string): Promise<number>;
  createAuthUser(email: string, password: string): Promise<{ id: string }>;   // lança HttpError(409) se já existe
  deleteAuthUser(id: string): Promise<void>;                      // só para desfazer uma criação que falhou
  setAuthPassword(id: string, password: string): Promise<void>;
  setBan(id: string, banned: boolean): Promise<void>;
  revokeSessionsWithPassword(email: string, password: string): Promise<boolean>;
  insertProfile(row: Omit<ProfileRow, 'created_at'>): Promise<ProfileRow>;
  updateProfile(id: string, patch: Partial<Pick<ProfileRow, 'role' | 'active' | 'must_change_password'>>): Promise<ProfileRow>;
  insertAudit(entry: AuditEntry): Promise<void>;
  generatePassword(): string;
  log(message: string): void;
}

export class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

const publicFields = (p: ProfileRow) => ({
  id: p.id, username: p.username, full_name: p.full_name, role: p.role, active: p.active, must_change_password: p.must_change_password
});

const emailFor = (username: string) => `${username}@${USERNAME_DOMAIN}`;

export function createHandler(deps: Deps) {
  const requireTarget = async (userId: unknown): Promise<ProfileRow> => {
    if (typeof userId !== 'string' || !UUID_RE.test(userId)) throw new HttpError(400, 'invalid_user_id', 'user_id inválido.');
    const target = await deps.getProfile(userId);
    if (!target) throw new HttpError(404, 'not_found', 'Usuário não encontrado.');
    return target;
  };

  const lastOwnerError = () =>
    new HttpError(409, 'last_owner', 'Não é possível: este é o último dono ativo. Mantenha pelo menos 2 usuários com perfil Dono.');

  async function create(callerId: string, body: Record<string, unknown>) {
    const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
    const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : '';
    const role = body.role as Role;
    if (!USERNAME_RE.test(username)) throw new HttpError(400, 'invalid_username', 'Usuário inválido: use 3 a 20 caracteres (a-z, 0-9, ponto, hífen, sublinhado).');
    if (fullName.length < FULL_NAME.min || fullName.length > FULL_NAME.max) throw new HttpError(400, 'invalid_full_name', 'Nome deve ter de 2 a 60 caracteres.');
    if (!ROLES.includes(role)) throw new HttpError(400, 'invalid_role', 'Perfil inválido.');
    if (await deps.getProfileByUsername(username)) throw new HttpError(409, 'username_taken', 'Esse usuário já existe.');

    const password = deps.generatePassword();
    const created = await deps.createAuthUser(emailFor(username), password);   // 409 se o e-mail interno já existe
    let profile: ProfileRow;
    try {
      profile = await deps.insertProfile({ id: created.id, username, full_name: fullName, role, active: true, must_change_password: true });
    } catch (err) {
      await deps.deleteAuthUser(created.id).catch(() => deps.log('rollback da criação falhou'));
      if (err instanceof HttpError) throw err;
      throw new HttpError(500, 'internal', 'Não foi possível criar o usuário.');
    }
    await deps.insertAudit({ table_name: 'profiles', row_id: profile.id, action: 'INSERT', changed_by: callerId, old_data: null, new_data: publicFields(profile) });
    return { ok: true, user: profile, temp_password: password };
  }

  async function resetPassword(callerId: string, body: Record<string, unknown>) {
    const target = await requireTarget(body.user_id);
    const password = deps.generatePassword();
    await deps.setAuthPassword(target.id, password);
    const updated = await deps.updateProfile(target.id, { must_change_password: true });
    // Revoga as sessões antigas: entra com a senha nova só para fazer signOut global (a sessão não é mantida).
    const revoked = await deps.revokeSessionsWithPassword(emailFor(target.username), password).catch(() => false);
    if (!revoked) deps.log('reset_password: sessões antigas não puderam ser revogadas por login (usuário desativado?)');
    await deps.insertAudit({ table_name: 'profiles', row_id: target.id, action: 'RESET_PASSWORD', changed_by: callerId, old_data: publicFields(target), new_data: publicFields(updated) });
    return { ok: true, user: updated, temp_password: password, sessions_revoked: revoked };
  }

  async function setActive(callerId: string, body: Record<string, unknown>) {
    const target = await requireTarget(body.user_id);
    if (typeof body.active !== 'boolean') throw new HttpError(400, 'invalid_active', 'active deve ser true ou false.');
    const active = body.active;
    if (target.active === active) return { ok: true, user: target, unchanged: true };

    if (!active && target.role === 'dono' && (await deps.countActiveOwners(target.id)) === 0) throw lastOwnerError();

    let updated: ProfileRow;
    if (active) {
      await deps.setBan(target.id, false);                              // reativar: ban_duration 'none'
      updated = await deps.updateProfile(target.id, { active: true });
    } else {
      updated = await deps.updateProfile(target.id, { active: false });
      try {
        await deps.setBan(target.id, true);                             // desativar: ban longo (derruba refresh e Auth)
      } catch (err) {
        await deps.updateProfile(target.id, { active: true });          // não deixa meio desativado
        throw err;
      }
      // Pós-checagem contra corrida entre dois pedidos simultâneos.
      if (target.role === 'dono' && (await deps.countActiveOwners()) === 0) {
        await deps.setBan(target.id, false);
        await deps.updateProfile(target.id, { active: true });
        throw lastOwnerError();
      }
    }
    await deps.insertAudit({ table_name: 'profiles', row_id: target.id, action: 'UPDATE', changed_by: callerId, old_data: publicFields(target), new_data: publicFields(updated) });
    return { ok: true, user: updated };
  }

  async function setRole(callerId: string, body: Record<string, unknown>) {
    const target = await requireTarget(body.user_id);
    const role = body.role as Role;
    if (!ROLES.includes(role)) throw new HttpError(400, 'invalid_role', 'Perfil inválido.');
    if (target.role === role) return { ok: true, user: target, unchanged: true };

    const demotingActiveOwner = target.role === 'dono' && target.active && role !== 'dono';
    if (demotingActiveOwner && (await deps.countActiveOwners(target.id)) === 0) throw lastOwnerError();

    const updated = await deps.updateProfile(target.id, { role });
    if (demotingActiveOwner && (await deps.countActiveOwners()) === 0) {
      await deps.updateProfile(target.id, { role: 'dono' });
      throw lastOwnerError();
    }
    await deps.insertAudit({ table_name: 'profiles', row_id: target.id, action: 'UPDATE', changed_by: callerId, old_data: publicFields(target), new_data: publicFields(updated) });
    return { ok: true, user: updated };
  }

  return async function handle(req: Request): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (req.method !== 'POST') return json(405, { ok: false, error: { code: 'method_not_allowed', message: 'Use POST.' } });

    try {
      const header = req.headers.get('authorization') || '';
      const jwt = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
      if (!jwt) throw new HttpError(401, 'unauthorized', 'Sessão ausente.');
      const callerId = await deps.verifyToken(jwt);
      if (!callerId) throw new HttpError(401, 'unauthorized', 'Sessão inválida ou expirada.');

      const caller = await deps.getProfile(callerId);
      if (!caller || !caller.active || caller.role !== 'dono') throw new HttpError(403, 'forbidden', 'Apenas o dono pode gerenciar usuários.');

      let body: Record<string, unknown>;
      try { body = await req.json(); } catch { throw new HttpError(400, 'invalid_json', 'Corpo inválido.'); }
      if (!body || typeof body !== 'object') throw new HttpError(400, 'invalid_json', 'Corpo inválido.');

      switch (body.action) {
        case 'create': return json(200, await create(callerId, body));
        case 'reset_password': return json(200, await resetPassword(callerId, body));
        case 'set_active': return json(200, await setActive(callerId, body));
        case 'set_role': return json(200, await setRole(callerId, body));
        default: throw new HttpError(400, 'invalid_action', 'Ação desconhecida.');
      }
    } catch (err) {
      if (err instanceof HttpError) return json(err.status, { ok: false, error: { code: err.code, message: err.message } });
      deps.log(`erro inesperado: ${err instanceof Error ? err.message : 'desconhecido'}`);
      return json(500, { ok: false, error: { code: 'internal', message: 'Erro interno. Tente de novo.' } });
    }
  };
}
