import React from 'react';
import { MessageCircle, Flame, Truck, Award, ChevronDown, Sparkles } from 'lucide-react';
import OrderConfigurator from './OrderConfigurator';

export default function Hero({ onOpenWhatsApp, onOpenCalculator }) {
  const handleScrollToCatalog = () => {
    const element = document.querySelector('#catalogo');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="hero" className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32 bg-[#0a160d]">
      {/* Subtle Background Glow Spheres */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none z-0"></div>
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none z-0"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Main Content Column */}
          <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
            
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#142718] border border-amber-500/30 shadow-neu-flat text-amber-300 text-xs sm:text-sm font-semibold tracking-wide animate-float">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Distribuidora Oficial de Chopp em SP & Região</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-100 tracking-tight leading-[1.15]">
              Chopp Gelado, Churrasco e <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent underline decoration-amber-500/40 decoration-wavy">boa resenha!</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-emerald-100/90 font-medium max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Entrega rápida em <strong className="text-amber-300 font-bold">São Paulo e região</strong> para festas, churrascos e eventos. Garantimos seu barril trincando de gelado no horário marcado!
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <button
                onClick={() => onOpenWhatsApp("Olá! Quero pedir chopp gelado para o meu evento!")}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-slate-950 font-black text-base tracking-wide shadow-gold-glow hover:shadow-[0_0_35px_rgba(245,158,11,0.5)] transform hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-3 group"
              >
                <MessageCircle className="w-5 h-5 text-slate-950 fill-slate-950 group-hover:scale-110 transition-transform" />
                <span>Solicitar Chopp via WhatsApp</span>
              </button>

              <button
                onClick={handleScrollToCatalog}
                className="w-full sm:w-auto px-7 py-4 rounded-xl bg-[#142718] border border-amber-500/30 text-amber-300 font-bold text-base shadow-neu-flat hover:shadow-neu-gold hover:border-amber-400 hover:text-amber-200 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <span>Ver Catálogo e Marcas</span>
                <ChevronDown className="w-4 h-4 text-amber-400" />
              </button>
            </div>

            {/* Key Value Propositions */}
            <div className="pt-6 border-t border-emerald-900/50 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
              <div className="p-3.5 rounded-xl bg-[#122215]/80 border border-emerald-800/40 shadow-neu-flat flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-200 uppercase tracking-wider">Entrega Expressa</h4>
                  <p className="text-xs text-emerald-200/70 mt-0.5">SP Capital e Grande SP com pontualidade</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#122215]/80 border border-emerald-800/40 shadow-neu-flat flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-200 uppercase tracking-wider">Chopeira Inclusa</h4>
                  <p className="text-xs text-emerald-200/70 mt-0.5">Isenção de taxa em pedidos &gt; 50L</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#122215]/80 border border-emerald-800/40 shadow-neu-flat flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-200 uppercase tracking-wider">Marcas Líderes</h4>
                  <p className="text-xs text-emerald-200/70 mt-0.5">Brahma, Germânia e Bru prontas</p>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Order Configurator Component */}
          <div className="lg:col-span-5 flex justify-center">
            <OrderConfigurator onOpenCalculator={onOpenCalculator} />
          </div>

        </div>
      </div>
    </section>
  );
}
