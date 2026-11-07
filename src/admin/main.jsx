import React from 'react';
import ReactDOM from 'react-dom/client';
import AdminApp from './AdminApp.jsx';
import './admin.css';
import { registerServiceWorker } from '../pwa/install';

registerServiceWorker('/admin/sw.js', '/admin/');

// Entrada própria do painel (admin.html). O site público (index.html/main.jsx) não importa nada daqui.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>,
);
