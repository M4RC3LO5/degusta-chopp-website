# Card 12 — evidência dos critérios de aceite

Marcas e Sabores separados, Preços sem toggle e "Valor a consultar". Testado em build de produção (`vite preview`) com Chromium (360, 390 e 1280 px) contra o **Supabase real** (`degusta-chopp`, `sa-east-1`, alvo confirmado antes de qualquer escrita). Usuários `teste.dono`, `teste.gerente` e `teste.operador` reativados só durante o teste e restaurados. O usuário `marcelo` (e `zilda`) não foi tocado.

Capturas e logs em `docs/evidencias-card12/` (`antes-*.png` = master `aeae7ff`, `depois-*.png` = este PR; `log-testes-admin.txt`, `log-testes-site.txt`, `whatsapp-preco-vazio.txt`).

## Migration

`supabase/migrations/0007_offer_price_optional.sql`, aplicada pela Management API e registrada no histórico do CLI (`0001…0007`, `md5` do registro = `md5` do arquivo: `53385bd5b39b4a158067a4b12c4cfe95`).

```sql
alter table public.offers drop constraint offers_check;   -- check (not active or price_30 is not null or price_50 is not null)
```

Nada mais mudou no schema. Conferido em `pg_constraint`: restaram só `offers_price_30_check`, `offers_price_50_check` (> 0 e ≤ 5000 quando preenchido) e `offers_subtitle_check`.

## Critérios

| Critério | Resultado |
|---|---|
| Barra: Marcas · Sabores · Preços · Ponto + "Mais" (regra de 6+ itens) | ✅ operador (4 itens): Marcas · Sabores · Preços · Ponto, sem Mais. Gerente (6): os mesmos 4 + Mais (Config., Histórico). Dono (7): os mesmos 4 + Mais (Config., Histórico, Usuários). Teste automático (`navLayout.test.js`) e navegador (`depois-dono-mais-360.png`, `depois-operador-barra-360.png`). |
| `/admin/catalogo` redireciona p/ `/admin/marcas` | ✅ |
| Tela inicial após o login = `/admin/precos` (os 3 perfis) | ✅ `homePathForRole` virou constante (antes era o 1º item da barra, que agora é Marcas). |
| Permissões iguais às de hoje | ✅ operador em `/admin/usuarios`, `/config`, `/historico` e `/ponto/espelho` volta para Preços; gerente em `/usuarios` volta e acessa `/config`; Marcas, Sabores e Preços para os três perfis. |
| Marcas e Sabores: telas separadas, sem abas, reaproveitando `CatalogPage` | ✅ `CatalogPage kind="brand" \| "flavor"`: lista, reordenação ↑↓, toggle de ativo, formulário e upload exatamente como antes (`antes-catalogo-*.png` × `depois-marcas-390.png`/`depois-sabores-390.png`). Novo sabor continua levando aos Preços do sabor. |
| Preços: sem toggle Ativa/Inativa | ✅ nenhum `role=switch` nem texto "Ativa/Inativa" na tela (`depois-precos-390.png`, `depois-precos-desktop-1280.png`). |
| "Remover deste sabor": confirmação, `active=false`, toast Desfazer 10 s, linha some | ✅ confirmação "Remover Germânia de Chopp Pilsen?" (cancelar não grava); confirmar grava `active=false` com preços e subtítulo intactos; toast "Marca removida" com "Desfazer (9 s)", contagem anda (7 s) e some após 10 s; a linha some da tela. Desfazer devolve a mesma linha (mesmo `id`) com os mesmos valores. |
| Última oferta do sabor | ✅ "Remover Heineken de Premium Lager? Premium Lager vai sumir do site." (mantém a regra do Card 5); o anon passa a ver 0 ofertas ativas do sabor; Desfazer devolve a Heineken. |
| "Adicionar marca a este sabor" volta a oferecer a marca removida (reativa a mesma linha) | ✅ lista as marcas sem oferta ativa (inclui a removida e as que nunca tiveram); ao escolher a marca removida a linha vem com os valores antigos preenchidos para conferência; Salvar reativa a **mesma linha** (mesmo `id`, `active=true`) e o total de ofertas no banco continua 17. Toast "Marca adicionada" com Desfazer. |
| Os dois preços podem ficar vazios | ✅ a tela aceita (sem erro, com a dica "Sem preço: o site mostra "Valor a consultar"") e o banco grava oferta ativa com `price_30` e `price_50` nulos. |
| Mantém: > 0 e ≤ 5000; confirmação de variação > 30% | ✅ `0` → "maior que zero" (texto novo: "Deixe em branco para mostrar "Valor a consultar" no site."); `9999` → "O preço máximo é R$ 5.000,00."; 1.000 → 500 pede "Era R$ 1.000,00, agora R$ 500,00. Confirma?" e cancelar não grava. |
| Alvos de toque ≥ 44 px (360 px) e tabela sem estouro (1280 px) | ✅ 0 controles abaixo de 44 px e `scrollWidth` 360 ≤ 360 (inclui "Remover deste sabor"); a 1280 px nada fica fora do cartão (`depois-precos-desktop-1280.png`). |

### Site público

REST simulada (`page.route` em `/rest/v1/offers`): Pilsen × Germânia sem os dois preços, Pilsen × Brahma só sem o 50L e Premium Lager × Heineken sem preços (sabor inteiro sem preço). Mesmo cenário nas duas versões (`antes-site-pilsen-vazio-*.png` × `depois-site-pilsen-vazio-*.png`).

| Critério | Resultado |
|---|---|
| Preço vazio em oferta ativa: célula "Valor a consultar" (no lugar do "—"); a marca aparece | ✅ Antes: Germânia **sumia** do sabor e a célula vazia mostrava "—". Depois: Germânia aparece com "Valor a consultar" nas duas células; Brahma mostra `R$ 490,00` e "Valor a consultar". Nenhuma célula "—". |
| Sabor com todas as ofertas sem preço aparece com "Valor a consultar" | ✅ Antes: Premium Lager sumia do site. Depois: aparece com a Heineken e "Valor a consultar" (`depois-site-premium-vazio-390.png`). |
| Configurador: tamanho sem preço selecionável, mostra "Valor a consultar" | ✅ botões 30L e 50L habilitados com o texto; seleciona e adiciona (`depois-site-configurador-tamanho-sem-preco-1280.png`). |
| Total soma só os itens com preço e mostra "+ itens com valor a consultar" | ✅ Germânia 30L (sem preço) + Brahma 30L: "Valor Total: R$ 490,00" e "+ itens com valor a consultar"; a linha da Germânia mostra "Valor a consultar" (`depois-site-configurador-total-1280.png`). Só item sem preço: "Valor a consultar" (sem R$ 0,00). |
| WhatsApp: linha do item "Valor a consultar"; `*Valor:*` soma só o que tem preço + "(+ itens a consultar)" | ✅ ver `whatsapp-preco-vazio.txt`: `1x barril de 30L ....... Valor a consultar` e `*Valor:* R$ 490,00 (+ itens a consultar)`. Testes unitários (`whatsapp.test.js`): soma parcial, nenhum com preço ("Valor a consultar"), todos com preço (igual a antes). |
| Fallback (Supabase fora) continua como hoje | ✅ requisições `/rest/v1/**` abortadas: catálogo com "Consultar" e nenhum R$; WhatsApp com "Valores a confirmar" e sem R$. |
| Ponta a ponta sem simulação | ✅ com `price_30`/`price_50` nulos na oferta real (via SQL, depois restaurada) o site em produção mostrou "Valor a consultar" (`depois-site-pilsen-REAL-sem-simulacao-390.png`). |

## Bundle (gzip -9, mesmas condições de build: com as variáveis do Supabase)

| Arquivo | Antes (master) | Depois | Δ |
|---|---|---|---|
| Landing `index-*.js` | 64.629 B (`index-CUhTKU8_.js`) | 64.848 B (`index-ONtf8i2U.js`) | **+219 B** |
| Landing `index-*.css` | 7.438 B (`index-oN87JdVb.css`) | 7.474 B (`index-hTHD-lN4.css`) | **+36 B** |
| Admin JS (só em `/admin`) | 169.089 B | 169.229 B | +140 B |
| Admin CSS (só em `/admin`) | 5.550 B | 5.545 B | −5 B |

A landing mudou (esperado): textos "Valor a consultar", total parcial e mensagem do WhatsApp; classes novas no CSS para a célula com texto quebrável. Muito abaixo do limite de +60 KB do Card 2.

## Testes automáticos

- `npm run test:admin`: 50 testes (preços sem exigência de preço, navegação por perfil, mensagem do WhatsApp com "Valor a consultar", demais do Card 5–11).
- `npm run test:functions`: 16 testes.
- Roteiro de navegador: 52 verificações no admin (`log-testes-admin.txt`) e 16 no site (`log-testes-site.txt`, inclui as 2 da versão "antes").

## Restauração dos dados reais

Snapshot antes (marcas, sabores, ofertas e usuários) comparado com o estado depois:

| Item | Resultado |
|---|---|
| 5 marcas, 6 sabores | ✅ idênticos (incluindo `updated_at`/`updated_by`: não foram tocados) |
| 17 ofertas (preços, subtítulos, `active`) | ✅ idênticas, incluindo as 2 inativas reais (Pilsen × Bru e Premium Lager × Teste Marca) |
| Usuários `teste.*` | ✅ `active=false`, banidos, hash da senha, metadados, confirmação e `updated_at` idênticos ao snapshot; sessões dos testes removidas |
| `marcelo` e `zilda` | ✅ não tocados |

Efeitos que **não** voltaram (ver relatório do PR): `updated_at`/`updated_by` das 17 ofertas (a restauração por SQL as regravou; o trigger carimba `updated_by = null`, o que a tela de Preços mostra como "carga inicial"), linhas novas em `audit_log` (161 → 294, das quais 126 de ofertas sem autor, feitas pela restauração via SQL) e `last_sign_in_at` dos usuários de teste.

## Decisões e pontos para você conferir

- **Ofertas inativas hoje somem da tela de Preços** (regra pedida: a linha some). No banco real são 2 (Pilsen × Bru e Premium Lager × Teste Marca); voltam por "Adicionar marca a este sabor".
- **Reativação traz os valores antigos preenchidos** (nada é gravado até o Salvar). Se preferir que volte em branco, é uma linha.
- **Aviso "vai sumir do site"** foi mantido, agora dentro da confirmação do "Remover deste sabor" (texto acrescentado só quando é a última oferta do sabor).
- **Nenhum item sem preço "soma" R$ 0,00**: se todos os itens do orçamento estão sem preço, o total mostra "Valor a consultar" (e o WhatsApp também).
- **Tamanho antes "indisponível" agora é "a consultar"**: como pedido, preço vazio deixa de significar "não vendido"; a oferta é publicada nos dois tamanhos. Para não vender um tamanho, o caminho é "Remover deste sabor" (a marca inteira).
