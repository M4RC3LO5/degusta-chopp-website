# Card 10 — evidência dos critérios de aceite

Retenção e exclusão do Histórico (só Dono). Testado em build de produção com Chromium contra o **Supabase real** (`degusta-chopp`, `sa-east-1`, alvo confirmado antes de qualquer escrita). Usuários: `teste.dono`, `teste.gerente` e `teste.operador`, reativados só durante o teste (senhas só em memória) e restaurados. O usuário `marcelo` não foi tocado (hash da senha, ban, perfil e confirmação idênticos).

## Migration

`supabase/migrations/0005_audit_retention.sql`, aplicada pela Management API e registrada no histórico do CLI (`0001…0005 audit_retention`):

- tabela `audit_purges(id, purged_by, purged_at, period_start, period_end, rows_deleted)`, RLS: select para dono e gerente; app só tem SELECT (sem INSERT/UPDATE/DELETE);
- RPC `audit_months()` (dono/gerente): `month, row_count, older_than_12m, is_current`;
- RPC `purge_audit_month(p_month)` (`security definer`, só dono): apaga o mês inteiro e grava em `audit_purges` na mesma transação; mês corrente e futuros recusados;
- meses calculados em `America/Sao_Paulo`. `older_than_12m` = mês que começou antes de (início do mês corrente − 12 meses).

**Um ponto além do texto do card (aviso):** `anon` e `authenticated` tinham `TRUNCATE`, `REFERENCES` e `TRIGGER` em `audit_log` por concessão padrão do Supabase. O PostgREST não expõe `TRUNCATE`, mas para valer "a exclusão só passa pela RPC" a migration faz `revoke all` e devolve só `SELECT` para `authenticated` em `audit_log` (o `service_role`, usado pela Edge Function, não foi tocado). Nenhuma outra mudança de schema.

## Critérios do card

| Critério | Resultado |
|---|---|
| Gerente e operador não veem o botão e a RPC recusa (42501) | ✅ gerente abre o Histórico **sem** o painel "Apagar histórico antigo" (`gerente-historico-sem-painel.png`). `purge_audit_month`: operador `403 / 42501`, gerente `403 / 42501`, anon `401 / 42501`. `audit_months`: operador e anon `42501`; gerente `200`. `DELETE` direto em `audit_log` (dono e gerente) → `42501`; `DELETE/PATCH/POST` direto em `audit_purges` (dono) → `42501`. |
| Aviso aparece no login do Dono só quando há meses com mais de 12 meses; "Lembrar depois" volta no próximo login | ✅ com o mês 01/2025 de teste (e 02, 03/2025): o dono vê "Há registros do Histórico com mais de 12 meses (de 01/2025 a 03/2025). Deseja apagar?" (desktop e 360 px). Operador e gerente **não** veem o aviso, mesmo com os meses antigos presentes. "Lembrar depois": não volta ao navegar entre telas; **volta** ao sair e entrar de novo. "Baixar e apagar" leva ao Histórico com o painel aberto. Sem meses antigos (depois da exclusão) o dono entra sem aviso. |
| Apagar sem baixar é impossível pela tela | ✅ antes do download o campo de confirmação e o botão Apagar ficam desabilitados (mesmo forçando o texto). O download vale só para aquele período: baixar 01/2025, cancelar e abrir 02/2025 volta a exigir o download. O arquivo é conferido contra a contagem do banco; se não bater, não habilita. |
| Cada exclusão aparece em `audit_purges` e o mês corrente nunca é apagado | ✅ `audit_purges` ganhou 3 linhas (uma por mês): `2025-01-01→2025-01-31, 6`, `2025-02-01→2025-02-28, 3`, `2025-03-01→2025-03-31, 2`, `purged_by` = `teste.dono`. Mês corrente: sem botão na tela e a RPC recusa `22023` (também com um dia qualquer do mês e com mês futuro). Mês sem registros: `P0002`, nada gravado. |

## Regras do card

| Regra | Resultado |
|---|---|
| Download CSV: UTF-8 com BOM, `;`, colunas em português | ✅ bytes `EF BB BF`; cabeçalho `Data e hora;Pessoa;Tipo;Ação;O que mudou;Registro (ID);Dados antes (JSON);Dados depois (JSON)`; 6 linhas para 01/2025 (`exemplo-historico-degusta-2025-01.csv`). Texto "O que mudou" é o mesmo do Histórico; células que começam com `=`, `+`, `-` ou `@` ganham `'` (planilha não executa fórmula). |
| Confirmação digitando o mês ou `APAGAR` para o lote | ✅ mês: `1/2025` e `APAGAR` não habilitam, `01/2025` habilita. Lote: o mês não basta, `apagar` habilita. |
| Um mês fechado por vez ou todos os fechados; nunca linha a linha | ✅ lote testado: CSV `historico-degusta-2025-02_a_2025-03.csv` (3 + 2 linhas), exclusão mês a mês, cada um com seu registro em `audit_purges`. |
| Nada apagado automaticamente | ✅ não há job/cron: só as duas RPCs, chamadas pela tela do Dono. |

## Prova de que nada mais foi apagado

Dados reais antes de tudo: `audit_log` = `{"2026-11": 157}` (todo o histórico real está no mês corrente, que a regra protege). Linhas de teste inseridas em 01/2025 (6), 02/2025 (3) e 03/2025 (2), com `row_id` `teste-card10-*`.

| Momento | `audit_log` por mês |
|---|---|
| Com as linhas de teste | `{"2025-01":6,"2025-02":3,"2025-03":2,"2026-11":157}` |
| Depois de todas as recusas (RPC e DELETE direto) | idêntico |
| Depois de apagar **só 01/2025** pela tela | `{"2025-02":3,"2025-03":2,"2026-11":157}` |
| Depois do lote (02 e 03/2025) | `{"2026-11":157}` = contagem real do início |

## Restauração

- `teste.dono`, `teste.gerente`, `teste.operador`: `active = false`, banidos, hash de senha original (conferido por SQL).
- `audit_log`: as linhas de teste foram todas apagadas **pela própria tela**; nenhuma real mudou. (O script ainda roda um `delete … like 'teste-card10-%'` de segurança no final; não havia o que apagar.)
- **Não volta:** as 3 linhas de `audit_purges` (o registro é permanente por desenho, o app não apaga). Ficam para a limpeza pré-lançamento (Card 8), junto com as demais sobras dos testes.

## Testes automáticos

`npm run test:admin`: 31 testes (7 novos em `retention.test.js`: rótulos, limites do mês em UTC-3 com virada de ano, mês corrente fora do lote, confirmação, nome do arquivo, escape do CSV, CSV completo).

## Bundle (gzip -9, build com as variáveis do Supabase)

| Arquivo | master | Card 10 |
|---|---|---|
| Landing `index-*.js` | `index-BQNxLoGA.js` (64.776 B) | **mesmo hash** e mesmo tamanho |
| Landing `index-*.css` | `index-oN87JdVb.css` | **mesmo hash** |
| Admin JS (só em `/admin`) | 155.255 B | 158.617 B (+3,3 KB) |
| Admin CSS | 5.303 B | 5.354 B |

## Decisões

- "Até 12 meses" no lote foi lido como "todos os meses fechados": o lote apaga **todos** os meses fechados que a tela lista (hoje o banco só tem o mês corrente). Se a intenção era limitar o lote a meses com mais de 12 meses, é uma linha na tela (filtrar por `older_than_12m`); não mexi no banco.
- O lote chama a RPC mês a mês (cada mês é atômico e tem seu próprio registro). Se uma chamada falhar no meio, a tela avisa quais meses já foram apagados.
- "Lembrar depois" usa `sessionStorage`, limpo quando a sessão termina: volta ao sair e entrar, e também ao abrir o admin em outra aba.
