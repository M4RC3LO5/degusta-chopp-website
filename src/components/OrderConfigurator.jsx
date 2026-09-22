import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Check, Plus, Minus, Trash2, Calculator, MessageCircle, Sparkles, ShoppingCart, X } from 'lucide-react';
import {
  BRANDS,
  TYPES,
  SIZES,
  PRICES,
  getPrice,
  formatPrice,
  PROMO_MIN_LITERS,
  MAX_QTY_PER_ITEM
} from '../data/products';
import { buildWhatsAppUrl } from '../utils/whatsapp';

export default function OrderConfigurator({ onOpenCalculator }) {
  // Budget items list (hydrated from localStorage)
  const [items, setItems] = useState(() => {
    try {
      const stored = localStorage.getItem('degusta-orcamento');
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(item => {
        if (!item || !item.id || typeof item.qty !== 'number' || item.qty < 1 || item.qty > MAX_QTY_PER_ITEM) {
          return false;
        }
        const unitPrice = getPrice(item.typeId, item.brandId, item.size);
        return unitPrice !== null && unitPrice !== undefined;
      });
    } catch (err) {
      return [];
    }
  });

  // Active draft state for new item selection
  const [draft, setDraft] = useState({
    typeId: null,
    brandId: null,
    size: null,
    qty: 1
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isDesktop && isMobileCartOpen) {
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
  }, [isMobileCartOpen, isDesktop]);

  const budgetListRef = useRef(null);
  const listContainerRef = useRef(null);
  const typeRefs = useRef({});
  const brandRefs = useRef({});
  const sizeRefs = useRef({});

  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);

  const checkScroll = () => {
    if (listContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = listContainerRef.current;
      setIsScrolledToBottom(scrollHeight - scrollTop - clientHeight < 2);
    }
  };

  useEffect(() => {
    checkScroll();
  }, [items]);

  // Persist items to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('degusta-orcamento', JSON.stringify(items));
    } catch (err) {
      // ignore storage errors
    }
  }, [items]);

  // Handler for selecting type
  const handleSelectType = (typeId) => {
    setDraft(prev => {
      let nextBrandId = prev.brandId;
      let nextSize = prev.size;

      // If brand was selected, check if combination is still valid
      if (nextBrandId && getPrice(typeId, nextBrandId, 30) === null) {
        nextBrandId = null;
        nextSize = null;
      }
      return {
        ...prev,
        typeId,
        brandId: nextBrandId,
        size: nextSize
      };
    });
    if (window.innerWidth < 1024) setCurrentStep(2);
  };

  // Handler for selecting brand
  const handleSelectBrand = (brandId) => {
    setDraft(prev => {
      let nextSize = prev.size;
      if (prev.typeId && nextSize) {
        if (getPrice(prev.typeId, brandId, nextSize) === null) {
          nextSize = null;
        }
      }
      return {
        ...prev,
        brandId,
        size: nextSize
      };
    });
    if (window.innerWidth < 1024) setCurrentStep(3);
  };

  // Handler for selecting size
  const handleSelectSize = (size) => {
    setDraft(prev => ({ ...prev, size }));
  };

  // Add draft to items
  const handleAddItem = () => {
    if (!draft.typeId || !draft.brandId || !draft.size) return;

    setItems(prevItems => {
      const existingIndex = prevItems.findIndex(
        it => it.typeId === draft.typeId && it.brandId === draft.brandId && it.size === draft.size
      );

      if (existingIndex >= 0) {
        const updated = [...prevItems];
        const currentQty = updated[existingIndex].qty;
        const newQty = Math.min(currentQty + draft.qty, MAX_QTY_PER_ITEM);
        updated[existingIndex] = { ...updated[existingIndex], qty: newQty };
        return updated;
      } else {
        return [
          ...prevItems,
          {
            id: crypto.randomUUID(),
            typeId: draft.typeId,
            brandId: draft.brandId,
            size: draft.size,
            qty: draft.qty
          }
        ];
      }
    });

    // Reset draft and scroll to budget list
    setDraft({ typeId: null, brandId: null, size: null, qty: 1 });
    setCurrentStep(1);
    setTimeout(() => {
      budgetListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  };

  // Stepper handlers for draft
  const handleDraftQtyChange = (delta) => {
    setDraft(prev => ({
      ...prev,
      qty: Math.max(1, Math.min(prev.qty + delta, MAX_QTY_PER_ITEM))
    }));
  };

  // Stepper handlers for list items
  const handleItemQtyChange = (itemId, delta) => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        qty: Math.max(1, Math.min(item.qty + delta, MAX_QTY_PER_ITEM))
      };
    }));
  };

  // Remove item
  const handleRemoveItem = (itemId) => {
    setItems(prev => prev.filter(it => it.id !== itemId));
  };

  // Clear all items
  const handleClearBudget = () => {
    if (window.confirm('Tem certeza que deseja limpar todo o orçamento?')) {
      setItems([]);
    }
  };

  // Calculations for totals
  const totalLiters = items.reduce((acc, it) => acc + (it.size * it.qty), 0);
  const totalPrice = items.reduce((acc, it) => {
    const price = getPrice(it.typeId, it.brandId, it.size) || 0;
    return acc + (price * it.qty);
  }, 0);

  // Helper for keyboard navigation in radio groups
  const handleGroupKeyDown = (e, list, currentSelectedId, onSelect, refMap) => {
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      return;
    }

    const availableOptions = list.filter(item => !item.disabled);
    if (availableOptions.length === 0) return;

    const currentIndex = availableOptions.findIndex(item => item.id === currentSelectedId);

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (currentSelectedId) onSelect(currentSelectedId);
      return;
    }

    e.preventDefault();
    let nextIndex = 0;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % availableOptions.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIndex = currentIndex <= 0 ? availableOptions.length - 1 : currentIndex - 1;
    }

    const nextOption = availableOptions[nextIndex];
    if (nextOption) {
      onSelect(nextOption.id);
      setTimeout(() => {
        refMap.current[nextOption.id]?.focus();
      }, 0);
    }
  };

  // Calculate minimum 30L price for selected type
  const minPrice30ForType = draft.typeId
    ? Math.min(...BRANDS.map(b => getPrice(draft.typeId, b.id, 30)).filter(p => p !== null))
    : null;

  return (
    <div className="w-full max-w-xl mx-auto p-6 sm:p-8 rounded-3xl bg-[#142718] border border-amber-500/30 shadow-neu-gold text-slate-100">
      
      {/* Configurator Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-emerald-900/60">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse"></span>
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-amber-300">
            Monte seu Orçamento
          </h2>
        </div>
        <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
          Personalizado
        </span>
      </div>

      <div className="space-y-6">

        {/* Mobile Wizard Header */}
        <div className="lg:hidden flex flex-col gap-2 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Passo {currentStep} de 3</span>
            {currentStep > 1 && (
              <button type="button" onClick={() => setCurrentStep(prev => prev - 1)} className="text-xs font-bold text-emerald-300 underline">
                Voltar
              </button>
            )}
          </div>
          <div className="w-full h-1.5 rounded-full bg-emerald-950 overflow-hidden flex">
            <div className="h-full bg-amber-400 transition-all duration-300" style={{ width: `${(currentStep / 3) * 100}%` }}></div>
          </div>
        </div>

        {/* STEP 1 — TIPO DE CHOPP */}
        <fieldset role="radiogroup" aria-label="Selecione o tipo de chopp" className={`space-y-3 ${currentStep !== 1 ? 'hidden lg:block' : 'block'}`}>
          <legend className="flex items-center gap-2 text-xs font-bold uppercase text-amber-400 tracking-wider mb-2">
            <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[11px] font-black">1</span>
            <span>Escolha o Tipo de Chopp</span>
          </legend>

          <div 
            className="grid grid-cols-5 gap-2"
            onKeyDown={(e) => handleGroupKeyDown(e, TYPES, draft.typeId, handleSelectType, typeRefs)}
          >
            {TYPES.map((type, idx) => {
              const isSelected = draft.typeId === type.id;
              const hasAnySelection = draft.typeId !== null;

              return (
                <button
                  key={type.id}
                  ref={el => typeRefs.current[type.id] = el}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={isSelected ? 0 : (!hasAnySelection && idx === 0 ? 0 : -1)}
                  onClick={() => handleSelectType(type.id)}
                  className={`relative p-2 rounded-2xl bg-[#0d1c10] border transition-all duration-200 flex flex-col items-center justify-between min-h-[96px] group focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                    isSelected
                      ? 'border-amber-400 shadow-gold-glow scale-105 z-10'
                      : (hasAnySelection ? 'border-emerald-900/40 opacity-60 hover:opacity-100 hover:scale-105 hover:border-amber-500/40' : 'border-emerald-900/40 hover:scale-105 hover:border-amber-500/40')
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                  <div className="w-10 h-10 flex items-center justify-center mt-1">
                    <img
                      src={type.image}
                      alt={`Copo de ${type.name}`}
                      width={40}
                      height={40}
                      loading="lazy"
                      className="object-contain max-h-10 group-hover:scale-110 transition-transform"
                    />
                  </div>
                  <span className="text-[11px] font-bold text-slate-200 text-center leading-tight mt-1 line-clamp-2">
                    {type.name.replace('Chopp ', '')}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* STEP 2 — MARCA */}
        <fieldset 
          role="radiogroup" 
          aria-label="Selecione a marca do chopp" 
          className={`space-y-3 lg:transition-opacity lg:duration-300 ${!draft.typeId ? 'lg:opacity-40 lg:pointer-events-none' : 'lg:opacity-100'} ${currentStep !== 2 ? 'hidden lg:block' : 'block'}`}
        >
          <legend className="flex items-center gap-2 text-xs font-bold uppercase text-amber-400 tracking-wider mb-2">
            <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[11px] font-black">2</span>
            <span>Escolha a Marca</span>
            {draft.typeId && minPrice30ForType && (
              <span className="text-[11px] text-emerald-300/70 font-normal tracking-normal ml-auto">
                (a partir de {formatPrice(minPrice30ForType)})
              </span>
            )}
          </legend>

          <div 
            className="grid grid-cols-3 gap-2.5"
            onKeyDown={(e) => {
              const brandOptions = BRANDS.map(b => {
                const isAvail = draft.typeId ? getPrice(draft.typeId, b.id, 30) !== null : false;
                return { ...b, disabled: !isAvail };
              });
              handleGroupKeyDown(e, brandOptions, draft.brandId, handleSelectBrand, brandRefs);
            }}
          >
            {BRANDS.map((brand, idx) => {
              const isSelected = draft.brandId === brand.id;
              const hasAnySelection = draft.brandId !== null;
              const isAvailable = draft.typeId ? getPrice(draft.typeId, brand.id, 30) !== null : true;

              return (
                <button
                  key={brand.id}
                  ref={el => brandRefs.current[brand.id] = el}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-disabled={!isAvailable}
                  disabled={!isAvailable}
                  title={!isAvailable ? 'Indisponível para este tipo' : undefined}
                  tabIndex={isSelected ? 0 : (!hasAnySelection && idx === 0 ? 0 : -1)}
                  onClick={() => isAvailable && handleSelectBrand(brand.id)}
                  className={`relative p-3 rounded-2xl bg-[#0d1c10] border transition-all duration-200 flex flex-col items-center justify-center gap-2 group focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                    !isAvailable
                      ? 'opacity-40 cursor-not-allowed border-emerald-950'
                      : (isSelected
                          ? 'border-amber-400 shadow-gold-glow scale-105 z-10'
                          : (hasAnySelection ? 'border-emerald-900/40 opacity-60 hover:opacity-100 hover:scale-105 hover:border-amber-500/40' : 'border-emerald-900/40 hover:scale-105 hover:border-amber-500/40'))
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                  <img
                    src={brand.logo}
                    alt={`Logo ${brand.name}`}
                    width={36}
                    height={36}
                    loading="lazy"
                    className="w-9 h-9 object-contain group-hover:scale-110 transition-transform"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <span className="text-xs font-bold text-slate-200">
                    {brand.name}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* STEP 3 — TAMANHO E QUANTIDADE */}
        <fieldset 
          role="radiogroup" 
          aria-label="Selecione o tamanho do barril" 
          className={`space-y-3 lg:transition-opacity lg:duration-300 ${!draft.brandId ? 'lg:opacity-40 lg:pointer-events-none' : 'lg:opacity-100'} ${currentStep !== 3 ? 'hidden lg:block' : 'block'}`}
        >
          <legend className="flex items-center gap-2 text-xs font-bold uppercase text-amber-400 tracking-wider mb-2">
            <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[11px] font-black">3</span>
            <span>Tamanho e Quantidade</span>
          </legend>

          <div 
            className="grid grid-cols-2 gap-3"
            onKeyDown={(e) => {
              const sizeOptions = SIZES.map(s => ({ id: s.liters, disabled: false }));
              handleGroupKeyDown(e, sizeOptions, draft.size, handleSelectSize, sizeRefs);
            }}
          >
            {SIZES.map((sizeObj, idx) => {
              const isSelected = draft.size === sizeObj.liters;
              const hasAnySelection = draft.size !== null;
              const price = (draft.typeId && draft.brandId)
                ? getPrice(draft.typeId, draft.brandId, sizeObj.liters)
                : null;

              return (
                <button
                  key={sizeObj.liters}
                  ref={el => sizeRefs.current[sizeObj.liters] = el}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={isSelected ? 0 : (!hasAnySelection && idx === 0 ? 0 : -1)}
                  onClick={() => handleSelectSize(sizeObj.liters)}
                  className={`relative p-3 rounded-2xl bg-[#0d1c10] border transition-all duration-200 flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                    isSelected
                      ? 'border-amber-400 shadow-gold-glow scale-105 z-10'
                      : (hasAnySelection ? 'border-emerald-900/40 opacity-60 hover:opacity-100 hover:scale-105 hover:border-amber-500/40' : 'border-emerald-900/40 hover:scale-105 hover:border-amber-500/40')
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                  <img
                    src={sizeObj.image}
                    alt={`Barril de ${sizeObj.liters}L`}
                    width={40}
                    height={40}
                    loading="lazy"
                    className="w-10 h-10 object-contain group-hover:scale-110 transition-transform shrink-0"
                  />
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-extrabold text-slate-100">{sizeObj.liters} Litros</span>
                    <span className="text-xs font-bold text-amber-400">
                      {price !== null ? formatPrice(price) : '---'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Stepper + Add Button Container */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            {/* Stepper */}
            <div className="flex items-center justify-between w-full sm:w-auto p-1.5 rounded-xl bg-[#0d1c10] border border-emerald-900/50">
              <button
                type="button"
                onClick={() => handleDraftQtyChange(-1)}
                disabled={draft.qty <= 1}
                className="w-8 h-8 rounded-lg bg-[#142718] text-amber-400 hover:bg-emerald-900/50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                aria-label="Diminuir quantidade"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-4 text-sm font-extrabold text-slate-100 min-w-[2.5rem] text-center">
                {draft.qty}
              </span>
              <button
                type="button"
                onClick={() => handleDraftQtyChange(1)}
                disabled={draft.qty >= MAX_QTY_PER_ITEM}
                className="w-8 h-8 rounded-lg bg-[#142718] text-amber-400 hover:bg-emerald-900/50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                aria-label="Aumentar quantidade"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Add to Budget Button */}
            <button
              type="button"
              onClick={handleAddItem}
              disabled={!draft.typeId || !draft.brandId || !draft.size}
              className="w-full sm:flex-1 h-11 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-gold-glow hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:scale-100 disabled:shadow-none disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Adicionar ao Orçamento</span>
            </button>
          </div>

          {/* Calculator Link */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={onOpenCalculator}
              className="text-xs text-amber-300/80 hover:text-amber-200 underline decoration-amber-500/40 transition-colors inline-flex items-center gap-1.5 font-medium"
            >
              <Calculator className="w-3.5 h-3.5 text-amber-400" />
              <span>Não sabe quanto pedir? Calcule aqui</span>
            </button>
          </div>
        </fieldset>

        {/* BUDGET LIST SECTION */}
        {items.length > 0 && (
          <>
            {/* Mobile Floating Action Button (Cart) */}
            {!isDesktop && createPortal(
              <button
                type="button"
                onClick={() => setIsMobileCartOpen(true)}
                className="global-fab fixed bottom-[210px] right-6 z-[60] p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-gold-glow flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
                aria-label="Abrir carrinho de orçamento"
              >
                <span className="absolute -top-2 -right-2 w-6 h-6 bg-[#142718] text-amber-400 rounded-full text-[11px] flex items-center justify-center font-black border border-amber-500/40 shadow-neu-flat">
                  {items.length}
                </span>
                <ShoppingCart className="w-6 h-6 fill-slate-950 stroke-slate-950" />
              </button>,
              document.body
            )}

            {(isDesktop || isMobileCartOpen) && (() => {
              const content = (
                <div 
                  ref={budgetListRef}
                  aria-live="polite"
                  className={`animate-fadeIn space-y-4 ${
                    isDesktop 
                      ? 'mt-6 pt-6 border-t border-emerald-900/60' 
                      : 'relative z-10 w-full bg-[#142718] p-5 sm:p-6 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] m-0 max-h-[90vh] overflow-y-auto pointer-events-auto'
                  }`}
                >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold uppercase text-amber-300 tracking-wider flex items-center gap-2">
                  <span>Seu Orçamento</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs">
                    {items.length} {items.length === 1 ? 'item' : 'itens'}
                  </span>
                </h3>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={handleClearBudget}
                    className="text-xs text-rose-400/80 hover:text-rose-300 transition-colors underline font-medium"
                  >
                    <span className="lg:hidden">Limpar</span>
                    <span className="hidden lg:inline">Limpar orçamento</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsMobileCartOpen(false)} 
                    className="lg:hidden p-1.5 text-slate-400 hover:text-white transition-colors bg-[#0d1c10] rounded-full border border-emerald-900/50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

            {/* Item List Rows */}
            <div className="relative">
              <div 
                ref={listContainerRef}
                onScroll={checkScroll}
                className="space-y-2.5 max-h-[320px] overflow-y-scroll overflow-x-hidden pr-2 [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:bg-emerald-950/40 [&::-webkit-scrollbar-thumb]:bg-amber-600/40 [&::-webkit-scrollbar-thumb:hover]:bg-amber-500/60 [&::-webkit-scrollbar-thumb]:rounded-full"
              >
                {items.map(item => {
                const type = TYPES.find(t => t.id === item.typeId);
                const brand = BRANDS.find(b => b.id === item.brandId);
                const unitPrice = getPrice(item.typeId, item.brandId, item.size) || 0;
                const lineSubtotal = unitPrice * item.qty;

                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-[#0d1c10] border border-emerald-900/50 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {brand && (
                        <img
                          src={brand.logo}
                          alt={`Logo ${brand.name}`}
                          width={32}
                          height={32}
                          loading="lazy"
                          className="w-8 h-8 object-contain shrink-0"
                        />
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-slate-100 leading-tight">
                          {type?.name.replace(/^Chopp /i, '')} — {brand?.name}
                        </span>
                        <span className="text-[11px] text-emerald-300/70">
                          {item.qty}x {item.size}L
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-extrabold text-amber-400 text-sm">
                        {formatPrice(lineSubtotal)}
                      </span>

                      {/* Item Stepper */}
                      <div className="flex flex-col-reverse lg:flex-row items-center gap-1 bg-[#142718] p-1 rounded-lg border border-emerald-900/60">
                        <button
                          type="button"
                          onClick={() => handleItemQtyChange(item.id, -1)}
                          disabled={item.qty <= 1}
                          className="w-8 h-8 lg:w-5 lg:h-5 text-amber-400 hover:bg-emerald-900/50 disabled:opacity-30 rounded flex items-center justify-center shrink-0 transition-colors"
                          aria-label="Diminuir quantidade do item"
                        >
                          <Minus className="w-4 h-4 lg:w-3 lg:h-3" />
                        </button>
                        <span className="py-1 lg:py-0 px-0 lg:px-1.5 font-extrabold text-slate-200 text-sm lg:text-xs">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleItemQtyChange(item.id, 1)}
                          disabled={item.qty >= MAX_QTY_PER_ITEM}
                          className="w-8 h-8 lg:w-5 lg:h-5 text-amber-400 hover:bg-emerald-900/50 disabled:opacity-30 rounded flex items-center justify-center shrink-0 transition-colors"
                          aria-label="Aumentar quantidade do item"
                        >
                          <Plus className="w-4 h-4 lg:w-3 lg:h-3" />
                        </button>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        aria-label={`Remover ${type?.name} ${brand?.name}`}
                        className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
              </div>

              {/* Bottom Fade indicator */}
              {!isScrolledToBottom && (
                <div className="absolute bottom-0 left-0 right-3.5 h-8 bg-gradient-to-t from-[#142718] to-transparent pointer-events-none" />
              )}
            </div>

            {/* Card Footer Totals & Promo Progress */}
            <div className="pt-4 border-t border-emerald-900/60 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-emerald-200/80">Total de Litros:</span>
                <span className="font-extrabold text-amber-300">{totalLiters}L</span>
              </div>
              <div className="flex items-center justify-between text-base">
                <span className="font-black text-slate-100">Valor Total:</span>
                <span className="text-xl font-black text-amber-400">{formatPrice(totalPrice)}</span>
              </div>

              {/* Promo Banner / Progress Bar */}
              {totalLiters < PROMO_MIN_LITERS ? (
                <div className="p-3 rounded-xl bg-[#0d1c10] border border-amber-500/20 space-y-1.5">
                  <div className="flex justify-between text-xs text-amber-300 font-semibold">
                    <span>Faltam {PROMO_MIN_LITERS - totalLiters}L para a chopeira sair de graça</span>
                    <span>{totalLiters}/{PROMO_MIN_LITERS}L</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-emerald-950 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300"
                      style={{ width: `${Math.min(100, (totalLiters / PROMO_MIN_LITERS) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-extrabold flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>🍺 Chopeira inclusa — cortesia</span>
                </div>
              )}

              {/* WhatsApp Checkout Button */}
              <button
                type="button"
                onClick={() => window.open(buildWhatsAppUrl(items), '_blank')}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 text-slate-950 font-black text-[13px] sm:text-sm uppercase tracking-normal sm:tracking-wider shadow-gold-glow hover:scale-[1.02] active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 sm:gap-2.5"
              >
                <MessageCircle className="w-5 h-5 fill-slate-950 stroke-slate-950" />
                <span>Enviar Orçamento pelo WhatsApp</span>
              </button>
            </div>
                </div>
              );
              return isDesktop ? content : createPortal(
                <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none sm:p-4">
                  <div 
                    className="absolute inset-0 bg-[#0a160d]/80 backdrop-blur-sm pointer-events-auto animate-fadeIn"
                    onClick={() => setIsMobileCartOpen(false)}
                  />
                  {content}
                </div>, 
                document.body
              );
            })()}
          </>
        )}

      </div>
    </div>
  );
}
