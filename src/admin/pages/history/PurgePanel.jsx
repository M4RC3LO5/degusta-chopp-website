import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { supabase } from '../../supabase';
import Modal from '../../components/Modal';
import { describeChange } from '../../historyDiff';
import {
  buildCsv, closedMonths, confirmMatches, confirmWord, csvFileName, monthLabel, monthStartIso, nextMonthStartIso,
  periodLabel, purgeErrorMessage, scopeKey, scopeRows
} from '../../retention';
import { inputClass } from '../catalog/fields';

const FETCH_PAGE = 1000;   // limite padrão do PostgREST

async function fetchMonthRows(month) {
  const rows = [];
  for (let from = 0; ; from += FETCH_PAGE) {
    const { data, error } = await supabase.from('audit_log').select('*')
      .gte('changed_at', monthStartIso(month)).lt('changed_at', nextMonthStartIso(month))
      .order('id', { ascending: true }).range(from, from + FETCH_PAGE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < FETCH_PAGE) return rows;
  }
}

function saveFile(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Exclusão do Histórico por mês fechado (ou todos os fechados). Só o Dono vê este painel.
// Fluxo: Baixar CSV (obrigatório, confere a contagem) -> digitar o mês/APAGAR -> Apagar (RPC purge_audit_month).
export default function PurgePanel({ ctx, defaultOpen = false, onPurged }) {
  const [open, setOpen] = useState(defaultOpen);
  const [months, setMonths] = useState([]);
  const [purges, setPurges] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [scope, setScope] = useState(null);           // { kind: 'month' | 'all', months: [...] }
  const [downloaded, setDownloaded] = useState('');   // scopeKey do que já foi baixado
  const [downloading, setDownloading] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const [done, setDone] = useState('');
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const load = useCallback(async () => {
    const [m, p] = await Promise.all([
      supabase.rpc('audit_months'),
      supabase.from('audit_purges').select('*').order('id', { ascending: false }).limit(10)
    ]);
    if (!mounted.current) return;
    if (m.error || p.error) { setLoadError('Não foi possível carregar os meses do histórico.'); return; }
    setLoadError('');
    setMonths(m.data.map(x => ({ ...x, row_count: Number(x.row_count) })));
    setPurges(p.data);
  }, []);
  useEffect(() => { if (open) load(); }, [open, load]);

  const closed = closedMonths(months);
  const key = scope ? scopeKey(scope) : '';
  const canPurge = Boolean(scope) && downloaded === key && confirmMatches(typed, scope) && !busy;
  const close = () => { if (!busy) { setScope(null); setTyped(''); setDialogError(''); } };
  const start = (next) => { setScope(next); setDownloaded(''); setTyped(''); setDialogError(''); setDone(''); };

  const download = async () => {
    setDownloading(true);
    setDialogError('');
    try {
      const rows = [];
      for (const m of scope.months) rows.push(...await fetchMonthRows(m.month));
      if (rows.length !== scopeRows(scope)) {
        setDialogError('O arquivo não bate com o número de registros do período. Baixe de novo.');
        return;
      }
      const describe = (row) => describeChange(row, ctx).lines;
      const who = (row) => (row.changed_by ? (ctx.names.get(row.changed_by) || '—') : 'Sistema');
      saveFile(csvFileName(scope), buildCsv(rows, { describe, who }));
      setDownloaded(key);
    } catch {
      setDialogError('Não foi possível baixar o período. Nada foi apagado.');
    } finally {
      setDownloading(false);
    }
  };

  const purge = async () => {
    if (!canPurge) return;
    setBusy(true);
    setDialogError('');
    let deleted = 0;
    const doneMonths = [];
    for (const m of scope.months) {
      const { data, error } = await supabase.rpc('purge_audit_month', { p_month: m.month });
      if (error) {
        setBusy(false);
        setDialogError(`${purgeErrorMessage(error)}${doneMonths.length ? ` Já apagados: ${doneMonths.join(', ')}.` : ''}`);
        await load();
        onPurged?.();
        return;
      }
      deleted += Number(data);
      doneMonths.push(monthLabel(m.month));
    }
    setBusy(false);
    setScope(null); setTyped('');
    setDone(`Apagado: ${periodLabel(scope.months)} (${deleted} ${deleted === 1 ? 'registro' : 'registros'}). A exclusão ficou registrada.`);
    await load();
    onPurged?.();
  };

  return (
    <section className="rounded-2xl bg-[#142718] border border-emerald-900/60" data-testid="purge-panel">
      <button type="button" aria-expanded={open} onClick={() => setOpen(o => !o)} className="w-full min-h-[48px] px-4 flex items-center gap-2 text-left text-sm font-bold text-amber-300">
        <Trash2 className="w-4 h-4" /> <span>Apagar histórico antigo</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-xs text-emerald-200/80">
            O Histórico é guardado por 12 meses, mas nada é apagado sozinho. Você pode apagar um mês fechado por vez, ou todos os meses fechados. O mês corrente nunca é apagado. Antes de apagar, o período é baixado em CSV.
          </p>
          {loadError && <p role="alert" className="text-sm font-semibold text-rose-300">{loadError}</p>}
          {done && <p role="status" data-testid="purge-done" className="text-sm font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2">{done}</p>}

          <ul className="space-y-2" data-testid="purge-months">
            {months.map(m => (
              <li key={m.month} data-testid={`purge-month-${m.month.slice(0, 7)}`} className="flex items-center justify-between gap-3 rounded-xl bg-[#0d1c10] border border-emerald-900/50 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-100">{monthLabel(m.month)}{m.is_current && <span className="ml-2 text-[11px] font-bold text-emerald-300/80">mês corrente</span>}{m.older_than_12m && <span className="ml-2 text-[11px] font-bold text-amber-300">mais de 12 meses</span>}</p>
                  <p className="text-xs text-emerald-200/70">{m.row_count} {m.row_count === 1 ? 'registro' : 'registros'}</p>
                </div>
                {!m.is_current && (
                  <button type="button" onClick={() => start({ kind: 'month', months: [m] })} className="min-h-[44px] px-4 rounded-xl border border-rose-400/40 bg-[#142718] text-xs font-bold text-rose-300 shrink-0">Apagar</button>
                )}
              </li>
            ))}
          </ul>
          {closed.length > 1 && (
            <button type="button" onClick={() => start({ kind: 'all', months: closed })} className="min-h-[44px] w-full sm:w-auto px-4 rounded-xl border border-rose-400/40 bg-[#0d1c10] text-xs font-bold text-rose-300">
              Apagar todos os meses fechados ({periodLabel(closed)})
            </button>
          )}

          {purges.length > 0 && (
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-1">Exclusões anteriores</h3>
              <ul className="space-y-1" data-testid="purge-log">
                {purges.map(p => (
                  <li key={p.id} className="text-xs text-emerald-100/85">
                    {monthLabel(p.period_start)}{p.period_end.slice(0, 7) !== p.period_start.slice(0, 7) ? ` a ${monthLabel(p.period_end)}` : ''}: {p.rows_deleted} registros, por {ctx.names.get(p.purged_by) || '—'} em {new Date(p.purged_at).toLocaleDateString('pt-BR')}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {scope && (
        <Modal title={scope.kind === 'all' ? 'Apagar todos os meses fechados' : `Apagar ${monthLabel(scope.months[0].month)}`} onClose={busy ? undefined : close}>
          <div className="space-y-4">
            <p className="text-sm text-emerald-100/90">
              {scopeRows(scope)} registros de {periodLabel(scope.months)} serão apagados para sempre. A exclusão fica registrada (quem, quando, período e quantidade).
            </p>

            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">1. Baixe o período</p>
              <button type="button" onClick={download} disabled={downloading || busy} data-testid="purge-download" className="w-full h-12 rounded-xl border border-amber-500/40 bg-[#0d1c10] text-sm font-bold text-amber-300 flex items-center justify-center gap-2 disabled:opacity-50">
                <Download className="w-4 h-4" /> {downloading ? 'Baixando…' : downloaded === key ? 'Baixado. Baixar de novo' : 'Baixar CSV'}
              </button>
              {downloaded === key && <p className="text-xs text-emerald-300" role="status">Arquivo baixado ({csvFileName(scope)}). Guarde-o em lugar seguro.</p>}
            </div>

            <div className="space-y-1">
              <label htmlFor="purge-confirm" className="block text-[11px] font-bold uppercase tracking-wider text-amber-400">
                2. Digite {confirmWord(scope)} para confirmar
              </label>
              <input id="purge-confirm" type="text" autoComplete="off" value={typed} onChange={e => setTyped(e.target.value)} disabled={downloaded !== key || busy} placeholder={confirmWord(scope)} className={`${inputClass} disabled:opacity-50`} />
            </div>

            {dialogError && <p role="alert" className="text-sm font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2.5">{dialogError}</p>}

            <div className="flex gap-3">
              <button type="button" onClick={close} disabled={busy} className="flex-1 h-12 rounded-xl border border-emerald-900/60 bg-[#0d1c10] text-sm font-bold text-emerald-200 disabled:opacity-50">Cancelar</button>
              <button type="button" onClick={purge} disabled={!canPurge} data-testid="purge-confirm" className="flex-1 h-12 rounded-xl bg-rose-500 text-slate-950 text-sm font-black uppercase tracking-wide disabled:opacity-40">{busy ? 'Apagando…' : 'Apagar'}</button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
