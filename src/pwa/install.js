import { useSyncExternalStore } from 'react';

// Instalação do app (Card 14). Módulo compartilhado pelas duas entradas (site e admin); cada build leva a sua cópia.
// Importe-o cedo (main.jsx): o `beforeinstallprompt` pode disparar antes de o React montar.

const DISMISS_KEY = 'degusta-install-dismissed-at';
export const DISMISS_DAYS = 30;

let deferred = null;          // evento beforeinstallprompt guardado
let installed = false;
let listeners = new Set();
let snapshot = null;

const storage = {
  get(k) { try { return window.localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { window.localStorage.setItem(k, v); } catch { /* sem storage: só não lembra */ } }
};

export function isIOS() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
}

export function isDismissed(now = Date.now()) {
  const at = Number(storage.get(DISMISS_KEY));
  return Number.isFinite(at) && at > 0 && now - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

function compute() {
  const hidden = installed || isStandalone() || isDismissed();
  const ios = isIOS();
  const mode = hidden ? null : deferred ? 'prompt' : ios ? 'ios' : null;
  return { mode }; // 'prompt' (1 toque) | 'ios' (guia) | null (não mostrar)
}

function emit() {
  snapshot = compute();
  listeners.forEach((l) => l());
}

if (typeof window !== 'undefined') {
  snapshot = compute();
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; emit(); });
  window.addEventListener('appinstalled', () => { installed = true; deferred = null; emit(); });
  if (window.matchMedia) {
    const mq = window.matchMedia('(display-mode: standalone)');
    mq.addEventListener?.('change', emit);
  }
}

function subscribe(l) { listeners.add(l); return () => listeners.delete(l); }
const getSnapshot = () => snapshot;
const getServerSnapshot = () => ({ mode: null });

export function dismissInstall() {
  storage.set(DISMISS_KEY, String(Date.now()));
  emit();
}

// Dispara o prompt nativo (Android/desktop). Se o usuário recusar, conta como "Agora não".
export async function promptInstall() {
  if (!deferred) return;
  const ev = deferred;
  deferred = null;
  try {
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    if (outcome === 'dismissed') storage.set(DISMISS_KEY, String(Date.now()));
  } catch { /* prompt só pode ser usado uma vez */ }
  emit();
}

export function useInstall() {
  const { mode } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { mode, promptInstall, dismissInstall };
}

// Service worker mínimo (network-only, sem cache) só para o navegador considerar o app instalável.
export function registerServiceWorker(url, scope) {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (!import.meta.env.PROD) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(url, { scope }).catch(() => { /* instalação segue sem SW */ });
  });
}
