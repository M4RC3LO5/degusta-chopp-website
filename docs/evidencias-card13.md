# Card 13 — redesenho do Ponto e do Espelho (evidências)

Somente front-end. **Nenhuma migration, RPC ou schema alterado.** Referência: `docs/prototipo-ponto/`.

## Como foi verificado (e o que NÃO foi)
- Build de produção servido localmente, Chromium (Playwright) em 390 px e 1280 px, relógio fixado em 05/11/2026.
- **Todo o tráfego do Supabase foi simulado** (interceptado no navegador; nada foi ao banco). Os dados são fixtures iguais aos do protótipo.
- ⚠️ **Não houve teste contra o Supabase real** (usuários `teste.*`, marcações em 01/2025, fluxo de expurgo ponta a ponta): o acesso SQL ao banco de produção foi bloqueado pelo ambiente nesta sessão e não foi contornado. O que muda no acesso a dados é nada: as mesmas chamadas (`time_entries`, `registrar_ponto`, `lancar_esquecimento`, `staff_names`, `time_months`, `purge_time_month`).
- `marcelo` e `teste.*` não foram tocados.

## Critérios
| Critério | Resultado |
|---|---|
| Cartão de situação (status, "desde", trabalhado hoje grande, hora oficial menor) | ✅ `after-ponto-expediente-390.png` |
| Etapas: feitas ✓ com horário, próxima dourada, pendentes tracejadas | ✅ (+ estados intervalo/encerrado/vazio) |
| Botão único com a PRÓXIMA ação e "Toque uma vez · registra HH:MM" | ✅ Registrar entrada / Iniciar intervalo / Voltar do intervalo / Registrar saída |
| Dia anterior sem saída: alerta laranja, "Informar saída" abre Saída + data do dia, "Agora não" | ✅ modal com `Saída` e `2026-11-04T22:21`; RPC recebe `claimed_at` do dia anterior |
| "Esqueci de marcar" como link secundário | ✅ |
| Nenhuma localização/distância/raio para o colaborador (nem após marcar) | ✅ teste automático varre o texto da tela; toast só "Intervalo iniciado às 11:20" |
| Captura de localização igual | ✅ RPC `registrar_ponto` recebe `p_lat/p_lng/p_accuracy` como antes |
| Consentimento 1º uso com texto neutro; revisar/retirar em Mais → "Privacidade do ponto" | ✅ `after-ponto-consentimento-390.png`, `after-privacidade-390.png`; retirar grava `ponto_geo.choice = denied` |
| Toast curto após marcar | ✅ `after-ponto-toast-390.png` |
| Espelho: mês com ‹ ›, colaborador em select, filtro Todos/Para conferir/Incompletos | ✅ (› desabilitado no mês atual) |
| Totais: horas no mês, média dia completo, intervalo médio, Para conferir (laranja) | ✅ 23h 23 · 8h 01 · 0h 59 · 3 |
| Linha do tempo 06h–24h (verde/dourado/laranja) + ocorrências como etiquetas | ✅ sem saída · fora do raio com distância · esquecimento com motivo |
| Celular: cartões; ≥1024 px: tabela com a linha do tempo | ✅ |
| Exportar CSV/PDF no topo | ✅ celular: menu "Exportar"; desktop: CSV e Baixar PDF (mesmo modelo do Card 11) |
| "Apagar marcações antigas" → "Arquivo e meses antigos" (rodapé, só Dono), fluxo do Card 11 mantido | ✅ abre o mesmo `PurgePanel` (download obrigatório, expurgo por mês). ⚠️ fluxo não repetido contra o banco real |
| Alvos de toque ≥ 44 px | ✅ varredura automática no espelho (celular) e botão principal |
| Build sem erros; landing com o mesmo hash | ✅ `index-C48b9jEN.js`/`index-Vd-femrQ.css` antes e depois (com `.env.local`); `index-BkfGN3pQ.js` sem env |
| `npm run test:admin` 59/59 · `test:functions` 16/16 | ✅ |

## Decisões e diferenças em relação ao protótipo
1. **"Todos os colaboradores"** (opção do select no protótipo) **não foi implementado**: não há tela desenhada para essa visão nem modelo de exportação. O select lista os colaboradores.
2. **"Registrar saída sem intervalo"**: link discreto acima de "Esqueci de marcar" (a sequência Entrada → Saída é válida no banco; sem isso não haveria como marcar quem não faz intervalo).
3. **Médias** arredondam ao minuto mais próximo (os números do protótipo não seguem uma única regra); totais truncam.
4. **"Para conferir"** = número de ocorrências (etiquetas), como no protótipo (3). "Incompletos" = dias passados sem Saída (hoje em andamento não conta).
5. **Mais** agora existe para todos os perfis (operador inclusive), por causa de "Privacidade do ponto" (rota `/admin/privacidade-ponto`). `navLayout` e seu teste foram atualizados.
6. Telas de tela usam "3h 18"; CSV/PDF seguem "3h18" (Card 11, inalterados).
7. Espelho usa largura 1180 px no computador (layout do protótipo).
8. Trecho aberto de dia passado aparece como um "toco" laranja de 1h30 (sem fim conhecido).

## Prints (`docs/evidencias-card13/`)
`before-*` (master) e `after-*`: ponto-expediente, ponto-pendencia, espelho em 390 e 1280 px; extras: toast, modal "Esqueci de marcar", consentimento, privacidade, estados intervalo/encerrado/vazio, menu Exportar, Arquivo e meses antigos.
