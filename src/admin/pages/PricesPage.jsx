import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown, Plus, Undo2 } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../auth/AuthContext';
import OfferRow, { GRID_COLS } from './prices/OfferRow';
import { RULES } from '../rules';
import { loadStaffNames } from '../staffNames';

const SAVE_FIELDS = ['subtitle', 'price_30', 'price_50', 'active'];

function mapDbError(error) {
  if (error?.code === '23505') return 'Essa marca já tem uma oferta para este sabor.';
  if (error?.code === '42501' || error?.code === 'PGRST301') return 'Sem permissão para salvar. Entre de novo.';
  if (error?.code === '23514') return 'O banco recusou os valores. Confira preços e subtítulo.';
  return 'Não foi possível salvar. Verifique a internet e tente de novo.';
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');
}

export default function PricesPage() {
  const { profile: me } = useAuth();
  const [data, setData] = useState({ brands: [], flavors: [], offers: [], names: new Map() });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const location = useLocation();
  const [openId, setOpenId] = useState(location.state?.flavorId ?? null);   // vindo de "Novo sabor": já abre o sabor criado
  const [adding, setAdding] = useState({});          // flavorId -> brandId escolhido (oferta nova ainda não salva)
  const [toast, setToast] = useState(null);          // { text, undo?, secondsLeft }
  const toastTimer = useRef(null);

  const load = useCallback(async () => {
    const [b, f, o, p] = await Promise.all([
      supabase.from('brands').select('*').order('sort_order'),
      supabase.from('flavors').select('*').order('sort_order'),
      supabase.from('offers').select('*'),
      loadStaffNames()      // RPC staff_names(): toda a equipe vê o nome (profiles segue restrito por RLS)
    ]);
    if (b.error || f.error || o.error) { setLoadError('Não foi possível carregar os preços.'); setLoading(false); return; }
    setData({ brands: b.data, flavors: f.data, offers: o.data, names: p });
    setOpenId(prev => prev ?? f.data[0]?.id ?? null);
    setLoadError('');
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const brandById = useMemo(() => new Map(data.brands.map(b => [b.id, b])), [data.brands]);

  const logoUrl = (brand) => (brand.logo_path
    ? supabase.storage.from(RULES.images.bucket).getPublicUrl(brand.logo_path).data.publicUrl
    : `/logos/${brand.slug}.webp`);
  const flavorImageUrl = (flavor) => (flavor.image_path
    ? supabase.storage.from(RULES.images.bucket).getPublicUrl(flavor.image_path).data.publicUrl
    : `/configurator/copo-${flavor.slug}.webp`);

  // ---- toast com contagem regressiva ----
  const showToast = useCallback((text, undo) => {
    clearInterval(toastTimer.current);
    const seconds = undo ? RULES.offer.undoSeconds : 4;
    setToast({ text, undo, secondsLeft: seconds });
    toastTimer.current = setInterval(() => {
      setToast(t => {
        if (!t) return t;
        if (t.secondsLeft <= 1) { clearInterval(toastTimer.current); return null; }
        return { ...t, secondsLeft: t.secondsLeft - 1 };
      });
    }, 1000);
  }, []);
  useEffect(() => () => clearInterval(toastTimer.current), []);

  const replaceOffer = (row) => setData(d => ({
    ...d,
    offers: d.offers.some(o => o.id === row.id) ? d.offers.map(o => (o.id === row.id ? row : o)) : [...d.offers, row]
  }));

  // Desativar a última oferta visível de um sabor o tira do site: o aviso é pedido pela linha.
  const wouldHideFlavor = (offer, values) => {
    const flavor = data.flavors.find(f => f.id === offer.flavor_id);
    const brand = brandById.get(offer.brand_id);
    if (!flavor?.active || !brand) return false;
    const wasVisible = offer.active && brand.active;
    const willBeVisible = values.active && brand.active;
    if (!wasVisible || willBeVisible) return false;
    return !data.offers.some(o => o.flavor_id === offer.flavor_id && o.id !== offer.id && o.active && brandById.get(o.brand_id)?.active);
  };

  const saveOffer = async (values, offer, flavor, brand) => {
    if (offer) {
      // Concorrência: só grava se ninguém mexeu na linha desde que ela foi carregada.
      const { data: row, error } = await supabase
        .from('offers').update(values).eq('id', offer.id).eq('updated_at', offer.updated_at).select('*').maybeSingle();
      if (error) return { error: mapDbError(error) };
      if (!row) {
        await load();
        return { error: 'Este preço foi alterado por outra pessoa. A tela foi atualizada: confira e salve de novo.' };
      }
      replaceOffer(row);
      const previous = Object.fromEntries(SAVE_FIELDS.map(k => [k, offer[k]]));
      showToast('Salvo', { id: row.id, previous, expectedUpdatedAt: row.updated_at });
      return {};
    }
    const { data: row, error } = await supabase
      .from('offers').insert({ flavor_id: flavor.id, brand_id: brand.id, ...values }).select('*').single();
    if (error) {
      if (error.code === '23505') await load();
      return { error: mapDbError(error) };
    }
    replaceOffer(row);
    setAdding(a => { const n = { ...a }; delete n[flavor.id]; return n; });
    // Não existe DELETE: desfazer uma criação desativa a oferta.
    showToast('Marca adicionada', { id: row.id, previous: { active: false }, expectedUpdatedAt: row.updated_at });
    return {};
  };

  const undo = async () => {
    const u = toast?.undo;
    if (!u) return;
    clearInterval(toastTimer.current);
    setToast(null);
    const { data: row, error } = await supabase
      .from('offers').update(u.previous).eq('id', u.id).eq('updated_at', u.expectedUpdatedAt).select('*').maybeSingle();
    if (error || !row) { showToast('Não foi possível desfazer: o valor foi alterado depois.'); load(); return; }
    replaceOffer(row);
    showToast('Alteração desfeita.');
  };

  const last = data.offers.reduce((acc, o) => (!acc || o.updated_at > acc.updated_at ? o : acc), null);
  const lastBy = last
    ? (last.updated_by ? (data.names.get(last.updated_by) || null) : 'carga inicial')
    : null;

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-amber-300">Preços</h1>
        {last && (
          <p className="text-xs text-emerald-200/70 mt-1" data-testid="last-change">
            Última alteração: {lastBy ? `${lastBy}, ` : ''}{formatDateTime(last.updated_at)}
          </p>
        )}
      </div>

      {loading && <p className="text-sm text-emerald-200/70" role="status">Carregando…</p>}
      {loadError && <p role="alert" className="text-sm font-semibold text-rose-300">{loadError}</p>}

      <div className="space-y-3">
        {data.flavors.map(flavor => {
          const offers = data.offers
            .filter(o => o.flavor_id === flavor.id)
            .sort((a, b) => (brandById.get(a.brand_id)?.sort_order ?? 0) - (brandById.get(b.brand_id)?.sort_order ?? 0));
          const visibleCount = offers.filter(o => o.active && brandById.get(o.brand_id)?.active).length;
          const missing = data.brands.filter(b => !offers.some(o => o.brand_id === b.id));
          const open = openId === flavor.id;
          const addingBrandId = adding[flavor.id];
          const addingBrand = addingBrandId ? brandById.get(addingBrandId) : null;

          return (
            <section key={flavor.id} data-testid={`flavor-${flavor.slug}`} className="rounded-2xl bg-[#142718] border border-emerald-900/50">
              <h2>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : flavor.id)}
                  className="w-full min-h-[56px] flex items-center gap-3 px-4 text-left lg:cursor-default"
                >
                  <img
                    src={flavorImageUrl(flavor)}
                    alt=""
                    width={32}
                    height={32}
                    className="h-8 w-8 object-contain shrink-0"
                    onError={(e) => { if (!e.currentTarget.dataset.fb) { e.currentTarget.dataset.fb = '1'; e.currentTarget.src = `/configurator/copo-${flavor.slug}.webp`; } else e.currentTarget.style.visibility = 'hidden'; }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-extrabold text-slate-100 truncate">{flavor.name}</span>
                    <span className="block text-[11px] text-emerald-200/70">
                      {!flavor.active ? 'Sabor desativado (fora do site)' : visibleCount === 0 ? 'Sem ofertas ativas (fora do site)' : `${visibleCount} ${visibleCount === 1 ? 'oferta ativa' : 'ofertas ativas'}`}
                    </span>
                  </span>
                  <ChevronDown className={`lg:hidden w-5 h-5 text-amber-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
              </h2>

              <div className={`${open ? 'block' : 'hidden'} lg:block px-4 pb-3`}>
                <div className={`hidden lg:grid ${GRID_COLS.replace('lg:grid ', '')} pb-2 border-b border-emerald-900/50 text-[11px] font-bold uppercase tracking-wider text-amber-400`}>
                  <span>Marca</span><span>Subtítulo</span><span className="text-right pr-1">Barril 30L</span><span className="text-right pr-1">Barril 50L</span><span>Ativa</span><span />
                </div>

                <div className="divide-y divide-emerald-900/40">
                  {offers.map(offer => {
                    const brand = brandById.get(offer.brand_id);
                    return brand && (
                      <OfferRow
                        key={offer.id}
                        flavor={flavor}
                        brand={brand}
                        offer={offer}
                        logoUrl={logoUrl(brand)}
                        wouldHideFlavor={wouldHideFlavor}
                        onSave={saveOffer}
                      />
                    );
                  })}
                  {addingBrand && (
                    <OfferRow
                      key={`new-${addingBrand.id}`}
                      flavor={flavor}
                      brand={addingBrand}
                      offer={null}
                      logoUrl={logoUrl(addingBrand)}
                      wouldHideFlavor={wouldHideFlavor}
                      onSave={saveOffer}
                      onCancelNew={() => setAdding(a => { const n = { ...a }; delete n[flavor.id]; return n; })}
                    />
                  )}
                </div>

                {missing.length > 0 && (
                  <div className="pt-3 space-y-2">
                    {addingBrand ? (
                      <div>
                        <label htmlFor={`add-${flavor.slug}`} className="block text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-1">Marca a adicionar</label>
                        <select
                          id={`add-${flavor.slug}`}
                          value={addingBrandId}
                          onChange={(e) => setAdding(a => ({ ...a, [flavor.id]: e.target.value }))}
                          className="w-full lg:w-60 h-11 px-3 rounded-xl bg-[#0d1c10] border border-emerald-900/60 text-slate-100"
                        >
                          {missing.map(b => <option key={b.id} value={b.id}>{b.name}{b.active ? '' : ' (desativada)'}</option>)}
                        </select>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAdding(a => ({ ...a, [flavor.id]: missing[0].id }))}
                        className="min-h-[44px] px-4 rounded-xl border border-amber-500/40 bg-[#0d1c10] text-xs font-bold text-amber-300 flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Adicionar marca a este sabor</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {toast && (
        <div role="status" aria-live="polite" className="fixed inset-x-0 bottom-20 z-[60] flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-[#0d1c10] border border-amber-500/40 shadow-neu-gold pl-4 pr-2 py-2">
            <span className="text-sm font-bold text-slate-100" data-testid="toast-text">{toast.text}</span>
            {toast.undo && (
              <button type="button" onClick={undo} className="min-h-[44px] px-3 rounded-xl bg-amber-500 text-slate-950 text-xs font-black flex items-center gap-1.5">
                <Undo2 className="w-4 h-4" />
                <span>Desfazer ({toast.secondsLeft} s)</span>
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
