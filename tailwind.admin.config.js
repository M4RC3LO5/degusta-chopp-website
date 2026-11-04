import base from './tailwind.config.js';

// Mesmo tema da landing, mas só varre os arquivos do admin: gera o CSS próprio do painel.
/** @type {import('tailwindcss').Config} */
export default {
  ...base,
  content: ['./admin.html', './src/admin/**/*.{js,jsx}']
};
