import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Archive, ChevronLeft, ChevronRight, Download, FileText } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../auth/AuthContext';
import PurgePanel from './history/PurgePanel';
import { loadStaffNames } from '../staffNames';
import { buildPdf } from '../pdf';
import { fetchServerOffset } from '../serverTime';
import {
  FILTERS, analyzeDay, barGeometry, buildMirror, dateShort, filterDays, formatHM, mirrorCsv, mirrorFetchRange, mirrorFileName,
  mirrorSummary, mirrorTable, monthLongLabel, newestFirst, shiftMonth, spMonthKey, spTime, weekdayLabel
} from '../timeTracking';

function download(name, data, type) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const FILTER_LABELS = { todos: 'Todos', conferir: 'Para conferir', incompletos: 'Incompletos' };
const SEG_COLORS = { ok: '#4ade80', live: '#f59e0b', warn: '#fb923c' };
const TAG = {
  warn: 'bg-orange-400/10 text-orange-200 border-orange-400/45',
  info: 'bg-sky-300/10 text-sky-200 border-sky-300/40'
};
const MARK_LABELS = ['ENTRADA', 'INTERVALO', 'RETORNO', 'SAÍDA'];

// Linha do tempo 06h–24h: verde = trabalhado · dourado = em andamento · laranja = sem saída.
function TimelineBar({ day }) {
  return (
    <div aria-hidden="true" data-testid="timeline" className="relative h-3 rounded-full bg-[#0a160d] border border-[#1b321f] overflow-hidden">
      {day.segments.map((seg, i) => {
        const g = barGeometry(seg, day.date);
        if (!g) return null;
        return <span key={i} data-seg={seg.kind} className="absolute top-0 bottom-0 rounded-full" style={{ left: `${g.left}%`, width: `${g.width}%`, background: SEG_COLORS[seg.kind] }} />;
      })}
    </div>
  );
}

const Axis = () => (
  <div className="flex justify-between text-[11px] font-semibold text-[#8aa592] tabular-nums" aria-hidden="true">
    <span>06h</span><span>12h</span><span>18h</span><span>24h</span>
  </div>
);

const Tags = ({ list }) => (list.length === 0 ? null : (
  <div className="flex flex-wrap gap-1.5" data-testid="day-tags">
    {list.map(o => <span key={o.key} data-tone={o.tone} className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${TAG[o.tone]}`}>{o.text}</span>)}
  </div>
));

const totalText = (d) => (d.state === 'sem_saida' ? `${formatHM(d.liveMs)} + ?` : formatHM(d.liveMs));
const totalColor = (d) => (d.state === 'sem_saida' ? 'text-orange-200' : d.state === 'andamento' ? 'text-amber-400' : 'text-amber-100');
const dayName = (d) => `${weekdayLabel(d.date)}${d.today ? ' · hoje' : ''}`;
const markTime = (item) => `${item.time}${item.forgot ? '*' : ''}`;

function MarkValue({ day, kindIndex }) {
  const items = day.marks[kindIndex].items;
  if (items.length) {
    return <span className={`text-sm font-bold tabular-nums ${items.some(i => i.loc) ? 'text-orange-200' : 'text-[#e7efe8]'}`}>{items.map(markTime).join(' / ')}</span>;
  }
  if (kindIndex === 3 && day.state === 'sem_saida') return <span className="text-sm font-bold text-orange-400">faltou</span>;
  return <span className="text-sm font-bold text-[#5f7d66]">--:--</span>;
}

function DayCard({ day }) {
  const border = day.state === 'sem_saida' ? 'border-orange-400/45' : day.occurrences.some(o => o.tone === 'info') ? 'border-sky-300/40' : 'border-[#234129]';
  return (
    <li data-testid="mirror-day" data-state={day.state} className={`p-3.5 rounded-[18px] bg-[#142718] border ${border} flex flex-col gap-2.5`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-[17px] font-extrabold text-amber-100">{dateShort(day.date)}</span>
          <span className="text-[13px] font-semibold text-[#9fb8a5]">{dayName(day)}</span>
        </div>
        <span className={`text-[17px] font-extrabold tabular-nums ${totalColor(day)}`} data-testid="day-total">{totalText(day)}</span>
      </div>
      <TimelineBar day={day} />
      <div className="grid grid-cols-4 gap-1.5">
        {MARK_LABELS.map((label, i) => (
          <div key={label} className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold tracking-wide text-[#8aa592]">{label}</span>
            <MarkValue day={day} kindIndex={i} />
          </div>
        ))}
      </div>
      <Tags list={day.occurrences} />
    </li>
  );
}

const breaksText = (day) => (day.breaks.length ? day.breaks.map(b => `${spTime(b.startMs)} – ${b.endMs ? spTime(b.endMs) : '…'}`).join(' / ') : '—');

function DayRow({ day }) {
  const entrada = day.marks[0].items;
  const saida = day.marks[3].items;
  return (
    <tr data-testid="mirror-row" data-state={day.state} className={day.state === 'sem_saida' ? 'bg-orange-400/5' : ''}>
      <td className="px-[18px] py-3.5 border-b border-[#1b321f] whitespace-nowrap"><span className="font-extrabold text-amber-100">{dateShort(day.date)}</span> <span className="text-[#9fb8a5]">{dayName(day)}</span></td>
      <td className={`px-2.5 py-3.5 border-b border-[#1b321f] font-bold tabular-nums ${entrada.some(i => i.loc) ? 'text-orange-200' : 'text-[#e7efe8]'}`}>{entrada.length ? entrada.map(markTime).join(' / ') : '—'}</td>
      <td className="px-2.5 py-3.5 border-b border-[#1b321f] font-semibold tabular-nums whitespace-nowrap text-[#e7efe8]">{breaksText(day)}</td>
      <td className={`px-2.5 py-3.5 border-b border-[#1b321f] font-bold tabular-nums whitespace-nowrap ${saida.length ? 'text-[#e7efe8]' : day.state === 'andamento' ? 'text-amber-400' : day.state === 'sem_saida' ? 'text-orange-400' : 'text-[#e7efe8]'}`}>
        {saida.length ? saida.map(markTime).join(' / ') : day.state === 'andamento' ? 'em expediente' : day.state === 'sem_saida' ? 'faltou' : '—'}
      </td>
      <td className="px-2.5 py-3.5 border-b border-[#1b321f]"><TimelineBar day={day} /></td>
      <td className={`px-2.5 py-3.5 border-b border-[#1b321f] text-right font-extrabold tabular-nums whitespace-nowrap ${totalColor(day)}`}>{totalText(day)}</td>
      <td className="px-[18px] py-3.5 border-b border-[#1b321f]"><Tags list={day.occurrences} /></td>
    </tr>
  );
}

// Espelho de ponto mensal por colaborador (Dono e Gerente) + exportação CSV/PDF.
// "Arquivo e meses antigos" (rodapé, só o Dono) guarda o fluxo de retenção do Card 11: download obrigatório e exclusão por mês.
export default function PontoMirrorPage() {
  const { profile } = useAuth();
  const location = useLocation();
  const [names, setNames] = useState(new Map());
  const [staff, setStaff] = useState([]);
  const [userId, setUserId] = useState('');
  const [month, setMonth] = useState(() => spMonthKey(Date.now()));
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('todos');
  const [offset, setOffset] = useState(0);
  const [, setTick] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(() => Boolean(location.state?.abrirExclusao));
  const archiveRef = useRef(null);

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

  // Hora oficial do servidor (para "hoje" e o trecho em andamento) e atualização a cada 30 s.
  useEffect(() => {
    let alive = true;
    fetchServerOffset().then(o => { if (alive && o !== null) setOffset(o); });
    const t = setInterval(() => setTick(n => n + 1), 30000);
    return () => { alive = false; clearInterval(t); };
  }, []);

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

  useEffect(() => {
    if (location.state?.abrirExclusao) archiveRef.current?.scrollIntoView?.({ block: 'start' });
  }, [location.state]);

  const nowMs = Date.now() + offset;
  const currentMonth = spMonthKey(nowMs);
  const person = names.get(userId) || '—';
  const mirror = useMemo(() => (entries ? buildMirror(entries, month) : null), [entries, month]);
  const table = useMemo(() => (mirror ? mirrorTable(mirror, person) : null), [mirror, person]);
  const days = useMemo(() => (mirror ? newestFirst(mirror.days.map(d => analyzeDay(d, nowMs))) : null), [mirror, nowMs]);  // eslint-disable-line react-hooks/exhaustive-deps
  const summary = useMemo(() => (days ? mirrorSummary(days) : null), [days]);
  const shown = days ? filterDays(days, filter) : [];
  const ctx = useMemo(() => ({ names }), [names]);

  const exportCsv = () => { setExportOpen(false); download(mirrorFileName(person, month, 'csv'), mirrorCsv(table), 'text/csv;charset=utf-8'); };
  const exportPdf = () => { setExportOpen(false); download(mirrorFileName(person, month, 'pdf'), buildPdf(table), 'application/pdf'); };

  const cards = summary ? [
    ['HORAS NO MÊS', formatHM(summary.workedMs), 'mirror-total-worked'],
    ['MÉDIA DIA COMPLETO', summary.avgDayMs === null ? '—' : formatHM(summary.avgDayMs), 'mirror-total-avg'],
    ['INTERVALO MÉDIO', summary.avgBreakMs === null ? '—' : formatHM(summary.avgBreakMs), 'mirror-total-break']
  ] : [];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/ponto" className="inline-flex items-center gap-1 min-h-[44px] pr-3 text-sm font-bold text-amber-400 hover:text-amber-200"><ChevronLeft className="w-5 h-5" aria-hidden="true" /> Ponto</Link>
        <div className="relative lg:hidden">
          <button type="button" aria-haspopup="true" aria-expanded={exportOpen} onClick={() => setExportOpen(o => !o)} disabled={!table} data-testid="export-menu"
            className="min-h-[44px] px-3.5 rounded-xl bg-[#142718] border border-[#234129] text-[13px] font-extrabold text-amber-400 inline-flex items-center gap-2 disabled:opacity-50">
            <Download className="w-[18px] h-[18px]" aria-hidden="true" /> Exportar
          </button>
          {exportOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setExportOpen(false)} aria-hidden="true" />
              <ul className="absolute right-0 top-full mt-1.5 z-40 w-44 rounded-2xl bg-[#142718] border border-amber-500/30 shadow-neu-gold overflow-hidden">
                <li><button type="button" onClick={exportCsv} data-testid="export-csv-m" className="w-full min-h-[48px] px-4 flex items-center gap-3 text-sm font-bold text-emerald-100/90 hover:text-amber-300"><Download className="w-4 h-4" aria-hidden="true" /> CSV</button></li>
                <li><button type="button" onClick={exportPdf} data-testid="export-pdf-m" className="w-full min-h-[48px] px-4 flex items-center gap-3 text-sm font-bold text-emerald-100/90 hover:text-amber-300"><FileText className="w-4 h-4" aria-hidden="true" /> PDF</button></li>
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] lg:text-3xl font-extrabold text-amber-100">Espelho de ponto</h1>
          <p className="text-[13px] text-[#9fb8a5]">Controle interno · horários gravados pelo servidor (Brasília)</p>
        </div>
        <div className="hidden lg:flex gap-2.5">
          <button type="button" onClick={exportCsv} disabled={!table} data-testid="export-csv" className="min-h-[44px] px-4 rounded-xl bg-[#142718] border border-[#234129] text-sm font-extrabold text-amber-400 inline-flex items-center gap-2 disabled:opacity-50"><Download className="w-[18px] h-[18px]" aria-hidden="true" /> CSV</button>
          <button type="button" onClick={exportPdf} disabled={!table} data-testid="export-pdf" className="min-h-[44px] px-4 rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 text-sm font-extrabold text-[#1a1205] inline-flex items-center gap-2 disabled:opacity-50"><FileText className="w-[18px] h-[18px]" aria-hidden="true" /> Baixar PDF</button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 lg:p-3.5 lg:rounded-[20px] lg:bg-[#142718] lg:border lg:border-[#234129]">
        <div className="flex flex-col gap-1.5 lg:flex-1">
          <label htmlFor="mirror-user" className="text-xs lg:text-[11px] font-bold tracking-wider text-[#9fb8a5]">COLABORADOR</label>
          <select id="mirror-user" value={userId} onChange={e => setUserId(e.target.value)}
            className="min-h-[48px] lg:min-h-[44px] rounded-[14px] lg:rounded-xl bg-[#142718] lg:bg-[#0f1f12] border border-[#234129] text-[#e7efe8] text-[15px] lg:text-sm font-semibold px-3 focus:outline-none focus:ring-2 focus:ring-amber-400">
            {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5 lg:flex-1">
          <span className="hidden lg:block text-[11px] font-bold tracking-wider text-[#9fb8a5]">MÊS</span>
          <div className="flex items-center justify-between min-h-[48px] lg:min-h-[44px] rounded-[14px] lg:rounded-xl bg-[#142718] lg:bg-[#0f1f12] border border-[#234129] px-1">
            <button type="button" aria-label="Mês anterior" data-testid="month-prev" onClick={() => setMonth(m => shiftMonth(m, -1))}
              className="w-11 h-11 flex items-center justify-center text-amber-400"><ChevronLeft className="w-5 h-5" strokeWidth={2.5} aria-hidden="true" /></button>
            <span className="text-[15px] lg:text-sm font-extrabold" data-testid="month-label">{monthLongLabel(month)}</span>
            <button type="button" aria-label="Próximo mês" data-testid="month-next" disabled={month >= currentMonth} onClick={() => setMonth(m => shiftMonth(m, 1))}
              className="w-11 h-11 flex items-center justify-center text-amber-400 disabled:text-[#5f7d66]"><ChevronRight className="w-5 h-5" strokeWidth={2.5} aria-hidden="true" /></button>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 lg:flex-[1.3]">
          <span className="hidden lg:block text-[11px] font-bold tracking-wider text-[#9fb8a5]">MOSTRAR</span>
          <div role="tablist" aria-label="Filtro" className="grid grid-cols-3 gap-1.5 p-1 lg:p-[3px] rounded-[14px] lg:rounded-xl bg-[#0f1f12] border border-[#1b321f] lg:border-[#234129]">
            {FILTERS.map(f => (
              <button key={f} type="button" role="tab" aria-selected={filter === f} data-testid={`filter-${f}`} onClick={() => setFilter(f)}
                className={`min-h-[44px] rounded-[10px] text-[13px] font-bold ${filter === f ? 'bg-amber-500 text-[#1a1205] font-extrabold' : 'text-[#cfe3d3]'}`}>{FILTER_LABELS[f]}</button>
            ))}
          </div>
        </div>
      </div>

      {error && <p role="alert" className="text-sm font-semibold text-rose-300">{error}</p>}
      {!days && !error && <p className="text-sm text-[#9fb8a5]" role="status">Carregando…</p>}

      {days && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-3" data-testid="mirror-totals">
            {cards.map(([label, value, id]) => (
              <div key={label} className="p-3.5 lg:px-[18px] lg:py-4 rounded-[18px] bg-[#142718] border border-[#234129] flex flex-col gap-1.5">
                <span className="text-[11px] font-bold tracking-wider text-[#9fb8a5]">{label}</span>
                <span data-testid={id} className="text-[28px] lg:text-3xl font-extrabold text-amber-100 tabular-nums">{value}</span>
              </div>
            ))}
            <div className="p-3.5 lg:px-[18px] lg:py-4 rounded-[18px] bg-orange-400/10 border border-orange-400/45 flex flex-col gap-1.5">
              <span className="text-[11px] font-bold tracking-wider text-orange-300">PARA CONFERIR</span>
              <span data-testid="mirror-total-check" className="text-[28px] lg:text-3xl font-extrabold text-orange-200 tabular-nums">{summary.toCheck}</span>
            </div>
          </div>

          {days.length === 0 && <p className="text-sm text-[#9fb8a5]" data-testid="mirror-empty">Sem marcações neste mês.</p>}
          {days.length > 0 && shown.length === 0 && <p className="text-sm text-[#9fb8a5]" data-testid="mirror-filter-empty">Nenhum dia neste filtro.</p>}

          {shown.length > 0 && (
            <>
              <div className="lg:hidden space-y-2.5">
                <div className="px-1"><Axis /></div>
                <ul className="flex flex-col gap-2.5" data-testid="mirror-list">
                  {shown.map(d => <DayCard key={d.date} day={d} />)}
                </ul>
              </div>
              <div className="hidden lg:block rounded-[20px] bg-[#142718] border border-[#234129] overflow-x-auto">
                <table className="w-full min-w-[980px] border-collapse text-sm" data-testid="mirror-table">
                  <thead>
                    <tr className="text-left text-[11px] font-bold tracking-wider text-amber-400">
                      <th scope="col" className="px-[18px] py-3.5 border-b border-[#234129]">DIA</th>
                      <th scope="col" className="px-2.5 py-3.5 border-b border-[#234129]">ENTRADA</th>
                      <th scope="col" className="px-2.5 py-3.5 border-b border-[#234129]">INTERVALO</th>
                      <th scope="col" className="px-2.5 py-3.5 border-b border-[#234129]">SAÍDA</th>
                      <th scope="col" className="px-2.5 py-3.5 border-b border-[#234129] w-[300px]"><Axis /></th>
                      <th scope="col" className="px-2.5 py-3.5 border-b border-[#234129] text-right">TRABALHADO</th>
                      <th scope="col" className="px-[18px] py-3.5 border-b border-[#234129]">OBSERVAÇÕES</th>
                    </tr>
                  </thead>
                  <tbody>{shown.map(d => <DayRow key={d.date} day={d} />)}</tbody>
                </table>
              </div>
            </>
          )}

          <div className="flex gap-x-4 gap-y-2 flex-wrap px-1 text-xs font-semibold text-[#b9cfbf]" data-testid="mirror-legend">
            <span className="inline-flex items-center gap-1.5"><span className="w-3.5 h-2 rounded-full bg-[#4ade80]" />Trabalhado</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-3.5 h-2 rounded-full bg-[#f59e0b]" />Em andamento</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-3.5 h-2 rounded-full bg-[#fb923c]" />Sem saída</span>
            <span>* lançado como esquecimento</span>
          </div>
        </>
      )}

      {profile.role === 'dono' && (
        <div ref={archiveRef} className="space-y-3">
          <button type="button" aria-expanded={archiveOpen} onClick={() => setArchiveOpen(o => !o)} data-testid="archive-toggle"
            className="w-full lg:w-auto min-h-[48px] lg:min-h-[44px] px-4 rounded-[14px] border border-[#234129] text-[13px] font-bold text-[#9fb8a5] hover:text-amber-300 inline-flex items-center justify-center gap-2">
            <Archive className="w-[18px] h-[18px]" aria-hidden="true" /> Arquivo e meses antigos
          </button>
          {archiveOpen && <PurgePanel kind="time" ctx={ctx} defaultOpen onPurged={load} />}
        </div>
      )}
    </section>
  );
}
