import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Tag, Beer, Award, Settings, History, Users, Clock, MoreHorizontal, LogOut } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { ROLE_LABELS, navLayout } from '../rules';
import RetentionNotice from './RetentionNotice';

const ICONS = { award: Award, tag: Tag, beer: Beer, settings: Settings, history: History, users: Users, clock: Clock };

const tabClass = (isActive) =>
  `h-16 min-h-[44px] w-full flex flex-col items-center justify-center gap-1 text-[11px] font-bold transition-colors ${
    isActive ? 'text-amber-400' : 'text-emerald-200/70 hover:text-amber-300'
  }`;

export default function AdminLayout({ children }) {
  const { profile, signOut } = useAuth();
  const { primary, more } = navLayout(profile.role);
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = more.some(r => location.pathname === `/${r.path}` || location.pathname.startsWith(`/${r.path}/`));

  useEffect(() => { setMoreOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!moreOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setMoreOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  return (
    <div className="min-h-screen bg-[#0a160d] text-slate-100 flex flex-col">
      <header className="sticky top-0 z-40 bg-[#0a160d]/95 backdrop-blur border-b border-[#1b321f]">
        <div className="max-w-3xl lg:max-w-5xl mx-auto h-14 px-4 flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-2.5">
            <img src="/logo/logo-simbolo.webp" alt="" width={32} height={32} className="h-8 w-8 object-contain shrink-0" />
            <div className="min-w-0 leading-tight">
              <p className="text-sm font-bold text-slate-100 truncate">{profile.full_name}</p>
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">{ROLE_LABELS[profile.role]}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="h-11 min-w-[44px] px-3 rounded-xl border border-emerald-900/60 bg-[#142718] text-xs font-bold text-emerald-200 hover:text-amber-300 flex items-center gap-1.5 shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </header>

      {profile.role === 'dono' && <RetentionNotice />}

      <main className="flex-1 w-full max-w-3xl lg:max-w-5xl mx-auto px-4 py-6 pb-28">{children}</main>

      {moreOpen && <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} aria-hidden="true" />}
      <nav aria-label="Navegação do admin" className="fixed bottom-0 inset-x-0 z-40 bg-[#0d1c10]/95 backdrop-blur border-t border-[#1b321f] pb-[env(safe-area-inset-bottom)]">
        {moreOpen && (
          <ul id="admin-more-menu" data-testid="nav-more-menu" className="absolute bottom-full right-2 mb-2 w-52 rounded-2xl bg-[#142718] border border-amber-500/30 shadow-neu-gold overflow-hidden">
            {more.map(({ path, label, icon }) => {
              const Icon = ICONS[icon];
              return (
                <li key={path}>
                  <NavLink to={`/${path}`} className={({ isActive }) => `min-h-[48px] px-4 flex items-center gap-3 text-sm font-bold ${isActive ? 'text-amber-400' : 'text-emerald-100/90 hover:text-amber-300'}`}>
                    <Icon className="w-5 h-5" />
                    <span>{label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        )}
        <ul className="max-w-3xl lg:max-w-5xl mx-auto flex">
          {primary.map(({ path, label, icon }) => {
            const Icon = ICONS[icon];
            return (
              <li key={path} className="flex-1">
                <NavLink to={`/${path}`} className={({ isActive }) => tabClass(isActive)}>
                  <Icon className="w-5 h-5" />
                  <span>{label}</span>
                </NavLink>
              </li>
            );
          })}
          {more.length > 0 && (
            <li className="flex-1">
              <button type="button" aria-haspopup="true" aria-expanded={moreOpen} aria-controls="admin-more-menu" data-testid="nav-more" onClick={() => setMoreOpen(o => !o)} className={tabClass(moreActive || moreOpen)}>
                <MoreHorizontal className="w-5 h-5" />
                <span>Mais</span>
              </button>
            </li>
          )}
        </ul>
      </nav>
    </div>
  );
}
