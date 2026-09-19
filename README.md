# 🍺 Degusta Chopp - Landing Page SPA

Single Page Application (SPA) responsiva para a distribuidora de bebidas **Degusta Chopp**, desenvolvida com **React.js 18**, **Tailwind CSS v3** e **Vite**.

![Dark Mode Neumorphic Design](https://img.shields.io/badge/Design-Dark%20Mode%20Neum%C3%B3rfico-emerald?style=for-the-badge)
![React 18](https://img.shields.io/badge/React-18.2.0-blue?style=for-the-badge&logo=react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4.1-38bdf8?style=for-the-badge&logo=tailwindcss)

---

## 🎨 Identidade Visual & Design System

- **Dark Mode Elegante**: Fundo verde escuro nobre (`#0a160d`, `#0f1f12`, `#142718`).
- **Destaques Dourados & Âmbar**: Tons de cerveja e chopp (`#f59e0b`, `#d97706`, `#fbbf24`, `shadow-gold-glow`).
- **Neumorfismo Escuro**:
  - `shadow-neu-flat`: Sombras duplas bidirecionais escuras para elevação de cartões (`6px 6px 14px #060e08, -6px -6px 14px #1c361e`).
  - `shadow-neu-pressed`: Efeito de profundidade/pressão interna para tabelas e inputs (`inset 4px 4px 8px #060e08...`).
  - `shadow-neu-gold`: Brilho dourado para CTAs primários.

---

## 🧩 Componentes do Projeto (`src/components/`)

- **`Navbar.jsx`**: Logo com caneca de chopp badge, menu responsivo, gaveta mobile, atalho para calculadora e botão Neumórfico *"Peça seu Orçamento"*.
- **`Hero.jsx`**: Headline principal *"Chopp Gelado, Churrasco e boa resenha!"*, subtítulo *"Entrega rápida em São Paulo e região para festas e eventos"*, CTAs diretos e selos de confiança.
- **`PromoBanner.jsx`**: Faixa de destaque com a promoção *"Pedidos acima de 50 litros: Isento de locação de chopeira!"*.
- **`Catalog.jsx`**: Grid de 2 colunas com centralização dinâmica do último cartão quando ímpar (`lg:col-span-2 lg:max-w-[calc(50%-1rem)] lg:mx-auto`), logos de marcas (`/logos/bru.png`, etc.) com fallback automático em erro, tipografia em destaque e tabela de preços com CSS Grid de 3 colunas (`grid-cols-[2fr_1fr_1fr]`) e badges de preço encapsulados (`min-h-[44px] text-lg lg:text-xl`).
- **`ChoppCalculatorModal.jsx`**: Calculadora interativa de litros por evento (homens, mulheres, duração) com botão de envio formatado direto para o WhatsApp.
- **`Footer.jsx`**: Canais de atendimento (WhatsApp: `11 99106-9099`, Instagram: `@degustachopp`), regiões atendidas e direitos.

---

## 📱 Responsividade & Mobile First

- **Mobile First 100%**: Layout testado e otimizado em todas as resoluções (320px a 4K).
- **Alvos de Toque (Touch Targets)**: Mínimo de 44px de altura para botões e links.
- **Sem Quebra de Preços**: Badges de valor com `whitespace-nowrap` mantêm `"R$"` e o valor na mesma linha.

---

## 🛠️ Como Rodar o Projeto Localmente

```bash
# 1. Clonar o repositório
git clone https://github.com/M4RC3LO5/degusta-chopp-website.git

# 2. Entrar na pasta do projeto
cd degusta-chopp-website

# 3. Instalar as dependências
npm install

# 4. Iniciar o servidor de desenvolvimento
npm run dev

# 5. Compilar para produção (Vite build)
npm run build
```

---

## 📞 Contatos da Distribuidora

- **WhatsApp**: `11 99106-9099` (Formato: `5511991069099`)
- **Instagram**: `@degustachopp`
