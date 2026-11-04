import React from 'react';

// Telas entregues nos próximos cards. O Card 3 só entrega o shell, o login e a guarda de perfil.
export default function Placeholder({ title, card }) {
  return (
    <section className="rounded-3xl bg-[#142718] border border-amber-500/20 p-6 text-center space-y-2">
      <h1 className="text-lg font-extrabold text-amber-300">{title}</h1>
      <p className="text-sm text-emerald-100/70">Esta tela chega no Card {card}.</p>
    </section>
  );
}
