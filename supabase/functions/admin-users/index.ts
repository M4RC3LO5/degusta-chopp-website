// Edge Function admin-users: gestão de usuários do painel (só o Dono).
// SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY são injetadas pelo Supabase no ambiente da
// função. A service role NUNCA vai para o front nem para o repositório.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createHandler, HttpError, type ProfileRow } from './handler.ts';
import { generateTempPassword } from './passwords.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

const noSession = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin = createClient(url, serviceKey, noSession);

const COLUMNS = 'id, username, full_name, role, active, must_change_password, created_at';
const BAN_FOREVER = '876000h'; // ~100 anos

function fail(message: string, error: { message?: string } | null): never {
  console.error(`[admin-users] ${message}: ${error?.message ?? 'erro'}`);
  throw new HttpError(500, 'internal', 'Erro interno. Tente de novo.');
}

const handler = createHandler({
  async verifyToken(jwt) {
    const { data, error } = await admin.auth.getUser(jwt);
    return error || !data.user ? null : data.user.id;
  },
  async getProfile(id) {
    const { data, error } = await admin.from('profiles').select(COLUMNS).eq('id', id).maybeSingle();
    if (error) fail('getProfile', error);
    return data as ProfileRow | null;
  },
  async getProfileByUsername(username) {
    const { data, error } = await admin.from('profiles').select(COLUMNS).eq('username', username).maybeSingle();
    if (error) fail('getProfileByUsername', error);
    return data as ProfileRow | null;
  },
  async countActiveOwners(excludeId) {
    let query = admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'dono').eq('active', true);
    if (excludeId) query = query.neq('id', excludeId);
    const { count, error } = await query;
    if (error) fail('countActiveOwners', error);
    return count ?? 0;
  },
  async createAuthUser(email, password) {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) {
      if (error.code === 'email_exists' || error.status === 422) throw new HttpError(409, 'username_taken', 'Esse usuário já existe.');
      fail('createUser', error);
    }
    return { id: data.user!.id };
  },
  async deleteAuthUser(id) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) fail('deleteUser (rollback)', error);
  },
  async setAuthPassword(id, password) {
    const { error } = await admin.auth.admin.updateUserById(id, { password });
    if (error) fail('updateUserById(password)', error);
  },
  async setBan(id, banned) {
    const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: banned ? BAN_FOREVER : 'none' });
    if (error) fail('updateUserById(ban)', error);
  },
  async revokeSessionsWithPassword(email, password) {
    // Cliente anon descartável: entra com a senha nova só para obter um token e derrubar TODAS as sessões.
    const anon = createClient(url, anonKey, noSession);
    const { data, error } = await anon.auth.signInWithPassword({ email, password });
    if (error || !data.session) return false;
    const { error: outError } = await admin.auth.admin.signOut(data.session.access_token, 'global');
    return !outError;
  },
  async insertProfile(row) {
    const { data, error } = await admin.from('profiles').insert(row).select(COLUMNS).single();
    if (error) {
      if (error.code === '23505') throw new HttpError(409, 'username_taken', 'Esse usuário já existe.');
      fail('insertProfile', error);
    }
    return data as ProfileRow;
  },
  async updateProfile(id, patch) {
    const { data, error } = await admin.from('profiles').update(patch).eq('id', id).select(COLUMNS).single();
    if (error) fail('updateProfile', error);
    return data as ProfileRow;
  },
  async insertAudit(entry) {
    const { error } = await admin.from('audit_log').insert(entry);
    if (error) fail('insertAudit', error);
  },
  generatePassword: generateTempPassword,
  log: (message) => console.error(`[admin-users] ${message}`)
});

Deno.serve(handler);
