import React, { useState } from 'react';
import { Beer, MessageCircle, Filter, Info, Sparkles } from 'lucide-react';

export default function Catalog({ onOpenWhatsApp }) {
  const [selectedBrandFilter, setSelectedBrandFilter] = useState('todos');

  // Categories data with logo image paths and exact required text content
  const categories = [
    {
      id: 'pilsen',
      title: 'Chopp Pilsen',
      badge: 'MAIS PEDIDO',
      badgeColor: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
      description: 'Leve, refrescante e muito cremoso. O clássico indispensável para qualquer churrasco ou celebração.',
      abv: '4.5%',
      ibu: '12 IBU',
      recommendedFor: 'Churrascos, festas e reuniões familiares.',
      icon: '🍺',
      brands: [
        { name: 'Bru', logo: '/logos/bru.png', price30L: 'R$ 380,00', price50L: 'R$ 590,00', note: 'Custo-benefício' },
        { name: 'Germânia', logo: '/logos/germania.png', price30L: 'R$ 420,00', price50L: 'R$ 650,00', note: 'Tradição artesanal' },
        { name: 'Brahma', logo: '/logos/brahma.png', price30L: 'R$ 490,00', price50L: 'R$ 780,00', note: 'Qualidade nacional' },
      ]
    },
    {
      id: 'escuro',
      title: 'Chopp Escuro',
      badge: 'SABOR INCORPADO',
      badgeColor: 'bg-amber-600/20 border-amber-600/40 text-amber-400',
      description: 'Notas sutilmente adocicadas e maltes torrados. Ideal para quem aprecia um chopp marcante e harmonioso.',
      abv: '4.8%',
      ibu: '15 IBU',
      recommendedFor: 'Noites frias, carnes e eventos noturnos.',
      icon: '🍻',
      brands: [
        { name: 'Bru', logo: '/logos/bru.png', price30L: 'R$ 410,00', price50L: 'R$ 640,00', note: 'Maltes torrados' },
        { name: 'Germânia', logo: '/logos/germania.png', price30L: 'R$ 450,00', price50L: 'R$ 690,00', note: 'Dunkel tradicional' },
        { name: 'Brahma', logo: '/logos/brahma.png', price30L: 'R$ 520,00', price50L: 'R$ 820,00', note: 'Black cremoso' },
      ]
    },
    {
      id: 'puro-malte',
      title: 'Chopp Puro Malte',
      badge: '100% MALTE',
      badgeColor: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
      description: 'Feito exclusivamente com malte de cevada e lúpulos selecionados. Amargor equilibrado e aroma inconfundível.',
      abv: '5.0%',
      ibu: '18 IBU',
      recommendedFor: 'Apreciadores de cerveja puro malte.',
      icon: '🌾',
      brands: [
        { name: 'Bru', logo: '/logos/bru.png', price30L: 'R$ 430,00', price50L: 'R$ 670,00', note: 'Puro e equilibrado' },
        { name: 'Germânia', logo: '/logos/germania.png', price30L: 'R$ 470,00', price50L: 'R$ 720,00', note: 'Puro malte artesanal' },
        { name: 'Brahma', logo: '/logos/brahma.png', price30L: 'R$ 550,00', price50L: 'R$ 850,00', note: 'Brahma Duplo Malte' },
      ]
    },
    {
      id: 'ipa',
      title: 'Chopp IPA',
      badge: 'LUPULADO PREMIUM',
      badgeColor: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300',
      description: 'Para amantes de lúpulo intenso! Aromas cítricos, amargor presente e colarinho denso e persistente.',
      abv: '6.2%',
      ibu: '45 IBU',
      recommendedFor: 'Hambúrgueres gourmet e carnes nobres.',
      icon: '🍃',
      brands: [
        { name: 'Bru', logo: '/logos/bru.png', price30L: 'R$ 480,00', price50L: 'R$ 760,00', note: 'IPA aromática' },
        { name: 'Germânia', logo: '/logos/germania.png', price30L: 'R$ 520,00', price50L: 'R$ 810,00', note: 'IPA especial' },
        { name: 'Brahma', logo: '/logos/brahma.png', price30L: 'R$ 590,00', price50L: 'R$ 920,00', note: 'Colorado / IPA' },
      ]
    },
    {
      id: 'vinho',
      title: 'Chopp de Vinho',
      badge: 'SUCESSO DAS FESTAS',
      badgeColor: 'bg-purple-500/20 border-purple-500/40 text-purple-300',
      description: 'A combinação perfeita entre a leveza do chopp e o sabor marcante do vinho tinto de mesa. Doce e refrescante.',
      abv: '5.5%',
      ibu: '8 IBU',
      recommendedFor: 'Recepções, festas e comemorações.',
      icon: '🍇',
      brands: [
        { name: 'Bru', logo: '/logos/bru.png', price30L: 'R$ 440,00', price50L: 'R$ 690,00', note: 'Grape Beer cremoso' },
        { name: 'Germânia', logo: '/logos/germania.png', price30L: 'R$ 480,00', price50L: 'R$ 740,00', note: 'Vinho tradicional' },
        { name: 'Brahma', logo: '/logos/brahma.png', price30L: 'R$ 560,00', price50L: 'R$ 880,00', note: 'Seleção especial' },
      ]
    }
  ];

  const filteredCategories = categories.map(category => {
    if (selectedBrandFilter === 'todos') return category;
    return {
      ...category,
      brands: category.brands.filter(b => b.name.toLowerCase() === selectedBrandFilter.toLowerCase())
    };
  });

  return (
    <section id="catalogo" className="py-16 sm:py-24 bg-[#0a160d] relative">
      {/* Glow ambient background elements */}
      <div className="absolute top-1/3 left-0 w-80 sm:w-96 h-80 sm:h-96 bg-emerald-600/10 rounded-full blur-[130px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-0 w-80 sm:w-96 h-80 sm:h-96 bg-amber-600/10 rounded-full blur-[130px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16 space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#142718] border border-amber-500/30 shadow-neu-flat text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Beer className="w-4 h-4 text-amber-400" />
            <span>Cardápio & Tabela de Preços</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-100 tracking-tight">
            Catálogo de <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">Chopp Gelado</span>
          </h2>

          <p className="text-emerald-100/80 text-sm sm:text-base lg:text-lg">
            Escolha o tipo de chopp ideal para o seu evento. Trabalhamos com barris de <strong className="text-amber-300">30 Litros</strong> e <strong className="text-amber-300">50 Litros</strong> das melhores marcas.
          </p>

          {/* Brand Filter Tabs */}
          <div className="pt-2 sm:pt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
            <span className="text-xs font-bold uppercase text-emerald-400 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filtrar Marca:
            </span>
            
            {['todos', 'bru', 'germânia', 'brahma'].map((brandKey) => (
              <button
                key={brandKey}
                onClick={() => setSelectedBrandFilter(brandKey)}
                className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all duration-200 border ${
                  selectedBrandFilter === brandKey
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 border-amber-400 shadow-gold-glow'
                    : 'bg-[#142718] text-emerald-100/80 border-emerald-900/60 shadow-neu-flat hover:border-amber-500/40 hover:text-amber-300'
                }`}
              >
                {brandKey === 'todos' ? 'Todas as Marcas' : brandKey.charAt(0).toUpperCase() + brandKey.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* 1. GRID: 2 columns on lg (max-w-6xl mx-auto items-stretch), dynamic last card centering when odd count */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto items-stretch">
          {filteredCategories.map((category, index) => {
            const total = filteredCategories.length;
            const isLastOdd = index === total - 1 && total % 2 === 1;

            return (
              <div
                key={category.id}
                className={`rounded-3xl bg-[#142718] border border-amber-500/25 p-6 lg:p-8 shadow-neu-flat hover:shadow-neu-gold hover:border-amber-400/60 transition-all duration-300 flex flex-col justify-between h-full group ${
                  isLastOdd ? 'lg:col-span-2 lg:max-w-[calc(50%-1rem)] lg:mx-auto w-full' : ''
                }`}
              >
                {/* Top Section */}
                <div className="flex flex-col flex-grow justify-between">
                  
                  {/* 3. Header Card Info (flex-wrap, text-2xl lg:text-3xl font-extrabold without truncation) */}
                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-[#0d1c10] border border-amber-500/20 flex items-center justify-center text-3xl shadow-neu-pressed group-hover:scale-110 transition-transform shrink-0">
                          {category.icon}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-2xl lg:text-3xl font-extrabold text-slate-100 group-hover:text-amber-300 transition-colors">
                            {category.title}
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs text-emerald-300/80 font-bold mt-0.5 whitespace-nowrap">
                            <span>ABV: {category.abv}</span>
                            <span>•</span>
                            <span>{category.ibu}</span>
                          </div>
                        </div>
                      </div>

                      {/* Compact Badge (wraps below title on narrow space without cutting title) */}
                      <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase whitespace-nowrap border shrink-0 tracking-wide mt-1 ${category.badgeColor}`}>
                        {category.badge}
                      </span>
                    </div>

                    {/* Description Paragraph */}
                    <p className="text-xs sm:text-sm text-emerald-100/75 leading-relaxed mb-5">
                      {category.description}
                    </p>
                  </div>

                  {/* 4. Refactored Price Table Box (p-4 lg:p-5, space-y-4 py-1) */}
                  <div className="rounded-2xl bg-[#0d1c10] p-4 lg:p-5 border border-emerald-900/50 shadow-neu-pressed mb-5">
                    
                    {/* Table Header: text-xs lg:text-sm */}
                    <div className="grid grid-cols-[2fr_1fr_1fr] gap-3 items-center text-xs lg:text-sm font-extrabold uppercase text-amber-400 pb-3 border-b border-emerald-800/50 mb-4">
                      <span className="text-left">MARCA / FABRICANTE</span>
                      <span className="text-center">BARRIL 30L</span>
                      <span className="text-center">BARRIL 50L</span>
                    </div>

                    {/* Table Body: Brand Rows with space-y-4 py-1 */}
                    <div className="space-y-4 py-1">
                      {category.brands.length === 0 ? (
                        <p className="text-xs text-emerald-300/60 text-center py-4">
                          Nenhuma opção para o filtro selecionado.
                        </p>
                      ) : (
                        category.brands.map((b) => (
                          <div
                            key={b.name}
                            className="grid grid-cols-[2fr_1fr_1fr] gap-3 items-center text-xs hover:bg-[#142718]/60 p-1.5 rounded-xl transition-colors"
                          >
                            {/* 2. LOGOS: Logo Image (w-12 h-12) + Fallback Initial + Brand Name (text-lg font-extrabold) + Subtitle (text-xs) */}
                            <div className="flex items-center gap-3 min-w-0 text-left">
                              <img
                                src={b.logo}
                                alt={`Logo ${b.name}`}
                                className="w-12 h-12 object-contain rounded-md bg-white/5 p-1 shrink-0"
                                loading="lazy"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  if (e.currentTarget.nextElementSibling) {
                                    e.currentTarget.nextElementSibling.classList.remove('hidden');
                                    e.currentTarget.nextElementSibling.classList.add('flex');
                                  }
                                }}
                              />
                              <div className="hidden w-12 h-12 rounded-md bg-emerald-900/50 text-amber-400 font-extrabold items-center justify-center text-lg shrink-0 border border-emerald-700/50">
                                {b.name.charAt(0)}
                              </div>
                              <div className="flex flex-col min-w-0 justify-center">
                                <span className="text-lg font-extrabold text-slate-100 truncate">{b.name}</span>
                                <span className="text-xs text-emerald-300/70 truncate font-medium">({b.note})</span>
                              </div>
                            </div>

                            {/* 4. Coluna 2: Badge de Preço 30L (text-lg lg:text-xl whitespace-nowrap py-2 px-3 min-h-[44px]) */}
                            <div className="flex items-center justify-center">
                              <span className="border border-emerald-700/50 rounded-md py-2 px-3 text-center text-amber-400 bg-emerald-900/30 w-full flex items-center justify-center font-extrabold text-lg lg:text-xl whitespace-nowrap min-h-[44px] shadow-sm">
                                {b.price30L}
                              </span>
                            </div>

                            {/* 4. Coluna 3: Badge de Preço 50L (text-lg lg:text-xl whitespace-nowrap py-2 px-3 min-h-[44px]) */}
                            <div className="flex items-center justify-center">
                              <span className="border border-emerald-700/50 rounded-md py-2 px-3 text-center text-yellow-300 bg-emerald-900/30 w-full flex items-center justify-center font-extrabold text-lg lg:text-xl whitespace-nowrap min-h-[44px] shadow-sm">
                                {b.price50L}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                  </div>

                  {/* Ideal Para Row */}
                  <div className="flex items-center gap-2 text-xs text-emerald-200/80 mb-6 bg-[#122215] px-3.5 py-3 rounded-xl border border-emerald-900/40 min-h-[44px] shrink-0">
                    <Info className="w-4 h-4 text-amber-400 shrink-0" />
                    <span><strong>Ideal para:</strong> {category.recommendedFor}</span>
                  </div>

                </div>

                {/* 4. Bottom WhatsApp Button (Pushed to bottom with mt-auto) */}
                <button
                  onClick={() => onOpenWhatsApp(`Olá! Gostaria de consultar a disponibilidade do *${category.title}* para meu evento.`)}
                  className="w-full h-12 px-4 rounded-xl bg-[#142718] border border-amber-500/30 text-amber-300 font-extrabold text-xs sm:text-sm tracking-wider uppercase shadow-neu-flat hover:shadow-neu-gold hover:border-amber-400 hover:text-amber-200 active:shadow-neu-pressed transition-all duration-200 flex items-center justify-center gap-2 mt-auto shrink-0"
                >
                  <MessageCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">PEDIR {category.title.toUpperCase()} VIA WHATSAPP</span>
                </button>

              </div>
            );
          })}
        </div>

        {/* Free dispenser alert callout under catalog */}
        <div className="mt-10 sm:mt-14 text-center bg-[#142718] p-5 sm:p-6 rounded-2xl border border-amber-500/30 shadow-neu-flat max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-left">
            <Sparkles className="w-6 h-6 text-amber-400 shrink-0" />
            <p className="text-xs sm:text-sm text-emerald-100/90 font-medium">
              Precisa de chopeira elétrica ou a gelo? Em pedidos acima de 50 Litros a locação é totalmente <strong className="text-amber-300 font-bold">Gratuita</strong>!
            </p>
          </div>
          <button
            onClick={() => onOpenWhatsApp("Olá! Gostaria de consultar os detalhes da chopeira cortesia acima de 50L.")}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs shrink-0 shadow-gold-glow hover:scale-105 transition-transform"
          >
            Consultar Condições
          </button>
        </div>

      </div>
    </section>
  );
}
