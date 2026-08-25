// src/components/CreditNotesReport.jsx
import React, { useState } from 'react';

/**
 * Componente para mostrar el reporte de notas crédito
 * @param {Object} props
 * @param {Array} props.notasCredito - Lista de notas crédito encontradas
 * @param {Function} props.onExport - Función para exportar el reporte
 */
const CreditNotesReport = ({ notasCredito = [], onExport }) => {
  const [showDetails, setShowDetails] = useState(true);

  if (!notasCredito || notasCredito.length === 0) {
    return null;
  }

  // Calcular totales
  const totalValor = notasCredito.reduce((sum, nota) => sum + (nota.valor || 0), 0);
  const totalFacturas = notasCredito.length;
  const proveedoresUnicos = [...new Set(notasCredito.map(n => n.tercero || 'Desconocido'))];

  // Formatear valor en pesos colombianos
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Exportar reporte como CSV
  const handleExportCSV = () => {
    if (!onExport) {
      // Exportar por defecto
      const headers = ['# Factura', 'Placa', 'Valor', 'Tercero', 'Fecha'];
      const rows = notasCredito.map(nota => [
        nota.factura || '',
        nota.placa || '',
        nota.valor || 0,
        nota.tercero || '',
        nota.fecha ? new Date(nota.fecha).toLocaleDateString('es-CO') : ''
      ]);
      
      let csvContent = headers.join(',') + '\n';
      rows.forEach(row => {
        csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
      });
      
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `notas_credito_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    } else {
      onExport(notasCredito);
    }
  };

  return (
    <div className="credit-notes-report">
      <div className="report-header">
        <div className="report-title-section">
          <h3>
            <span className="icon">📋</span>
            Notas Crédito Encontradas
          </h3>
          <span className="badge">{totalFacturas}</span>
        </div>
        <div className="report-actions">
          <button 
            className="btn-toggle"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Ocultar' : 'Mostrar'} Detalles
          </button>
          <button 
            className="btn-export"
            onClick={handleExportCSV}
          >
            📥 Exportar CSV
          </button>
        </div>
      </div>

      {/* Resumen rápido */}
      <div className="report-summary">
        <div className="summary-item">
          <span className="summary-label">Total Notas Crédito</span>
          <span className="summary-value">{totalFacturas}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Valor Total</span>
          <span className="summary-value highlight">{formatCurrency(totalValor)}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Proveedores</span>
          <span className="summary-value">{proveedoresUnicos.join(', ')}</span>
        </div>
      </div>

      {/* Tabla de detalles */}
      {showDetails && (
        <div className="report-table-container">
          <table className="report-table">
            <thead>
              <tr>
                <th># Factura</th>
                <th>Placa</th>
                <th>Valor</th>
                <th>Tercero</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {notasCredito.map((nota, index) => (
                <tr key={index} className={nota.valor > 1000000 ? 'high-value' : ''}>
                  <td>
                    <span className="factura-num">{nota.factura || '-'}</span>
                  </td>
                  <td>
                    <span className="placa-tag">{nota.placa || '-'}</span>
                  </td>
                  <td className="valor-cell">
                    {formatCurrency(nota.valor || 0)}
                  </td>
                  <td>{nota.tercero || '-'}</td>
                  <td>
                    {nota.fecha ? new Date(nota.fecha).toLocaleDateString('es-CO') : '-'}
                  </td>
                  <td>
                    <button 
                      className="btn-detail"
                      onClick={() => {
                        // Mostrar detalles de la nota crédito
                        alert(`Detalles de nota crédito:\n\nFactura: ${nota.factura}\nPlaca: ${nota.placa}\nValor: ${formatCurrency(nota.valor)}\nTercero: ${nota.tercero}\nFecha: ${nota.fecha}`);
                      }}
                      title="Ver detalles"
                    >
                      👁️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="total-row">
                <td colSpan="2"><strong>Totales</strong></td>
                <td><strong>{formatCurrency(totalValor)}</strong></td>
                <td colSpan="3">{totalFacturas} notas crédito</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Mensaje informativo */}
      <div className="report-info">
        <p>
          ⚠️ Las notas crédito no fueron incluidas en los archivos CSV generados.
          Puedes descargar este reporte para su revisión manual.
        </p>
      </div>
    </div>
  );
};

export default CreditNotesReport;