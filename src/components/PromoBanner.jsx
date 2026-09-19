import React from 'react';
import { Flame, Sparkles, MessageCircle, CheckCircle } from 'lucide-react';

export default function PromoBanner({ onOpenWhatsApp }) {
  const promoText = "Pedidos acima de 50 litros: Isento de locação de chopeira!";

  return (
    <section id="promo" className="relative z-20 py-8 bg-[#071109] border-y border-amber-500/30 overflow-hidden">
      {/* Background Animated Gradient Stream */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-yellow-500/15 to-amber-500/10 opacity-70 animate-pulse-subtle pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="p-6 sm:p-8 rounded-2xl bg-[#142718] border-2 border-amber-500/50 shadow-neu-gold flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Offer Icon & Text Content */}
          <div className="flex items-center gap-5 text-center md:text-left">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-gold-glow shrink-0 animate-bounce-subtle">
              <Flame className="w-8 h-8 fill-slate-950 stroke-slate-950" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-extrabold uppercase tracking-wider border border-amber-500/40 mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Oferta Imperdível</span>
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-100 tracking-tight">
                {promoText}
              </h2>
              <p className="text-xs sm:text-sm text-emerald-200/80 mt-1 flex items-center justify-center md:justify-start gap-2">
                <CheckCircle className="w-4 h-4 text-amber-400" />
                <span>Válido para todas as marcas do catálogo (Bru, Germânia e Brahma).</span>
              </p>
            </div>
          </div>

          {/* Action CTA Button */}
          <div className="shrink-0 w-full md:w-auto">
            <button
              onClick={() => onOpenWhatsApp(`Olá! Quero aproveitar a promoção: "${promoText}"`)}
              className="w-full md:w-auto px-7 py-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-slate-950 font-black text-sm tracking-wide shadow-gold-glow hover:shadow-[0_0_30px_rgba(245,158,11,0.6)] transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 group"
            >
              <MessageCircle className="w-5 h-5 text-slate-950 fill-slate-950 group-hover:scale-110 transition-transform" />
              <span>Garantir Chopeira Cortesia</span>
            </button>
          </div>

        </div>
      </div>
    </section>
  );
}
