import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import ChangePasswordPage from './ChangePasswordPage';
import AdminLayout from '../layout/AdminLayout';

export function FullScreenLoading() {
  return (
    <div className="min-h-screen bg-[#0a160d] flex items-center justify-center" role="status" aria-label="Carregando">
      <span className="w-8 h-8 rounded-full border-4 border-amber-500/30 border-t-amber-400 animate-spin" />
    </div>
  );
}

// Guarda das rotas protegidas:
//  sem sessão -> login | desativado -> signOut (no AuthContext) | 1º acesso -> troca de senha obrigatória.
export default function RequireAuth() {
  const { status, profile, refresh } = useAuth();
  const location = useLocation();

  // Cada navegação revalida sessão e perfil (desativação e mudança de perfil valem no próximo request).
  useEffect(() => {
    if (status === 'ready') refresh();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  if (status === 'loading') return <FullScreenLoading />;
  if (status === 'anon') return <Navigate to="/login" replace />;
  if (profile.must_change_password) return <ChangePasswordPage />;

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}
