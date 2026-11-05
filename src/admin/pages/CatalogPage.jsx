import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, Pencil, Plus } from 'lucide-react';
import { supabase } from '../supabase';
import { ConfirmDialog } from '../components/Modal';
import BrandForm from './catalog/BrandForm';
import FlavorForm from './catalog/FlavorForm';
import { Switch, primaryBtn } from './catalog/fields';
import { IMAGE_BUCKET, objectPath, versionedPath } from '../imageTools';
import { nextSortOrder, plural, reorder } from '../catalogRules';

function mapDbError(error) {
  if (error?.code === '23505') return 'Já existe um registro com esse nome.';
  if (error?.code === '42501' || error?.code === 'PGRST301') return 'Sem permissão para salvar. Entre de novo.';
  if (error?.code === '23514') return 'O banco recusou os valores. Confira os limites dos campos.';
  return 'Não foi possível salvar. Verifique a internet e tente de novo.';
}

const publicUrl = (path) => (path ? supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl : null);

async function uploadImage(folder, id, blob) {
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(objectPath(versionedPath(folder, id)), blob, { contentType: 'image/webp', upsert: true, cacheControl: '3600' });
  return error ? { error } : { path: versionedPath(folder, id) };
}

function ItemRow({ kind, item, subtitle, count, index, last, onMove, onToggle, onEdit }) {
  const thumb = kind === 'brand' ? publicUrl(item.logo_path) : publicUrl(item.image_path);
  return (
    <li data-testid={`${kind}-${item.slug}`} className="rounded-2xl bg-[#142718] border border-emerald-900/50 p-4 space-y-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`${kind === 'brand' ? 'h-12 w-12' : 'h-14 w-10'} shrink-0 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden`}>
          {thumb ? <img src={thumb} alt="" className="h-full w-full object-contain" /> : <span className="text-amber-400 font-extrabold">{item.name.charAt(0)}</span>}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="font-bold text-slate-100 truncate">{item.name}</p>
          <p className="text-xs text-emerald-200/60 truncate">{item.slug} · {subtitle}</p>
        </div>
        {!item.active && <span className="text-[11px] font-bold text-rose-300 shrink-0">Inativo</span>}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <button type="button" aria-label={`Subir ${item.name}`} disabled={index === 0} onClick={() => onMove(item, -1)} className="h-11 w-11 rounded-xl border border-emerald-900/60 bg-[#0d1c10] text-amber-400 disabled:opacity-30 flex items-center justify-center"><ArrowUp className="w-4 h-4" /></button>
          <button type="button" aria-label={`Descer ${item.name}`} disabled={last} onClick={() => onMove(item, 1)} className="h-11 w-11 rounded-xl border border-emerald-900/60 bg-[#0d1c10] text-amber-400 disabled:opacity-30 flex items-center justify-center"><ArrowDown className="w-4 h-4" /></button>
        </div>
        <Switch checked={item.active} onChange={() => onToggle(item)} label={`${item.name} ativo`} />
        <button type="button" onClick={() => onEdit(item)} className="min-h-[44px] px-4 rounded-xl border border-amber-500/40 bg-[#0d1c10] text-xs font-bold text-amber-300 flex items-center gap-2"><Pencil className="w-4 h-4" /><span>Editar</span></button>
      </div>
    </li>
  );
}

// Card 12: uma tela por tipo. `kind` = 'brand' (/admin/marcas) ou 'flavor' (/admin/sabores).
export default function CatalogPage({ kind }) {
  const navigate = useNavigate();
  const tab = kind === 'brand' ? 'brands' : 'flavors';
  const [data, setData] = useState({ brands: [], flavors: [], offers: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState(null);                 // { kind: 'brand'|'flavor', item: row|null }
  const [confirm, setConfirm] = useState(null);           // { title, message, confirmLabel, run }
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  const load = useCallback(async () => {
    const [b, f, o] = await Promise.all([
      supabase.from('brands').select('*').order('sort_order'),
      supabase.from('flavors').select('*').order('sort_order'),
      supabase.from('offers').select('id, flavor_id, brand_id, active')
    ]);
    if (b.error || f.error || o.error) { setLoadError('Não foi possível carregar o catálogo.'); setLoading(false); return; }
    setData({ brands: b.data, flavors: f.data, offers: o.data });
    setLoadError('');
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const { brands, flavors, offers } = data;
  const brandById = useMemo(() => new Map(brands.map(b => [b.id, b])), [brands]);
  const flavorById = useMemo(() => new Map(flavors.map(f => [f.id, f])), [flavors]);

  // Sabores em que a marca aparece hoje no site (oferta ativa e sabor ativo).
  const visibleFlavorsOfBrand = (brand) => new Set(offers.filter(o => o.brand_id === brand.id && o.active && flavorById.get(o.flavor_id)?.active).map(o => o.flavor_id)).size;
  const flavorIsVisible = (flavor) => flavor.active && offers.some(o => o.flavor_id === flavor.id && o.active && brandById.get(o.brand_id)?.active);

  const guardedUpdate = async (table, item, patch) => {
    const { data: row, error } = await supabase.from(table).update(patch).eq('id', item.id).eq('updated_at', item.updated_at).select('*').maybeSingle();
    if (error) return { error: mapDbError(error) };
    if (!row) { await load(); return { error: 'Este item foi alterado por outra pessoa. A tela foi atualizada: confira e tente de novo.' }; }
    return { row };
  };

  // ---- lista: ativar/desativar e reordenar ----
  const applyToggle = async (kind, item) => {
    const r = await guardedUpdate(kind === 'brand' ? 'brands' : 'flavors', item, { active: !item.active });
    if (r.error) throw new Error(r.error);
    await load();
  };
  const toggleActive = (kind, item) => {
    setNotice('');
    if (item.active) {
      let message = '';
      if (kind === 'brand') {
        const n = visibleFlavorsOfBrand(item);
        if (n > 0) message = `${item.name} será ocultada em ${plural(n, 'sabor', 'sabores')}. Continuar?`;
      } else if (flavorIsVisible(item)) {
        message = `${item.name} vai sumir do site. Continuar?`;
      }
      if (message) { setConfirmError(''); setConfirm({ title: kind === 'brand' ? 'Desativar marca' : 'Desativar sabor', message, confirmLabel: 'Continuar', run: () => applyToggle(kind, item) }); return; }
    }
    applyToggle(kind, item).catch(err => setNotice(err.message));
  };
  const runConfirm = async () => {
    setConfirmBusy(true);
    setConfirmError('');
    try { await confirm.run(); setConfirm(null); } catch (err) { setConfirmError(err.message); } finally { setConfirmBusy(false); }
  };

  const move = async (kind, item, dir) => {
    setNotice('');
    const list = kind === 'brand' ? brands : flavors;
    const changes = reorder(list, item.id, dir);
    for (const c of changes) {
      const row = list.find(x => x.id === c.id);
      const r = await guardedUpdate(kind === 'brand' ? 'brands' : 'flavors', row, { sort_order: c.sort_order });
      if (r.error) { setNotice(r.error); await load(); return; }
    }
    await load();
  };

  // ---- formulários ----
  const saveBrand = async (values, staged) => {
    const item = form.item;
    if (item) {
      let patch = { name: values.name };
      if (staged) {
        const up = await uploadImage('brands', item.id, staged.blob);
        if (up.error) return { error: 'Não foi possível enviar a imagem. Tente de novo.' };
        patch = { ...patch, logo_path: up.path };
      }
      const r = await guardedUpdate('brands', item, patch);
      if (r.error) return { error: r.error };
    } else {
      const { data: row, error } = await supabase.from('brands').insert({ slug: values.slug, name: values.name, active: values.active, sort_order: nextSortOrder(brands) }).select('*').single();
      if (error) return { error: mapDbError(error) };
      if (staged) {
        const up = await uploadImage('brands', row.id, staged.blob);
        const r = up.error ? { error: true } : await guardedUpdate('brands', row, { logo_path: up.path });
        if (r.error) setNotice('Marca criada, mas a imagem não foi enviada. Abra "Editar" e tente de novo.');
      }
    }
    setForm(null);
    await load();
    return {};
  };

  const saveFlavor = async (values, staged) => {
    const item = form.item;
    const { slug, active, ...fields } = values;
    if (item) {
      let patch = fields;
      if (staged) {
        const up = await uploadImage('flavors', item.id, staged.blob);
        if (up.error) return { error: 'Não foi possível enviar a imagem. Tente de novo.' };
        patch = { ...patch, image_path: up.path };
      }
      const r = await guardedUpdate('flavors', item, patch);
      if (r.error) return { error: r.error };
      setForm(null);
      await load();
      return {};
    }
    const { data: row, error } = await supabase.from('flavors').insert({ slug, active, sort_order: nextSortOrder(flavors), ...fields }).select('*').single();
    if (error) return { error: mapDbError(error) };
    if (staged) {
      const up = await uploadImage('flavors', row.id, staged.blob);
      const r = up.error ? { error: true } : await guardedUpdate('flavors', row, { image_path: up.path });
      if (r.error) setNotice('Sabor criado, mas a imagem não foi enviada. Abra "Editar" e tente de novo.');
    }
    // Sabor novo: segue direto para os preços dele
    navigate('/precos', { state: { flavorId: row.id } });
    return {};
  };

  if (form?.kind === 'brand') {
    return <BrandForm brand={form.item} brands={brands} currentLogoUrl={publicUrl(form.item?.logo_path)} onSave={saveBrand} onCancel={() => setForm(null)} />;
  }
  if (form?.kind === 'flavor') {
    return <FlavorForm flavor={form.item} flavors={flavors} currentImageUrl={publicUrl(form.item?.image_path)} onSave={saveFlavor} onCancel={() => setForm(null)} />;
  }

  const list = kind === 'brand' ? brands : flavors;

  return (
    <section className="space-y-5">
      <h1 className="text-xl font-extrabold text-amber-300">{kind === 'brand' ? 'Marcas' : 'Sabores'}</h1>

      <button type="button" onClick={() => setForm({ kind, item: null })} className={`${primaryBtn} w-full flex items-center justify-center gap-2 text-sm`}>
        <Plus className="w-4 h-4" />
        <span>{kind === 'brand' ? 'Nova marca' : 'Novo sabor'}</span>
      </button>

      {notice && <p role="alert" className="text-sm font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2.5">{notice}</p>}
      {loading && <p className="text-sm text-emerald-200/70" role="status">Carregando…</p>}
      {loadError && <p role="alert" className="text-sm font-semibold text-rose-300">{loadError}</p>}

      <ul className="space-y-3" data-testid={`list-${tab}`}>
        {list.map((item, i) => (
          <ItemRow
            key={item.id}
            kind={kind}
            item={item}
            index={i}
            last={i === list.length - 1}
            subtitle={kind === 'brand'
              ? `em ${plural(visibleFlavorsOfBrand(item), 'sabor', 'sabores')}`
              : `${String(item.abv).replace('.', ',')}% · ${item.ibu} IBU${item.badge ? ` · ${item.badge}` : ''}`}
            onMove={(it, dir) => move(kind, it, dir)}
            onToggle={(it) => toggleActive(kind, it)}
            onEdit={(it) => setForm({ kind, item: it })}
          />
        ))}
      </ul>

      {confirm && (
        <ConfirmDialog title={confirm.title} message={confirm.message} confirmLabel={confirm.confirmLabel} danger busy={confirmBusy} error={confirmError} onConfirm={runConfirm} onCancel={() => setConfirm(null)} />
      )}
    </section>
  );
}
