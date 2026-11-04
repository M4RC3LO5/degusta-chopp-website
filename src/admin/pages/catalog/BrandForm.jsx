import React, { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Field, Switch, inputClass, primaryBtn } from './fields';
import ImageField from './ImageField';
import { BrandPreview } from './Previews';
import { slugify, validateBrand } from '../../catalogRules';
import { RULES } from '../../rules';

export default function BrandForm({ brand, brands, currentLogoUrl, onSave, onCancel }) {
  const isNew = !brand;
  const [name, setName] = useState(brand?.name ?? '');
  const [active, setActive] = useState(brand?.active ?? true);
  const [staged, setStaged] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const slug = isNew ? slugify(name) : brand.slug;
  const errors = useMemo(() => {
    const e = validateBrand({ name });
    if (!e.name && isNew && brands.some(b => b.slug === slug)) e.name = 'Já existe uma marca com esse nome.';
    return e;
  }, [name, slug, isNew, brands]);
  const dirty = isNew || name.trim() !== brand.name || Boolean(staged);
  const canSave = !busy && dirty && Object.keys(errors).length === 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSave) return;
    setBusy(true);
    setError('');
    const result = await onSave({ name: name.trim(), slug, active }, staged);
    if (result?.error) { setError(result.error); setBusy(false); }
  };

  const spec = RULES.images.brandLogo;
  const logoUrl = staged?.url || currentLogoUrl;

  return (
    <form onSubmit={submit} className="space-y-5" noValidate data-testid="brand-form">
      <button type="button" onClick={onCancel} className="min-h-[44px] flex items-center gap-2 text-sm font-bold text-emerald-300"><ArrowLeft className="w-4 h-4" /> Voltar à lista</button>
      <h1 className="text-xl font-extrabold text-amber-300">{isNew ? 'Nova marca' : `Editar ${brand.name}`}</h1>

      <Field id="brand-name" label="Nome" max={RULES.brand.name.max} value={name} error={errors.name && name ? errors.name : ''}>
        <input id="brand-name" className={inputClass} maxLength={RULES.brand.name.max} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
      </Field>

      <p className="text-xs text-emerald-200/70">
        Endereço interno (slug): <code className="font-mono text-amber-300" data-testid="brand-slug">{slug || '—'}</code>{' '}
        {isNew ? '(gerado do nome; não pode ser alterado depois de criado)' : '(não editável)'}
      </p>

      <ImageField
        testId="brand-logo"
        label="Logo da marca"
        spec={spec}
        hint="Prefira PNG com fundo transparente."
        currentUrl={currentLogoUrl}
        staged={staged}
        onStage={setStaged}
        renderPreview={(url) => <BrandPreview name={name} logoUrl={url} />}
      />

      {isNew && <Switch checked={active} onChange={setActive} label="Marca ativa" />}

      <div className="rounded-2xl bg-[#142718] border border-emerald-900/50 p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">Prévia ao vivo</p>
        <BrandPreview name={name} logoUrl={logoUrl} />
      </div>

      {error && <p role="alert" className="text-sm font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2.5">{error}</p>}
      <div className="flex gap-3">
        <button type="button" onClick={onCancel} disabled={busy} className="flex-1 h-12 rounded-xl border border-emerald-900/60 bg-[#0d1c10] text-sm font-bold text-emerald-200 disabled:opacity-50">Cancelar</button>
        <button type="submit" disabled={!canSave} className={`${primaryBtn} flex-1`}>{busy ? 'Salvando…' : isNew ? 'Criar marca' : 'Salvar'}</button>
      </div>
    </form>
  );
}
