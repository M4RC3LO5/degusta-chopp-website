import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import LoginPage from './auth/LoginPage';
import RequireAuth, { FullScreenLoading } from './auth/RequireAuth';
import Placeholder from './pages/Placeholder';
import UsersPage from './pages/UsersPage';
import PricesPage from './pages/PricesPage';
import CatalogPage from './pages/CatalogPage';
import ConfigPage from './pages/ConfigPage';
import HistoryPage from './pages/HistoryPage';
import PontoPage from './pages/PontoPage';
import PontoMirrorPage from './pages/PontoMirrorPage';
import PrivacyPage from './pages/PrivacyPage';
import { adminConfigured } from './supabase';
import { canAccess, homePathForRole } from './rules';

const PAGES = {
  precos: { title: 'Preços', card: 5, element: <PricesPage /> },
  marcas: { title: 'Marcas', card: 6, element: <CatalogPage key="brand" kind="brand" /> },
  sabores: { title: 'Sabores', card: 6, element: <CatalogPage key="flavor" kind="flavor" /> },
  ponto: { title: 'Ponto', card: 11, element: <PontoPage /> },
  'ponto/espelho': { title: 'Espelho de ponto', card: 11, element: <PontoMirrorPage /> },
  'privacidade-ponto': { title: 'Privacidade do ponto', card: 13, element: <PrivacyPage /> },
  config: { title: 'Configurações', card: 7, element: <ConfigPage /> },
  historico: { title: 'Histórico', card: 7, element: <HistoryPage /> },
  usuarios: { title: 'Usuários', card: 4, element: <UsersPage /> }
};

function Home() {
  const { profile } = useAuth();
  return <Navigate to={`/${homePathForRole(profile.role)}`} replace />;
}

// Rota sem permissão para o perfil -> volta para a home do perfil.
function RoleGate({ path, children }) {
  const { profile } = useAuth();
  if (!canAccess(profile.role, path)) return <Navigate to={`/${homePathForRole(profile.role)}`} replace />;
  return children;
}

function Routing() {
  return (
    <Routes>
      <Route path="login" element={<LoginRoute />} />
      <Route element={<RequireAuth />}>
        <Route index element={<Home />} />
        {/* Card 12: o Catálogo foi separado em Marcas e Sabores; links antigos caem em Marcas */}
        <Route path="catalogo" element={<Navigate to="/marcas" replace />} />
        {Object.entries(PAGES).map(([path, page]) => (
          <Route
            key={path}
            path={path}
            element={<RoleGate path={path}>{page.element || <Placeholder title={page.title} card={page.card} />}</RoleGate>}
          />
        ))}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function LoginRoute() {
  const { status } = useAuth();
  if (status === 'loading') return <FullScreenLoading />;
  return <LoginPage />;
}

export default function AdminApp() {
  if (!adminConfigured) {
    return (
      <div className="min-h-screen bg-[#0a160d] text-slate-100 flex items-center justify-center p-6 text-center">
        <p className="text-sm text-rose-300">Admin indisponível: variáveis do Supabase não configuradas.</p>
      </div>
    );
  }

  return (
    <BrowserRouter basename="/admin">
      <AuthProvider>
        <Routing />
      </AuthProvider>
    </BrowserRouter>
  );
}
