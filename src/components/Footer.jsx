import React from 'react';
import { Beer, MessageCircle, Instagram, Phone, MapPin, Clock, ShieldCheck } from 'lucide-react';

export default function Footer({ onOpenWhatsApp }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer id="contato" className="bg-[#060e08] border-t border-amber-500/30 text-slate-100 pt-16 pb-12 relative overflow-hidden">
      {/* Glow ambient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] bg-amber-500/5 blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-emerald-900/60">
          
          {/* Brand Info Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#142718] flex items-center justify-center border border-amber-500/30 shadow-neu-flat">
                <Beer className="w-6 h-6 text-amber-400" />
              </div>
              <span className="text-xl font-extrabold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                Degusta Chopp
              </span>
            </div>

            <p className="text-xs text-emerald-200/70 leading-relaxed">
              Sua distribuidora de chopp de confiança em São Paulo e região. Leve o sabor e a cremosidade do chopp perfeito para a sua festa ou evento.
            </p>

            <div className="pt-2 flex items-center gap-3">
              {/* WhatsApp icon link */}
              <button
                onClick={() => onOpenWhatsApp("Olá! Vim pelo rodapé do site.")}
                className="w-10 h-10 rounded-xl bg-[#142718] border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-neu-flat hover:shadow-neu-gold hover:text-amber-300 transition-all"
                aria-label="WhatsApp Degusta Chopp"
              >
                <MessageCircle className="w-5 h-5" />
              </button>

              {/* Instagram icon link */}
              <a
                href="https://instagram.com/degustachopp"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-[#142718] border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-neu-flat hover:shadow-neu-gold hover:text-amber-300 transition-all"
                aria-label="Instagram @degustachopp"
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Contact Details Column */}
          <div className="space-y-3">
            <h4 className="text-sm font-black uppercase tracking-wider text-amber-300">
              Canais de Contato
            </h4>
            
            <ul className="space-y-3 text-xs">
              <li>
                <button
                  onClick={() => onOpenWhatsApp("Olá! Vim pelo site.")}
                  className="flex items-center gap-3 text-emerald-100/90 hover:text-amber-300 transition-colors group text-left"
                >
                  <div className="p-2 rounded-lg bg-[#142718] border border-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-emerald-300/60 uppercase font-bold">WhatsApp / Telefone</span>
                    <span className="font-bold text-sm text-amber-300">11 99106-9099</span>
                  </div>
                </button>
              </li>

              <li>
                <a
                  href="https://instagram.com/degustachopp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-emerald-100/90 hover:text-amber-300 transition-colors group"
                >
                  <div className="p-2 rounded-lg bg-[#142718] border border-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
                    <Instagram className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-emerald-300/60 uppercase font-bold">Instagram</span>
                    <span className="font-bold text-sm text-slate-100">@degustachopp</span>
                  </div>
                </a>
              </li>
            </ul>
          </div>

          {/* Delivery Region Column */}
          <div className="space-y-3">
            <h4 className="text-sm font-black uppercase tracking-wider text-amber-300">
              Regiões Atendidas
            </h4>
            <div className="flex items-start gap-2.5 text-xs text-emerald-200/80">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                São Paulo (Capital), Grande SP, Região do ABC, Osasco, Barueri, Alphaville e Guarulhos.
              </p>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-emerald-200/80 pt-1">
              <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Atendimento: Segunda a Sábado das 08h às 20h. Entregas programadas para fins de semana e feriados.
              </p>
            </div>
          </div>

          {/* Payment & Security Column */}
          <div className="space-y-3">
            <h4 className="text-sm font-black uppercase tracking-wider text-amber-300">
              Pagamento & Garantia
            </h4>
            <div className="p-4 rounded-xl bg-[#142718] border border-emerald-900/60 shadow-neu-pressed space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Chopeira Testada e Higienizada</span>
              </div>
              <p className="text-[11px] text-emerald-200/70">
                Aceitamos Pix, Cartões de Crédito (até 12x) e Débito no momento da entrega.
              </p>
            </div>
          </div>

        </div>

        {/* Bottom Rights */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-emerald-300/60 gap-4">
          <p>
            © {currentYear} Degusta Chopp. Todos os direitos reservados.
          </p>
          <p className="flex items-center gap-1">
            <span>Aprecio moderado. Venda proibida para menores de 18 anos.</span>
            <span>🔞</span>
          </p>
        </div>

      </div>
    </footer>
  );
}
