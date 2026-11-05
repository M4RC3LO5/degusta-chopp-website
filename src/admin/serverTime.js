// Hora oficial = hora do servidor: o cabeçalho Date da resposta do Supabase (o /rest/v1 expõe Date no CORS;
// o /auth/v1 não). O relógio do aparelho não conta. Devolve o deslocamento (ms) a somar a Date.now(), ou null.
export async function fetchServerOffset() {
  try {
    const t0 = Date.now();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/settings?select=id&limit=1`, { headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY } });
    const header = res.headers.get('date');
    if (!header) return null;
    const rtt = Date.now() - t0;
    return Date.parse(header) + rtt / 2 + 500 - Date.now();   // Date tem precisão de 1 s: +0,5 s centraliza o erro
  } catch { return null; }
}
