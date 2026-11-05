import { supabase } from '../../supabase';

// Consentimento da localização do ponto: auth.users.raw_user_meta_data.ponto_geo = { v, choice, at } (Card 11).
export const consentOf = (session) => session?.user?.user_metadata?.ponto_geo || null;

export async function saveConsent(choice, nowMs) {
  const value = { v: 1, choice, at: new Date(nowMs).toISOString() };
  const { error } = await supabase.auth.updateUser({ data: { ponto_geo: value } });
  return error ? { error } : { value };
}
