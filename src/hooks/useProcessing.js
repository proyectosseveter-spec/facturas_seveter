// src/hooks/useProcessing.js
import { useState, useCallback } from 'react';
import { procesarArchivo, obtenerEstadisticas } from '../services/processingService';
import { getParametrosProveedor } from '../services/firestoreService';

export const useProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [estadisticas, setEstadisticas] = useState(null);

  /**
   * Valida que los parámetros tengan cuentas configuradas
   * Busca en ambas estructuras: cuentas y cuentaCargo
   */
  const validarParametros = (parametros) => {
    const errores = [];
    
    for (const [proveedorId, params] of Object.entries(parametros)) {
      // Verificar si hay cuentas en cualquiera de las dos estructuras
      const tieneCuentas = 
        (params.cuentas && Object.keys(params.cuentas).length > 0) ||
        (params.cuentaCargo && Object.keys(params.cuentaCargo).length > 0);
      
      if (!tieneCuentas) {
        errores.push(`El proveedor ${proveedorId} no tiene cuentas configuradas`);
      }
      
      // Verificar impuestos
      if (!params.impuestos || Object.keys(params.impuestos).length === 0) {
        errores.push(`El proveedor ${proveedorId} no tiene impuestos configurados`);
      }
    }
    
    return errores;
  };

  const processFile = useCallback(async (file) => {
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setResultado(null);
    setEstadisticas(null);

    try {
      setProgress(10);
      
      const proveedoresIds = ['arca_colombia', 'march_inmobiliaria', 'union_colombiana'];
      const parametros = {};
      
      for (const id of proveedoresIds) {
        try {
          const params = await getParametrosProveedor(id);
          parametros[id] = params;
        } catch (error) {
          console.error(`Error obteniendo parámetros para ${id}:`, error);
          parametros[id] = { cuentas: {}, cuentaCargo: {}, impuestos: {} };
        }
      }

      setProgress(40);

      // Validar parámetros con la nueva función
      const erroresParametros = validarParametros(parametros);
      if (erroresParametros.length > 0) {
        throw new Error(`Errores en parámetros: ${erroresParametros.join(', ')}`);
      }

      setProgress(50);

      const resultadoProcesamiento = await procesarArchivo(file, parametros);
      
      setProgress(80);

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
