// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';

// ⬇️ IMPORTANTE: Importar estilos globales primero
import './index.css';
// Los estilos de App.css se importan dentro de App.jsx
// Los estilos de componentes se importan en App.css

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);