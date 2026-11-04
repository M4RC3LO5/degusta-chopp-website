import React, { useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import CropModal from './CropModal';
import { inspectFile } from '../../imageTools';
import { formatKB } from '../../catalogRules';

// Escolha de imagem: valida o arquivo, abre o recorte e entrega o blob final (`staged`) ao formulário.
// O upload só acontece quando o formulário é salvo.
export default function ImageField({ label, spec, hint, currentUrl, staged, onStage, renderPreview, testId }) {
  const inputRef = useRef(null);
  const [error, setError] = useState('');
  const [picked, setPicked] = useState(null);   // { url } do arquivo original, durante o recorte

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';                            // permite escolher o mesmo arquivo de novo
    if (!file) return;
    setError('');
    const info = await inspectFile(file, spec);
    if (info.error) { setError(info.error); return; }
    setPicked({ url: info.url });
  };

  const closeCrop = () => { if (picked) URL.revokeObjectURL(picked.url); setPicked(null); };
  const done = (result) => {
    if (staged?.url) URL.revokeObjectURL(staged.url);
    onStage(result);
    closeCrop();
  };

  const shown = staged?.url || currentUrl;
  const thumbClass = spec.width === spec.height ? 'h-20 w-20' : 'h-24 w-16';

  return (
    <div className="space-y-2" data-testid={testId}>
      <p className="text-xs font-bold uppercase tracking-wider text-amber-400">{label}</p>
      <div className="flex items-center gap-4">
        <div className={`${thumbClass} shrink-0 rounded-xl bg-white/5 border border-emerald-900/50 flex items-center justify-center overflow-hidden`}>
          {shown
            ? <img src={shown} alt="" className="h-full w-full object-contain" data-testid={`${testId}-thumb`} />
            : <ImagePlus className="w-6 h-6 text-emerald-300/60" />}
        </div>
        <div className="min-w-0 space-y-1.5">
          <button type="button" onClick={() => inputRef.current?.click()} className="min-h-[44px] px-4 rounded-xl border border-amber-500/40 bg-[#0d1c10] text-xs font-bold text-amber-300">
            {shown ? 'Trocar imagem' : 'Escolher imagem'}
          </button>
          {staged && <p className="text-xs text-emerald-300" data-testid={`${testId}-staged`}>Nova imagem pronta ({formatKB(staged.blob.size)}). Salve para enviar.</p>}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onFile} aria-label={label} data-testid={`${testId}-input`} />
      {hint && <p className="text-xs text-emerald-200/70">{hint}</p>}
      {error && <p role="alert" className="text-sm font-semibold text-rose-300">{error}</p>}
      {picked && (
        <CropModal title={label.toLowerCase()} imageUrl={picked.url} spec={spec} renderPreview={renderPreview} onCancel={closeCrop} onDone={done} />
      )}
    </div>
  );
}
