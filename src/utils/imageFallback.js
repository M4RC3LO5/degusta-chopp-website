// onError de <img>: tenta uma vez a imagem local de public/.
// Retorna true se aplicou o fallback (o chamador não precisa fazer mais nada);
// false se não há fallback ou ele também falhou (o chamador esconde a imagem).
export function applyImageFallback(event, fallbackSrc) {
  const img = event.currentTarget;
  if (!fallbackSrc || img.dataset.fallbackApplied === '1') return false;
  img.dataset.fallbackApplied = '1';
  img.src = fallbackSrc;
  return true;
}
