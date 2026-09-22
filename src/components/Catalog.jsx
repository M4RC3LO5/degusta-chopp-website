import React, { useState } from 'react';
import { Beer, MessageCircle, Filter, Info, Sparkles } from 'lucide-react';
import { BRANDS, TYPES, PRICES, getPrice, formatPrice } from '../data/products';

export default function Catalog({ onOpenWhatsApp }) {
  const [selectedBrandFilter, setSelectedBrandFilter] = useState('todos');

  const filterOptions = [
    { id: 'todos', name: 'Todas as Marcas' },
    ...BRANDS
  ];

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
            
            {filterOptions.map((brand) => (
              <button
                key={brand.id}
                onClick={() => setSelectedBrandFilter(brand.id)}
                className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all duration-200 border ${
                  selectedBrandFilter === brand.id
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 border-amber-400 shadow-gold-glow'
                    : 'bg-[#142718] text-emerald-100/80 border-emerald-900/60 shadow-neu-flat hover:border-amber-500/40 hover:text-amber-300'
                }`}
              >
                {brand.name}
              </button>
            ))}
          </div>
        </div>

        {/* 1. GRID: 2 columns on lg (max-w-6xl mx-auto items-stretch), dynamic last card centering when odd count */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto items-stretch">
          {TYPES.map((type, index) => {
            const total = TYPES.length;
            const isLastOdd = index === total - 1 && total % 2 === 1;

            const displayedBrands = selectedBrandFilter === 'todos'
              ? BRANDS
              : BRANDS.filter(b => b.id === selectedBrandFilter);

            return (
              <div
                key={type.id}
                className={`rounded-3xl bg-[#142718] border border-amber-500/25 p-6 lg:p-8 shadow-neu-flat hover:shadow-neu-gold hover:border-amber-400/60 transition-all duration-300 flex flex-col justify-between h-full group ${
                  isLastOdd ? 'lg:col-span-2 lg:max-w-[calc(50%-1rem)] lg:mx-auto w-full' : ''
                }`}
              >
                {/* Top Section */}
                <div className="flex flex-col flex-grow justify-between">
                  
                  {/* Header Card Info */}
                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-[#0d1c10] border border-amber-500/20 flex items-center justify-center text-3xl shadow-neu-pressed group-hover:scale-110 transition-transform shrink-0">
                          {type.icon}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-2xl lg:text-3xl font-extrabold text-slate-100 group-hover:text-amber-300 transition-colors">
                            {type.name}
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs text-emerald-300/80 font-bold mt-0.5 whitespace-nowrap">
                            <span>ABV: {type.abv}</span>
                            <span>•</span>
                            <span>{type.ibu}</span>
                          </div>
                        </div>
                      </div>

                      {/* Compact Badge */}
                      <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase whitespace-nowrap border shrink-0 tracking-wide mt-1 ${type.badgeColor}`}>
                        {type.badge}
                      </span>
                    </div>

                    {/* Description Paragraph */}
                    <p className="text-xs sm:text-sm text-emerald-100/75 leading-relaxed mb-5">
                      {type.description}
                    </p>
                  </div>

                  {/* Refactored Price Table Box */}
                  <div className="rounded-2xl bg-[#0d1c10] p-4 lg:p-5 border border-emerald-900/50 shadow-neu-pressed mb-5">
                    
                    {/* Table Header */}
                    <div className="grid grid-cols-[2fr_1fr_1fr] gap-3 items-center text-xs lg:text-sm font-extrabold uppercase text-amber-400 pb-3 border-b border-emerald-800/50 mb-4">
                      <span className="text-left">MARCA / FABRICANTE</span>
                      <span className="text-center">BARRIL 30L</span>
                      <span className="text-center">BARRIL 50L</span>
                    </div>

                    {/* Table Body: Brand Rows */}
                    <div className="space-y-4 py-1">
                      {displayedBrands.length === 0 ? (
                        <p className="text-xs text-emerald-300/60 text-center py-4">
                          Nenhuma opção para o filtro selecionado.
                        </p>
                      ) : (
                        displayedBrands.map((brand) => {
                          const price30 = getPrice(type.id, brand.id, 30);
                          const price50 = getPrice(type.id, brand.id, 50);
                          const subtitle = PRICES[type.id]?.[brand.id]?.subtitle || '';

                          return (
                            <div
                              key={brand.id}
                              className="grid grid-cols-[2fr_1fr_1fr] gap-3 items-center text-xs hover:bg-[#142718]/60 p-1.5 rounded-xl transition-colors"
                            >
                              {/* Brand info with logo & line-clamp-2 subtitle */}
                              <div className="flex items-center gap-3 min-w-0 text-left">
                                <img
                                  src={brand.logo}
                                  alt={`Logo ${brand.name}`}
                                  className="w-14 h-14 object-contain rounded-md bg-white/5 p-1 shrink-0"
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
                                  {brand.name.charAt(0)}
                                </div>
                                <div className="flex flex-col min-w-0 justify-center">
                                  <span className="text-lg font-extrabold text-slate-100 truncate">{brand.name}</span>
                                  {subtitle && (
                                    <span className="text-xs text-emerald-300/70 line-clamp-2 font-medium">({subtitle})</span>
                                  )}
                                </div>
                              </div>

                              {/* Price 30L */}
                              <div className="flex items-center justify-center">
                                <span className="border border-emerald-700/50 rounded-md py-2 px-3 text-center text-amber-400 bg-emerald-900/30 w-full flex items-center justify-center font-extrabold text-lg lg:text-xl whitespace-nowrap min-h-[44px] shadow-sm">
                                  {formatPrice(price30)}
                                </span>
                              </div>

                              {/* Price 50L */}
                              <div className="flex items-center justify-center">
                                <span className="border border-emerald-700/50 rounded-md py-2 px-3 text-center text-yellow-300 bg-emerald-900/30 w-full flex items-center justify-center font-extrabold text-lg lg:text-xl whitespace-nowrap min-h-[44px] shadow-sm">
                                  {formatPrice(price50)}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                  </div>

                  {/* Ideal Para Row */}
                  <div className="flex items-center gap-2 text-xs text-emerald-200/80 mb-6 bg-[#122215] px-3.5 py-3 rounded-xl border border-emerald-900/40 min-h-[44px] shrink-0">
                    <Info className="w-4 h-4 text-amber-400 shrink-0" />
                    <span><strong>Ideal para:</strong> {type.idealFor}</span>
                  </div>

                </div>

                {/* Bottom WhatsApp Button */}
                <button
                  onClick={() => onOpenWhatsApp(`Olá! Gostaria de consultar a disponibilidade do *${type.name}* para meu evento.`)}
                  className="w-full h-12 px-4 rounded-xl bg-[#142718] border border-amber-500/30 text-amber-300 font-extrabold text-xs sm:text-sm tracking-wider uppercase shadow-neu-flat hover:shadow-neu-gold hover:border-amber-400 hover:text-amber-200 active:shadow-neu-pressed transition-all duration-200 flex items-center justify-center gap-2 mt-auto shrink-0"
                >
                  <MessageCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">PEDIR {type.name.toUpperCase()} VIA WHATSAPP</span>
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
