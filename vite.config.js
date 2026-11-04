import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// /admin e /admin/* servem admin.html (entrada própria do painel, buildada por vite.admin.config.js).
// Em produção (Vercel) isso é feito pelo vercel.json. Não captura /admin-manifest.webmanifest nem
// /admin-icon-*.png: exige "/admin" seguido de "/", "?" ou fim.
function adminHtmlFallback() {
  const rewrite = (req, _res, next) => {
    if (/^\/admin(\/|\?|$)/.test(req.url || '')) req.url = '/admin.html'
    next()
  }
  return {
    name: 'admin-html-fallback',
    configureServer(server) { server.middlewares.use(rewrite) },
    configurePreviewServer(server) { server.middlewares.use(rewrite) }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), adminHtmlFallback()],
})
