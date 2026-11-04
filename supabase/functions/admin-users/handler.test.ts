// Testes da lógica da função (sem rede). Rodar: node --experimental-strip-types --test supabase/functions/admin-users/handler.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHandler, HttpError, type AuditEntry, type Deps, type ProfileRow, type Role } from './handler.ts';
import { generateTempPassword, WORDS } from './passwords.ts';

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const mk = (n: number, username: string, role: Role, active = true): ProfileRow =>
  ({ id: uuid(n), username, full_name: `Nome ${username}`, role, active, must_change_password: false });

function world(initial: ProfileRow[], opts: { failInsertProfile?: boolean; failBan?: boolean; onCount?: (n: number) => void } = {}) {
  let countCalls = 0;
  const profiles = new Map(initial.map(p => [p.id, { ...p }]));
  const tokens = new Map<string, string>(initial.map(p => [`jwt-${p.username}`, p.id]));
  const audit: AuditEntry[] = [];
  const calls: string[] = [];
  const authUsers = new Set<string>();
  const deps: Deps = {
    verifyToken: async jwt => tokens.get(jwt) ?? null,
    getProfile: async id => (profiles.get(id) ? { ...profiles.get(id)! } : null),
    getProfileByUsername: async u => [...profiles.values()].find(p => p.username === u) ?? null,
    countActiveOwners: async ex => { opts.onCount?.(++countCalls); return [...profiles.values()].filter(p => p.role === 'dono' && p.active && p.id !== ex).length; },
    createAuthUser: async email => {
      if (authUsers.has(email)) throw new HttpError(409, 'username_taken', 'x');
      authUsers.add(email); calls.push(`createAuthUser:${email}`); return { id: uuid(900 + authUsers.size) };
    },
    deleteAuthUser: async id => { calls.push(`deleteAuthUser:${id}`); },
    setAuthPassword: async id => { calls.push(`setAuthPassword:${id}`); },
    setBan: async (id, banned) => { if (opts.failBan) throw new HttpError(500, 'internal', 'x'); calls.push(`setBan:${id}:${banned}`); },
    revokeSessionsWithPassword: async () => { calls.push('revokeSessions'); return true; },
    insertProfile: async row => {
      if (opts.failInsertProfile) throw new Error('boom');
      const p = { ...row, created_at: 'now' } as ProfileRow; profiles.set(p.id, p); return { ...p };
    },
    updateProfile: async (id, patch) => { Object.assign(profiles.get(id)!, patch); return { ...profiles.get(id)! }; },
    insertAudit: async e => { audit.push(e); },
    generatePassword: generateTempPassword,
    log: () => {}
  };
  const handle = createHandler(deps);
  const call = async (jwt: string | null, body: unknown, method = 'POST') => {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (jwt) headers.authorization = `Bearer ${jwt}`;
    const res = await handle(new Request('http://x/admin-users', { method, headers, body: method === 'POST' ? JSON.stringify(body) : undefined }));
    return { status: res.status, json: res.status === 204 ? null : await res.json() };
  };
  return { profiles, audit, calls, call };
}

const dono1 = mk(1, 'dono.um', 'dono'), dono2 = mk(2, 'dono.dois', 'dono');
const ger = mk(3, 'gerente', 'gerente'), op = mk(4, 'operador', 'operador'), donoOff = mk(5, 'dono.off', 'dono', false);

test('senha provisória: palavra-palavra-NNNN, sem acento, >= 200 palavras', () => {
  assert.ok(WORDS.length >= 200, `palavras: ${WORDS.length}`);
  for (let i = 0; i < 1000; i++) assert.match(generateTempPassword(), /^[a-z]+-[a-z]+-[1-9][0-9]{3}$/);
});

test('CORS: OPTIONS 204; GET 405', async () => {
  const w = world([dono1]);
  assert.equal((await w.call(null, {}, 'OPTIONS')).status, 204);
  assert.equal((await w.call('jwt-dono.um', {}, 'GET')).status, 405);
});

test('401 sem token ou com token inválido', async () => {
  const w = world([dono1]);
  assert.equal((await w.call(null, { action: 'create' })).status, 401);
  assert.equal((await w.call('lixo', { action: 'create' })).status, 401);
});

test('403 para gerente, operador e dono desativado, em todas as ações', async () => {
  const w = world([dono1, ger, op, donoOff]);
  for (const who of ['gerente', 'operador', 'dono.off']) {
    for (const body of [
      { action: 'create', username: 'novo.user', full_name: 'Novo', role: 'operador' },
      { action: 'reset_password', user_id: dono1.id },
      { action: 'set_active', user_id: dono1.id, active: false },
      { action: 'set_role', user_id: dono1.id, role: 'operador' }
    ]) {
      const r = await w.call(`jwt-${who}`, body);
      assert.equal(r.status, 403, `${who} ${body.action}`);
      assert.equal(r.json.error.code, 'forbidden');
    }
  }
  assert.equal(w.audit.length, 0);
  assert.equal(w.calls.length, 0);
});

test('create: ok, devolve a senha uma vez, must_change_password, audit sem senha', async () => {
  const w = world([dono1]);
  const r = await w.call('jwt-dono.um', { action: 'create', username: 'Novo.User', full_name: ' Fulano da Silva ', role: 'gerente' });
  assert.equal(r.status, 200);
  assert.match(r.json.temp_password, /^[a-z]+-[a-z]+-\d{4}$/);
  assert.equal(r.json.user.username, 'novo.user');
  assert.equal(r.json.user.must_change_password, true);
  assert.equal(r.json.user.full_name, 'Fulano da Silva');
  assert.equal(w.audit.length, 1);
  assert.equal(w.audit[0].table_name, 'profiles');
  assert.equal(w.audit[0].changed_by, dono1.id);
  assert.equal(w.audit[0].action, 'INSERT');
  assert.ok(!JSON.stringify(w.audit).includes(r.json.temp_password), 'senha vazou para o audit_log');
  assert.ok(w.calls.includes('createAuthUser:novo.user@usuarios.degustachopp.local'));
});

test('create: validações e usuário duplicado', async () => {
  const w = world([dono1]);
  const bad = (b: object) => w.call('jwt-dono.um', { action: 'create', username: 'ok.user', full_name: 'Nome', role: 'operador', ...b });
  assert.equal((await bad({ username: 'ab' })).json.error.code, 'invalid_username');
  assert.equal((await bad({ username: 'Tem Espaço' })).json.error.code, 'invalid_username');
  assert.equal((await bad({ username: 'a'.repeat(21) })).json.error.code, 'invalid_username');
  assert.equal((await bad({ full_name: 'A' })).json.error.code, 'invalid_full_name');
  assert.equal((await bad({ full_name: 'A'.repeat(61) })).json.error.code, 'invalid_full_name');
  assert.equal((await bad({ role: 'admin' })).json.error.code, 'invalid_role');
  const dup = await bad({ username: 'dono.um' });
  assert.equal(dup.status, 409); assert.equal(dup.json.error.code, 'username_taken');
  assert.equal(w.audit.length, 0);
});

test('create: se o perfil falha, desfaz o usuário do Auth (sem órfão)', async () => {
  const w = world([dono1], { failInsertProfile: true });
  const r = await w.call('jwt-dono.um', { action: 'create', username: 'novo.user', full_name: 'Novo', role: 'operador' });
  assert.equal(r.status, 500);
  assert.ok(w.calls.some(c => c.startsWith('deleteAuthUser:')));
  assert.equal(w.audit.length, 0);
});

test('reset_password: nova senha, must_change_password, revoga sessões, audit', async () => {
  const w = world([dono1, op]);
  const r = await w.call('jwt-dono.um', { action: 'reset_password', user_id: op.id });
  assert.equal(r.status, 200);
  assert.match(r.json.temp_password, /^[a-z]+-[a-z]+-\d{4}$/);
  assert.equal(r.json.user.must_change_password, true);
  assert.equal(r.json.sessions_revoked, true);
  assert.ok(w.calls.includes(`setAuthPassword:${op.id}`) && w.calls.includes('revokeSessions'));
  assert.equal(w.audit[0].action, 'RESET_PASSWORD');
  assert.ok(!JSON.stringify(w.audit).includes(r.json.temp_password));
  assert.equal((await w.call('jwt-dono.um', { action: 'reset_password', user_id: uuid(777) })).status, 404);
  assert.equal((await w.call('jwt-dono.um', { action: 'reset_password', user_id: 'x' })).status, 400);
});

test('set_active: ban ao desativar, unban ao reativar, audit com antes/depois', async () => {
  const w = world([dono1, op]);
  const off = await w.call('jwt-dono.um', { action: 'set_active', user_id: op.id, active: false });
  assert.equal(off.status, 200); assert.equal(off.json.user.active, false);
  assert.ok(w.calls.includes(`setBan:${op.id}:true`));
  const on = await w.call('jwt-dono.um', { action: 'set_active', user_id: op.id, active: true });
  assert.equal(on.json.user.active, true);
  assert.ok(w.calls.includes(`setBan:${op.id}:false`));
  assert.equal(w.audit.length, 2);
  assert.equal((w.audit[0].old_data as ProfileRow).active, true);
  assert.equal((w.audit[0].new_data as ProfileRow).active, false);
  assert.equal((await w.call('jwt-dono.um', { action: 'set_active', user_id: op.id, active: 'sim' })).status, 400);
});

test('ÚLTIMO DONO: não pode desativar o único dono ativo (nem a si mesmo)', async () => {
  const w = world([dono1, ger, op, donoOff]);              // 1 dono ativo + 1 dono inativo
  const r = await w.call('jwt-dono.um', { action: 'set_active', user_id: dono1.id, active: false });
  assert.equal(r.status, 409); assert.equal(r.json.error.code, 'last_owner');
  assert.equal(w.profiles.get(dono1.id)!.active, true);
  assert.equal(w.audit.length, 0);
  assert.ok(!w.calls.some(c => c.startsWith('setBan')));
});

test('ÚLTIMO DONO: não pode rebaixar o único dono ativo', async () => {
  const w = world([dono1, ger]);
  for (const role of ['gerente', 'operador']) {
    const r = await w.call('jwt-dono.um', { action: 'set_role', user_id: dono1.id, role });
    assert.equal(r.status, 409); assert.equal(r.json.error.code, 'last_owner');
  }
  assert.equal(w.profiles.get(dono1.id)!.role, 'dono');
  assert.equal(w.audit.length, 0);
});

test('com 2 donos ativos: desativar/rebaixar um é permitido; depois o restante vira o último e fica protegido', async () => {
  const w = world([dono1, dono2]);
  assert.equal((await w.call('jwt-dono.um', { action: 'set_role', user_id: dono2.id, role: 'gerente' })).status, 200);
  assert.equal((await w.call('jwt-dono.um', { action: 'set_active', user_id: dono1.id, active: false })).status, 409);
  assert.equal((await w.call('jwt-dono.um', { action: 'set_role', user_id: dono2.id, role: 'dono' })).status, 200);
  assert.equal((await w.call('jwt-dono.um', { action: 'set_active', user_id: dono2.id, active: false })).status, 200);
  // dono.um ficou sozinho -> protegido
  assert.equal((await w.call('jwt-dono.um', { action: 'set_active', user_id: dono1.id, active: false })).status, 409);
});

test('dono inativo pode ser rebaixado/desativado sem afetar a regra', async () => {
  const w = world([dono1, donoOff]);
  assert.equal((await w.call('jwt-dono.um', { action: 'set_role', user_id: donoOff.id, role: 'operador' })).status, 200);
});

test('corrida: outro pedido desativa o outro dono entre a checagem e a gravação → desfaz e devolve 409', async () => {
  // 1ª contagem (pré-checagem) vê 1 outro dono; antes da 2ª (pós-checagem) o outro dono some em paralelo.
  const w = world([dono1, dono2], { onCount: n => { if (n === 2) w.profiles.get(dono2.id)!.active = false; } });
  const r = await w.call('jwt-dono.um', { action: 'set_role', user_id: dono1.id, role: 'operador' });
  assert.equal(r.status, 409); assert.equal(r.json.error.code, 'last_owner');
  assert.equal(w.profiles.get(dono1.id)!.role, 'dono');          // rollback
  assert.equal(w.audit.length, 0);

  const w2 = world([dono1, dono2], { onCount: n => { if (n === 2) w2.profiles.get(dono2.id)!.active = false; } });
  const r2 = await w2.call('jwt-dono.um', { action: 'set_active', user_id: dono1.id, active: false });
  assert.equal(r2.status, 409);
  assert.equal(w2.profiles.get(dono1.id)!.active, true);        // rollback
  assert.ok(w2.calls.includes(`setBan:${dono1.id}:false`));      // ban desfeito
});

test('set_role: valida perfil e inexistente; sem mudança não gera audit', async () => {
  const w = world([dono1, op]);
  assert.equal((await w.call('jwt-dono.um', { action: 'set_role', user_id: op.id, role: 'root' })).status, 400);
  assert.equal((await w.call('jwt-dono.um', { action: 'set_role', user_id: uuid(555), role: 'gerente' })).status, 404);
  const same = await w.call('jwt-dono.um', { action: 'set_role', user_id: op.id, role: 'operador' });
  assert.equal(same.json.unchanged, true); assert.equal(w.audit.length, 0);
  const ok = await w.call('jwt-dono.um', { action: 'set_role', user_id: op.id, role: 'gerente' });
  assert.equal(ok.json.user.role, 'gerente'); assert.equal(w.audit.length, 1);
});

test('ação desconhecida e JSON inválido → 400', async () => {
  const w = world([dono1]);
  assert.equal((await w.call('jwt-dono.um', { action: 'delete_user' })).json.error.code, 'invalid_action');
  const handle = createHandler({
    verifyToken: async () => dono1.id, getProfile: async () => ({ ...dono1 })
  } as unknown as Deps);
  const res = await handle(new Request('http://x', { method: 'POST', headers: { authorization: 'Bearer t' }, body: 'não é json' }));
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.code, 'invalid_json');
});
