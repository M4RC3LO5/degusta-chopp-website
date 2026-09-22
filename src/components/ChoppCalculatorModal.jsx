import React, { useState } from 'react';
import { X, Calculator, Beer, MessageCircle, CheckCircle2 } from 'lucide-react';

export default function ChoppCalculatorModal({ isOpen, onClose, onOpenWhatsApp }) {
  const [menCount, setMenCount] = useState(10);
  const [womenCount, setWomenCount] = useState(10);
  const [durationHours, setDurationHours] = useState(4);
  const [selectedBeerType, setSelectedBeerType] = useState('Chopp Pilsen');

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('has-modal');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('has-modal');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('has-modal');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Calculation formula: Average 1.8L per man for 4 hours, 1.2L per woman for 4 hours
  // Adjusted proportionally by duration
  const basePerMan = 1.8 * (durationHours / 4);
  const basePerWoman = 1.2 * (durationHours / 4);
  
  const totalLitersRaw = (menCount * basePerMan) + (womenCount * basePerWoman);
  const totalLiters = Math.ceil(totalLitersRaw);

  // Determine barrel recommendation (30L / 50L)
  let barrelSuggestion = '';
  if (totalLiters <= 30) {
    barrelSuggestion = '1 Barril de 30 Litros';
  } else if (totalLiters <= 50) {
    barrelSuggestion = '1 Barril de 50 Litros';
  } else if (totalLiters <= 80) {
    barrelSuggestion = '1 Barril de 50L + 1 Barril de 30L (Total: 80L)';
  } else if (totalLiters <= 100) {
    barrelSuggestion = '2 Barris de 50 Litros (Total: 100L)';
  } else {
    const barrels50 = Math.floor(totalLiters / 50);
    const remainder = totalLiters % 50;
    if (remainder > 0 && remainder <= 30) {
      barrelSuggestion = `${barrels50} Barril(is) de 50L + 1 Barril de 30L`;
    } else {
      barrelSuggestion = `${barrels50 + (remainder > 0 ? 1 : 0)} Barris de 50L`;
    }
  }

  const handleSendQuote = () => {
    const message = `Olá! Calculei meu evento na Calculadora Degusta Chopp:\n\n- *Homens:* ${menCount}\n- *Mulheres:* ${womenCount}\n- *Duração:* ${durationHours} horas\n- *Tipo de Chopp:* ${selectedBeerType}\n- *Recomendado:* ~${totalLiters} Litros (${barrelSuggestion})\n\nGostaria de confirmar a disponibilidade e valores!`;
    onOpenWhatsApp(message);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#142718] border-2 border-amber-500/40 p-6 sm:p-8 shadow-neu-gold text-slate-100 max-h-[90vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-emerald-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/40 shrink-0">
              <Calculator className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-amber-400">
                Calculadora
              </h2>
              <p className="text-xs text-emerald-200/70">Descubra a quantidade perfeita para a sua festa</p>
            </div>
          </div>
          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 shrink-0 rounded-xl bg-[#0d1c10] text-emerald-300 hover:text-amber-400 border border-emerald-900/60 shadow-neu-pressed transition-colors"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Controls */}
        <div className="space-y-5">

          {/* Men count */}
          <div>
            <div className="flex justify-between items-center text-xs font-bold mb-2">
              <label className="text-emerald-200">Quantidade de Homens:</label>
              <span className="text-amber-300 bg-[#0d1c10] px-2.5 py-1 rounded border border-amber-500/20">{menCount} pessoas</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={menCount}
              onChange={(e) => setMenCount(parseInt(e.target.value) || 0)}
              className="w-full accent-amber-500 bg-[#0d1c10] h-2 rounded-lg cursor-pointer"
            />
          </div>

          {/* Women count */}
          <div>
            <div className="flex justify-between items-center text-xs font-bold mb-2">
              <label className="text-emerald-200">Quantidade de Mulheres:</label>
              <span className="text-amber-300 bg-[#0d1c10] px-2.5 py-1 rounded border border-amber-500/20">{womenCount} pessoas</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={womenCount}
              onChange={(e) => setWomenCount(parseInt(e.target.value) || 0)}
              className="w-full accent-amber-500 bg-[#0d1c10] h-2 rounded-lg cursor-pointer"
            />
          </div>

          {/* Duration */}
          <div>
            <div className="flex justify-between items-center text-xs font-bold mb-2">
              <label className="text-emerald-200">Duração estimada do evento:</label>
              <span className="text-amber-300 bg-[#0d1c10] px-2.5 py-1 rounded border border-amber-500/20">{durationHours} Horas</span>
            </div>
            <input
              type="range"
              min="2"
              max="12"
              value={durationHours}
              onChange={(e) => setDurationHours(parseInt(e.target.value) || 4)}
              className="w-full accent-amber-500 bg-[#0d1c10] h-2 rounded-lg cursor-pointer"
            />
          </div>

          {/* Beer Type selector */}
          <div>
            <label className="block text-xs font-bold text-emerald-200 mb-2">Tipo de Chopp Preferido:</label>
            <select
              value={selectedBeerType}
              onChange={(e) => setSelectedBeerType(e.target.value)}
              className="w-full p-3 rounded-xl bg-[#0d1c10] border border-emerald-900/80 text-amber-300 font-bold text-xs shadow-neu-pressed focus:outline-none focus:border-amber-500"
            >
              <option value="Chopp Pilsen">Chopp Pilsen (Clássico Refrescante)</option>
              <option value="Chopp Escuro">Chopp Escuro (Maltes Torrados)</option>
              <option value="Chopp Puro Malte">Chopp Puro Malte (100% Cevada)</option>
              <option value="Chopp IPA">Chopp IPA (Lupulado e Amargo)</option>
              <option value="Chopp de Vinho">Chopp de Vinho (Doce e Frutado)</option>
            </select>
          </div>

          {/* Results Box */}
          <div className="rounded-2xl bg-[#0d1c10] p-5 border border-amber-500/30 shadow-neu-pressed text-center space-y-2 mt-6">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-400">
              Resultado Recomendado
            </span>
            <div className="text-3xl font-black text-amber-300 flex items-center justify-center gap-2">
              <Beer className="w-8 h-8 text-amber-400 animate-bounce-subtle" />
              <span>~{totalLiters} Litros</span>
            </div>
            <p className="text-xs text-amber-200 font-bold bg-[#142718] py-1.5 px-3 rounded-lg border border-amber-500/20">
              Sugestão: {barrelSuggestion}
            </p>

            {totalLiters >= 50 && (
              <p className="text-[11px] text-emerald-300 flex items-center justify-center gap-1 font-semibold pt-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Qualifica para Isenção de Locação de Chopeira!</span>
              </p>
            )}
          </div>

          {/* Send Quote button */}
          <button
            onClick={handleSendQuote}
            className="w-full py-4 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-slate-950 font-black text-sm tracking-wide shadow-gold-glow hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-5 h-5 fill-slate-950 stroke-slate-950" />
            <span>Enviar Cálculo no WhatsApp</span>
          </button>

        </div>

      </div>
    </div>
  );
}
