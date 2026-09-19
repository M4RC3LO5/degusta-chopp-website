import React from 'react';
import { MessageCircle, Flame, Truck, Award, ShieldCheck, ChevronDown, Sparkles } from 'lucide-react';

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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
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

          {/* Neumorphic Beer Card Showcase Column */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[#142718] border border-amber-500/30 shadow-neu-gold relative">
              
              {/* Top Tag */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-emerald-900/60">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                    Disponível Agora
                  </span>
                </div>
                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                  Barris 30L e 50L
                </span>
              </div>

              {/* Graphic Mockup / Illustration Box */}
              <div className="relative rounded-2xl bg-[#0d1c10] p-6 text-center border border-emerald-900/40 shadow-neu-pressed overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-emerald-500/5 pointer-events-none"></div>
                
                <div className="text-7xl mb-3 transform group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_10px_20px_rgba(245,158,11,0.3)]">
                  🍺
                </div>
                
                <h3 className="text-xl font-extrabold text-amber-300">
                  Chopp Trincando de Gelado
                </h3>
                <p className="text-xs text-emerald-200/70 mt-1">
                  Instalação completa e suporte durante seu evento.
                </p>

                {/* Brands badge */}
                <div className="mt-4 pt-3 border-t border-emerald-900/40 flex items-center justify-center gap-2 text-xs text-amber-200 font-semibold">
                  <span className="px-2 py-0.5 rounded bg-emerald-950 border border-amber-500/20">Bru</span>
                  <span>•</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 border border-amber-500/20">Germânia</span>
                  <span>•</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 border border-amber-500/20">Brahma</span>
                </div>
              </div>

              {/* Quick Calculate Event Box */}
              <div className="mt-6 p-4 rounded-xl bg-[#1b321f]/90 border border-amber-500/20 shadow-neu-flat">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                      Dúvida sobre a quantidade?
                    </h5>
                    <p className="text-xs text-emerald-100/70 mt-0.5">
                      Calcule litros por pessoa em 30 segundos
                    </p>
                  </div>
                  <button
                    onClick={onOpenCalculator}
                    className="px-3.5 py-2 rounded-lg bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 transition-colors shadow-md shrink-0"
                  >
                    Calcular Litros
                  </button>
                </div>
              </div>

              {/* Security note */}
              <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-emerald-300/80">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Chopp armazenado e transportado sob temperatura ideal</span>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
