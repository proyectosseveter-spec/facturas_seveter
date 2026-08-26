import { useState, useCallback } from 'react';
import { procesarArchivo, validarParametros, obtenerEstadisticas } from '../services/processingService';
import { getParametrosProveedor } from '../services/firestoreService';

export const useProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [estadisticas, setEstadisticas] = useState(null);

  // Procesar archivo
  const processFile = useCallback(async (file) => {
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setResultado(null);
    setEstadisticas(null);

    try {
      // Simular progreso inicial
      setProgress(10);

      // 1. Obtener parámetros de Firestore
      setProgress(20);
      
      // Obtener parámetros para todos los proveedores
      const proveedoresIds = ['arca_colombia', 'march_inmobiliaria', 'union_colombiana'];
      const parametros = {};
      
      for (const id of proveedoresIds) {
        try {
          const params = await getParametrosProveedor(id);
          parametros[id] = params;
        } catch (error) {
          console.error(`Error obteniendo parámetros para ${id}:`, error);
          parametros[id] = { cuentaCargo: {}, impuestos: {} };
        }
      }

      setProgress(40);

      // 2. Validar parámetros
      const erroresParametros = validarParametros(parametros);
      if (erroresParametros.length > 0) {
        throw new Error(`Errores en parámetros: ${erroresParametros.join(', ')}`);
      }

      setProgress(50);

      // 3. Procesar archivo
      const resultadoProcesamiento = await procesarArchivo(file, parametros);
      
      setProgress(80);

      // 4. Calcular estadísticas
      const stats = obtenerEstadisticas(resultadoProcesamiento);
      
      setProgress(90);

      if (resultadoProcesamiento.success) {
        setResultado(resultadoProcesamiento);
        setEstadisticas(stats);
      } else {
        setError(resultadoProcesamiento.error || 'Error al procesar el archivo');
      }

      setProgress(100);

    } catch (error) {
      console.error('Error en procesamiento:', error);
      setError(error.message || 'Error al procesar el archivo');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Descargar un archivo CSV específico
  const downloadFile = useCallback((index) => {
    if (!resultado || !resultado.archivosCSV || index >= resultado.archivosCSV.length) {
      console.error('Archivo no disponible');
      return null;
    }

    const archivo = resultado.archivosCSV[index];
    return {
      nombre: archivo.nombreArchivo,
      contenido: archivo.contenido,
      proveedor: archivo.proveedorNombre
    };
  }, [resultado]);

  // Descargar todos los archivos (uno por uno o en ZIP)
  const downloadAll = useCallback(() => {
    if (!resultado || !resultado.archivosCSV || resultado.archivosCSV.length === 0) {
      return null;
    }

    return resultado.archivosCSV.map(archivo => ({
      nombre: archivo.nombreArchivo,
      contenido: archivo.contenido,
      proveedor: archivo.proveedorNombre
    }));
  }, [resultado]);

  // Resetear estado
  const reset = useCallback(() => {
    setIsProcessing(false);
    setProgress(0);
    setResultado(null);
    setError(null);
    setEstadisticas(null);
  }, []);

  return {
    isProcessing,
    progress,
    resultado,
    error,
    estadisticas,
    processFile,
    downloadFile,
    downloadAll,
    reset
  };
};
