# Degusta Chopp — Fase 1: Admin (banco, login, usuários, preços, catálogo)

> Executor: Claude Code · Projeto: `C:\Projetos\Degusta_Chopp\website`
> Regra de git: 1 card = 1 branch (`feat/f1-cardN-...`), PR com squash para `master`. Nada direto na master.
> Lançamento do site só após o Card 8 (preços reais cadastrados pelo dono no admin).

## Decisões fechadas (não rediscutir)

| Tema | Decisão |
|---|---|
| Banco | Supabase free, região `sa-east-1` (São Paulo) |
| Acesso | `/admin` no mesmo app, lazy load, PWA "Degusta Admin", `noindex` |
| Login | **usuário + senha** (sem e-mail). Por baixo: `<usuario>@usuarios.degustachopp.local` |
| Criação de conta | Só o Dono cria; senha provisória exibida 1x (Copiar / Enviar no WhatsApp); troca obrigatória no 1º acesso |
| Esqueci a senha | Sem recuperação por e-mail. Dono clica "Redefinir senha" → nova provisória |
| Perfis | `dono`, `gerente`, `operador` (tabela abaixo) |
| Exclusão | Nada é apagado. Tudo tem `active`. Usuário só é desativado |
| Auditoria | Trigger em toda tabela editável: quem, quando, antes, depois |
| Fallback | Se o Supabase falhar/pausar, o site mostra o catálogo **sem preços** e o orçamento vai ao WhatsApp como "valores a confirmar". Nunca exibe preço desatualizado |

### Permissões (Fase 1)

| Área | dono | gerente | operador |
|---|---|---|---|
| Preços de venda | ✅ | ✅ | ✅ |
| Catálogo (marcas, sabores, imagens) | ✅ | ✅ | ✅ |
| Configurações do site | ✅ | ✅ | ❌ |
| Histórico (auditoria) | ✅ | ✅ | ❌ |
| Usuários | ✅ | ❌ | ❌ |

> Custos, pedidos e dashboard = Fase 2.

### Como aplicar migrations (ambiente na nuvem)

No ambiente de nuvem do Claude Code a porta Postgres (5432/6543) é bloqueada, então `supabase db push` dá `Connection timed out`. Padrão para os próximos cards: **Management API sobre HTTPS** com o `SUPABASE_ACCESS_TOKEN` do ambiente (token com escopo de projeto). Nunca imprimir, gravar em arquivo ou commitar o token.

1. **Confirmar o alvo** antes de qualquer escrita: `GET https://api.supabase.com/v1/projects/auaodnjrpaqsgcoogtcb` deve retornar `name = degusta-chopp` e `region = sa-east-1`. Divergiu: parar.
2. **Migration**: `POST https://api.supabase.com/v1/projects/auaodnjrpaqsgcoogtcb/database/query` com `{"query": "<conteúdo exato do arquivo .sql>"}`. Um arquivo por chamada, em ordem (`0001`, `0002`, ...). Não usar `apply_migration`.
3. **Registrar no histórico do CLI** logo após cada migration (formato do CLI 3.0.0), para o `supabase migration list` não divergir:
   ```sql
   create schema if not exists supabase_migrations;
   create table if not exists supabase_migrations.schema_migrations (version text not null primary key, statements text[], name text);
   insert into supabase_migrations.schema_migrations(version, name, statements)
   values ('000N', '<nome>', array[$mig$<conteúdo exato do arquivo>$mig$]) on conflict (version) do nothing;
   ```
   Prova: `select version, name from supabase_migrations.schema_migrations order by 1` (o `migration list --remote` também exige Postgres e falha com timeout na nuvem; localmente funciona).
4. **Seed**: mesma chamada de `database/query` com o conteúdo exato de `supabase/seed.sql` (idempotente).
5. **Upload de imagens**: Storage API HTTPS (`POST /storage/v1/object/catalog/<path>`, `x-upsert: true`) com a secret key obtida em tempo de execução por `GET /v1/projects/<ref>/api-keys?reveal=true`, mantida só em memória. Depois atualizar `logo_path`/`image_path` por SQL.
6. **Aceite**: REST com a publishable key (anon) e SQL simulando papéis (`set local role anon/authenticated` + `request.jwt.claims`) dentro de um `DO` que termina em `RAISE EXCEPTION`, para reverter os dados de teste.
7. **Validade do token:** o `SUPABASE_ACCESS_TOKEN` vence em **7 dias** e precisa ser renovado pelo Marcelo. Erro 401/403 na Management API = token vencido: parar e avisar.
8. **Edge Functions**: deploy pela API (sem Docker, sem porta Postgres): `npx supabase functions deploy <nome> --project-ref auaodnjrpaqsgcoogtcb --use-api --yes`. O `--yes` é exigido pelo CLI 3.x em modo não interativo (ele pede confirmação para mutar o projeto hospedado). `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são injetadas no ambiente da função; nunca vão para o front nem para o repositório. A lógica fica em `handler.ts` (dependências injetadas) e é testada sem rede com `npm run test:functions`.
9. **Logs (Management API)**: `GET /v1/projects/<ref>/analytics/endpoints/logs?sql=...&iso_timestamp_start=...&iso_timestamp_end=...` (janela de até 24 h). É um fluxo único em ClickHouse: `select ... from logs where source = 'auth_logs'` (também `auth_audit_logs`, `function_logs`, `function_edge_logs`, `edge_logs`). O antigo `logs.all` responde `410 Gone`.

---

## CARD 1 — Supabase: schema, RLS, storage e seed

**Objetivo:** banco pronto, seguro e populado com o catálogo atual.

**Passos**
1. Projeto `degusta-chopp` já criado pelo Marcelo na org **Degusta Chopp (Free)**, região `sa-east-1`, Data API ligada, *Automatically expose new tables* **desligado**, *automatic RLS* ligado. Dono convidado como Owner.
2. Auth → Settings: **Allow new users to sign up = OFF**. Confirm email = OFF.
3. Criar `supabase/migrations/0001_schema.sql` com o SQL abaixo e aplicar.
4. Criar `supabase/seed.sql` a partir de `src/data/products.js` (5 sabores, 3 marcas, 15 ofertas, settings).
5. Subir as imagens atuais de `public/logos` e `public/configurator/copo-*` para o bucket `catalog` (`brands/<slug>.webp`, `flavors/<slug>.webp`) e preencher `logo_path` / `image_path`.
6. `.env.local` + Vercel (Production e Preview): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. **Nunca** a service_role no front.

```sql
-- ===== Tipos e helpers =====
create type public.user_role as enum ('dono','gerente','operador');

create table public.profiles (
  id uuid primary key references auth.users on delete restrict,
  username text unique not null check (username ~ '^[a-z0-9._-]{3,20}$'),
  full_name text not null check (char_length(full_name) between 2 and 60),
  role public.user_role not null default 'operador',
  active boolean not null default true,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.my_role() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active
$$;

-- ===== Catálogo =====
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9-]{2,30}$'),
  name text not null check (char_length(name) between 2 and 20),
  logo_path text,
  active boolean not null default true,
  sort_order int not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles
);

create table public.flavors (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9-]{2,30}$'),
  name text not null check (char_length(name) between 2 and 20),
  abv numeric(3,1) not null check (abv between 0 and 15),
  ibu int not null check (ibu between 0 and 120),
  description text not null check (char_length(description) between 10 and 120),
  ideal_for text not null check (char_length(ideal_for) between 5 and 45),
  badge text check (badge is null or (char_length(badge) <= 18 and badge = upper(badge))),
  badge_color text not null default 'amber'
    check (badge_color in ('amber','emerald','yellow','purple','orange')),
  image_path text,
  active boolean not null default true,
  sort_order int not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles
);

-- Oferta = sabor x marca. Tamanhos fixos 30L/50L nesta fase.
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  flavor_id uuid not null references public.flavors,
  brand_id uuid not null references public.brands,
  subtitle text check (subtitle is null or char_length(subtitle) <= 22),
  price_30 numeric(8,2) check (price_30 is null or (price_30 > 0 and price_30 <= 5000)),
  price_50 numeric(8,2) check (price_50 is null or (price_50 > 0 and price_50 <= 5000)),
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles,
  unique (flavor_id, brand_id),
  check (not active or price_30 is not null or price_50 is not null)
);

create table public.settings (
  id int primary key default 1 check (id = 1),
  whatsapp text not null check (whatsapp ~ '^55[1-9][0-9]{9,10}$'),
  promo_min_liters int not null default 50 check (promo_min_liters between 0 and 500),
  business_hours text not null check (char_length(business_hours) <= 80),
  regions text not null check (char_length(regions) <= 160),
  payment_info text not null check (char_length(payment_info) <= 120),
  instagram text check (instagram is null or instagram ~ '^[a-z0-9._]{1,30}$'),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles
);

-- ===== Auditoria =====
create table public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  row_id text not null,
  action text not null,
  changed_by uuid references public.profiles,
  changed_at timestamptz not null default now(),
  old_data jsonb,
  new_data jsonb
);

create or replace function public.tg_audit_and_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  insert into public.audit_log(table_name,row_id,action,changed_by,old_data,new_data)
  values (tg_table_name,
          coalesce(new.id, old.id)::text,
          tg_op, auth.uid(),
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return new;
end $$;

create trigger audit_brands   before insert or update on public.brands   for each row execute function public.tg_audit_and_stamp();
create trigger audit_flavors  before insert or update on public.flavors  for each row execute function public.tg_audit_and_stamp();
create trigger audit_offers   before insert or update on public.offers   for each row execute function public.tg_audit_and_stamp();
create trigger audit_settings before insert or update on public.settings for each row execute function public.tg_audit_and_stamp();

-- ===== RLS =====
alter table public.profiles  enable row level security;
alter table public.brands    enable row level security;
alter table public.flavors   enable row level security;
alter table public.offers    enable row level security;
alter table public.settings  enable row level security;
alter table public.audit_log enable row level security;

-- Público (site): só o que está ativo
create policy pub_brands  on public.brands  for select to anon using (active);
create policy pub_flavors on public.flavors for select to anon using (active);
create policy pub_offers  on public.offers  for select to anon using (active);
create policy pub_settings on public.settings for select to anon, authenticated using (true);

-- Equipe: lê tudo, cria e edita catálogo (sem DELETE: nenhuma policy de delete)
create policy staff_read_brands  on public.brands  for select to authenticated using (public.my_role() is not null);
create policy staff_read_flavors on public.flavors for select to authenticated using (public.my_role() is not null);
create policy staff_read_offers  on public.offers  for select to authenticated using (public.my_role() is not null);

create policy staff_ins_brands  on public.brands  for insert to authenticated with check (public.my_role() is not null);
create policy staff_upd_brands  on public.brands  for update to authenticated using (public.my_role() is not null);
create policy staff_ins_flavors on public.flavors for insert to authenticated with check (public.my_role() is not null);
create policy staff_upd_flavors on public.flavors for update to authenticated using (public.my_role() is not null);
create policy staff_ins_offers  on public.offers  for insert to authenticated with check (public.my_role() is not null);
create policy staff_upd_offers  on public.offers  for update to authenticated using (public.my_role() is not null);

create policy mgr_upd_settings on public.settings for update to authenticated
  using (public.my_role() in ('dono','gerente'));

create policy mgr_read_audit on public.audit_log for select to authenticated
  using (public.my_role() in ('dono','gerente'));

-- Profiles: cada um lê o próprio; dono lê todos. Escrita só via Edge Function / RPC.
create policy self_read_profile on public.profiles for select to authenticated
  using (id = auth.uid() or public.my_role() = 'dono');

-- ===== GRANTs explícitos =====
-- Projeto criado com "Automatically expose new tables" DESLIGADO: sem estes grants a API não enxerga nada.
-- Sem DELETE para ninguém (dupla proteção junto com a ausência de policy).
grant usage on schema public to anon, authenticated;
grant select on public.brands, public.flavors, public.offers, public.settings to anon;
grant select, insert, update on public.brands, public.flavors, public.offers to authenticated;
grant select, update on public.settings to authenticated;
grant select on public.profiles, public.audit_log to authenticated;
grant execute on function public.my_role() to authenticated;

-- (0003) service_role usado pela Edge Function admin-users
grant select, insert, update on public.profiles to service_role;
grant select, insert on public.audit_log to service_role;
grant usage on sequence public.audit_log_id_seq to service_role;

-- RPC: concluir troca de senha do 1º acesso
create or replace function public.complete_password_change() returns void
language sql security definer set search_path = public as $$
  update public.profiles set must_change_password = false where id = auth.uid() and active;
$$;
revoke all on function public.complete_password_change() from public, anon;
grant execute on function public.complete_password_change() to authenticated;
```

**Storage**
- Bucket `catalog`: público para leitura; `file_size_limit = 204800` (200 KB); `allowed_mime_types = ['image/webp']`.
- Policies de storage: select/insert/update em `catalog` para `authenticated` com `public.my_role() is not null` (select é exigido pelo upload com upsert). Sem delete.

**Critérios de aceite**
- [ ] Com a anon key: `select` em `offers` retorna só ativas; `update` falha.
- [ ] Sem login: `select` em `audit_log` e `profiles` falha com permission denied (42501).
- [ ] `insert` de oferta com `price_30 = 0` ou `subtitle` com 23 caracteres falha no banco.
- [ ] Upload de PNG ou de webp com 300 KB no bucket falha.
- [ ] Todo update em `offers` gera linha em `audit_log` com `old_data` e `new_data`.
- [ ] `delete` em qualquer tabela, com qualquer perfil, falha (permission denied).

---

## CARD 2 — Site público lendo do Supabase (com fallback) + keep-alive

**Objetivo:** o site mostra o catálogo do banco e nunca quebra.

**Arquivos:** `src/lib/supabase.js` (novo), `src/data/catalogRepository.js` (novo), `src/components/Catalog.jsx`, `src/components/OrderConfigurator.jsx`, `src/utils/whatsapp.js`, `src/App.jsx`, `api/keepalive.js` (novo), `vercel.json`

**Passos**
1. `npm i @supabase/supabase-js`.
2. `catalogRepository.loadCatalog()`: busca brands, flavors, offers e settings ativos. Retorna **o mesmo formato** que `products.js` exporta hoje (`BRANDS`, `TYPES`, `PRICES`, `PROMO_MIN_LITERS`, whatsapp) + flag `pricesAvailable`. Timeout de 3 s.
   - Em erro ou timeout → usa `products.js` (textos, imagens, contatos) com `pricesAvailable = false` e loga `console.warn('[catalog] fallback')`.
   - Modo fallback: catálogo e configurador funcionam, mas **sem valores**. Preço vira "Consultar". Total some. A mensagem do WhatsApp lista os itens com a linha `Valores a confirmar`.
3. Prover via `CatalogContext` no `App.jsx`. `Catalog`, `OrderConfigurator` e `whatsapp.js` passam a ler do contexto, não do import direto. `getPrice` e `formatPrice` continuam puros.
4. Enquanto carrega: skeleton nos cards (sem layout shift).
5. Imagens: URL pública do bucket. `onError` da `<img>` → imagem local de `public/`.
6. Sabor sem nenhuma oferta ativa **não aparece**. Marca inativa some de todos os sabores.
7. `vercel.json`:
   ```json
   {
     "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }],
     "crons": [{ "path": "/api/keepalive", "schedule": "0 12 * * *" }]
   }
   ```
8. `api/keepalive.js` (Vercel Function): GET em `${SUPABASE_URL}/rest/v1/settings?select=id` com a anon key (env server-side `SUPABASE_URL`, `SUPABASE_ANON_KEY`); responde 200/500. Checar header `Authorization: Bearer ${CRON_SECRET}`.
   > Não usar GitHub Actions: o GitHub desativa cron de repositório sem commits há 60 dias, e o banco pausaria em silêncio.

**Critérios de aceite**
- [ ] Alterar um preço no painel do Supabase e recarregar → valor novo no site e na mensagem do WhatsApp.
- [ ] Trocar a URL do Supabase por uma inválida → site carrega com `products.js`, **nenhum preço aparece**, e o pedido chega no WhatsApp com "Valores a confirmar".
- [ ] Desativar Brahma → some do catálogo e do configurador.
- [ ] F5 em qualquer rota não dá 404 na Vercel; `/api/keepalive` não é reescrito.
- [ ] Cron aparece em Vercel → Settings → Cron Jobs e a 1ª execução retorna 200.
- [ ] Bundle da landing não cresce mais que 60 KB gzip.

---

## CARD 3 — Shell do admin: rota, PWA, login, 1º acesso, guarda de perfil

**Objetivo:** `/admin` acessível, instalável e protegido.

**Arquivos:** `src/main.jsx`, `src/admin/` (novo: `AdminApp.jsx`, `auth/`, `layout/`, `rules.js`), `public/admin-manifest.webmanifest`, `public/admin-icon-192.png`, `public/admin-icon-512.png`, `public/robots.txt`

**Passos**
1. `npm i react-router-dom`. Em `main.jsx`: `/` → `App`; `/admin/*` → `React.lazy(() => import('./admin/AdminApp'))`.
2. `src/admin/rules.js`: **fonte única** de limites (caracteres, faixas numéricas, tamanhos de imagem). Os valores espelham os `check` do Card 1.
3. **Login**
   - Campos: Usuário (minúsculas automáticas, `^[a-z0-9._-]{3,20}$`) e Senha (mostrar/ocultar).
   - Mapear para o e-mail interno com `${usuario}@usuarios.degustachopp.local`. Esse e-mail nunca aparece na UI.
   - Mensagens: "Usuário ou senha incorretos." / "Seu acesso está desativado. Fale com o responsável." / "Muitas tentativas. Aguarde alguns minutos."
   - Texto fixo: "Esqueceu a senha? Fale com o responsável." Sem link de cadastro nem de recuperação.
   - Sessão persistente (padrão do supabase-js).
4. **1º acesso** (`must_change_password = true`): tela obrigatória "Crie sua senha", sem navegação.
   - Regras: mínimo 8 caracteres, diferente da atual, confirmação igual.
   - Indicador de força.
   - `auth.updateUser({ password })` → `rpc('complete_password_change')`.
5. **Guard:** sem sessão → login; `profiles.active = false` → `signOut` + mensagem; rota sem permissão → volta para a home do perfil.
6. **Home por perfil:** operador → Preços; gerente e dono → Preços. Na Fase 2 muda para Dashboard.
7. **Layout mobile-first:** barra inferior com ícones (Preços, Catálogo, Config., Histórico, Usuários), filtrada por perfil. Topo com nome e "Sair". Mesma identidade visual do site.
8. **PWA**
   - Manifest: `name` "Degusta Admin", `start_url` `/admin`, `scope` `/admin`, `display` `standalone`, ícones 192/512.
   - `<link rel="manifest">` só nas rotas `/admin`.
9. **Indexação:** `<meta name="robots" content="noindex">` no admin; `robots.txt` com `Disallow: /admin`.

**Critérios de aceite**
- [ ] Usuário desativado no banco é deslogado no próximo request.
- [ ] Usuário com `must_change_password` não consegue abrir nenhuma outra tela.
- [ ] Operador que digita `/admin/usuarios` na URL é redirecionado.
- [ ] No Android/iOS, "Adicionar à tela inicial" abre direto em `/admin`, em tela cheia.
- [ ] A landing não baixa nenhum chunk do admin (conferir no Network).

---

## CARD 4 — Usuários (só Dono) + Edge Function `admin-users`

**Objetivo:** o dono gerencia acessos sem depender de você.

**Edge Function `supabase/functions/admin-users`**
- Valida o JWT do chamador e checa `profiles.role = 'dono' and active`. Senão → 403.
- Usa a `service_role` via secret da função (nunca no front).
- Ações:
  - `create {username, full_name, role}` → gera senha provisória → `auth.admin.createUser({ email: interno, password, email_confirm: true })` → insere em `profiles` com `must_change_password = true` → **retorna a senha uma vez**.
  - `reset_password {user_id}` → nova provisória + `must_change_password = true` + revoga sessões (`auth.admin.signOut`).
  - `set_active {user_id, active}` → ao desativar, revoga sessões. Bloqueia desativar o **último dono ativo**.
  - `set_role {user_id, role}` → bloqueia rebaixar o **último dono ativo**.
- **Senha provisória:** formato `palavra-palavra-NNNN` (lista de ~200 palavras PT-BR simples, sem acento), via `crypto.getRandomValues`.
- Toda ação grava em `audit_log` (`table_name = 'profiles'`).

**Tela `/admin/usuarios`**
- Lista: nome, usuário, perfil (chip), status, data de criação.
- **Novo usuário:**
  - Campos: nome (2–60), usuário (validação ao vivo + aviso "já existe"), perfil (select com a descrição de cada um).
  - Ao salvar: modal com a senha provisória, **Copiar**, **Enviar no WhatsApp**, e o aviso "Esta senha não será exibida de novo".
  - Mensagem do WhatsApp: `Seu acesso ao painel Degusta Chopp:\nEndereço: <origin>/admin\nUsuário: <u>\nSenha provisória: <s>\nNo 1º acesso você vai criar sua senha.`
- **Ações por linha:** Redefinir senha (mesmo modal), Ativar/Desativar e Alterar perfil, todas com confirmação.
- **Aviso fixo:** "Mantenha pelo menos 2 usuários com perfil Dono."

**Critérios de aceite**
- [ ] Gerente ou operador chamando a função diretamente → 403.
- [ ] Criar → logar com a provisória → forçado a trocar → entra.
- [ ] Desativar usuário logado em outro aparelho → perde acesso no próximo request.
- [ ] Impossível desativar ou rebaixar o último dono.
- [ ] Nenhum e-mail é disparado (Auth logs).

---

## CARD 5 — Tela Preços (matriz)

**Objetivo:** a tela mais usada. Editar preço em 2 toques.

**Layout**
- **Mobile:** um bloco por sabor (accordion). Dentro, uma linha por marca: logo, subtítulo, campos 30L e 50L e toggle de ativo.
- **Desktop:** tabela sabor × marca.

**Regras**
- **Campo de preço:** máscara BRL, teclado numérico (`inputmode="decimal"`), aceita vazio (= tamanho indisponível), > 0 e ≤ 5.000.
- **Variação > 30%** do valor salvo → confirmação: "Era R$ 590,00, agora R$ 59,00. Confirma?"
- **Subtítulo:** contador `n/22`, âmbar a partir de 90%, bloqueia no limite.
- **Desativar a última oferta ativa de um sabor** → aviso: "Chopp IPA vai sumir do site. Continuar?"
- **Oferta ativa sem preço** → bloqueia o salvar, com mensagem no campo.
- **Salvar por linha** (não autosave). Após salvar: toast "Salvo" com **Desfazer (10 s)**, que reverte para os valores anteriores.
- **Cabeçalho:** "Última alteração: <nome>, <data/hora>" (de `updated_by` / `updated_at`).
- **Combinação inexistente:** botão "Adicionar marca a este sabor" cria a oferta.

**Critérios de aceite**
- [ ] Operador, gerente e dono editam; cada alteração aparece no Histórico.
- [ ] Digitar `0`, `-5` ou `9999` → bloqueado com mensagem clara.
- [ ] Desfazer restaura exatamente o valor anterior.
- [ ] Uso confortável em tela de 360 px (alvos de toque ≥ 44 px).

---

## CARD 6 — Tela Catálogo (marcas e sabores) + upload com recorte

**Objetivo:** criar e editar marcas e sabores sem risco de quebrar o layout.

**Dependências:** `npm i react-easy-crop`. Compressão via `<canvas>` → `toBlob('image/webp', q)`.

**Regras de imagem** (em `rules.js`)

| Imagem | Proporção (recorte travado) | Saída | Peso máx. | Entrada |
|---|---|---|---|---|
| Logo da marca | 1:1 | 400×400 webp | 60 KB | JPG/PNG/WEBP, ≤ 5 MB, mín. 200×200 |
| Copo do sabor | 2:3 | 400×600 webp | 80 KB | JPG/PNG/WEBP, ≤ 5 MB, mín. 400×600 |

- **Fluxo:** escolher arquivo → validar tipo, tamanho e dimensões → modal de recorte com proporção travada e zoom → prévia **no card real** → comprimir.
  - Compressão: começa com q=0.85 e desce de 0.05 até caber no peso máximo; se nem a 0.5 couber, recusa com mensagem.
  - Upload em `catalog/brands/<id>.webp` com cache-busting (`?v=updated_at`).
- **Mensagens:**
  - Abaixo do mínimo: "Imagem muito pequena: mínimo 200×200 px."
  - Tipo inválido: "Use JPG, PNG ou WEBP."
  - Dica fixa na logo: "Prefira PNG com fundo transparente."

**Regras de texto** (contador `n/max` em todos)

| Campo | Limite |
|---|---|
| Nome do sabor / marca | 20 |
| Descrição | 120 |
| Ideal para | 45 |
| Selo (badge) | 18, maiúsculas automáticas |
| ABV | 0–15, passo 0,1 |
| IBU | 0–120, inteiro |
| Cor do selo | select com 5 opções e prévia |

**Telas**
- **Marcas e Sabores:** abas. Lista com toggle de ativo e reordenação (setas ↑↓, sem drag no mobile).
- **Formulário:** prévia ao vivo do card como aparece no site. Slug gerado automaticamente a partir do nome (sem acento) e não editável depois de criado.
- **Novo sabor:** após salvar, leva direto para Preços desse sabor.
- **Desativar marca:** "Brahma será ocultada em X sabores. Continuar?"

**Critérios de aceite**
- [ ] Subir foto de celular (4000×3000, 4 MB) → recorte → resultado ≤ 80 KB, 400×600.
- [ ] Upload direto via API de PNG ou de arquivo > 200 KB é recusado pelo bucket.
- [ ] Nome com 21 caracteres é impossível de digitar e recusado pelo banco.
- [ ] Nova marca + preços → aparece no site sem deploy.

---

## CARD 7 — Configurações + Histórico

**Configurações (`/admin/config`, dono e gerente)**
- WhatsApp: máscara `(11) 99999-9999`, salva como `55DDDNÚMERO`. Botão **Testar** abre `wa.me`.
- Litros mínimos para chopeira grátis (0–500).
- Horário de atendimento (80), regiões atendidas (160), formas de pagamento (120), Instagram (sem @).
- Site público lê esses campos (Footer, PromoBanner, `whatsapp.js`).

**Histórico (`/admin/historico`, dono e gerente)**
- Lista paginada (30/página): data/hora, pessoa, o que mudou.
- Diff legível: "Preço 50L de Pilsen · Bru: R$ 590,00 → R$ 620,00". Mapear nomes de campos para português; ignorar `updated_at` e `updated_by`.
- Filtros: pessoa, tipo (preço, marca, sabor, configuração, usuário), período.

**Nomes de quem alterou (decisão pós-Card 5)**
- Toda a equipe (dono, gerente, operador) pode ver o **nome** de quem fez a última alteração e no Histórico.
- `profiles` continua restrito por RLS. Criar migration `0004_staff_names.sql` com a RPC `public.staff_names()`
  (`security definer`, `stable`, retorna só `id, full_name` de `profiles`, exige `public.my_role() is not null`;
  `revoke all from public, anon`; `grant execute to authenticated`).
- Usar essa RPC no cabeçalho "Última alteração" do Card 5 e no Histórico.

**Critérios de aceite**
- [ ] Trocar WhatsApp → mensagem do site vai para o novo número sem deploy.
- [ ] Toda alteração dos Cards 4–7 aparece no Histórico com nome da pessoa.

---

---

## CARD 8 — Lançamento

**Objetivo:** abrir o site ao público com dados reais.

**Pré-requisitos**
- Cards 1–5 em produção.
- Dono cadastrou preços reais e desativou as combinações que não vende.
- Settings preenchidos (WhatsApp, Instagram, regiões, horário, pagamento).

**Passos**
1. Textos fixos:
   - `products.js`: `"SABOR INCORPADO"` → `"SABOR ENCORPADO"` (o fallback também precisa estar certo).
   - `Footer.jsx`: `"Aprecio moderado."` → `"Aprecie com moderação."`
2. `index.html`:
   - `og:image` absoluta (`https://<domínio>/og-image.jpg`, 1200×630, JPG).
   - `og:url` e `<link rel="canonical">`.
3. `public/robots.txt`: manter `Disallow: /admin` (Card 3) + `Sitemap:`. Criar `public/sitemap.xml`.
4. Domínio próprio (se o dono quiser): registrar no Registro.br em nome dele → Vercel → Domains → DNS.
5. Hospedagem: projeto Vercel na conta do dono **ou** plano Pro (Hobby não permite uso comercial).
6. Vercel → Deployment Protection: domínio de produção acessível sem login; previews protegidos.

**Limpeza pré-lançamento (dados de teste dos Cards 4–7)**
- Usuários `teste.*`: continuam desativados (não aparecem para o dono como ativos). Avaliar se ficam ou se o Arquiteto remove.
- `audit_log`: remover as linhas geradas pelos testes, para o histórico do dono começar limpo.
- `brands`/`flavors`/`offers`: zerar `updated_by` que aponte para usuários de teste e remover marcas/sabores com slug `teste-`.
- Executada pelo Arquiteto com aprovação do Marcelo, logo antes de entregar o admin ao dono.

**Critérios de aceite**
- [ ] Aba anônima abre o site sem login da Vercel.
- [ ] Pedido de teste no celular chega no WhatsApp do dono com valores corretos.
- [ ] Link colado no WhatsApp mostra imagem e título.
- [ ] `/admin` não aparece no Google (`site:` após indexação) e pede login.

## Ordem e dependências

```
Card 1 → Card 2 (site no banco)
Card 1 → Card 3 → Card 4 → Card 5 → Card 6 → Card 7
Cards 2 + 5 + dono cadastrando preços → Card 8 (lançamento)
```

Admin entregue ao dono após Cards 3–5 (mínimo útil) para ele cadastrar os preços reais. Cards 6–7 podem entrar antes ou depois do lançamento.

## Fase 2 (próxima)
Pedidos (ciclo `NOVO → NEGOCIANDO → VENDIDO → ENTREGUE → RECOLHIDO`, `PERDIDO` com motivo, `CANCELADO`, pedido manual, código `#DC123` na mensagem), custos (operador só escreve, via RPC), dashboard financeiro (dono e gerente).
