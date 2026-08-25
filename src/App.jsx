// Trigger workflow
import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import FileUpload from './components/FileUpload';
import ResultView from './components/ResultView';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import { useProcessing } from './hooks/useProcessing';
import './styles/App.css';

function App() {
  const { user, userRole, loading: authLoading } = useAuth();
  const [showAdmin, setShowAdmin] = useState(false);
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

  const handleFileUpload = (uploadedFile) => {
    setFile(uploadedFile);
    processFile(uploadedFile);
  };

  const handleReset = () => {
    setFile(null);
    reset();
  };

  if (authLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando...</p>
      </div>
    );
  }

  if (user && userRole === 'admin') {
    return <AdminPanel />;
  }

  if (showAdmin) {
    return (
      <div className="app-container">
        <header className="app-header">
          <h1>Procesador de Asientos Contables</h1>
        </header>
        <Login />
        <div className="back-link">
          <button 
            className="btn btn-outline"
            onClick={() => setShowAdmin(false)}
          >
            ← Volver al procesador
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Procesador de Asientos Contables</h1>
        <p className="app-description">
          Sube el archivo "Asiento Contable_Resumen.xlsx" para generar 
          los archivos planos por proveedor
        </p>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAdmin(true)}
        >
          ⚙️ Administración
        </button>
        {user && <span className="user-info">👤 {user.email}</span>}
      </header>

      <main className="app-main">
        {!file && !isProcessing && !resultado && (
          <FileUpload 
            onFileUpload={handleFileUpload}
            isProcessing={isProcessing}
          />
        )}

        {isProcessing && (
          <div className="processing-container">
            <div className="progress-bar-container">
              <div 
                className="progress-bar" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p>Procesando archivo... {progress}%</p>
            <p className="processing-detail">
              Por favor espera mientras se procesan los datos
            </p>
          </div>
        )}

        {error && (
          <div className="error-container">
            <h3>Error en el Procesamiento</h3>
            <p>{error}</p>
            <button onClick={handleReset} className="btn btn-primary">
              Intentar de nuevo
            </button>
          </div>
        )}

        {resultado && (
          <ResultView 
            resultado={resultado}
            estadisticas={estadisticas}
            onReset={handleReset}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>© 2024 - Procesador de Asientos Contables</p>
        <p className="footer-version">v1.0.0</p>
      </footer>
    </div>
  );
}

export default App;

