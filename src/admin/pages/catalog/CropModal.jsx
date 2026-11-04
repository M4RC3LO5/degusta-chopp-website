import React, { useCallback, useEffect, useState } from 'react';
import Cropper from 'react-easy-crop';
import Modal from '../../components/Modal';
import { cropToWebp } from '../../imageTools';
import { formatKB } from '../../catalogRules';

// Recorte com proporção travada e zoom -> prévia no card real -> compressão. `onDone` recebe o blob final.
export default function CropModal({ title, imageUrl, spec, renderPreview, onCancel, onDone }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pixels, setPixels] = useState(null);
  const [step, setStep] = useState('crop');          // 'crop' | 'preview'
  const [result, setResult] = useState(null);        // { blob, url, quality }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const aspect = spec.width / spec.height;

  const onCropComplete = useCallback((_area, areaPixels) => setPixels(areaPixels), []);
  useEffect(() => () => { if (result?.url) URL.revokeObjectURL(result.url); }, [result]);

  const next = async () => {
    if (!pixels || busy) return;
    setBusy(true);
    setError('');
    try {
      const out = await cropToWebp(imageUrl, pixels, spec);
      setResult({ ...out, url: URL.createObjectURL(out.blob) });
      setStep('preview');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const backToCrop = () => { setResult(null); setStep('crop'); };

  return (
    <Modal title={step === 'crop' ? `Recortar ${title}` : 'Prévia no site'} onClose={busy ? undefined : onCancel} labelledBy="crop-title">
      {step === 'crop' ? (
        <div className="space-y-4">
          <div className="relative h-72 rounded-2xl overflow-hidden bg-black" data-testid="cropper">
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              minZoom={1}
              maxZoom={4}
              showGrid
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <div>
            <label htmlFor="crop-zoom" className="block text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-1">Zoom</label>
            <input
              id="crop-zoom"
              type="range"
              min={1}
              max={4}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-11 accent-amber-500"
            />
          </div>
          <p className="text-xs text-emerald-200/70">
            Proporção travada em {spec.ratio}. Arraste para posicionar. Saída: {spec.width}×{spec.height} px em WEBP, até {formatKB(spec.maxBytes)}.
          </p>
          {error && <p role="alert" className="text-sm font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2.5">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onCancel} disabled={busy} className="flex-1 h-12 rounded-xl border border-emerald-900/60 bg-[#0d1c10] text-sm font-bold text-emerald-200 disabled:opacity-50">Cancelar</button>
            <button type="button" onClick={next} disabled={busy || !pixels} className="flex-1 h-12 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-sm font-black uppercase tracking-wide disabled:opacity-50">
              {busy ? 'Processando…' : 'Continuar'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div data-testid="crop-preview">{renderPreview(result.url)}</div>
          <p className="text-xs text-emerald-200/80" data-testid="crop-info">
            {spec.width}×{spec.height} px · WEBP · {formatKB(result.blob.size)} (limite {formatKB(spec.maxBytes)}) · qualidade {Math.round(result.quality * 100)}%
          </p>
          <div className="flex gap-3">
            <button type="button" onClick={backToCrop} className="flex-1 h-12 rounded-xl border border-emerald-900/60 bg-[#0d1c10] text-sm font-bold text-emerald-200">Voltar ao recorte</button>
            <button type="button" onClick={() => onDone({ blob: result.blob, url: result.url, quality: result.quality })} className="flex-1 h-12 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-sm font-black uppercase tracking-wide">Usar esta imagem</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
