import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase';
import { MESSAGES, RULES, usernameToEmail } from '../rules';

const AuthContext = createContext(null);

const REVALIDATE_MS = 60_000;

function mapAuthError(error) {
  if (error?.status === 429 || error?.code === 'over_request_rate_limit') return MESSAGES.rateLimited;
  if (error?.code === 'user_banned') return MESSAGES.inactive;
  if (error?.name === 'AuthRetryableFetchError' || !error?.status) return MESSAGES.network;
  return MESSAGES.badCredentials;
}

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', session: null, profile: null });
  const [notice, setNotice] = useState(null);
  const inflight = useRef(null);
  const lastPassword = useRef(null);      // senha usada no login (só em memória) p/ validar "diferente da atual"
  const passwordUpdated = useRef(false);  // updateUser ok, falta concluir a RPC

  const goAnon = useCallback((message) => {
    lastPassword.current = null;
    passwordUpdated.current = false;
    if (message) setNotice(message);
    setState({ status: 'anon', session: null, profile: null });
  }, []);

  const signOut = useCallback(async (message) => {
    try { await supabase.auth.signOut(); } catch { /* sessão local é limpa mesmo assim */ }
    goAnon(message);
  }, [goAnon]);

  // Relê sessão e perfil. É aqui que usuário desativado (profiles.active = false) é deslogado.
  const refresh = useCallback(() => {
    if (inflight.current) return inflight.current;
    inflight.current = (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { goAnon(); return { ok: false }; }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, username, full_name, role, active, must_change_password')
          .eq('id', session.user.id)
          .maybeSingle();

        if (error) {
          // Sem rede: mantém o estado atual. Token recusado: encerra a sessão.
          if (error.code === 'PGRST301' || /JWT/i.test(error.message || '')) {
            await signOut(MESSAGES.badCredentials);
            return { ok: false, error: MESSAGES.badCredentials };
          }
          setState(prev => (prev.status === 'loading' ? { status: 'anon', session: null, profile: null } : prev));
          return { ok: false, error: MESSAGES.network };
        }
        if (!profile) { await signOut(MESSAGES.badCredentials); return { ok: false, error: MESSAGES.badCredentials }; }
        if (!profile.active) { await signOut(MESSAGES.inactive); return { ok: false, error: MESSAGES.inactive }; }

        setState({ status: 'ready', session, profile });
        return { ok: true, profile };
      } finally {
        inflight.current = null;
      }
    })();
    return inflight.current;
  }, [goAnon, signOut]);

  useEffect(() => {
    // Não chamar o Supabase direto dentro do callback (trava o lock do Auth): adia com setTimeout.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') { goAnon(); return; }
      setTimeout(() => { refresh(); }, 0);
    });
    return () => subscription.unsubscribe();
  }, [goAnon, refresh]);

  // Revalida ao voltar para a aba/app e a cada 60 s enquanto logado.
  useEffect(() => {
    if (state.status !== 'ready') return undefined;
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    const timer = setInterval(refresh, REVALIDATE_MS);
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [state.status, refresh]);

  const signIn = useCallback(async (rawUsername, password) => {
    const username = String(rawUsername || '').trim().toLowerCase();
    setNotice(null);
    if (!RULES.username.regex.test(username) || !password) return { error: MESSAGES.badCredentials };

    const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(username), password });
    if (error) return { error: mapAuthError(error) };

    lastPassword.current = password;
    const result = await refresh();
    return result.ok ? {} : { error: result.error || MESSAGES.network };
  }, [refresh]);

  const changePassword = useCallback(async (newPassword) => {
    if (!passwordUpdated.current) {
      if (newPassword === lastPassword.current) return { error: 'A nova senha deve ser diferente da atual.' };
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        if (error.code === 'same_password') return { error: 'A nova senha deve ser diferente da atual.' };
        if (error.code === 'weak_password') return { error: 'Senha fraca. Use pelo menos 8 caracteres, com letras e números.' };
        return { error: mapAuthError(error) === MESSAGES.network ? MESSAGES.network : 'Não foi possível salvar a senha. Tente de novo.' };
      }
      passwordUpdated.current = true;
    }
    const { error: rpcError } = await supabase.rpc('complete_password_change');
    if (rpcError) return { error: 'Senha salva, mas não foi possível concluir. Toque em salvar de novo.' };
    passwordUpdated.current = false;
    lastPassword.current = null;
    await refresh();
    return {};
  }, [refresh]);

  const value = {
    ...state,
    notice,
    clearNotice: () => setNotice(null),
    signIn,
    signOut: () => signOut(),
    refresh,
    changePassword
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
