import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import Modal from '../components/Modal';
import { monthLabel, oldMonths } from '../retention';

// Aviso do Dono no login: há histórico com mais de 12 meses? "Lembrar depois" = só volta no próximo login
// (a marca fica em sessionStorage e é limpa quando a sessão termina, em AuthContext.goAnon).
export const RETENTION_FLAG = 'dc_retention_seen';
const seen = () => { try { return sessionStorage.getItem(RETENTION_FLAG) === '1'; } catch { return false; } };
const markSeen = () => { try { sessionStorage.setItem(RETENTION_FLAG, '1'); } catch { /* sem storage: pergunta de novo na próxima carga */ } };

export default function RetentionNotice() {
  const [range, setRange] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (seen()) return undefined;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc('audit_months');
      if (cancelled || error) return;
      const old = oldMonths(data).map(m => m.month).sort();
      if (old.length) setRange({ from: monthLabel(old[0]), to: monthLabel(old[old.length - 1]) });
    })();
    return () => { cancelled = true; };
  }, []);

  if (!range) return null;
  const later = () => { markSeen(); setRange(null); };
  const go = () => { markSeen(); setRange(null); navigate('/historico', { state: { abrirExclusao: true } }); };

  return (
    <Modal title="Histórico com mais de 12 meses" onClose={later}>
      <p className="text-sm text-emerald-100/90 mb-4" data-testid="retention-text">
        Há registros do Histórico com mais de 12 meses (de {range.from} a {range.to}). Deseja apagar?
      </p>
      <div className="flex gap-3">
        <button type="button" onClick={later} className="flex-1 h-12 rounded-xl border border-emerald-900/60 bg-[#0d1c10] text-sm font-bold text-emerald-200">Lembrar depois</button>
        <button type="button" onClick={go} className="flex-1 h-12 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-sm font-black uppercase tracking-wide">Baixar e apagar</button>
      </div>
    </Modal>
  );
}
