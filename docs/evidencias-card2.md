# Card 2 — evidência dos critérios de aceite

Site público lendo do Supabase (`degusta-chopp`) com fallback sem preços. Testado em build de produção servido localmente (`vite preview`) com Chromium/Playwright. O que depende da Vercel está marcado "validar no preview".

## Bundle (gzip -9, bytes)

| Arquivo | Antes (master) | Depois |
|---|---|---|
| JS de entrada | 61.854 | 64.605 (+2.751) |
| JS `supabase-js` (chunk carregado sob demanda) | — | 59.342 |
| CSS | 7.275 | 7.438 (+163) |
| **Total** | **69.129** | **131.385 (+62.256 ≈ 60,8 KB)** |

O `supabase-js` entra por `import()` dinâmico (não pesa no chunk de entrada). Somando o chunk lazy, o crescimento fica ~0,8 KB acima do limite de 60 KB.

## Critérios

| Critério | Resultado |
|---|---|
| Alterar preço no banco → valor novo no site e na mensagem do WhatsApp | ✅ simulado na resposta REST (Pilsen/Bru 50L = R$ 777,77): aparece no catálogo e na mensagem. Sem alterar o banco real (o card não altera o banco). Com os dados reais: Pilsen/Bru 30L R$ 380,00 e 50L R$ 590,00 vieram do banco. |
| URL do Supabase inválida → site carrega, nenhum preço, pedido com "Valores a confirmar" | ✅ build com `VITE_SUPABASE_URL=https://invalid.invalid` e, separadamente, rede abortada: 5 sabores, 0 ocorrências de `R$`, 30 células "Consultar", sem "Valor Total", mensagem com `*Valor:* Valores a confirmar`, 1 `console.warn('[catalog] fallback')`. |
| Timeout de 3 s | ✅ resposta atrasada em 6 s → fallback em ~3,4 s com `[catalog] fallback timeout de 3000ms`. |
| Desativar Brahma → some do catálogo e do configurador | ✅ simulado removendo Brahma da resposta de `brands` (equivale ao `active=false` sob RLS): 0 ocorrências de "Brahma" no catálogo (filtro e linhas) e no configurador. |
| Skeleton sem layout shift | ✅ altura da seção do catálogo: 2.781 px (skeleton) → 2.783 px (carregado), desktop. |
| Imagens: URL pública do bucket, `onError` → local | ✅ com dados reais as logos vêm de `/storage/v1/object/public/catalog/brands/*.webp`; com o storage abortado todas caem em `/logos/*.webp` e carregam. |
| `scripts/test-whatsapp.mjs` (modo estático) | ✅ saída idêntica à do master. |
| `api/keepalive.js` | ✅ sem header/Bearer errado/`CRON_SECRET` ausente → 401; sem `SUPABASE_URL` → 500; Bearer correto + Supabase real → 200; chave inválida → 500; host inacessível → 500. |
| F5 em qualquer rota não dá 404; `/api/keepalive` não é reescrito | validar no preview (depende do `vercel.json` na Vercel). |
| Cron aparece em Settings → Cron Jobs e 1ª execução retorna 200 | validar no preview/produção. |
| Bundle da landing ≤ +60 KB gzip | ❌ no total (+60,8 KB com o chunk lazy); ✅ no chunk de entrada (+2,7 KB). Ver tabela. |
