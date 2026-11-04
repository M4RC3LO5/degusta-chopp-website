import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import Modal from '../components/Modal';
import { KEEP_FILES_NOTE, monthLabel, oldMonths, retentionMessage } from '../retention';

// Aviso do Dono no login: há Histórico e/ou Ponto com mais de 12 meses? Um aviso só para os dois.
// "Lembrar depois" = só volta no próximo login (a marca fica em sessionStorage e é limpa quando a sessão termina, em AuthContext.goAnon).
export const RETENTION_FLAG = 'dc_retention_seen';
const seen = () => { try { return sessionStorage.getItem(RETENTION_FLAG) === '1'; } catch { return false; } };
const markSeen = () => { try { sessionStorage.setItem(RETENTION_FLAG, '1'); } catch { /* sem storage: pergunta de novo na próxima carga */ } };

const SOURCES = [
  { key: 'audit', label: 'Histórico', rpc: 'audit_months', path: '/historico' },
  { key: 'time', label: 'Ponto', rpc: 'time_months', path: '/ponto/espelho' }
];

export default function RetentionNotice() {
  const [items, setItems] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (seen()) return undefined;
    let cancelled = false;
    (async () => {
      const found = [];
      for (const src of SOURCES) {
        const { data, error } = await supabase.rpc(src.rpc);
        if (error) continue;
        const old = oldMonths(data).map(m => m.month).sort();
        if (old.length) found.push({ ...src, from: monthLabel(old[0]), to: monthLabel(old[old.length - 1]) });
      }
      if (!cancelled && found.length) setItems(found);
    })();
    return () => { cancelled = true; };
  }, []);

  if (!items.length) return null;
  const later = () => { markSeen(); setItems([]); };
  const go = (item) => { markSeen(); setItems([]); navigate(item.path, { state: { abrirExclusao: true } }); };
  const hasTime = items.some(i => i.key === 'time');

  return (
    <Modal title="Registros com mais de 12 meses" onClose={later}>
      <p className="text-sm text-emerald-100/90 mb-2" data-testid="retention-text">{retentionMessage(items)}</p>
      {hasTime && <p className="text-xs text-emerald-200/70 mb-4">{KEEP_FILES_NOTE}</p>}
      <div className={`flex gap-3 ${items.length > 1 ? 'flex-col' : ''} ${hasTime ? '' : 'mt-2'}`}>
        <button type="button" onClick={later} className="flex-1 h-12 rounded-xl border border-emerald-900/60 bg-[#0d1c10] text-sm font-bold text-emerald-200">Lembrar depois</button>
        {items.map(item => (
          <button key={item.key} type="button" onClick={() => go(item)} data-testid={`retention-go-${item.key}`} className="flex-1 h-12 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-sm font-black uppercase tracking-wide">
            {items.length > 1 ? `Baixar e apagar ${item.label}` : 'Baixar e apagar'}
          </button>
        ))}
      </div>
    </Modal>
  );
}
