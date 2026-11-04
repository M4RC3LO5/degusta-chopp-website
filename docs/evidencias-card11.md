# Card 11 — evidência dos critérios de aceite

Ponto dos colaboradores (controle interno; não substitui ponto certificado REP-P / Portaria 671). Testado em build de produção com Chromium (360 px e desktop) contra o **Supabase real** (`degusta-chopp`, `sa-east-1`, alvo confirmado antes de qualquer escrita). Usuários `teste.operador`, `teste.gerente` e `teste.dono`, reativados só durante o teste (senha só em memória/arquivo temporário fora do repositório) e restaurados. O usuário `marcelo` não foi tocado (hash, ban, confirmação, metadados e perfil idênticos ao snapshot).

Capturas e exemplos em `docs/evidencias-card11/` (`exemplo-espelho.pdf`/`.csv`, `exemplo-ponto-periodo-2025-01.csv`, `rpc-testes.jsonl`).

## Migration

`supabase/migrations/0006_time_tracking.sql`, aplicada pela Management API e registrada no histórico do CLI (`0001…0006 time_tracking`, `md5` do registro = `md5` do arquivo). Aplicada uma vez com erro de sintaxe (nada gravado; revertida pela transação), e reaplicada do zero duas vezes depois de ajustes de regra (antes de qualquer marcação real).

- `settings`: `store_lat`, `store_lng`, `store_radius_m` com **default** (-23.644057, -46.494256, 200) e `check`s do card (raio 50–50.000). Pelo default, a linha existente ganhou os valores **sem disparar o trigger de auditoria** (nenhuma linha em `audit_log`, `updated_at/by` intactos).
- `time_entries` conforme o card + `check`s (origem `app` sem `claimed_at`/motivo; `esquecimento` com `claimed_at <= recorded_at` e motivo de 3 a 120 caracteres; lat/lng juntos). RLS: colaborador lê só as próprias, dono/gerente leem todas.
- `time_purges` (mesmo desenho de `audit_purges`).
- Privilégios (padrão do Card 10): `revoke all … from public, anon, authenticated` e só `SELECT` para `authenticated`. **Nada de INSERT/UPDATE/DELETE/TRUNCATE direto**. Conferido: `information_schema.role_table_grants` mostra só `SELECT` para `authenticated`; `anon` sem nada.
- RPCs `security definer`: `registrar_ponto`, `lancar_esquecimento`, `purge_time_month` (só dono) — as três do card — e **`time_months()`** (dono/gerente; mesma forma de `audit_months()`), necessária para o aviso e o painel de retenção "no mesmo padrão do Card 10". Helper `_time_next_ok` sem EXECUTE para o app.
- Distância: haversine em SQL puro (R = 6.371.000 m), sem extensões.

### Pontos além do texto do card (para você conferir)

1. **`time_months()`**: RPC auxiliar descrita acima. Está dentro do mesmo `0006`; sem ela o aviso de retenção teria de baixar todas as marcações para contar meses.
2. **Sequência vale dentro do dia (São Paulo)** no esquecimento: vizinhas de outro dia não contam. Sem isso é impossível lançar um **dia inteiro** esquecido (Entrada + Saída) havendo marcações de hoje (`entrada → entrada` seria recusado).
3. **Dia anterior em aberto** (esqueceu a Saída): em `registrar_ponto` só vale uma nova **Entrada**. Sem essa regra a pessoa ficaria **travada** depois de 7 dias (nem marca Entrada, nem consegue lançar esquecimento). O dia aberto aparece como "Incompleto" no espelho.
4. **Mês pelo horário efetivo** (informado, no esquecimento): vale para espelho, `time_months` e `purge_time_month`. Um esquecimento lançado em fevereiro para 31/01 conta em janeiro (conferido no teste de exclusão).
5. **Consentimento LGPD** fica em `auth.users.raw_user_meta_data.ponto_geo` (`{v, choice, at}`) — sem tabela nova, vale em qualquer aparelho. Não há `time_consents`; se você preferir tabela própria é outra migration.
6. **Motivo do esquecimento: mínimo de 3 caracteres** (o card só fala em até 120).
7. `settings` já é de leitura pública (anon) desde o Card 1: **lat/lng da loja passam a ser públicos** (é o endereço comercial). O site público não os lê.

## Critérios do card

| Critério | Resultado |
|---|---|
| Hora gravada é a do servidor mesmo com relógio do celular adiantado | ✅ Aparelho simulado **+3 h** (tela de fábrica mostraria 22:31). 4 marcações pela tela gravaram `22:31:34`, `:36`, `:37`, `:39` UTC = a hora real (19:31 em SP), nunca +3 h. A tela do Ponto mostra o relógio **do servidor** (cabeçalho `Date` do Supabase): `19:33:09` com o aparelho em `22:33:09`, e avisa "O relógio do seu aparelho está diferente; vale a hora do servidor." (`ponto-relogio-servidor-360.png`, `ponto-dia-completo-360.png`). No banco `recorded_at = now()` (não é parâmetro da RPC). |
| Fora do raio / sem permissão de localização → aceita e sinalizada | ✅ Na loja: `0 m`, dentro, sem selo. 1 km ao norte: `1001 m`, `within_radius=false`, selo "Fora do raio" (`ponto-fora-do-raio-360.png`). Permissão do navegador revogada: `lat/lng/within_radius = null`, selo "Sem localização". Usuário que **recusa o consentimento** marca normalmente e fica sinalizado (`ponto-sem-consentimento-360.png`). Haversine conferido contra Python (loja 0 m · 100 m N = 100 · 1 km N = 1001 · Praça da Sé = 17.577 m). |
| Esquecimento com mais de 7 dias ou no futuro → recusado | ✅ Pela tela: "Só é possível lançar dos últimos 7 dias." e "O horário não pode estar no futuro." (`esquecimento-recusado-360.png`). Direto na RPC: 8 dias atrás e +1 min → `22023`; motivo de 121 caracteres ou 2 → `22023`; mesmo horário e fora de sequência → `55000`. Esquecimento válido grava `recorded_at` = servidor e `claimed_at` = informado (08:00 BRT → `11:00Z`), sem localização, origem `esquecimento`. |
| Colaborador não vê marcações de outros; nada editável/apagável pelo app (exceto expurgo do Dono) | ✅ REST com o token do operador **sem filtro**: 10 linhas, todas dele (banco tinha 12 de 2 usuários). `POST`/`PATCH`/`DELETE` em `time_entries` e RPC `purge_time_month` → `403`. Em SQL: `INSERT/UPDATE/DELETE/TRUNCATE` e `DELETE` em `time_purges` → `42501`; operador e gerente em `purge_time_month` → `42501`; operador em `time_months` → `42501`; anon em `registrar_ponto` e `select` → `42501`. Operador em `/admin/ponto/espelho` volta para Preços. |
| Espelho mensal bate com as marcações; CSV/PDF exportam o mesmo conteúdo | ✅ 01/2025 do operador (08–12 e 13–18, 1 dia): tela `9h00` trabalhadas, `1h00` de intervalo, 2 sinalizadas = cálculo manual. CSV e PDF saem do **mesmo modelo de tabela**; teste automático extrai o PDF (`pdftotext`) e confere que cada célula/linha do CSV está no PDF (29 de 29). CSV: UTF-8 com BOM, `;`, `10/01/2025;sex;08:00;12:00;13:00*;18:00*;9h00;1h00;Sinalizado`. Esquecimentos aparecem sinalizados no mês corrente (`espelho-2026-11-360.png`). PDF: `exemplo-espelho.pdf`. |

## Regras do card

| Regra | Resultado |
|---|---|
| Botão grande, um toque; sequência Entrada · Início · Fim · Saída | ✅ Botão sugerido muda sozinho (Entrada → Início do intervalo → Fim → Saída); com Entrada feita aparece também "Saída" (sem intervalo). Duas Entradas seguidas, Fim sem Início, Saída dupla → `55000` (testado em SQL, `rpc-testes.jsonl`). |
| Consentimento LGPD no 1º uso; recusa = marcação aceita e sinalizada | ✅ Tela explicativa (o quê, quem vê, retenção 12 meses, "só no toque"); "Permitir"/"Não permitir"; "Alterar" na tela do Ponto (`consentimento-360.png`). |
| Raio configurável em Config + "Usar minha localização atual" | ✅ Com GPS simulado em outro ponto: preenche `-23,550500 / -46,633300`; raio `49` é recusado ("inteiro de 50 a 50000"); salvo `300 m`; depois restaurado pela própria tela para `-23.644057 / -46.494256 / 200`. O Histórico descreve ("Latitude da loja (ponto)", "Raio do ponto … 200 m → 300 m"). |
| Barra inferior: 6+ itens → "Mais"; Ponto visível para todos | ✅ Dono (6 itens): Preços · Catálogo · Ponto · **Mais** (Config., Histórico, Usuários) (`dono-mais-360.png`). Gerente (5): todos visíveis, sem Mais. Operador (3): Preços, Catálogo, Ponto. "Mais" fica âmbar quando a rota ativa está no grupo e o menu fecha ao navegar/Esc/toque fora. |
| Quem marca: todo usuário ativo; Dono pode marcar | ✅ Operador e gerente marcam; dono vê o botão de marcar e o link do Espelho. Inativo → `my_role()` nulo → `42501`. |
| Espelho (Dono e Gerente): por colaborador e mês | ✅ Filtros colaborador + mês, totais, linhas por dia, "Incompleto"/"Sinalizado", lista de sinalizadas, CSV e PDF. |
| Hora, instante e fuso | ✅ Tudo em `America/Sao_Paulo` (UTC-3 fixo), como no Card 10. |

## Retenção de 12 meses (padrão do Card 10)

Dados de teste inseridos como `postgres` com `recorded_at` em 01–03/2025 (marcações, incluindo um esquecimento lançado em 03/02 para 31/01) e 2 linhas de `audit_log` em 03/2025.

| Verificação | Resultado |
|---|---|
| Aviso **único** no login do Dono | ✅ "Há registros com mais de 12 meses: Histórico (de 03/2025 a 03/2025) e Ponto (de 01/2025 a 03/2025). Deseja apagar?" + "Guarde os arquivos baixados por 5 anos." com **Lembrar depois** e um botão **Baixar e apagar** por tipo (`dono-aviso-unico-dois-botoes-360.png`). Só Histórico → texto idêntico ao do Card 10 (`dono-aviso-historico-360.png`). |
| "Lembrar depois" | ✅ não volta ao navegar; volta ao sair e entrar. |
| Download obrigatório | ✅ Antes do CSV, campo e botão Apagar desabilitados (mesmo forçando o campo e o texto). `1/2025` não habilita; `01/2025` habilita. |
| Expurgo por mês | ✅ 01/2025 apagado: `{"2025-01":6,"2025-02":2,"2025-03":2,"2026-11":6}` → `{"2025-02":2,"2025-03":2,"2026-11":6}` (o esquecimento de 31/01 foi junto; fevereiro intacto). |
| Lote | ✅ Só `APAGAR` habilita; apagou 02 e 03/2025; sobrou `{"2026-11":6}` (**mês corrente nunca**; sem botão na tela e a RPC recusa `22023`, inclusive futuro). |
| `time_purges` | ✅ uma linha por mês, `purged_by` = Teste Dono, período e quantidade. |
| CSV do período | ✅ UTF-8 com BOM, `;`, 12 colunas em português (`exemplo-ponto-periodo-2025-01.csv`): coordenadas como número (`-23,644057`), motivo e células de texto com proteção contra fórmula. |
| Histórico (Card 10) com o painel generalizado | ✅ apagou 03/2025 do `audit_log` pela tela; `audit_log` por mês: `{"2026-11":159}`. |
| Gerente | ✅ não vê o painel de exclusão de marcações; RPC recusa `42501`. |

## Dados reais: snapshot e restauração

- `settings`: valores reais (WhatsApp, Instagram, horário, regiões, pagamento, litros) **intocados**; os 3 campos novos ficaram nos valores iniciais pedidos (-23.644057 / -46.494256 / 200). ⚠️ **Não consegui restaurar `updated_at`/`updated_by`**: as duas gravações de teste pela tela da Config carimbaram `updated_by = Teste Dono` e `updated_at = 04/11 19:36` (antes: Marcelo, 22:01Z). Restaurar exigiria desabilitar o trigger de auditoria de `settings`, o que não fiz sem sua autorização. O texto "Última alteração" da Config mostra o dono de teste até a próxima alteração real.
- `teste.dono/gerente/operador`: `active = false`, banidos, hash de senha, metadados (`ponto_geo` removido) e confirmação idênticos ao snapshot (comparação por SQL: iguais). `marcelo`: idêntico.
- `audit_log`: antes `{"2026-11":157}`; agora `{"2026-11":159}` — **2 linhas do teste de Config** (ids 196 e 197, `settings`, Teste Dono). Linhas de teste de 03/2025 foram todas apagadas pela tela.
- **Não voltam** (permanentes por desenho): `audit_purges` 3 → 5 (+2, de 03/2025) e `time_purges` 5 linhas (01, 02 e 03/2025 do 1º teste; 01 e 02/2025 do 2º). Entram na limpeza pré-lançamento.

### Marcações de teste do mês corrente (11/2026) — entram na limpeza pré-lançamento

Todas do `teste.operador` (o app não apaga; só o expurgo de mês fechado, que não alcança o mês corrente):

| id | Marcação | Origem | Quando (SP) | Raio |
|---|---|---|---|---|
| 37 | Entrada | app | 04/11 19:31:34 | dentro |
| 38 | Início do intervalo | app | 04/11 19:31:36 | fora (1001 m) |
| 39 | Fim do intervalo | app | 04/11 19:31:37 | sem localização |
| 40 | Saída | app | 04/11 19:31:39 | dentro |
| 41 | Entrada | esquecimento | 03/11 08:00 | — |
| 42 | Saída | esquecimento | 03/11 17:30 | — |

Os testes de RPC (distância, sequência, esquecimento, permissões) rodaram dentro de um `DO` que termina em `RAISE EXCEPTION`: nada deles ficou no banco.

## Testes automáticos

`npm run test:admin`: 45 testes (14 novos: `timeTracking.test.js` — fuso, sequência, próximo passo, espelho, esquecimento, janela de busca, CSV/PDF com o mesmo conteúdo via `pdftotext`, CSV do período, validação; `navLayout.test.js` — barra/"Mais"; mais casos em `settingsRules` e `retention`). `npm run test:functions`: 16 testes, sem mudança.

## Bundle (gzip -9, build com as variáveis do Supabase)

| Arquivo | master | Card 11 |
|---|---|---|
| Landing `index-*.js` | `index-CUhTKU8_.js` (64.629 B) | **mesmo hash** e mesmo tamanho (`cmp` byte a byte) |
| Landing `index-*.css` | `index-oN87JdVb.css` | **mesmo hash** |
| `index.html` | — | idêntico |
| Admin JS (só em `/admin`) | 158.513 B | 169.089 B (+10,3 KB; inclui o gerador de PDF próprio, sem dependência nova) |
| Admin CSS | 5.354 B | 5.550 B |

## Decisões

- **PDF sem biblioteca**: gerador mínimo (A4 paisagem, Helvetica/WinAnsi) em `src/admin/pdf.js`, testado com `pdftotext`. Evita ~100+ KB de dependência no admin.
- **Hora do relógio da tela**: vem do cabeçalho `Date` do `GET /rest/v1/settings` (o `/auth/v1` não expõe `Date` no CORS) e é recalibrada a cada marcação. Se a rede falhar, a tela mostra a hora do aparelho **com o aviso** de que a marcação usa a do servidor.
- **Dia que atravessa a meia-noite** (turno noturno) não é agrupado no espelho: cada dia é um ciclo. Fora do escopo do card.
- **Fim do intervalo/Início** podem se repetir no dia (dois ciclos Entrada…Saída no mesmo dia somam).
