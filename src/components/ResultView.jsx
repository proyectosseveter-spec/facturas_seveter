import React from 'react';
import { downloadCSV } from '../utils/csvGenerator';

const ResultView = ({ resultado, estadisticas, onReset }) => {
  if (!resultado || !resultado.success) return null;

  const handleDownload = (archivo) => {
    downloadCSV(archivo.contenido, archivo.nombreArchivo);
  };

  const handleDownloadAll = () => {
    // Descargar todos los archivos uno por uno (o implementar ZIP)
    resultado.archivosCSV.forEach(archivo => {
      downloadCSV(archivo.contenido, archivo.nombreArchivo);
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

      {/* Estadísticas */}
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

      {/* Archivos generados */}
      <div className="files-section">
        <h3>Archivos Generados</h3>
        <div className="files-grid">
          {resultado.archivosCSV.map((archivo, index) => (
            <div key={index} className="file-card">
              <div className="file-info">
                <i className="fas fa-file-csv"></i>
                <div>
                  <p className="file-name">{archivo.nombreArchivo}</p>
                  <p className="file-details">
                    Proveedor: {archivo.proveedorNombre} | 
                    Líneas: {archivo.cantidadLineas}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => handleDownload(archivo)}
                className="btn-download"
              >
                Descargar
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Notas Crédito */}
      {resultado.notasCredito && resultado.notasCredito.length > 0 && (
        <div className="credit-notes-section">
          <h3>Notas Crédito Encontradas</h3>
          <p className="credit-notes-info">
            Las siguientes notas crédito no fueron incluidas en los archivos generados:
          </p>
          <table className="credit-notes-table">
            <thead>
              <tr>
                <th># Factura</th>
                <th>Placa</th>
                <th>Valor</th>
                <th>Tercero</th>
              </tr>
            </thead>
            <tbody>
              {resultado.notasCredito.map((nota, index) => (
                <tr key={index}>
                  <td>{nota.factura}</td>
                  <td>{nota.placa || '-'}</td>
                  <td>{nota.valor.toLocaleString('es-CO')}</td>
                  <td>{nota.tercero || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Errores */}
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