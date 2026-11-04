import { createClient } from '@supabase/supabase-js';

// Cliente PÚBLICO (anon). Usado só para leitura do catálogo.
// Nunca colocar service_role aqui: este arquivo vai para o navegador.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

function createPublicClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  try {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
  } catch (err) {
    console.warn('[catalog] cliente Supabase inválido:', err?.message || err);
    return null;
  }
}

export const supabase = createPublicClient();
