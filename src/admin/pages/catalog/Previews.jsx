import React from 'react';

// Réplicas fiéis do que o site mostra (mesmas classes de Catalog.jsx e OrderConfigurator.jsx).
export const BADGE_CLASSES = {
  amber: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
  emerald: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
  yellow: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300',
  purple: 'bg-purple-500/20 border-purple-500/40 text-purple-300',
  orange: 'bg-orange-500/20 border-orange-500/40 text-orange-300'
};
export const COLOR_LABELS = { amber: 'Âmbar', emerald: 'Verde', yellow: 'Amarelo', purple: 'Roxo', orange: 'Laranja' };
const ICONS = { pilsen: '🍺', escuro: '🍻', 'puro-malte': '🌾', ipa: '🍃', vinho: '🍇' };

const Label = ({ children }) => <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-300/80">{children}</p>;

export function BrandPreview({ name, logoUrl }) {
  const shown = name?.trim() || 'Nome da marca';
  return (
    <div className="space-y-3" data-testid="brand-preview">
      <Label>No catálogo</Label>
      <div className="rounded-2xl bg-[#0d1c10] p-3 border border-emerald-900/50">
        <div className="grid grid-cols-[2fr_1fr_1fr] gap-1 items-center text-xs">
          <div className="flex items-center gap-2 min-w-0">
            {logoUrl
              ? <img src={logoUrl} alt="" className="w-14 h-14 object-contain rounded-md bg-white/5 p-1 shrink-0" data-testid="brand-preview-logo" />
              : <div className="w-14 h-14 rounded-md bg-emerald-900/50 text-amber-400 font-extrabold flex items-center justify-center text-lg shrink-0 border border-emerald-700/50">{shown.charAt(0)}</div>}
            <div className="min-w-0 leading-tight">
              <p className="font-extrabold text-slate-100 text-base truncate">{shown}</p>
              <p className="text-xs text-emerald-300/70">(Subtítulo)</p>
            </div>
          </div>
          <span className="border border-emerald-700/50 rounded-md py-2 text-center text-amber-400 bg-emerald-900/30 font-extrabold text-xs">R$ 000,00</span>
          <span className="border border-emerald-700/50 rounded-md py-2 text-center text-yellow-300 bg-emerald-900/30 font-extrabold text-xs">R$ 000,00</span>
        </div>
      </div>
      <Label>No configurador</Label>
      <div className="w-28 p-3 rounded-2xl bg-[#0d1c10] border border-emerald-900/40 flex flex-col items-center gap-2">
        {logoUrl ? <img src={logoUrl} alt="" className="w-9 h-9 object-contain" /> : <div className="w-9 h-9 rounded bg-emerald-900/50" />}
        <span className="text-xs font-bold text-slate-200 text-center break-words">{shown}</span>
      </div>
    </div>
  );
}

export function FlavorPreview({ slug, name, abv, ibu, badge, badgeColor, description, idealFor, imageUrl }) {
  const shown = name?.trim() || 'Nome do sabor';
  return (
    <div className="space-y-3" data-testid="flavor-preview">
      <Label>No catálogo</Label>
      <div className="rounded-3xl bg-[#142718] border border-amber-500/25 p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-[#0d1c10] border border-amber-500/20 flex items-center justify-center text-2xl shrink-0">{ICONS[slug] || '🍺'}</div>
            <div className="min-w-0">
              <h3 className="text-xl font-extrabold text-slate-100 break-words">{shown}</h3>
              <p className="text-xs text-emerald-300/80 font-bold">ABV: {abv === '' ? '—' : String(abv).replace(',', '.')}% • {ibu === '' ? '—' : ibu} IBU</p>
            </div>
          </div>
          {badge?.trim() && (
            <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase whitespace-nowrap border tracking-wide ${BADGE_CLASSES[badgeColor] || BADGE_CLASSES.amber}`} data-testid="flavor-preview-badge">
              {badge.trim()}
            </span>
          )}
        </div>
        <p className="text-xs text-emerald-100/75 leading-relaxed">{description?.trim() || 'Descrição do sabor.'}</p>
        <p className="text-xs text-emerald-200/80 bg-[#122215] px-3 py-2.5 rounded-xl border border-emerald-900/40"><strong>Ideal para:</strong> {idealFor?.trim() || '—'}</p>
      </div>
      <Label>No configurador</Label>
      <div className="flex items-end gap-4">
        <div className="w-[72px] p-2 rounded-2xl bg-[#0d1c10] border border-emerald-900/40 flex flex-col items-center justify-between min-h-[96px]">
          <div className="w-10 h-10 flex items-center justify-center mt-1">
            {imageUrl ? <img src={imageUrl} alt="" width={40} height={40} className="object-contain max-h-10" data-testid="flavor-preview-glass" /> : <span className="text-xl">🍺</span>}
          </div>
          <span className="text-[11px] font-bold text-slate-200 text-center leading-tight mt-1 line-clamp-2">{shown.replace(/^Chopp /i, '')}</span>
        </div>
        {imageUrl && <img src={imageUrl} alt="" className="h-36 w-24 object-contain rounded-xl bg-white/5 border border-emerald-900/50" data-testid="flavor-preview-full" />}
      </div>
    </div>
  );
}
