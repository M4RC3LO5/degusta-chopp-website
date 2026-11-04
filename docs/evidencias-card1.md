# Card 1 — evidência dos critérios de aceite

Projeto `degusta-chopp` (`auaodnjrpaqsgcoogtcb`, sa-east-1). Aplicado em 2026-11-04 via Management API (ver "Como aplicar migrations" em `FASE-1-CARDS.md`).

Histórico: `select version,name from supabase_migrations.schema_migrations` → `0001 schema`, `0002 storage`.
Seed: brands 3, flavors 5, offers 15, settings 1.

| # | Critério | Query / chamada | Resultado |
|---|---|---|---|
| 1 | anon só vê ofertas ativas | `set local role anon; select count(*) from offers` com 1 oferta desativada (rollback depois) | ✅ 14 (de 15). Via REST sem desativar: 15 linhas, HTTP 200 |
| 1 | anon não faz update | `PATCH /rest/v1/offers` (publishable key) e `update offers` como anon | ✅ HTTP 401, `42501 permission denied for table offers` |
| 2 | anon não lê `audit_log` / `profiles` | `GET /rest/v1/audit_log`, `GET /rest/v1/profiles` | ✅ HTTP 401, `42501 permission denied` nas duas |
| 3 | `price_30 = 0` | `insert into offers(...,price_30) values (...,0)` | ✅ `23514 offers_price_30_check` |
| 3 | `subtitle` com 23 caracteres | `insert ... subtitle = repeat('x',23)` | ✅ `23514 offers_subtitle_check` |
| 4 | PNG no bucket | `POST /storage/v1/object/catalog/test/x.png` | ✅ 415 `InvalidMimeType` |
| 4 | webp de 300 KB no bucket | `POST .../test/big.webp` (300 KB) | ✅ 413 `EntityTooLarge` |
| 4 | upload sem login | `POST .../test/anon.webp` com a publishable key | ✅ 403 `new row violates row-level security policy` |
| 5 | update em `offers` gera auditoria | `update offers set price_30 = 123.45` e leitura do `audit_log` | ✅ linhas 2 → 3; `old_data.price_30 = 380.00`, `new_data.price_30 = 123.45` |
| 6 | delete negado (perfil dono autenticado) | `delete from` offers, brands, flavors, settings, profiles, audit_log | ✅ `42501 permission denied` em todas (e `my_role() = dono`, `update` do dono: 1 linha) |
| — | Imagens públicas | `GET /storage/v1/object/public/catalog/brands/bru.webp` | ✅ 200 `image/webp` (8 arquivos em `brands/` e `flavors/`; `logo_path`/`image_path` preenchidos) |

Os testes de papel rodaram num bloco `DO` com `RAISE EXCEPTION` final (rollback). Conferido depois: 15 ofertas ativas, 3 marcas, 0 usuários em `auth.users`.
