import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, LocateFixed } from 'lucide-react';
import { supabase } from '../supabase';
import { RULES } from '../rules';
import { Field, inputClass, primaryBtn } from './catalog/fields';
import { loadStaffNames } from '../staffNames';
import { fmtCoord, maskPhone, settingsToForm, validateSettings, waTestUrl } from '../settingsRules';

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');
}

function mapDbError(error) {
  if (error?.code === '42501' || error?.code === 'PGRST301') return 'Sem permissão para salvar. Entre de novo.';
  if (error?.code === '23514') return 'O banco recusou os valores. Confira os campos.';
  return 'Não foi possível salvar. Verifique a internet e tente de novo.';
}

export default function ConfigPage() {
  const S = RULES.settings;
  const [row, setRow] = useState(null);
  const [names, setNames] = useState(new Map());
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);   // { kind: 'ok' | 'error', text }
  const [locating, setLocating] = useState(false);
  const [locNote, setLocNote] = useState('');

  const load = useCallback(async () => {
    const [s, n] = await Promise.all([
      supabase.from('settings').select('*').eq('id', 1).maybeSingle(),
      loadStaffNames()
    ]);
    if (s.error || !s.data) { setLoadError('Não foi possível carregar as configurações.'); return; }
    setRow(s.data);
    setForm(settingsToForm(s.data));
    setNames(n);
    setLoadError('');
  }, []);
  useEffect(() => { load(); }, [load]);

  const dirty = useMemo(() => {
    if (!row || !form) return false;
    const base = settingsToForm(row);
    return Object.keys(base).some(k => String(base[k]) !== String(form[k]));
  }, [row, form]);

  const set = (key, value) => { setForm(f => ({ ...f, [key]: value })); setMessage(null); };

  // Dono na loja: usa o GPS do aparelho para preencher latitude e longitude.
  const useMyLocation = () => {
    setLocNote('');
    if (!navigator.geolocation) { setLocNote('Este aparelho não oferece localização. Digite as coordenadas.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setForm(f => ({ ...f, storeLat: fmtCoord(pos.coords.latitude), storeLng: fmtCoord(pos.coords.longitude) }));
        setMessage(null);
        setLocNote(`Localização capturada (precisão ±${Math.round(pos.coords.accuracy)} m). Confira e toque em Salvar.`);
      },
      () => { setLocating(false); setLocNote('Não foi possível obter a localização. Permita o acesso no navegador ou digite as coordenadas.'); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const save = async (e) => {
    e.preventDefault();
    const { errors: errs, values } = validateSettings(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSaving(true);
    setMessage(null);
    // Concorrência: só grava se ninguém mexeu nas configurações desde que foram carregadas.
    const { data, error } = await supabase
      .from('settings').update(values).eq('id', 1).eq('updated_at', row.updated_at).select('*').maybeSingle();
    setSaving(false);
    if (error) { setMessage({ kind: 'error', text: mapDbError(error) }); return; }
    if (!data) {
      await load();
      setMessage({ kind: 'error', text: 'As configurações foram alteradas por outra pessoa. A tela foi atualizada: confira e salve de novo.' });
      return;
    }
    setRow(data);
    setForm(settingsToForm(data));
    setMessage({ kind: 'ok', text: 'Salvo. O site já usa os valores novos.' });
  };

  if (loadError) return <p role="alert" className="text-sm font-semibold text-rose-300">{loadError}</p>;
  if (!form) return <p className="text-sm text-emerald-200/70" role="status">Carregando…</p>;

  const lastBy = row.updated_by ? (names.get(row.updated_by) || null) : null;

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-amber-300">Configurações do site</h1>
        <p className="text-xs text-emerald-200/70 mt-1" data-testid="config-last-change">
          Última alteração: {row.updated_by ? (lastBy ? `${lastBy}, ` : '') : 'carga inicial, '}{formatDateTime(row.updated_at)}
        </p>
      </div>

      <form onSubmit={save} noValidate className="space-y-5 rounded-3xl bg-[#142718] border border-emerald-900/60 p-4 sm:p-6">
        <Field id="cfg-whatsapp" label="WhatsApp" error={errors.whatsapp} hint="Número que recebe os pedidos do site.">
          <div className="flex gap-2">
            <input
              id="cfg-whatsapp" type="tel" inputMode="numeric" autoComplete="off"
              value={form.whatsapp} onChange={e => set('whatsapp', maskPhone(e.target.value))}
              placeholder="(11) 99999-9999" className={inputClass}
            />
            <a
              href={waTestUrl(form.whatsapp)} target="_blank" rel="noopener noreferrer"
              className="h-12 min-w-[44px] px-4 rounded-xl border border-emerald-900/60 bg-[#0d1c10] text-xs font-bold text-emerald-200 hover:text-amber-300 flex items-center gap-1.5 shrink-0"
              aria-label="Testar WhatsApp"
            >
              <ExternalLink className="w-4 h-4" /> Testar
            </a>
          </div>
        </Field>

        <Field id="cfg-promo" label="Litros mínimos para chopeira grátis" error={errors.promoMinLiters} hint={`De ${S.promoMinLiters.min} a ${S.promoMinLiters.max}. Com 0, todo pedido tem chopeira grátis.`}>
          <input
            id="cfg-promo" type="text" inputMode="numeric" value={form.promoMinLiters}
            onChange={e => set('promoMinLiters', e.target.value.replace(/\D/g, '').slice(0, 3))}
            className={inputClass}
          />
        </Field>

        <Field id="cfg-hours" label="Horário de atendimento" max={S.businessHours.max} value={form.businessHours} error={errors.businessHours}>
          <input id="cfg-hours" type="text" maxLength={S.businessHours.max} value={form.businessHours} onChange={e => set('businessHours', e.target.value)} className={inputClass} />
        </Field>

        <Field id="cfg-regions" label="Regiões atendidas" max={S.regions.max} value={form.regions} error={errors.regions}>
          <textarea id="cfg-regions" rows={3} maxLength={S.regions.max} value={form.regions} onChange={e => set('regions', e.target.value)} className={`${inputClass} h-auto py-3`} />
        </Field>

        <Field id="cfg-payment" label="Formas de pagamento" max={S.paymentInfo.max} value={form.paymentInfo} error={errors.paymentInfo}>
          <textarea id="cfg-payment" rows={2} maxLength={S.paymentInfo.max} value={form.paymentInfo} onChange={e => set('paymentInfo', e.target.value)} className={`${inputClass} h-auto py-3`} />
        </Field>

        <Field id="cfg-instagram" label="Instagram" error={errors.instagram} hint="Sem @. Deixe vazio para esconder o link no site.">
          <div className="flex items-center gap-2">
            <span className="text-emerald-200/70 font-bold">@</span>
            <input
              id="cfg-instagram" type="text" autoCapitalize="none" autoCorrect="off" maxLength={31}
              value={form.instagram} onChange={e => set('instagram', e.target.value.replace(/^@+/, '').toLowerCase())}
              className={inputClass}
            />
          </div>
        </Field>

        <fieldset className="space-y-4 rounded-2xl border border-emerald-900/60 p-4">
          <legend className="px-2 text-xs font-bold uppercase tracking-wider text-amber-400">Ponto: localização da loja</legend>
          <p className="text-xs text-emerald-200/70">Rua Apalaches, 1215 — Santo André/SP. Marcações de ponto fora do raio ficam sinalizadas (continuam aceitas).</p>
          <button type="button" onClick={useMyLocation} disabled={locating} data-testid="use-my-location"
            className="w-full h-12 rounded-xl border border-amber-500/40 bg-[#0d1c10] text-sm font-bold text-amber-300 flex items-center justify-center gap-2 disabled:opacity-50">
            <LocateFixed className="w-4 h-4" /> {locating ? 'Obtendo localização…' : 'Usar minha localização atual'}
          </button>
          {locNote && <p role="status" data-testid="loc-note" className="text-xs font-semibold text-sky-200">{locNote}</p>}
          <div className="grid grid-cols-2 gap-3">
            <Field id="cfg-lat" label="Latitude" error={errors.storeLat}>
              <input id="cfg-lat" type="text" inputMode="decimal" autoComplete="off" value={form.storeLat} onChange={e => set('storeLat', e.target.value)} className={inputClass} />
            </Field>
            <Field id="cfg-lng" label="Longitude" error={errors.storeLng}>
              <input id="cfg-lng" type="text" inputMode="decimal" autoComplete="off" value={form.storeLng} onChange={e => set('storeLng', e.target.value)} className={inputClass} />
            </Field>
          </div>
          <Field id="cfg-radius" label="Raio aceito (metros)" error={errors.storeRadiusM} hint={`De ${S.storeRadiusM.min} a ${S.storeRadiusM.max} m.`}>
            <input id="cfg-radius" type="text" inputMode="numeric" value={form.storeRadiusM}
              onChange={e => set('storeRadiusM', e.target.value.replace(/\D/g, '').slice(0, 5))} className={inputClass} />
          </Field>
        </fieldset>

        {message && (
          <p role={message.kind === 'error' ? 'alert' : 'status'} data-testid="config-message"
            className={`text-sm font-semibold rounded-xl px-3 py-2.5 border ${message.kind === 'error' ? 'text-rose-300 bg-rose-500/10 border-rose-500/30' : 'text-sky-200 bg-sky-500/15 border-sky-400/40'}`}>
            {message.text}
          </p>
        )}

        <button type="submit" disabled={saving || !dirty} className={`${primaryBtn} w-full`}>
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
      </form>
    </section>
  );
}
