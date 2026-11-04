import { supabase } from './supabase';

// Nome de quem alterou (decisão pós-Card 5): `profiles` é restrito por RLS, então a equipe toda
// lê só id + full_name pela RPC staff_names() (migration 0004).
// Devolve Map<uuid, nome>; em erro devolve Map vazio (a tela cai em "—", nunca quebra).
export async function loadStaffNames() {
  const { data, error } = await supabase.rpc('staff_names');
  if (error) return new Map();
  return new Map((data || []).map(p => [p.id, p.full_name]));
}
