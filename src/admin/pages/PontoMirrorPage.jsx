import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, Download, FileText } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../auth/AuthContext';
import PurgePanel from './history/PurgePanel';
import { loadStaffNames } from '../staffNames';
import { inputClass } from './catalog/fields';
import { buildPdf } from '../pdf';
import {
  KIND_LABELS, KINDS, buildMirror, dateLabel, effectiveMs, entryFlags, formatDuration, mirrorCsv, mirrorFetchRange, mirrorFileName,
  mirrorTable, spMonthKey, spTime, weekdayLabel
} from '../timeTracking';

function download(name, data, type) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Espelho de ponto mensal por colaborador (Dono e Gerente) + exportação CSV/PDF.
// O Dono também vê aqui o painel de exclusão de marcações antigas (retenção de 12 meses).
export default function PontoMirrorPage() {
  const { profile } = useAuth();
  const location = useLocation();
  const [names, setNames] = useState(new Map());
  const [staff, setStaff] = useState([]);
  const [userId, setUserId] = useState('');
  const [month, setMonth] = useState(() => spMonthKey(Date.now()));
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      const n = await loadStaffNames();
      if (!alive) return;
      setNames(n);
      const list = [...n.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      setStaff(list);
      setUserId(prev => prev || (list.find(x => x.id === profile.id) || list[0])?.id || '');
    })();
    return () => { alive = false; };
  }, [profile.id]);

  const load = useCallback(async () => {
    if (!userId || !/^\d{4}-\d{2}$/.test(month)) return;
    setEntries(null);
    const { from, to } = mirrorFetchRange(month);
    const rows = [];
    for (let start = 0; ; start += 1000) {
      const { data, error: err } = await supabase.from('time_entries').select('*').eq('user_id', userId)
        .gte('recorded_at', from).lt('recorded_at', to).order('id', { ascending: true }).range(start, start + 999);
      if (err) { setError('Não foi possível carregar o espelho.'); return; }
      rows.push(...data);
      if (data.length < 1000) break;
    }
    setError('');
    setEntries(rows);
  }, [userId, month]);
  useEffect(() => { load(); }, [load]);

  const person = names.get(userId) || '—';
  const mirror = useMemo(() => (entries ? buildMirror(entries, month) : null), [entries, month]);
  const table = useMemo(() => (mirror ? mirrorTable(mirror, person) : null), [mirror, person]);
  const ctx = useMemo(() => ({ names }), [names]);

  const exportCsv = () => download(mirrorFileName(person, month, 'csv'), mirrorCsv(table), 'text/csv;charset=utf-8');
  const exportPdf = () => download(mirrorFileName(person, month, 'pdf'), buildPdf(table), 'application/pdf');

  return (
    <section className="space-y-5">
      <div>
        <Link to="/ponto" className="inline-flex items-center gap-1 min-h-[44px] text-xs font-bold text-emerald-200 hover:text-amber-300"><ChevronLeft className="w-4 h-4" /> Ponto</Link>
        <h1 className="text-xl font-extrabold text-amber-300">Espelho de ponto</h1>
        <p className="text-xs text-emerald-200/70 mt-1">Controle interno. Horários gravados pelo servidor. * = marcação sinalizada.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl bg-[#142718] border border-emerald-900/60 p-4">
        <div className="space-y-1.5">
          <label htmlFor="mirror-user" className="text-xs font-bold uppercase tracking-wider text-amber-400">Colaborador</label>
          <select id="mirror-user" value={userId} onChange={e => setUserId(e.target.value)} className={inputClass}>
            {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="mirror-month" className="text-xs font-bold uppercase tracking-wider text-amber-400">Mês</label>
          <input id="mirror-month" type="month" value={month} max={spMonthKey(Date.now())} onChange={e => e.target.value && setMonth(e.target.value)} className={inputClass} />
        </div>
      </div>

      {error && <p role="alert" className="text-sm font-semibold text-rose-300">{error}</p>}
      {!mirror && !error && <p className="text-sm text-emerald-200/70" role="status">Carregando…</p>}

      {mirror && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="mirror-totals">
            {[
              ['Horas trabalhadas', formatDuration(mirror.totals.workedMs)],
              ['Intervalo total', formatDuration(mirror.totals.breakMs)],
              ['Dias com marcação', String(mirror.totals.days)],
              ['Sinalizadas', String(mirror.totals.flagged)]
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-[#142718] border border-emerald-900/60 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">{label}</p>
                <p className="text-2xl font-black text-slate-100 tabular-nums">{value}</p>
              </div>
            ))}
          </div>
          {mirror.totals.incompleteDays > 0 && <p className="text-xs font-semibold text-amber-200">{mirror.totals.incompleteDays} {mirror.totals.incompleteDays === 1 ? 'dia incompleto (sem Saída)' : 'dias incompletos (sem Saída)'}.</p>}

          <div className="flex flex-col sm:flex-row gap-3">
            <button type="button" onClick={exportCsv} data-testid="export-csv" className="flex-1 min-h-[48px] rounded-xl border border-amber-500/40 bg-[#142718] text-sm font-bold text-amber-300 flex items-center justify-center gap-2"><Download className="w-4 h-4" /> Exportar CSV</button>
            <button type="button" onClick={exportPdf} data-testid="export-pdf" className="flex-1 min-h-[48px] rounded-xl border border-amber-500/40 bg-[#142718] text-sm font-bold text-amber-300 flex items-center justify-center gap-2"><FileText className="w-4 h-4" /> Exportar PDF</button>
          </div>

          {mirror.days.length === 0 ? (
            <p className="text-sm text-emerald-200/70" data-testid="mirror-empty">Sem marcações neste mês.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-emerald-900/60">
              <table className="w-full text-sm min-w-[720px]" data-testid="mirror-table">
                <thead className="bg-[#142718] text-[11px] uppercase tracking-wider text-amber-400">
                  <tr>
                    <th className="text-left px-3 py-2">Data</th>
                    {KINDS.map(k => <th key={k} className="text-left px-3 py-2">{KIND_LABELS[k]}</th>)}
                    <th className="text-left px-3 py-2">Trabalhado</th>
                    <th className="text-left px-3 py-2">Intervalo</th>
                    <th className="text-left px-3 py-2">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {mirror.days.map(d => (
                    <tr key={d.date} data-testid="mirror-row" className="border-t border-emerald-900/40 bg-[#0d1c10]">
                      <td className="px-3 py-2 font-bold text-slate-100 whitespace-nowrap">{dateLabel(d.date)} <span className="text-emerald-200/60 font-normal">{weekdayLabel(d.date)}</span></td>
                      {KINDS.map(k => (
                        <td key={k} className="px-3 py-2 tabular-nums text-emerald-100/90">
                          {d.entries.filter(e => e.kind === k).map(e => `${spTime(effectiveMs(e))}${entryFlags(e).length ? '*' : ''}`).join(' / ') || '—'}
                        </td>
                      ))}
                      <td className="px-3 py-2 tabular-nums font-bold text-slate-100">{formatDuration(d.workedMs)}</td>
                      <td className="px-3 py-2 tabular-nums text-emerald-100/90">{formatDuration(d.breakMs)}</td>
                      <td className="px-3 py-2 text-xs font-bold text-amber-300">{d.incomplete ? 'Incompleto' : d.flagged.length ? 'Sinalizado' : <span className="text-emerald-300">OK</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {table.flagged.length > 0 && (
            <div className="rounded-2xl bg-[#142718] border border-amber-500/30 p-4 space-y-1.5" data-testid="mirror-flagged">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-amber-400">{table.flaggedTitle}</h2>
              <ul className="space-y-1">
                {table.flagged.map(line => <li key={line} className="text-xs text-emerald-100/90">{line}</li>)}
              </ul>
            </div>
          )}
        </>
      )}

      {profile.role === 'dono' && <PurgePanel kind="time" ctx={ctx} defaultOpen={Boolean(location.state?.abrirExclusao)} onPurged={load} />}
    </section>
  );
}
