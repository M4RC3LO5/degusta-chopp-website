# Card 3 — evidência dos critérios de aceite

Shell do admin (`/admin`): login por usuário + senha, 1º acesso, guarda de perfil e PWA. Testado em build de produção (`vite preview`) com Chromium/Playwright contra o Supabase real (`degusta-chopp`), usando o usuário `teste.operador` (ao final: `active = false`, role `operador`). O 1º acesso do usuário `marcelo` não foi consumido nos testes.

## Desvio do card (e por quê)

O card pedia `React.lazy` no `main.jsx`. O `import()` faz o Vite injetar o helper de preload na entrada da landing (+~350 B gz), e o requisito era **não aumentar o chunk de entrada da landing**. Solução: o admin tem entrada e build próprios.

- `admin.html` + `src/admin/main.jsx`, com `manifest`, `noindex` e ícone de instalação **estáticos no HTML**.
- `vite.admin.config.js`: segundo build (roda depois do da landing em `npm run build`), com cópia própria do React. Com duas entradas no mesmo build o Rollup extrairia React/lucide para um chunk compartilhado e a landing mudaria.
- `tailwind.admin.config.js` + `src/admin/admin.css`: CSS do admin separado; a landing exclui `src/admin/**` do `content`.
- `vercel.json`: `/admin` e `/admin/*` → `/admin.html` (antes do rewrite geral) e `X-Robots-Tag: noindex, nofollow` em `/admin*`.
- Em dev/preview, um plugin do Vite faz o mesmo rewrite de `/admin`.

## Bundle da landing (gzip -9, bytes)

| Arquivo | Antes (master) | Depois |
|---|---|---|
| `index-*.js` (entrada) | 64.196 (`index-BxWfkATj.js`) | 64.196 (`index-BxWfkATj.js`), **mesmo hash** |
| `index-*.css` | 7.438 (`index-oN87JdVb.css`) | 7.438 (`index-oN87JdVb.css`), **mesmo hash** |
| Admin (só em `/admin`): JS / CSS | — | 124343 / 3462 |

A landing é byte a byte idêntica ao baseline.

## Critérios do card

| Critério | Resultado |
|---|---|
| Usuário desativado no banco é deslogado no próximo request | ✅ `update profiles set active=false` e clique em outra aba do painel: em ~2,6 s volta a `/admin/login` com "Seu acesso está desativado. Fale com o responsável." e a sessão some do `localStorage`. Também derruba ao voltar para o app (evento de foco) e a cada 60 s. Login de desativado mostra a mesma mensagem. |
| Usuário com `must_change_password` não abre nenhuma outra tela | ✅ `/admin/usuarios`, `/precos`, `/catalogo`, `/config` e `/historico` digitados na URL: sempre "Crie sua senha", sem barra de navegação. Tentativas inválidas não mudam o flag; a troca válida zera no banco. |
| Operador que digita `/admin/usuarios` é redirecionado | ✅ → `/admin/precos` (idem `/config` e `/historico`). Gerente: 4 itens, `/usuarios` redireciona. Dono: 5 itens, acessa `/usuarios` (perfil alterado por SQL entre navegações). |
| Android/iOS: "Adicionar à tela inicial" abre em `/admin`, tela cheia | **validar no aparelho**. Evidência local: manifest válido (`name` Degusta Admin, `start_url`/`scope` `/admin`, `display` standalone, ícones 192/512 com HTTP 200) e `Page.getInstallabilityErrors` do Chrome retorna **0 erros**. |
| A landing não baixa nenhum chunk do admin | ✅ requisições da landing: só `index-*.js` e `index-*.css`; 0 com "admin", `supabase-js` ou `react-router`. A landing também não tem `<link rel=manifest>` nem `noindex`. |

## Demais itens do card

| Item | Resultado |
|---|---|
| Login: mensagens "Usuário ou senha incorretos." (senha errada e usuário inexistente) e "Muitas tentativas. Aguarde alguns minutos." | ✅ a 2ª foi testada com resposta 429 simulada no `/auth/v1/token` |
| Sem link de cadastro nem de recuperação; texto fixo "Esqueceu a senha? Fale com o responsável." | ✅ 0 links `<a>` na tela de login |
| Usuário em minúsculas automáticas, senha com mostrar/ocultar | ✅ |
| 1º acesso: mín. 8, diferente da atual, confirmação igual, indicador de força | ✅ "Muito curta" → "Forte"; `updateUser` + `rpc('complete_password_change')` |
| Sessão persistente | ✅ reload mantém a sessão |
| Barra inferior filtrada por perfil, topo com nome e "Sair" | ✅ alvos de toque ≥ 44 px a 360 px |
| `noindex` + `robots.txt` com `Disallow: /admin` | ✅ meta (estática no `admin.html`), header `X-Robots-Tag` (vercel.json) e `robots.txt` |
| Header `X-Robots-Tag` e rewrites `/admin` → `/admin.html` na Vercel | validar no preview |
| Nenhuma mudança de schema | ✅ só dados: 2 usuários (Auth Admin API) e 2 linhas em `profiles` |

## Usuários criados

| Usuário | Perfil | Estado |
|---|---|---|
| `marcelo` ("Marcelo (suporte)") | dono | ativo, `must_change_password = true` (senha provisória entregue ao Marcelo fora do repositório) |
| `teste.operador` | operador | **`active = false`** (nada foi apagado) |
