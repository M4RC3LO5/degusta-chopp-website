import React, { useState } from 'react';
import { Beer, Menu, X, MessageCircle, Calculator, ChevronRight } from 'lucide-react';

export default function Navbar({ onOpenCalculator, onOpenWhatsApp }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Início', href: '#hero' },
    { name: 'Oferta Especial', href: '#promo' },
    { name: 'Catálogo de Chopp', href: '#catalogo' },
    { name: 'Contato', href: '#contato' },
  ];

  const handleNavClick = (e, href) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#0a160d]/90 backdrop-blur-md border-b border-[#1b321f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">

          {/* Logo & Brand Name */}
          <a 
            href="#hero" 
            onClick={(e) => handleNavClick(e, '#hero')}
            className="flex items-center gap-3 group focus:outline-none"
          >
            <div className="w-12 h-12 rounded-xl bg-[#142718] flex items-center justify-center shadow-neu-flat border border-amber-500/30 group-hover:border-amber-400 group-hover:shadow-neu-gold transition-all duration-300">
              <Beer className="w-7 h-7 text-amber-400 group-hover:scale-110 transition-transform duration-300" />
            </div>
            <div>
              <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent drop-shadow-sm">
                Degusta Chopp
              </span>
              <span className="block text-[10px] uppercase tracking-widest text-emerald-400/80 font-bold -mt-1">
                Distribuidora Premium
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="text-sm font-semibold text-emerald-100/80 hover:text-amber-400 transition-colors duration-200 relative group py-1"
              >
                {link.name}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-amber-400 transition-all duration-300 group-hover:w-full"></span>
              </a>
            ))}

            {/* Quick Calculator Button */}
            <button
              onClick={onOpenCalculator}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300 hover:text-amber-200 bg-[#142718] px-3.5 py-2 rounded-lg border border-amber-500/20 hover:border-amber-500/50 shadow-neu-flat transition-all"
            >
              <Calculator className="w-4 h-4 text-amber-400" />
              Calculadora
            </button>
          </nav>

          {/* Desktop Neumorphic CTA Button */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={() => onOpenWhatsApp("Olá! Vim pelo site e gostaria de solicitar um orçamento de chopp.")}
              className="relative group overflow-hidden px-6 py-3 rounded-xl font-bold text-sm tracking-wide text-amber-300 bg-[#142718] shadow-neu-flat border border-amber-500/30 hover:border-amber-400 hover:text-amber-200 hover:shadow-neu-gold active:shadow-neu-pressed transition-all duration-300 flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>Peça seu Orçamento</span>
              <span className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/10 to-amber-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={onOpenCalculator}
              aria-label="Abrir calculadora de chopp"
              className="p-2 rounded-lg bg-[#142718] text-amber-400 border border-amber-500/20"
            >
              <Calculator className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2.5 rounded-xl bg-[#142718] text-emerald-100 border border-emerald-900/60 shadow-neu-flat active:shadow-neu-pressed transition-all"
              aria-label="Alternar Menu de Navegação"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6 text-amber-400" /> : <Menu className="w-6 h-6 text-emerald-100" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#0d1c10] border-b border-[#1b321f] px-4 pt-3 pb-6 space-y-4 shadow-2xl animate-pulse-subtle">
          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="flex items-center justify-between px-4 py-3 rounded-lg bg-[#142718] text-emerald-100 hover:text-amber-300 font-semibold border border-emerald-900/30 text-sm"
              >
                <span>{link.name}</span>
                <ChevronRight className="w-4 h-4 text-amber-400/60" />
              </a>
            ))}
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenCalculator();
              }}
              className="w-full py-3 px-4 rounded-xl bg-[#142718] text-amber-300 font-bold border border-amber-500/30 flex items-center justify-center gap-2 text-sm shadow-neu-flat"
            >
              <Calculator className="w-5 h-5 text-amber-400" />
              Calculadora de Litros por Evento
            </button>

            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenWhatsApp("Olá! Vim pelo site e gostaria de solicitar um orçamento de chopp.");
              }}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-extrabold text-sm shadow-gold-glow flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-5 h-5 text-slate-950 fill-slate-950" />
              Peça seu Orçamento via WhatsApp
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
