# Card 7 — evidência dos critérios de aceite

Configurações (`/admin/config`), Histórico (`/admin/historico`), nomes da equipe via `staff_names()` e site público lendo `settings`. Testado em build de produção (`vite preview`) com Chromium contra o **Supabase real** (`degusta-chopp`): operador a 390 px, gerente a 390 px, dono a 1280 e 390 px. O usuário `marcelo` não foi tocado (perfil, hash da senha, ban e confirmação idênticos antes/depois).

## Migration

`supabase/migrations/0004_staff_names.sql`: RPC `public.staff_names()` (`security definer`, `stable`, `set search_path = public`), retorna só `id, full_name`, exige `public.my_role() is not null`; `revoke all from public, anon`; `grant execute to authenticated`. Aplicada pela Management API (alvo confirmado: `degusta-chopp` / `sa-east-1`) e registrada no histórico do CLI. `select version, name from supabase_migrations.schema_migrations` → `0001 schema`, `0002 storage`, `0003 service_role_grants`, `0004 staff_names`. Nenhuma outra mudança de schema.

| Verificação da RPC (banco real) | Resultado |
|---|---|
| `anon` chamando `rpc/staff_names` | ✅ `401 / 42501 permission denied for function staff_names` |
| operador, gerente e dono | ✅ `200`, 6 linhas, só as chaves `id, full_name` |
| `profiles` direto como operador | ✅ continua restrito (só o próprio) |
| usuário desativado (JWT simulado por `set local role`) | ✅ 0 linhas |
| grants | ✅ `postgres:EXECUTE, authenticated:EXECUTE` (nada para `anon`/`public`) |

## Critérios do card

| Critério | Resultado |
|---|---|
| Trocar WhatsApp → mensagem do site vai para o novo número sem deploy | ✅ gerente salvou `(11) 98888-7777`; sem rebuild, o Footer mostrou `11 98888-7777`, o botão do banner abriu `…send/?phone=5511988887777` e `buildWhatsAppUrl` com o catálogo carregado usa o número novo. |
| Toda alteração dos Cards 4–7 aparece no Histórico com nome da pessoa | ✅ as 137 linhas (5 páginas) foram percorridas: nenhuma sem nome. Alterações feitas pelo app aparecem com o nome (Teste Dono/Operador/Gerente); só as feitas por SQL/carga inicial (Cards 1, 5 e 6) aparecem como "Sistema" (`changed_by` nulo no banco). Por tabela: preços, marcas, sabores, configurações e usuários (criação, perfil, acesso, redefinição de senha). |

## Configurações

| Regra | Resultado |
|---|---|
| Máscara `(11) 99999-9999`, salva como `55DDDNÚMERO` | ✅ digitar `11988887777` → `(11) 98888-7777` → gravado `5511988887777`. Incompleto → "Informe DDD + número." |
| Botão **Testar** abre `wa.me` | ✅ `https://wa.me/5511988887777?text=…` (nova aba) |
| Litros 0–500 | ✅ 501 bloqueado ("de 0 a 500"); o banco também recusa (`23514`). 0 é aceito (banner passa a "Todos os pedidos…"). |
| Horário 80 / regiões 160 / pagamento 120 | ✅ campos travam no limite com contador `n/max`; banco recusa 81 caracteres (`23514`). |
| Instagram sem @ | ✅ `@TesteDegusta` → `testedegusta`; `@x` direto na API → `23514`. Vazio grava `null` e o link some do Footer. |
| Salvar só com alteração; concorrência | ✅ botão desabilitado sem mudança; grava só se `updated_at` não mudou (mensagem "alteradas por outra pessoa" + recarrega). |
| Cabeçalho "Última alteração" | ✅ "Teste Gerente, 04/11/2026 17:09" (via `staff_names`). |
| Operador/gerente | ✅ operador em `/admin/config` e `/admin/historico` → redireciona para Preços; operador `PATCH settings` → `[]` (RLS); gerente em `/admin/usuarios` → redireciona. |

## Site público lendo `settings`

Footer (telefone, Instagram, regiões, horário, pagamento), PromoBanner e `whatsapp.js` (via `CatalogContext`). Também ligados ao mesmo campo `promo_min_liters`, para o site não ficar contraditório: o texto "> 50L" do Hero e o aviso "acima de 50 Litros" do Catálogo; e a lista de marcas do banner agora vem do catálogo (antes fixa em "Bru, Germânia e Brahma").

| Cenário | Resultado |
|---|---|
| Valores novos (80 L, horário, regiões, pagamento, Instagram) | ✅ aparecem no site sem deploy; banner "acima de 80 litros". |
| Fallback (requisições `rest/v1` abortadas) | ✅ Footer com os valores atuais do site (`11 99106-9099`, `@degustachopp`, horário, regiões, pagamento), banner "50 litros", `console.warn('[catalog] fallback')`, nenhum "R$" no catálogo. |
| Campo ausente/inválido no banco | ✅ cai no valor atual do site, campo a campo (`STATIC_SETTINGS`). |
| Leitura pública | ✅ continua por `fetch` (sem supabase-js na landing). |

## Histórico

| Regra | Resultado |
|---|---|
| Lista paginada, 30 por página | ✅ "Página 1 de 5 · 137 alterações"; páginas somam exatamente 137 (última com 17). |
| Diff em português | ✅ `Preço 50L de Chopp Pilsen · Bru: R$ 590,00 → R$ 620,00`; `WhatsApp de Configurações do site: (11) 99106-9099 → (11) 98888-7777`; `Situação de Teste Marca: ativo → inativo`; `Acesso de Teste Dono: ativado → desativado`; `Perfil de Teste UI: Operador → Gerente`; `Senha redefinida de Teste UI`; `Usuário criado: … (Perfil)`. Nenhum nome cru de coluna na tela. |
| `logo_path`/`image_path` | ✅ "Logo de Teste Marca: Imagem trocada" / "Imagem do copo de Teste Sabor: Imagem trocada"; nenhum `?v=` aparece. |
| `updated_at`/`updated_by` ignorados | ✅ (teste unitário e varredura das 137 linhas: nenhum `updated_*` nem UUID no texto). |
| Filtros pessoa, tipo e período | ✅ tipo=Configuração (3 linhas, só config) e Usuário (21, só usuários); pessoa=Teste Gerente (2, todas dele); período hoje→hoje = 137 (conferido por SQL); 2020 → "Nenhuma alteração encontrada." |
| Mobile 390 px | ✅ sem rolagem horizontal; filtros, paginação e barra com alvo ≥ 44 px. |

## Restauração dos dados reais

| Item | Resultado |
|---|---|
| `settings` | ✅ valores (WhatsApp, litros, horário, regiões, pagamento, Instagram) idênticos ao snapshot. **Não** volta: `updated_at` (`09:43:40` → `17:12:20`); `updated_by` segue `null`. Tentei restaurar sem disparar a auditoria; o ambiente bloqueou, então o restore é um `UPDATE` normal, que gerou uma linha no `audit_log`. |
| marcas, sabores | ✅ hash do conteúdo idêntico (4 e 6 linhas) |
| ofertas | ✅ mesmas 16 linhas e valores; a única diferença é `updated_at`/`updated_by` de **Pilsen · Bru** (50 L: R$ 590 → 620 → 590, restaurado, 30 L R$ 380 intacto), feita como operador de teste para gerar histórico. |
| `marcelo` | ✅ perfil, hash da senha, ban e confirmação idênticos |
| `teste.dono`, `teste.operador`, `teste.gerente` | ✅ ficaram `active = false` e banidos (como `teste.criado` e `teste.ui`) |

Ficam para a limpeza pré-lançamento (Card 8): usuário `teste.gerente` (novo), +5 linhas no `audit_log` (133 → 138), além do que o Card 6 já listou.

## Testes automáticos

- `npm run test:admin`: 24 testes (preços, catálogo, **histórico**, **configurações**).
- `npm run test:functions`: 16 testes.

## Bundle (gzip -9, build com as variáveis do Supabase)

| Arquivo | Antes (master) | Depois |
|---|---|---|
| Landing `index-*.js` | 64.196 B | 64.628 B (**+432 B**; limite do Card 2: 60 KB) |
| Landing `index-*.css` | 7.438 B | 7.438 B (mesmo hash) |
| Admin JS (só em `/admin`) | 150.310 B | 155.062 B |
| Admin CSS (só em `/admin`) | 5.168 B | 5.267 B |
