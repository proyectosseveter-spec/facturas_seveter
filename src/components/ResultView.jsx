// src/components/ResultView.jsx
import React from 'react';
import { downloadXLSX } from '../utils/csvGenerator'; // 👈 cambio
import CreditNotesReport from './CreditNotesReport';

const ResultView = ({ resultado, estadisticas, onReset }) => {
  if (!resultado || !resultado.success) return null;

  const handleDownload = (archivo) => {
    downloadXLSX(archivo.contenido, archivo.nombreArchivo); // 👈 cambio
  };

  const handleDownloadAll = () => {
    resultado.archivos.forEach(archivo => {  // 👈 cambio archivosCSV → archivos
      downloadXLSX(archivo.contenido, archivo.nombreArchivo);
    });
  };

  return (
    <div className="result-container">
      <div className="result-header">
        <h2>Resultados del Procesamiento</h2>
        <div className="result-actions">
          <button onClick={handleDownloadAll} className="btn-download-all">
            Descargar Todos
          </button>
          <button onClick={onReset} className="btn-new">
            Nuevo Procesamiento
          </button>
        </div>
      </div>

      {estadisticas && (
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Total Líneas Procesadas</span>
            <span className="stat-value">{estadisticas.totalLineas}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Archivos Generados</span>
            <span className="stat-value">{estadisticas.archivosGenerados}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Notas Crédito</span>
            <span className="stat-value">{estadisticas.totalNotasCredito}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Errores</span>
            <span className="stat-value">{estadisticas.totalErrores}</span>
          </div>
        </div>
      )}

      <div className="files-section">
        <h3>Archivos Generados</h3>
        <div className="files-grid">
          {resultado.archivos.map((archivo, index) => (  // 👈 cambio archivosCSV → archivos
            <div key={index} className="file-card">
              <div className="file-info">
                <i className="fas fa-file-excel file-icon"></i>  {/* 👈 icono xlsx */}
                <div>
                  <p className="file-name">{archivo.nombreArchivo}</p>
                  <p className="file-details">
                    Proveedor: {archivo.proveedorNombre} |
                    Líneas: {archivo.cantidadLineas}
                  </p>
                </div>
              </div>
              <button onClick={() => handleDownload(archivo)} className="btn-download">
                Descargar
              </button>
            </div>
          ))}
        </div>
      </div>

      {resultado.notasCredito && resultado.notasCredito.length > 0 && (
        <CreditNotesReport notasCredito={resultado.notasCredito} />
      )}

      {resultado.errores && resultado.errores.length > 0 && (
        <div className="errors-section">
          <h3>Errores en el Procesamiento</h3>
          <ul className="errors-list">
            {resultado.errores.map((error, index) => (
              <li key={index}>
                <span className="error-line">Línea {error.linea}:</span>
                {error.mensaje}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ResultView;
