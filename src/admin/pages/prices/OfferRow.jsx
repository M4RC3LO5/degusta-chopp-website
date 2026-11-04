import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ConfirmDialog } from '../../components/Modal';
import PriceInput from './PriceInput';
import { bigVariations, isDirty, priceToText, validateOffer, variationMessage } from '../../pricing';
import { RULES } from '../../rules';

// Colunas da tabela no desktop (md+): marca | subtítulo | 30L | 50L | ativa | salvar
export const GRID_COLS = 'md:grid md:grid-cols-[190px_minmax(0,1fr)_150px_150px_100px_112px] md:gap-x-3 md:gap-y-1 md:items-start';

const EMPTY = { subtitle: null, price_30: null, price_50: null, active: true };

// Linha de uma oferta (sabor x marca). `offer` nulo = oferta nova (ainda não existe no banco).
// Mobile: cartão empilhado. md+: linha de tabela (grid).
export default function OfferRow({ flavor, brand, offer, logoUrl, wouldHideFlavor, onSave, onCancelNew }) {
  const saved = offer || EMPTY;
  const initial = () => ({ subtitle: saved.subtitle ?? '', text30: priceToText(saved.price_30), text50: priceToText(saved.price_50), active: Boolean(saved.active) });
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');
  const [confirm, setConfirm] = useState(null);       // { message, confirmLabel, resolve }
  const resetKey = offer ? offer.updated_at : 'new';
  const mounted = useRef(true);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  // Linha recarregada (salvou, desfez ou houve conflito): o rascunho volta aos valores do banco.
  // O erro do servidor NÃO é limpo aqui (o aviso de conflito chega no mesmo commit); ele some ao editar ou salvar de novo.
  useEffect(() => { setDraft(initial()); }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const { errors, values } = useMemo(() => validateOffer(draft), [draft]);
  const hasErrors = Object.keys(errors).length > 0;
  const dirty = offer ? isDirty(saved, values) : true;
  const set = (patch) => { setServerError(''); setDraft(d => ({ ...d, ...patch })); };

  const ask = (message, confirmLabel) => new Promise(resolve => setConfirm({ message, confirmLabel, resolve }));
  const answer = (ok) => { confirm.resolve(ok); setConfirm(null); };

  const save = async () => {
    if (busy || hasErrors || !dirty) return;
    // 1) variação > 30% em algum tamanho; 2) desativar a última oferta visível do sabor
    const big = offer ? bigVariations(saved, values) : [];
    if (big.length > 0 && !(await ask(variationMessage(big), 'Confirmar'))) return;
    if (offer && wouldHideFlavor(offer, values) && !(await ask(`${flavor.name} vai sumir do site. Continuar?`, 'Continuar'))) return;
    setBusy(true);
    setServerError('');
    const result = await onSave(values, offer, flavor, brand);
    if (mounted.current) {
      setBusy(false);
      if (result?.error) setServerError(result.error);
    }
  };

  const sub = draft.subtitle;
  const subLen = sub.length;
  const subWarn = subLen >= RULES.offer.subtitleMax * RULES.offer.subtitleWarnAt;
  const id = `${flavor.slug}-${brand.slug}`;
  const hidden = offer && (!offer.active || !brand.active || !flavor.active);

  return (
    <div data-testid={`offer-${id}`} className={`${GRID_COLS} py-4 md:py-3 space-y-3 md:space-y-0`}>
      {/* Marca + ativa (mobile: mesma linha; md: vira duas células da grid) */}
      <div className="flex items-center justify-between gap-3 md:contents">
        <div className="flex items-center gap-3 min-w-0 md:col-start-1 md:row-start-1 md:h-11">
          <img
            src={logoUrl}
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 rounded-lg bg-white/5 p-1 object-contain shrink-0"
            onError={(e) => { if (!e.currentTarget.dataset.fb) { e.currentTarget.dataset.fb = '1'; e.currentTarget.src = `/logos/${brand.slug}.webp`; } else e.currentTarget.style.visibility = 'hidden'; }}
          />
          <div className="min-w-0 leading-tight">
            <p className="font-bold text-slate-100 truncate">{brand.name}</p>
            {!brand.active && <p className="text-[11px] font-bold text-rose-300">Marca desativada</p>}
            {brand.active && hidden && <p className="text-[11px] text-emerald-200/60">Fora do site</p>}
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={draft.active}
          aria-label={`Oferta ${brand.name} ativa`}
          onClick={() => set({ active: !draft.active })}
          className="min-h-[44px] flex items-center gap-2 md:col-start-5 md:row-start-1"
        >
          <span className={`relative inline-block w-12 h-7 rounded-full transition-colors ${draft.active ? 'bg-emerald-500' : 'bg-slate-600'}`}>
            <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all ${draft.active ? 'left-[22px]' : 'left-0.5'}`} />
          </span>
          <span className="text-xs font-bold text-emerald-100/90 w-12 text-left">{draft.active ? 'Ativa' : 'Inativa'}</span>
        </button>
      </div>

      {/* Subtítulo */}
      <div className="md:col-start-2 md:row-start-1 min-w-0">
        <label htmlFor={`${id}-sub`} className="block text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-1 md:sr-only">Subtítulo</label>
        <input
          id={`${id}-sub`}
          type="text"
          maxLength={RULES.offer.subtitleMax}
          autoComplete="off"
          value={sub}
          onChange={(e) => set({ subtitle: e.target.value.slice(0, RULES.offer.subtitleMax) })}
          placeholder="Ex.: Custo-benefício"
          className="w-full h-11 px-3 rounded-xl bg-[#0d1c10] border border-emerald-900/60 text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <p className={`text-[11px] text-right mt-0.5 ${subWarn ? 'text-amber-300 font-bold' : 'text-emerald-200/60'}`} data-testid={`${id}-counter`}>{subLen}/{RULES.offer.subtitleMax}</p>
      </div>

      {/* Preços */}
      <div className="grid grid-cols-2 gap-3 md:contents">
        <div className="md:col-start-3 md:row-start-1">
          <PriceInput id={`${id}-p30`} label="Barril 30L" value={draft.text30} onChange={(v) => set({ text30: v })} error={errors.p30} />
        </div>
        <div className="md:col-start-4 md:row-start-1">
          <PriceInput id={`${id}-p50`} label="Barril 50L" value={draft.text50} onChange={(v) => set({ text50: v })} error={errors.p50} />
        </div>
      </div>
      {errors.prices && <p role="alert" className="text-xs font-semibold text-rose-300 md:col-span-full md:row-start-2">{errors.prices}</p>}

      {/* Salvar (por linha) */}
      <div className="flex gap-2 md:col-start-6 md:row-start-1">
        {!offer && (
          <button type="button" onClick={onCancelNew} disabled={busy} className="min-h-[44px] px-3 rounded-xl border border-emerald-900/60 bg-[#0d1c10] text-xs font-bold text-emerald-200 disabled:opacity-50">Cancelar</button>
        )}
        <button
          type="button"
          onClick={save}
          disabled={busy || hasErrors || !dirty}
          className="min-h-[44px] flex-1 md:flex-none md:min-w-[96px] px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-xs font-black uppercase tracking-wide disabled:opacity-40"
        >
          {busy ? 'Salvando…' : 'Salvar'}
        </button>
      </div>

      {serverError && <p role="alert" className="text-sm font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2 md:col-span-full md:row-start-3">{serverError}</p>}

      {confirm && (
        <ConfirmDialog
          title="Confirmar alteração"
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          onConfirm={() => answer(true)}
          onCancel={() => answer(false)}
        />
      )}
    </div>
  );
}
