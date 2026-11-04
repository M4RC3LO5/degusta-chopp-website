# Card 6 — evidência dos critérios de aceite

Tela `/admin/catalogo` (marcas e sabores) com upload e recorte de imagem. Testada em build de produção (`vite preview`) com Chromium, contra o **Supabase real** (`degusta-chopp`) e o bucket `catalog`: marcas como dono (1280 px) e sabores como operador (390 px). Nenhuma mudança de schema. O usuário `marcelo` não foi tocado (perfil, hash da senha, ban e confirmação idênticos).

## Restauração dos dados reais

Snapshot antes (marcas, sabores, ofertas e os 8 arquivos do bucket, com SHA-256 do **conteúdo** de cada imagem) comparado com o estado depois:

| Item | Resultado |
|---|---|
| 3 marcas reais (nome, slug, `logo_path`, `active`, ordem) | ✅ idênticas |
| 5 sabores reais (textos, ABV/IBU, selo, cor, `image_path`, `active`, ordem) | ✅ idênticos |
| 15 ofertas reais (preços, subtítulos, `active`) | ✅ idênticas |
| 8 arquivos originais do bucket (tamanho e SHA-256) | ✅ idênticos (nenhum foi sobrescrito: os testes de upload usaram só os itens `teste-`) |

Efeito que não volta: `updated_at`/`updated_by` das marcas e sabores reais que participaram do teste de reordenação (Brahma e Vinho, trocados de lugar com os itens de teste e devolvidos ao lugar). A ordem voltou exatamente.

## Tudo que ficou com "teste-" (limpar antes do lançamento)

| Tipo | Item | Estado |
|---|---|---|
| Marca | `teste-marca` ("Teste Marca"), ordem 4, `logo_path = brands/7549b375-96f9-4830-8227-62c37ed5a6a7.webp?v=…` | inativa |
| Sabor | `teste-sabor` ("Teste Sabor"), ordem 6, `image_path = flavors/9e2b923b-bb1f-488a-a7fe-9c48d7b05145.webp?v=…` | inativo |
| Oferta | `teste-sabor` × `teste-marca` (R$ 111,00 / R$ 222,00) | inativa |
| Bucket `catalog` | `brands/7549b375-….webp` (2,9 KB) e `flavors/9e2b923b-….webp` (24,7 KB) | objetos novos |
| `audit_log` | 19 linhas novas (marcas 10, sabores 7, ofertas 2) | histórico |
| Usuários | `teste.dono` e `teste.operador` | `active = false` e banidos |

O site público não mostra nenhum deles (conferido no catálogo e no configurador). Não há DELETE no app: a limpeza precisa ser feita por SQL/Management API.

## Critérios do card

| Critério | Resultado |
|---|---|
| Foto de celular (4000×3000, 4 MB) → recorte → ≤ 80 KB, 400×600 | ✅ JPEG de 3,8 MB (4000×3000, gerado com ruído de sensor) → recorte 2:3 com zoom → prévia → **WEBP 400×600, 24,2 KB** (24.730 B; qualidade 0,85), prévia pronta em ~1,4 s. Conferido no arquivo do bucket (cabeçalho WEBP: 400×600; `content-type: image/webp`). |
| Upload direto via API de PNG ou de arquivo > 200 KB é recusado pelo bucket | ✅ PNG → `415 invalid_mime_type`; WEBP de 275 KB → `413 Payload too large`; sem login → `403 Unauthorized`. Nada ficou no bucket. |
| Nome com 21 caracteres é impossível de digitar e recusado pelo banco | ✅ marca e sabor: o campo trava em 20 (contador `20/20`); pela API, `brands` e `flavors` com 21 caracteres → `400 / 23514` (check constraint). Também recusados no banco: ABV 15,1 e selo em minúsculas. |
| Nova marca + preços → aparece no site sem deploy | ✅ criei "Teste Marca" (com logo) e "Teste Sabor" (com copo) pela tela e adicionei a oferta nos Preços: sem rebuild nem deploy, o site passou a mostrar o card do sabor (selo, descrição, "Ideal para"), a linha "Teste Marca" com **R$ 111,00 / R$ 222,00**, o logo vindo de `/storage/v1/object/public/catalog/brands/<id>.webp?v=…` e o item no configurador. Desativar a marca fez marca e sabor sumirem do site; reativar trouxe de volta. |

## Regras da tela

| Regra | Resultado |
|---|---|
| Validação do arquivo: tipo, 5 MB, dimensão mínima | ✅ GIF e PDF: "Use JPG, PNG ou WEBP."; PNG de 16 MB: "Arquivo grande demais: máximo 5 MB."; logo 150×150: "Imagem muito pequena: mínimo 200×200 px."; copo 300×500: "Imagem muito pequena: mínimo 400×600 px." Nenhum abre o recorte. |
| Recorte com proporção travada e zoom → prévia no card real → compressão | ✅ 1:1 (logo) e 2:3 (copo); a prévia mostra o catálogo e o configurador com a imagem já recortada, e o peso final ("400×600 px · WEBP · 24 KB (limite 80 KB) · qualidade 85%"). |
| Compressão q=0,85 descendo 0,05 até caber; se nem a 0,5 couber, recusa | ✅ um ruído de 900 px coube só na qualidade 0,75 (54 KB, limite 60 KB): o laço desce. Um ruído de 400×400 (sem redução) → "Não foi possível reduzir essa imagem para 60 KB. Tente uma foto com menos detalhes." e nada foi gravado. |
| Logo: dica fixa "Prefira PNG com fundo transparente." | ✅ e a transparência do PNG é preservada no WEBP (3,5 KB, 400×400, com alfa). |
| Upload em `catalog/<pasta>/<id>.webp` com cache-busting | ✅ `brands/<id>.webp?v=<carimbo>` e `flavors/<id>.webp?v=<carimbo>`. O `?v=` vai dentro do `logo_path`/`image_path`, então a landing (que só concatena a URL pública) mostra a imagem nova sem mudar de código. Trocar o logo gerou novo `?v=` e novo conteúdo no mesmo objeto. |
| Contador `n/max` e limites (nome 20, descrição 120, ideal para 45, selo 18 em maiúsculas, ABV 0–15 passo 0,1, IBU 0–120 inteiro, 5 cores com prévia) | ✅ tudo vem de `rules.js`; ABV > 15 e IBU > 120 recusados; IBU só aceita dígitos; selo vira maiúsculo e trava em 18; troca de cor atualiza a prévia do selo. |
| Slug gerado do nome (sem acento) e não editável depois de criado | ✅ "Teste Marca" → `teste-marca`; na edição o slug é só texto. Nome repetido é recusado ("Já existe uma marca com esse nome."). |
| Lista com toggle de ativo e reordenação ↑↓ | ✅ ↑↓ gravam a ordem (renumeram) e dá para voltar: marcas `…brahma:3,teste-marca:4 → teste-marca:3,brahma:4 → voltou`; sabores idem. |
| Desativar marca: "Brahma será ocultada em X sabores. Continuar?" | ✅ "Brahma será ocultada em 5 sabores. Continuar?"; cancelar manteve a marca ativa. Para sabor visível: "Chopp IPA vai sumir do site. Continuar?". |
| Novo sabor leva direto para Preços desse sabor | ✅ foi para `/admin/precos` com o sabor criado já aberto e o botão "Adicionar marca a este sabor". |
| Operador usa o Catálogo (permissão da Fase 1) | ✅ o fluxo de sabor, inclusive upload, foi feito como operador a 390 px; alvos de toque ≥ 44 px. |

## Testes automáticos

- `npm run test:admin`: 16 testes (preços e catálogo: slug, validação de imagem e texto, compressão, ordem).
- `npm run test:functions`: 16 testes (Card 4).

## Decisões e ajustes de rota

- **`?v=` no caminho**: o card pede cache-busting `?v=updated_at`. Para o site público ver a imagem trocada sem alterar a landing, o carimbo é gravado dentro de `logo_path`/`image_path` (`brands/<id>.webp?v=<ms>`). Os arquivos do seed continuam em `brands/<slug>.webp` até a primeira troca.
- **Upload só ao salvar**: o recorte fica na memória até o "Salvar"; cancelar não mexe no bucket.
- **Navegadores sem codificação WEBP** (Safari antigo): o `toBlob` devolve PNG; a tela detecta e avisa em vez de enviar o arquivo errado.
- **Roteiro de teste**: três falhas iniciais foram do meu roteiro (rótulos em MAIÚSCULAS no `innerText`, um botão "Cancelar" que não existe na etapa de prévia e a confirmação "vai sumir do site" ao encerrar); foram corrigidas e os passos repetidos. Nenhuma foi defeito do app.

## Bundle

| Arquivo (gzip -9) | Antes (master) | Depois |
|---|---|---|
| Landing `index-*.js` | 64.196 B (`index-BxWfkATj.js`) | 64.196 B, **mesmo hash** |
| Landing `index-*.css` | 7.438 B (`index-oN87JdVb.css`) | 7.438 B, **mesmo hash** |
| Admin JS (só em `/admin`) | 133.354 B | 150.310 B (react-easy-crop, recorte e formulários) |
| Admin CSS (só em `/admin`) | 4.712 B | 5.168 B |
