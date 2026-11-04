# Card 5 — evidência dos critérios de aceite

Tela `/admin/precos` (matriz sabor × marca). Testada em build de produção (`vite preview`) com Chromium, contra o **Supabase real** (`degusta-chopp`) e as 15 ofertas do seed: 360 px (operador e gerente), 820 px (tablet) e 1280 px (dono). Nenhuma mudança de schema. O usuário `marcelo` não foi tocado (perfil, hash da senha, ban e confirmação idênticos antes e depois).

## Restauração dos dados

Snapshot das 15 ofertas antes dos testes (igual ao `seed.sql`) e comparação depois: **idênticas** (preços, subtítulos e `active`), conferidas contra o snapshot e contra os valores parseados do `supabase/seed.sql`.

Efeitos que **não** voltam ao estado original e não têm como voltar (sem DELETE e com trigger de auditoria): `audit_log` ganhou linhas dos testes (61 de `offers`, 53 com autor e 8 feitas por mim via SQL na preparação/restauração, sem autor), e 8 das 15 ofertas passaram a ter `updated_at`/`updated_by` dos testes (por isso o cabeçalho "Última alteração" mostra um usuário de teste e não "carga inicial").

## Critérios do card

| Critério | Resultado |
|---|---|
| Operador, gerente e dono editam; cada alteração aparece no Histórico | ✅ operador (360 px), gerente (o mesmo usuário de teste promovido por SQL) e dono (1280 px) editaram e desfizeram preços; `offers.updated_by` = quem salvou. O Histórico é do Card 7: a evidência é o `audit_log` (`table_name = 'offers'`, `changed_by`, `old_data`/`new_data`), por exemplo o dono: `price_50` 720,00 → 721,00 e de volta. |
| Digitar `0`, `-5` ou `9999` → bloqueado com mensagem clara | ✅ `0`: "O preço deve ser maior que zero. Deixe em branco se este tamanho não é vendido." · `-5`: "O preço não pode ser negativo." · `9999`: "O preço máximo é R$ 5.000,00." O botão Salvar fica desabilitado e o banco não muda. |
| Desfazer restaura exatamente o valor anterior | ✅ comparação da linha inteira (subtítulo, 30L, 50L, ativa) antes e depois do desfazer, em 6 cenários (preço, variação > 30%, limpar um tamanho, gerente, dono). A contagem regressiva anda (10 s → 9 s → 7 s) e, após 10 s, o toast e o botão somem. |
| Uso confortável em tela de 360 px (alvos de toque ≥ 44 px) | ✅ 19 controles medidos (botões, campos, seletores, barra inferior): nenhum menor que 44 px e sem rolagem horizontal (`scrollWidth` 360 ≤ 360). Capturas: operador, erro de preço e pós-desfazer. |

## Regras da tela

| Regra | Resultado |
|---|---|
| Máscara BRL, teclado numérico (`inputmode="decimal"`), vazio = tamanho indisponível | ✅ prefixo "R$" fixo, vírgula para centavos, ponto como milhar; "590" vira "590,00" ao sair do campo. Limpar o 50L grava `null`; o site (anon) vê `price_50: null`; desfazer volta. |
| Variação > 30% pede confirmação | ✅ "Era R$ 590,00, agora R$ 59,00. Confirma?" (texto exato). Cancelar não grava; confirmar grava; 380 → 266 (exatos 30%) salva sem perguntar. |
| Subtítulo `n/22`, âmbar a partir de 90%, bloqueia no limite | ✅ 10/22 normal; 20/22 âmbar; digitar 30 caracteres trava em 22/22. |
| Desativar a última oferta ativa de um sabor | ✅ nas duas primeiras do Vinho não pergunta; na última: "Chopp de Vinho vai sumir do site. Continuar?". Cancelar mantém ativa; continuar grava, a consulta anon retorna 0 ofertas ativas do vinho e o catálogo do site deixa de mostrar "Chopp de Vinho". Reativar as 3 pela tela devolve o sabor. |
| Oferta ativa sem preço bloqueia o salvar com mensagem no campo | ✅ "Oferta ativa precisa de pelo menos um preço. Preencha um valor ou desative a oferta." Inativa não exige preço. |
| Salvar por linha (não autosave); toast "Salvo" com Desfazer (10 s) | ✅ |
| Cabeçalho "Última alteração: <nome>, <data/hora>" | ✅ ver limitação abaixo |
| Combinação inexistente: "Adicionar marca a este sabor" | ✅ com ressalva: as 15 combinações já existem e não há DELETE, então o fluxo foi testado com a lista de ofertas **simulada** (uma oferta removida da resposta): o botão só aparece no sabor com combinação faltando, e o POST envia `flavor_id`, `brand_id`, subtítulo, preços e `active` corretos (resposta simulada: o banco não foi tocado). O caminho real também foi exercitado: inserir uma combinação que já existe devolve "Essa marca já tem uma oferta para este sabor." e não duplica (continuam 15 ofertas). |
| Mobile em acordeão por sabor; desktop em tabela | ✅ abaixo de 1024 px: um bloco por sabor (só o 1º aberto), inclusive no tablet (820 px, sem estouro). De 1024 px: tabela com marca, subtítulo, 30L, 50L, ativa e salvar na mesma linha, tudo dentro do cartão (subtítulo com 244 px a 1280 px). |
| Limites vêm de `src/admin/rules.js` | ✅ `priceMax` (5.000), `subtitleMax` (22), `variationPct` (0,3), `undoSeconds` (10) e `sizes` em `RULES.offer`; funções puras em `src/admin/pricing.js` com 7 testes (`npm run test:admin`). |

## Decisões e limitações

- **Nome em "Última alteração"**: o RLS de `profiles` só deixa cada pessoa ler o próprio perfil (o dono lê todos). Então o **dono** vê o nome de quem alterou por último; operador e gerente veem o nome só quando foram eles mesmos, e nos demais casos aparece só a data e hora. Mostrar o nome para todos exigiria uma view ou RPC (mudança de schema): fica para você decidir.
- **Concorrência**: salvar usa `updated_at` como trava. Se outra pessoa alterou a linha desde que a tela foi carregada, nada é sobrescrito: aparece "Este preço foi alterado por outra pessoa. A tela foi atualizada…" e a linha é recarregada. O desfazer usa a mesma trava.
- **Desfazer uma oferta criada** desativa a oferta (não existe DELETE).
- **Bugs pegos pelos testes e corrigidos neste PR**: (1) a mensagem de conflito era apagada pelo reset da linha no mesmo commit; (2) no desktop o contêiner de 768 px espremia o subtítulo e o Salvar vazava do cartão: a tabela passou a valer de 1024 px e o contêiner do admin se alarga em `lg`.

## Bundle

| Arquivo (gzip -9) | Antes (master) | Depois |
|---|---|---|
| Landing `index-*.js` | 64.196 B (`index-BxWfkATj.js`) | 64.196 B, **mesmo hash** |
| Landing `index-*.css` | 7.438 B (`index-oN87JdVb.css`) | 7.438 B, **mesmo hash** |
| Admin JS (só em `/admin`) | 128.240 B | 133.354 B |
| Admin CSS (só em `/admin`) | 4.058 B | 4.712 B |
