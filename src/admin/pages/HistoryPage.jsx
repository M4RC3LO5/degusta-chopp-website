import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth/AuthContext';
import PurgePanel from './history/PurgePanel';
import { loadStaffNames } from '../staffNames';
import { HISTORY_TYPES, describeChange } from '../historyDiff';
import { inputClass } from './catalog/fields';

const PAGE_SIZE = 30;

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');
}

// "2026-11-04" (data local) -> ISO do começo do dia local (e do dia seguinte, para o fim do período).
const startOfDay = (d) => new Date(`${d}T00:00:00`).toISOString();
const startOfNextDay = (d) => { const x = new Date(`${d}T00:00:00`); x.setDate(x.getDate() + 1); return x.toISOString(); };

export default function HistoryPage() {
  const { profile } = useAuth();
  const location = useLocation();
  const [filters, setFilters] = useState({ person: '', type: 'all', from: '', to: '' });
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [ctx, setCtx] = useState({ names: new Map(), brands: new Map(), flavors: new Map() });
  const [ctxReady, setCtxReady] = useState(false);   // nomes/marcas/sabores carregados antes de montar as linhas
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0);   // resposta antiga (filtro/página trocados) nunca sobrescreve a mais nova

  // Nomes (RPC staff_names), marcas e sabores: uma vez.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [names, b, f] = await Promise.all([
        loadStaffNames(),
        supabase.from('brands').select('id, name'),
        supabase.from('flavors').select('id, name')
      ]);
      if (cancelled) return;
      setCtx({
        names,
        brands: new Map((b.data || []).map(x => [x.id, x])),
        flavors: new Map((f.data || []).map(x => [x.id, x]))
      });
      setCtxReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const load = useCallback(async () => {
    const mine = ++requestId.current;
    setLoading(true);
    let q = supabase.from('audit_log').select('*', { count: 'exact' });
    const tables = HISTORY_TYPES.find(t => t.id === filters.type)?.tables;
    if (tables) q = q.in('table_name', tables);
    if (filters.person === 'system') q = q.is('changed_by', null);
    else if (filters.person) q = q.eq('changed_by', filters.person);
    if (filters.from) q = q.gte('changed_at', startOfDay(filters.from));
    if (filters.to) q = q.lt('changed_at', startOfNextDay(filters.to));
    const { data, error: err, count } = await q
      .order('changed_at', { ascending: false }).order('id', { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (mine !== requestId.current) return;
    if (err) { setError('Não foi possível carregar o histórico.'); setLoading(false); return; }
    setRows(data);
    setTotal(count ?? 0);
    setError('');
    setLoading(false);
  }, [filters, page]);
  useEffect(() => { if (ctxReady) load(); }, [load, ctxReady]);

  const setFilter = (key, value) => { setFilters(f => ({ ...f, [key]: value })); setPage(0); };
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const people = useMemo(() => [...ctx.names.entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR')), [ctx.names]);

  const who = (row) => (row.changed_by ? (ctx.names.get(row.changed_by) || '—') : 'Sistema');

  return (
    <section className="space-y-5">
      <h1 className="text-xl font-extrabold text-amber-300">Histórico</h1>

      {profile.role === 'dono' && ctxReady && <PurgePanel ctx={ctx} defaultOpen={Boolean(location.state?.abrirExclusao)} onPurged={load} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 rounded-2xl bg-[#142718] border border-emerald-900/60 p-3">
        <label className="text-xs font-bold uppercase tracking-wider text-amber-400 space-y-1">Pessoa
          <select aria-label="Filtrar por pessoa" value={filters.person} onChange={e => setFilter('person', e.target.value)} className={`${inputClass} normal-case tracking-normal font-normal`}>
            <option value="">Todas</option>
            {people.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            <option value="system">Sistema</option>
          </select>
        </label>
        <label className="text-xs font-bold uppercase tracking-wider text-amber-400 space-y-1">Tipo
          <select aria-label="Filtrar por tipo" value={filters.type} onChange={e => setFilter('type', e.target.value)} className={`${inputClass} normal-case tracking-normal font-normal`}>
            {HISTORY_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>
        <label className="text-xs font-bold uppercase tracking-wider text-amber-400 space-y-1">De
          <input type="date" aria-label="Período: de" value={filters.from} max={filters.to || undefined} onChange={e => setFilter('from', e.target.value)} className={`${inputClass} normal-case tracking-normal font-normal`} />
        </label>
        <label className="text-xs font-bold uppercase tracking-wider text-amber-400 space-y-1">Até
          <input type="date" aria-label="Período: até" value={filters.to} min={filters.from || undefined} onChange={e => setFilter('to', e.target.value)} className={`${inputClass} normal-case tracking-normal font-normal`} />
        </label>
      </div>

      {error && <p role="alert" className="text-sm font-semibold text-rose-300">{error}</p>}
      {loading && <p className="text-sm text-emerald-200/70" role="status">Carregando…</p>}
      {ctxReady && !loading && !error && rows.length === 0 && <p className="text-sm text-emerald-200/70">Nenhuma alteração encontrada.</p>}

      <ul className="space-y-2" data-testid="history-list">
        {ctxReady && rows.map(row => {
          const { lines } = describeChange(row, ctx);
          return (
            <li key={row.id} data-testid="history-row" className="rounded-2xl bg-[#142718] border border-emerald-900/60 p-3.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs">
                <span className="font-bold text-amber-300" data-testid="history-who">{who(row)}</span>
                <time dateTime={row.changed_at} className="text-emerald-200/70">{formatDateTime(row.changed_at)}</time>
              </div>
              <ul className="mt-1.5 space-y-0.5">
                {lines.map((line, i) => <li key={i} className="text-sm text-emerald-50/95 break-words">{line}</li>)}
              </ul>
            </li>
          );
        })}
      </ul>

      <nav aria-label="Paginação do histórico" className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => setPage(p => p - 1)} disabled={page === 0 || loading} className="h-12 min-w-[44px] px-4 rounded-xl border border-emerald-900/60 bg-[#142718] text-sm font-bold text-emerald-200 disabled:opacity-40 flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Anterior
        </button>
        <span className="text-xs text-emerald-200/70" data-testid="history-page">Página {page + 1} de {pages} · {total} alterações</span>
        <button type="button" onClick={() => setPage(p => p + 1)} disabled={page + 1 >= pages || loading} className="h-12 min-w-[44px] px-4 rounded-xl border border-emerald-900/60 bg-[#142718] text-sm font-bold text-emerald-200 disabled:opacity-40 flex items-center gap-1">
          Próxima <ChevronRight className="w-4 h-4" />
        </button>
      </nav>
    </section>
  );
}
