import { createClient } from '@supabase/supabase-js';

// Cliente do ADMIN (com Auth e sessão persistente). Só é importado por src/admin/**,
// que é carregado sob demanda em /admin: o site público nunca baixa este código.
// Usa apenas a anon/publishable key. Nunca a service_role.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const adminConfigured = Boolean(url && key);

export const supabase = adminConfigured
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: 'degusta-admin-auth'
      }
    })
  : null;
