import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Build SEPARADO do painel (npm run build roda este depois do build da landing).
// Motivo: com duas entradas no mesmo build o Rollup extrairia React/lucide para um chunk compartilhado
// e a landing deixaria de ser byte a byte igual. Aqui o admin leva a própria cópia: só quem abre /admin baixa.
export default defineConfig({
  plugins: [react()],
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: false, // preserva o build da landing
    rollupOptions: {
      input: fileURLToPath(new URL('./admin.html', import.meta.url))
    }
  }
})
