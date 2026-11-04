// Leitura, recorte e compressão de imagem no navegador (<canvas>). Regras vêm de rules.js / catalogRules.js.
import { RULES } from './rules.js';
import { formatKB, qualitySteps, validateImageFile } from './catalogRules.js';

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível ler essa imagem. Tente outro arquivo.'));
    img.src = url;
  });
}

// Valida o arquivo (tipo, tamanho, dimensões). Devolve { error, url, width, height }.
// `url` é um object URL que o chamador precisa revogar (URL.revokeObjectURL).
export async function inspectFile(file, spec) {
  const early = validateImageFile({ type: file.type, size: file.size, width: Infinity, height: Infinity }, spec);
  if (early) return { error: early };
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const error = validateImageFile({ type: file.type, size: file.size, width: img.naturalWidth, height: img.naturalHeight }, spec);
    if (error) { URL.revokeObjectURL(url); return { error }; }
    return { error: '', url, width: img.naturalWidth, height: img.naturalHeight };
  } catch (err) {
    URL.revokeObjectURL(url);
    return { error: err.message };
  }
}

const toBlob = (canvas, type, quality) => new Promise(resolve => canvas.toBlob(resolve, type, quality));

// Recorta (pixelCrop vem do react-easy-crop, em pixels da imagem original), redimensiona para a saída
// do `spec` e comprime em WEBP: q=0.85 descendo de 0.05 até caber; se nem a 0.5 couber, recusa.
export async function cropToWebp(imageUrl, pixelCrop, spec) {
  const img = await loadImage(imageUrl);
  const canvas = document.createElement('canvas');
  canvas.width = spec.width;
  canvas.height = spec.height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, spec.width, spec.height);

  for (const quality of qualitySteps()) {
    const blob = await toBlob(canvas, 'image/webp', quality);
    if (!blob || blob.type !== 'image/webp') {
      throw new Error('Seu navegador não consegue gerar imagens WEBP. Use o Chrome ou atualize o navegador.');
    }
    if (blob.size <= spec.maxBytes) return { blob, quality, width: spec.width, height: spec.height };
  }
  throw new Error(`Não foi possível reduzir essa imagem para ${formatKB(spec.maxBytes)}. Tente uma foto com menos detalhes.`);
}

// Caminho no bucket com cache-busting: catalog/<pasta>/<id>.webp?v=<carimbo>. O `?v=` vai junto no
// logo_path/image_path (a landing só concatena a URL pública), então a imagem nova aparece sem deploy.
export function versionedPath(folder, id, stamp = Date.now()) {
  return `${folder}/${id}.webp?v=${stamp}`;
}
export const objectPath = (versioned) => versioned.split('?')[0];

export const IMAGE_BUCKET = RULES.images.bucket;
