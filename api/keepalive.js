// Vercel Function chamada pelo cron diário (vercel.json) para o Supabase free não pausar por inatividade.
// Env server-side: SUPABASE_URL, SUPABASE_ANON_KEY, CRON_SECRET (a Vercel envia `Authorization: Bearer $CRON_SECRET`).
export default async function handler(req, res) {
  const { SUPABASE_URL, SUPABASE_ANON_KEY, CRON_SECRET } = process.env;

  if (!CRON_SECRET || req.headers.authorization !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ ok: false, error: 'supabase env missing' });
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/settings?select=id`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) {
      return res.status(500).json({ ok: false, supabaseStatus: response.status });
    }
    return res.status(200).json({ ok: true, supabaseStatus: response.status });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'supabase unreachable' });
  }
}
