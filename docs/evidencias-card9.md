# Card 9 — ajustes visuais em Preços e no catálogo

Duas correções de CSS/layout. Nenhuma mudança de schema, de dados ou de lógica. Testado em build de produção (Chromium) com `npm run build`.

## Bug A — botões "Cancelar" + "Salvar" fora do cartão (admin, Preços, ≥ 1024 px)

**Causa:** a última coluna da grade tem 104 px, mas Cancelar (78 px) + Salvar (96 px) + espaço somam ~184 px, então os botões vazavam para a direita do cartão.

**Correção** (`src/admin/pages/prices/OfferRow.jsx`): de 1024 px em diante, a coluna de ações empilha os botões (Salvar em cima, alinhado à linha; Cancelar logo abaixo), ambos com a largura da coluna. No mobile nada muda (lado a lado).

**Teste:** `teste.dono` reativado só durante o teste, com login real. A lista de ofertas foi interceptada para remover 1 oferta por sabor e exibir "Adicionar marca a este sabor". As gravações foram abortadas, então nenhum dado foi alterado. Ao final, `teste.dono` voltou a `active = false`, banido até 2126, com o mesmo hash de senha (conferido por SQL).

| Largura | Antes (botões dentro do cartão?) | Depois |
|---|---|---|
| 1024 px | ❌ Salvar termina em x=1069, cartão em 1008; rolagem horizontal (1069/1024) | ✅ botões em x=887–991 |
| 1280 px | ❌ termina em 1197, cartão em 1136 | ✅ 1015–1119 |
| 1440 px | ❌ termina em 1277, cartão em 1216 | ✅ 1095–1199 |
| 360 px | ✅ | ✅ sem alteração |

Prints: `docs/evidencias-card9/{antes,depois}-precos-{1024,1280,1440,360}.png`.

## Bug B — tabela de marcas centralizada no cartão do catálogo

**Causa:** o contêiner interno do cartão usava `justify-between`, que distribuía o espaço sobrando e jogava a tabela para o meio.

**Correção** (`src/components/Catalog.jsx`): sem `justify-between`; a linha "Ideal para" ganhou `mt-auto`. A tabela fica logo abaixo da descrição, com a altura do próprio conteúdo. "Ideal para" e o botão continuam no fim do cartão, e cartões da mesma linha mantêm a mesma altura (o cartão cresce com `items-stretch`).

**Teste:** REST do Supabase interceptada (sabores com 3, 1, 2 e 1 marcas), desktop 1280 px e mobile 360 px. Medidas em px:

| Sabor (marcas) | Distância descrição→tabela, antes (desktop) | Depois |
|---|---|---|
| Pilsen (3) | 20 | 20 |
| Vinho (1) | **108** | 20 |
| IPA (2) | 20 | 20 |
| Escuro (1) | **64** | 20 |

Depois da correção: "Ideal para"→botão = 24 e botão→fim do cartão = 49 (desktop) / 41 (mobile) em todos os cartões; Pilsen e Vinho (mesma linha) têm 695 de altura, IPA e Escuro 587. No mobile cada cartão tem a altura do próprio conteúdo e a distância é sempre 20.

Prints: `docs/evidencias-card9/{antes,depois}-catalogo-{desktop,mobile}.png`.
