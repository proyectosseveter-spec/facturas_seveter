/**
 * Genera contenido CSV a partir de un array de objetos
 * @param {Array} data - Array de objetos con los datos
 * @param {Array} headers - Array con los nombres de las columnas
 * @returns {string} Contenido CSV
 */
export const generateCSV = (data, headers) => {
  if (!data || data.length === 0) return '';
  if (!headers || headers.length === 0) return '';

  // Escapar valor para CSV
  const escapeValue = (value) => {
    if (value === null || value === undefined) return '';
    
    const stringValue = String(value);
    
    // Si contiene comas, comillas o saltos de línea, envolver en comillas
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    
    return stringValue;
  };

  // Crear encabezados
  const headerRow = headers.map(header => escapeValue(header)).join(',');
  
  // Crear filas de datos
  const rows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      return escapeValue(value);
    }).join(',');
  });

  // Unir encabezados y filas
  return [headerRow, ...rows].join('\n');
};

/**
 * Descarga un archivo CSV
 * @param {string} content - Contenido del CSV
 * @param {string} filename - Nombre del archivo
 */
export const downloadCSV = (content, filename) => {
  if (!content || !filename) return;

  // Crear Blob
  const blob = new Blob(['\uFEFF' + content], { 
    type: 'text/csv;charset=utf-8;' 
  });
  
  // Crear enlace de descarga
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Liberar memoria
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

/**
 * Descarga múltiples archivos CSV comprimidos en un ZIP
 * (Requiere librería adicional para ZIP)
 */
export const downloadMultipleCSV = async (archivos, zipName = 'archivos.zip') => {
  // Esta función requiere la librería 'jszip'
  // Implementación opcional según necesidad
  console.warn('Descarga múltiple requiere la librería jszip');
};

/**
 * Convierte un objeto a formato CSV con encabezados personalizados
 */
export const objectToCSV = (obj, headers) => {
  if (!obj || typeof obj !== 'object') return '';
  
  const data = Array.isArray(obj) ? obj : [obj];
  return generateCSV(data, headers);
};

/**
 * Valida que el contenido CSV tenga el formato correcto
 */
export const validateCSV = (csvContent, expectedHeaders) => {
  if (!csvContent || typeof csvContent !== 'string') {
    return { valid: false, error: 'Contenido CSV inválido' };
  }
  
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length === 0) {
    return { valid: false, error: 'Archivo CSV vacío' };
  }
  
  const headers = lines[0].split(',').map(h => h.trim());
  
  if (expectedHeaders) {
    const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      return { 
        valid: false, 
        error: `Faltan encabezados: ${missingHeaders.join(', ')}` 
      };
    }
  }
  
  return { valid: true, headers, totalLines: lines.length - 1 };
};