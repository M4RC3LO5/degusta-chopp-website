import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadCatalog, buildFallbackCatalog } from './catalogRepository';

const CatalogContext = createContext(null);

export function CatalogProvider({ children }) {
  const [state, setState] = useState(() => ({ ...buildFallbackCatalog(), loading: true }));

  useEffect(() => {
    let cancelled = false;
    loadCatalog().then(catalog => {
      if (!cancelled) setState({ ...catalog, loading: false });
    });
    return () => { cancelled = true; };
  }, []);

  return <CatalogContext.Provider value={state}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog deve ser usado dentro de <CatalogProvider>');
  return ctx;
}
