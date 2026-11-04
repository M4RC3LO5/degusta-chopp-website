import { supabase } from '../supabase';

export class AdminUsersError extends Error {
  constructor(code, message, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// Chama a Edge Function admin-users com a sessão do usuário logado.
// A função só aceita dono ativo (senão 403); a validação real é lá, nunca aqui.
export async function callAdminUsers(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke('admin-users', { body: { action, ...payload } });
  if (!error) return data;

  const response = error.context;
  if (response && typeof response.json === 'function') {
    try {
      const body = await response.json();
      if (body?.error) throw new AdminUsersError(body.error.code, body.error.message, response.status);
    } catch (inner) {
      if (inner instanceof AdminUsersError) throw inner;
    }
    throw new AdminUsersError('http_error', 'Não foi possível concluir a ação. Tente de novo.', response.status);
  }
  throw new AdminUsersError('network', 'Não foi possível conectar. Verifique a internet e tente de novo.', 0);
}
