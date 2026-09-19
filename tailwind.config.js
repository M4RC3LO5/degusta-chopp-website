/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        chopp: {
          dark: '#0a160d',       // Deep rich dark green background
          base: '#0f1f12',       // Main section dark green
          card: '#142718',       // Neumorphic card surface background
          surface: '#1b321f',    // Raised element surface background
          border: '#234129',     // Subtle border accent
          gold: '#f59e0b',       // Primary beer gold accent
          goldHover: '#d97706',  // Amber hover state
          goldLight: '#fbbf24', // Bright yellow-gold text highlight
          amber: '#b45309',      // Dark amber badge/accent
          cream: '#fef3c7',      // Warm light text
          muted: '#94a3b8',      // Secondary text
        }
      },
      boxShadow: {
        'neu-flat': '6px 6px 14px #060e08, -6px -6px 14px #1c361e',
        'neu-pressed': 'inset 4px 4px 8px #060e08, inset -4px -4px 8px #1c361e',
        'neu-gold': '6px 6px 16px #060e08, -6px -6px 16px #1c361e, 0 0 15px rgba(245, 158, 11, 0.25)',
        'neu-btn': '4px 4px 10px #060e08, -4px -4px 10px #1c361e',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      animation: {
        'pulse-subtle': 'pulse-subtle 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        'pulse-subtle': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.8 },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        }
      }
    },
  },
  plugins: [],
}
