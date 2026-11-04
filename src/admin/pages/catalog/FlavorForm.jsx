import React, { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Field, Switch, inputClass, primaryBtn } from './fields';
import ImageField from './ImageField';
import { BADGE_CLASSES, COLOR_LABELS, FlavorPreview } from './Previews';
import { normalizeBadge, slugify, toFlavorRow, validateFlavor } from '../../catalogRules';
import { RULES } from '../../rules';

const abvText = (v) => String(v).replace('.', ',');

export default function FlavorForm({ flavor, flavors, currentImageUrl, onSave, onCancel }) {
  const isNew = !flavor;
  const [v, setV] = useState(() => ({
    name: flavor?.name ?? '',
    abv: flavor ? abvText(flavor.abv) : '',
    ibu: flavor ? String(flavor.ibu) : '',
    description: flavor?.description ?? '',
    idealFor: flavor?.ideal_for ?? '',
    badge: flavor?.badge ?? '',
    badgeColor: flavor?.badge_color ?? 'amber'
  }));
  const [active, setActive] = useState(flavor?.active ?? true);
  const [staged, setStaged] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (patch) => { setError(''); setV(prev => ({ ...prev, ...patch })); };

  const slug = isNew ? slugify(v.name) : flavor.slug;
  const errors = useMemo(() => {
    const e = validateFlavor(v);
    if (!e.name && isNew && flavors.some(f => f.slug === slug)) e.name = 'Já existe um sabor com esse nome.';
    return e;
  }, [v, slug, isNew, flavors]);
  const dirty = useMemo(() => {
    if (isNew || staged) return true;
    if (Object.keys(errors).length > 0) return true;
    const row = toFlavorRow(v);
    return ['name', 'abv', 'ibu', 'description', 'ideal_for', 'badge', 'badge_color'].some(k => (row[k] ?? null) !== (flavor[k] ?? null)) ;
  }, [v, staged, isNew, flavor, errors]);
  const canSave = !busy && dirty && Object.keys(errors).length === 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSave) return;
    setBusy(true);
    setError('');
    const result = await onSave({ ...toFlavorRow(v), slug, active }, staged);
    if (result?.error) { setError(result.error); setBusy(false); }
  };

  const spec = RULES.images.flavorGlass;
  const imageUrl = staged?.url || currentImageUrl;
  const show = (k) => (errors[k] && String(v[k]).length > 0 ? errors[k] : '');
  const previewProps = { slug, name: v.name, abv: v.abv, ibu: v.ibu, badge: v.badge, badgeColor: v.badgeColor, description: v.description, idealFor: v.idealFor };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate data-testid="flavor-form">
      <button type="button" onClick={onCancel} className="min-h-[44px] flex items-center gap-2 text-sm font-bold text-emerald-300"><ArrowLeft className="w-4 h-4" /> Voltar à lista</button>
      <h1 className="text-xl font-extrabold text-amber-300">{isNew ? 'Novo sabor' : `Editar ${flavor.name}`}</h1>

      <Field id="flavor-name" label="Nome" max={RULES.flavor.name.max} value={v.name} error={show('name')}>
        <input id="flavor-name" className={inputClass} maxLength={RULES.flavor.name.max} value={v.name} onChange={(e) => set({ name: e.target.value })} autoComplete="off" />
      </Field>
      <p className="text-xs text-emerald-200/70">
        Endereço interno (slug): <code className="font-mono text-amber-300" data-testid="flavor-slug">{slug || '—'}</code>{' '}
        {isNew ? '(gerado do nome; não pode ser alterado depois de criado)' : '(não editável)'}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Field id="flavor-abv" label="ABV (%)" error={show('abv')} hint="De 0 a 15, passo 0,1">
          <input id="flavor-abv" className={inputClass} inputMode="decimal" autoComplete="off" value={v.abv} onChange={(e) => set({ abv: e.target.value.replace(/[^\d.,]/g, '').slice(0, 4) })} />
        </Field>
        <Field id="flavor-ibu" label="IBU" error={show('ibu')} hint="Inteiro de 0 a 120">
          <input id="flavor-ibu" className={inputClass} inputMode="numeric" autoComplete="off" value={v.ibu} onChange={(e) => set({ ibu: e.target.value.replace(/[^\d]/g, '').slice(0, 3) })} />
        </Field>
      </div>

      <Field id="flavor-description" label="Descrição" max={RULES.flavor.description.max} value={v.description} error={show('description')}>
        <textarea id="flavor-description" rows={3} className={`${inputClass} h-auto py-3 resize-none`} maxLength={RULES.flavor.description.max} value={v.description} onChange={(e) => set({ description: e.target.value })} />
      </Field>

      <Field id="flavor-ideal" label="Ideal para" max={RULES.flavor.idealFor.max} value={v.idealFor} error={show('idealFor')}>
        <input id="flavor-ideal" className={inputClass} maxLength={RULES.flavor.idealFor.max} value={v.idealFor} onChange={(e) => set({ idealFor: e.target.value })} autoComplete="off" />
      </Field>

      <Field id="flavor-badge" label="Selo (opcional)" max={RULES.flavor.badge.max} value={v.badge} error={show('badge')} hint="Sempre em maiúsculas.">
        <input id="flavor-badge" className={`${inputClass} uppercase`} maxLength={RULES.flavor.badge.max} value={v.badge} onChange={(e) => set({ badge: normalizeBadge(e.target.value) })} autoComplete="off" />
      </Field>

      <Field id="flavor-color" label="Cor do selo" error={errors.badgeColor}>
        <div className="flex items-center gap-3">
          <select id="flavor-color" className={`${inputClass} flex-1`} value={v.badgeColor} onChange={(e) => set({ badgeColor: e.target.value })}>
            {RULES.flavor.badgeColors.map(c => <option key={c} value={c}>{COLOR_LABELS[c]}</option>)}
          </select>
          <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase border tracking-wide whitespace-nowrap ${BADGE_CLASSES[v.badgeColor]}`}>{v.badge.trim() || 'Selo'}</span>
        </div>
      </Field>

      <ImageField
        testId="flavor-glass"
        label="Copo do sabor"
        spec={spec}
        hint="Foto na vertical funciona melhor. O recorte é 2:3."
        currentUrl={currentImageUrl}
        staged={staged}
        onStage={setStaged}
        renderPreview={(url) => <FlavorPreview {...previewProps} imageUrl={url} />}
      />

      {isNew && <Switch checked={active} onChange={setActive} label="Sabor ativo" />}

      <div className="rounded-2xl bg-[#142718] border border-emerald-900/50 p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">Prévia ao vivo</p>
        <FlavorPreview {...previewProps} imageUrl={imageUrl} />
      </div>

      {error && <p role="alert" className="text-sm font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2.5">{error}</p>}
      <div className="flex gap-3">
        <button type="button" onClick={onCancel} disabled={busy} className="flex-1 h-12 rounded-xl border border-emerald-900/60 bg-[#0d1c10] text-sm font-bold text-emerald-200 disabled:opacity-50">Cancelar</button>
        <button type="submit" disabled={!canSave} className={`${primaryBtn} flex-1`}>{busy ? 'Salvando…' : isNew ? 'Criar sabor' : 'Salvar'}</button>
      </div>
      {isNew && <p className="text-xs text-emerald-200/70 text-center">Depois de criar, você vai direto para os preços deste sabor.</p>}
    </form>
  );
}
