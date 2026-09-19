import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import PromoBanner from './components/PromoBanner';
import Catalog from './components/Catalog';
import ChoppCalculatorModal from './components/ChoppCalculatorModal';
import Footer from './components/Footer';
import { MessageCircle, Calculator, ChevronUp } from 'lucide-react';

export default function App() {
  const WHATSAPP_NUMBER = '5511991069099';
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  const handleOpenWhatsApp = (customMessage = '') => {
    const text = customMessage || 'Olá! Gostaria de solicitar um orçamento para entrega de chopp.';
    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedText}`, '_blank');
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0a160d] text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950 relative">
      
      {/* Top Navbar */}
      <Navbar 
        onOpenCalculator={() => setIsCalculatorOpen(true)}
        onOpenWhatsApp={handleOpenWhatsApp}
      />

      <main>
        {/* Hero Section */}
        <Hero 
          onOpenWhatsApp={handleOpenWhatsApp}
          onOpenCalculator={() => setIsCalculatorOpen(true)}
        />

        {/* Highlight Promo Banner */}
        <PromoBanner 
          onOpenWhatsApp={handleOpenWhatsApp}
        />

        {/* Menu / Catalog Section */}
        <Catalog 
          onOpenWhatsApp={handleOpenWhatsApp}
        />
      </main>

      {/* Footer */}
      <Footer 
        onOpenWhatsApp={handleOpenWhatsApp}
      />

      {/* Chopp Calculator Modal */}
      <ChoppCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        onOpenWhatsApp={handleOpenWhatsApp}
      />

      {/* Floating Action Buttons (Fixed Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 pointer-events-auto">
        
        {/* Quick Calculator Floating Button */}
        <button
          onClick={() => setIsCalculatorOpen(true)}
          className="p-3.5 rounded-2xl bg-[#142718] border border-amber-500/40 text-amber-400 shadow-neu-gold hover:scale-110 active:scale-95 transition-all duration-200 group flex items-center gap-2"
          title="Calculadora de Chopp por Evento"
          aria-label="Abrir Calculadora de Chopp"
        >
          <Calculator className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          <span className="hidden md:inline text-xs font-bold text-amber-300 pr-1">Calculadora</span>
        </button>

        {/* Floating WhatsApp Button */}
        <button
          onClick={() => handleOpenWhatsApp("Olá! Vim pelo site da Degusta Chopp e gostaria de um orçamento.")}
          className="relative p-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 font-black shadow-gold-glow hover:shadow-[0_0_30px_rgba(16,185,129,0.7)] hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center group"
          aria-label="Contato direto via WhatsApp"
        >
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-[#0a160d] animate-ping"></span>
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-[#0a160d]"></span>
          <MessageCircle className="w-6 h-6 fill-slate-950 stroke-slate-950 group-hover:scale-110 transition-transform" />
        </button>

        {/* Back to top button */}
        <button
          onClick={scrollToTop}
          className="p-2.5 rounded-xl bg-[#142718]/80 text-emerald-300 border border-emerald-900/60 shadow-neu-flat hover:text-amber-400 transition-colors"
          title="Voltar ao Topo"
          aria-label="Voltar ao topo da página"
        >
          <ChevronUp className="w-4 h-4" />
        </button>

      </div>

    </div>
  );
}
