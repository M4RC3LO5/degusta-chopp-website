import React from 'react';
import { NavLink } from 'react-router-dom';
import { Tag, Beer, Settings, History, Users, LogOut } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { ROLE_LABELS, routesForRole } from '../rules';
import RetentionNotice from './RetentionNotice';

const ICONS = { tag: Tag, beer: Beer, settings: Settings, history: History, users: Users };

export default function AdminLayout({ children }) {
  const { profile, signOut } = useAuth();
  const items = routesForRole(profile.role);

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

      <nav aria-label="Navegação do admin" className="fixed bottom-0 inset-x-0 z-40 bg-[#0d1c10]/95 backdrop-blur border-t border-[#1b321f] pb-[env(safe-area-inset-bottom)]">
        <ul className="max-w-3xl lg:max-w-5xl mx-auto flex">
          {items.map(({ path, label, icon }) => {
            const Icon = ICONS[icon];
            return (
              <li key={path} className="flex-1">
                <NavLink
                  to={`/${path}`}
                  className={({ isActive }) =>
                    `h-16 min-h-[44px] flex flex-col items-center justify-center gap-1 text-[11px] font-bold transition-colors ${
                      isActive ? 'text-amber-400' : 'text-emerald-200/70 hover:text-amber-300'
                    }`
                  }
                >
                  <Icon className="w-5 h-5" />
                  <span>{label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
