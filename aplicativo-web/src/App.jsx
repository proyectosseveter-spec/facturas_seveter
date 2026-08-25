// src/App.jsx
import React from 'react';
import { useAuth } from './context/AuthContext';
import FileUpload from './components/FileUpload';
import ResultView from './components/ResultView';
import Login from './components/Login';
import { useProcessing } from './hooks/useProcessing';

// ⬇️ IMPORTANTE: Importar estilos de la App (incluye componentes.css)
import './styles/App.css';

function App() {
  const { user, userRole, loading: authLoading } = useAuth();
  const [file, setFile] = useState(null);
  const {
    isProcessing,
    progress,
    resultado,
    error,
    estadisticas,
    processFile,
    reset
  } = useProcessing();

  // ... resto del código
}

export default App;