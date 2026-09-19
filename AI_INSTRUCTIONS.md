# 🤖 Instruções para Agentes de IA / Novas Conversas

Este arquivo orienta qualquer assistente de Inteligência Artificial (Antigravity, Claude, Cursor, Copilot, ChatGPT) a manter o alinhamento arquitetural, visual e funcional do projeto **Degusta Chopp**.

---

## 📌 Diretrizes Fundamentais

1. **Idioma Obrigatório**: Sempre responder e fazer perguntas estritamente em **português do Brasil (pt-BR)**.
2. **Identidade Visual Dark Mode Neumórfica**:
   - Fundo base: Verde escuro nobre (`#0a160d`, `#0f1f12`, `#142718`).
   - Destaques & Acentos: Dourado e Âmbar (`#f59e0b`, `#d97706`, `#fbbf24`, `shadow-gold-glow`).
   - Neumorfismo Escuro: Usar `shadow-neu-flat` para elevação de cartões, `shadow-neu-pressed` para containers afundados/tabelas e `shadow-neu-gold` para botões e CTAs primários.

---

## 📐 Regras de Layout & Componentes (`src/components/`)

- **`Catalog.jsx` (Catálogo de Chopp)**:
  - **Grid**: `grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto items-stretch`.
  - **Card Ímpar Centralizado**: Quando o número de cards filtrados for ímpar (`index === total - 1 && total % 2 === 1`), aplicar no último card as classes:
    `lg:col-span-2 lg:max-w-[calc(50%-1rem)] lg:mx-auto w-full`.
  - **Logos de Marcas**: Localizados em `public/logos/` (ex: `/logos/bru.png`, `/logos/germania.png`, `/logos/brahma.png`). Sempre incluir manipulador `onError` para exibir a div fallback com a inicial da marca.
  - **Tipografia do Título**: `text-2xl lg:text-3xl font-extrabold text-slate-100`. Não utilizar `truncate` ou `line-clamp` no título do chopp.
  - **Tabela de Preços com CSS Grid**: Linhas e cabeçalho devem obrigatoriamente usar `grid grid-cols-[2fr_1fr_1fr] gap-3`. Cabeçalho de colunas de barril centralizado (`text-center`).
  - **Badges de Preço**: Preços de 30L e 50L devem ser caixas retangulares encapsuladas com `py-2 px-3 min-h-[44px] text-lg lg:text-xl font-extrabold whitespace-nowrap`.
  - **Botão CTA WhatsApp**: Ancorado ao fundo com `mt-auto`.

- **`Navbar.jsx`**:
  - Marca "Degusta Chopp" com gradiente dourado e ícone de caneca.
  - Botão Neumórfico "Peça seu Orçamento" + atalho da Calculadora + Gaveta Mobile responsiva.

- **`Hero.jsx`**:
  - Headline: *"Chopp Gelado, Churrasco e boa resenha!"*.
  - Subtítulo: *"Entrega rápida em São Paulo e região para festas e eventos"*.

- **`PromoBanner.jsx`**:
  - Texto fixo: *"Pedidos acima de 50 litros: Isento de locação de chopeira!"*.

- **`ChoppCalculatorModal.jsx`**:
  - Modal interativo de estimativa de litros (homens, mulheres, horas) com botão de envio formatado direto para o WhatsApp.

- **`Footer.jsx`**:
  - Contatos oficiais: WhatsApp `11 99106-9099` (URL: `https://wa.me/5511991069099`) e Instagram `@degustachopp`.

---

## 📱 Responsividade 100% Mobile First

- Garantir que todos os componentes funcionem sem barra de rolagem horizontal indesejada em resoluções de 320px a 4K.
- Manter botões com alvos de toque confortáveis (`min-h-[44px]`).

---

## 🧪 Comandos de Build e Teste

Ao realizar alterações, validar se a compilação passa sem erros ou warnings:

```bash
npm run build
```
