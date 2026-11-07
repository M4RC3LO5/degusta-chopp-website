// Service worker mínimo do admin (Card 14): existe só para o navegador considerar o app instalável.
// Estratégia network-only: NÃO guarda nada em cache (preços, catálogo e respostas do Supabase sempre vêm da rede).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Limpa qualquer cache que um SW antigo tenha criado.
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (event) => {
  // Sem respondWith: o navegador faz a requisição normalmente, direto na rede.
  if (event.request.mode === 'navigate') return;
});
