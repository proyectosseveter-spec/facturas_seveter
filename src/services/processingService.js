// src/services/processingService.js
import XLSX from 'xlsx';
import { generateCSV } from '../utils/csvGenerator';

// Configuración de proveedores
const PROVEEDORES_CONFIG = {
  '860502253': { 
    id: 'union_colombiana',
    nombre: 'UNION COLOMBIANA DE BUSES S.A.',
    formatoPlaca: (placa) => `${placa} Transporte Especial`,
    precioLista: 'Precios de Compra Ucoltur',
    actividad: 'TRANSPORTE ESPECIAL',
    prefijoProyecto: '',
    sufijoProyecto: ' Transporte Especial',
    nombreCliente: 'UCOLTUR S.A.',
    carpeta: 'union_colombiana'
  },
  '901007844': { 
    id: 'arca_colombia',
    nombre: 'ARCA COLOMBIA S.A.S.',
    formatoPlaca: (placa) => `Arca_${placa}`,
    precioLista: 'Precios de Compra ARCA',
    actividad: 'FLOTA PROPIA',
    prefijoProyecto: 'Arca_',
    sufijoProyecto: '',
    nombreCliente: 'ARCA COLOMBIA S.A.S.',
    carpeta: 'arca_colombia'
  },
  '900469624': { 
    id: 'march_inmobiliaria',
    nombre: 'MARCH INMOBILIARIA S.A.S.',
    formatoPlaca: (placa) => `mi_${placa}`,
    precioLista: 'Precios de Compra MInmobiliaria',
    actividad: 'FLOTA PROPIA',
    prefijoProyecto: 'mi_',
    sufijoProyecto: '',
    nombreCliente: 'MARCH INMOBILIARIA S.A.S.',
    carpeta: 'march_inmobiliaria'
  }
};

// Constantes para valores fijos
const VALORES_FIJOS = {
  organizacion: 'SEVETER S.A.',
  tipoDocumento: 'Factura Proveedor',
  socioNegocio: 'SERVICIOS PARA VEHICULOS DE TRANSPORTE S.A.',
  ubicacionSocio: '1015056',
  terminoPago: '1000001',
  descripcionBase: 'REPUESTOS - PARTES - SERVICIOS DE MANTENIMIENTO - {mesAnio} - PLACA: {placa}'
};

// Encabezados del archivo CSV
const CSV_HEADERS = [
  'AD_Org_ID[Name]',
  'C_DocTypeTarget_ID[Name]',
  'M_PriceList_ID[Name]',
  'C_BPartner_ID[Name]',
  'C_BPartner_Location_ID',
  'DocumentNo',
  'C_PaymentTerm_ID[Value]',
  'C_Activity_ID[Name]',
  'DateInvoiced',
  'C_Project_ID[Value]',
  'Description',
  'DateAcct',
  'C_InvoiceLine>C_Invoice_ID[DocumentNo]/K',
  'C_InvoiceLine>Line/K',
  'C_InvoiceLine>Description',
  'C_InvoiceLine>M_Product_ID[Value]',
  'C_InvoiceLine>C_Charge_ID[Name]',
  'C_InvoiceLine>QtyEntered',
  'C_InvoiceLine>C_Tax_ID[Name]',
  'C_InvoiceLine>TaxAmt',
  'C_InvoiceLine>PriceEntered'
];

/**
 * Procesa el archivo Excel y genera los CSV por proveedor
 */
export const procesarArchivo = async (file, parametrosFirestore) => {
  try {
    const data = await readExcelFile(file);
    const lineasFiltradas = filtrarLineasPorCuenta(data);
    const { lineasPorProveedor, notasCredito, errores } = await procesarLineas(
      lineasFiltradas, 
      parametrosFirestore
    );
    const archivosCSV = generarArchivosCSV(lineasPorProveedor);
    
    return {
      success: true,
      archivosCSV,
      notasCredito,
      errores,
      resumen: {
        totalLineasProcesadas: lineasFiltradas.length,
        lineasPorProveedor: Object.keys(lineasPorProveedor).reduce((acc, key) => {
          acc[key] = lineasPorProveedor[key].lineas.length;
          return acc;
        }, {}),
        totalNotasCredito: notasCredito.length
      }
    };
  } catch (error) {
    console.error('Error procesando archivo:', error);
    return {
      success: false,
      error: error.message || 'Error al procesar el archivo'
    };
  }
};

/**
 * Lee el archivo Excel y convierte a JSON
 */
const readExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        
        // Mostrar nombres de columnas para depuración
        if (jsonData.length > 0) {
          console.log('📋 Nombres de columnas encontrados:');
          Object.keys(jsonData[0]).forEach(key => {
            console.log('  - "' + key + '"');
          });
        }
        
        resolve(jsonData);
      } catch (error) {
        reject(new Error('Error al leer el archivo Excel: ' + error.message));
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Filtra líneas donde la cuenta empieza con '41'
 */
const filtrarLineasPorCuenta = (data) => {
  console.log('📊 Total de líneas en el archivo: ' + data.length);
  
  // Mostrar primeras 5 cuentas para depuración
  console.log('🔍 Primeras 5 cuentas del archivo:');
  const primeras5 = data.slice(0, 5);
  for (let i = 0; i < primeras5.length; i++) {
    const row = primeras5[i];
    const cuenta = row['Cuenta'] || row['Cod. Cuenta'] || '';
    console.log('  ' + (i + 1) + '. Cuenta: "' + cuenta + '"');
  }
  
  const filtradas = data.filter(row => {
    const cuenta = row['Cuenta'] || row['Cod. Cuenta'] || '';
    const comienzaCon41 = String(cuenta).startsWith('41');
    if (comienzaCon41) {
      console.log('✅ Cuenta encontrada: "' + cuenta + '"');
    }
    return comienzaCon41;
  });
  
  console.log('✅ Líneas filtradas (cuentas que comienzan con 41): ' + filtradas.length);
  return filtradas;
};

/**
 * Procesa las líneas filtradas y las agrupa por proveedor
 */
const procesarLineas = async (lineas, parametrosFirestore) => {
  const lineasPorProveedor = {};
  const notasCredito = [];
  const errores = [];

  for (const [index, linea] of lineas.entries()) {
    try {
      const nit = String(linea['CC/NIT'] || '').trim();
      const proveedorConfig = PROVEEDORES_CONFIG[nit];
      
      if (!proveedorConfig) {
        errores.push({
          linea: index + 2,
          mensaje: 'Proveedor no soportado: ' + (linea['Tercero'] || nit)
        });
        continue;
      }

      const params = parametrosFirestore[proveedorConfig.id];
      if (!params) {
        errores.push({
          linea: index + 2,
          mensaje: 'Parámetros no encontrados para: ' + proveedorConfig.nombre
        });
        continue;
      }

      const descripcionOriginal = linea['Descripción'] || '';
      const numeroFactura = extraerNumeroFactura(descripcionOriginal);
      const placa = extraerPlaca(descripcionOriginal);

      if (esNotaCredito(numeroFactura)) {
        notasCredito.push({
          factura: numeroFactura,
          placa: placa,
          valor: Math.abs(linea['Débito'] || 0) || Math.abs(linea['Crédito'] || 0),
          tercero: linea['Tercero']
        });
        continue;
      }

      const placaFinal = placa || extraerPlacaAlternativa(descripcionOriginal);
      
      // Mostrar fecha para depuración
      console.log('📅 Fecha Contable: "' + linea['Fecha Contable'] + '"');
      
      const lineaPlano = await crearLineaPlano(
        linea, 
        proveedorConfig, 
        params, 
        numeroFactura, 
        placaFinal
      );

      if (!lineasPorProveedor[proveedorConfig.id]) {
        lineasPorProveedor[proveedorConfig.id] = {
          proveedor: proveedorConfig.nombre,
          cliente: proveedorConfig.nombreCliente,
          lineas: []
        };
      }
      lineasPorProveedor[proveedorConfig.id].lineas.push(lineaPlano);

    } catch (error) {
      errores.push({
        linea: index + 2,
        mensaje: error.message || 'Error procesando línea'
      });
    }
  }

  return { lineasPorProveedor, notasCredito, errores };
};

/**
 * Extrae el número de factura (hasta el primer espacio)
 */
const extraerNumeroFactura = (descripcion) => {
  if (!descripcion) return '';
  return descripcion.split(' ')[0] || '';
};

/**
 * Extrae la placa de la descripción
 */
const extraerPlaca = (descripcion) => {
  if (!descripcion) return '';
  const match = descripcion.match(/PLACA:\s*([A-Z0-9]+)/i);
  return match ? match[1] : '';
};

/**
 * Extrae placa de forma alternativa
 */
const extraerPlacaAlternativa = (descripcion) => {
  if (!descripcion) return '';
  const patterns = [
    /PLACA:\s*([A-Z0-9]+)/i,
    /PLACA\s+([A-Z0-9]+)/i,
    /Placa:\s*([A-Z0-9]+)/i,
    /\(([A-Z0-9]{6,7})\)/
  ];
  
  for (const pattern of patterns) {
    const match = descripcion.match(pattern);
    if (match) return match[1];
  }
  return '';
};

/**
 * Verifica si es una nota crédito
 */
const esNotaCredito = (numeroFactura) => {
  if (!numeroFactura) return false;
  return numeroFactura.toUpperCase().startsWith('NC');
};

/**
 * Crea una línea del archivo plano
 */
const crearLineaPlano = (lineaOriginal, proveedorConfig, params, numeroFactura, placa) => {
  // Procesar fecha
  let fecha = new Date(lineaOriginal['Fecha Contable']);
  // Si la fecha no es válida, intentar parsear como string
  if (isNaN(fecha.getTime())) {
    const fechaStr = String(lineaOriginal['Fecha Contable']).trim();
    // Intentar diferentes formatos
    if (fechaStr.includes('/')) {
      const partes = fechaStr.split('/');
      if (partes.length === 3) {
        fecha = new Date(partes[2] + '-' + partes[1] + '-' + partes[0]);
      }
    } else if (fechaStr.includes('-')) {
      fecha = new Date(fechaStr);
    }
    // Si aún no es válida, usar fecha actual
    if (isNaN(fecha.getTime())) {
      fecha = new Date();
    }
  }
  
  const mesAnio = formatMesAnio(fecha);
  
  const cuenta = lineaOriginal['Cuenta'] || '';
  // Buscar cargo en ambas estructuras posibles
  const cargo = params.cuentas?.[cuenta]?.cargo || 
                params.cuentaCargo?.[cuenta]?.cargo || '';
  
  const impuestoOriginal = lineaOriginal['Impuesto'] || '';
  const taxInfo = params.impuestos?.[impuestoOriginal] || {};
  const taxId = taxInfo.impuestoId || '';
  
  const esDebito = (lineaOriginal['Débito'] || 0) > 0;
  const qtyEntered = esDebito ? -1 : 1;
  
  const valor = Math.abs(lineaOriginal['Débito'] || 0) || Math.abs(lineaOriginal['Crédito'] || 0);
  
  const producto = lineaOriginal['Producto'] || '';
  const descripcionLinea = producto.replace(/,/g, '.') + ' - PLACA: ' + placa;
  
  const descripcionGeneral = VALORES_FIJOS.descripcionBase
    .replace('{mesAnio}', mesAnio)
    .replace('{placa}', placa);
  
  const proyecto = proveedorConfig.prefijoProyecto + placa + proveedorConfig.sufijoProyecto;
  
  return {
    'AD_Org_ID[Name]': VALORES_FIJOS.organizacion,
    'C_DocTypeTarget_ID[Name]': VALORES_FIJOS.tipoDocumento,
    'M_PriceList_ID[Name]': proveedorConfig.precioLista,
    'C_BPartner_ID[Name]': proveedorConfig.nombreCliente,
    'C_BPartner_Location_ID': VALORES_FIJOS.ubicacionSocio,
    'DocumentNo': lineaOriginal['Tabla'] || '',
    'C_PaymentTerm_ID[Value]': VALORES_FIJOS.terminoPago,
    'C_Activity_ID[Name]': proveedorConfig.actividad,
    'DateInvoiced': formatDate(fecha),
    'C_Project_ID[Value]': proyecto,
    'Description': descripcionGeneral,
    'DateAcct': formatDate(fecha),
    'C_InvoiceLine>C_Invoice_ID[DocumentNo]/K': lineaOriginal['Tabla'] || '',
    'C_InvoiceLine>Line/K': lineaOriginal['ID Línea'] || '',
    'C_InvoiceLine>Description': descripcionLinea,
    'C_InvoiceLine>M_Product_ID[Value]': producto,
    'C_InvoiceLine>C_Charge_ID[Name]': cargo,
    'C_InvoiceLine>QtyEntered': qtyEntered,
    'C_InvoiceLine>C_Tax_ID[Name]': taxId,
    'C_InvoiceLine>TaxAmt': '',
    'C_InvoiceLine>PriceEntered': valor
  };
};

/**
 * Formatea fecha para los campos DateInvoiced y DateAcct
 */
const formatDate = (date) => {
  if (!date || isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

/**
 * Formatea mes y año en español en mayúsculas
 */
const formatMesAnio = (date) => {
  if (!date || isNaN(date.getTime())) return '';
  
  const meses = [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
  ];
  
  const mes = meses[date.getMonth()];
  const anio = date.getFullYear();
  return mes + ' ' + anio;
};

/**
 * Genera los archivos CSV por proveedor
 */
const generarArchivosCSV = (lineasPorProveedor) => {
  const archivos = [];
  
  for (const [proveedorId, data] of Object.entries(lineasPorProveedor)) {
    if (data.lineas.length === 0) continue;
    
    const csvContent = generateCSV(data.lineas, CSV_HEADERS);
    const nombreArchivo = 'plano_' + proveedorId + '.csv';
    
    archivos.push({
      proveedorId,
      proveedorNombre: data.proveedor,
      cliente: data.cliente,
      nombreArchivo,
      contenido: csvContent,
      cantidadLineas: data.lineas.length
    });
  }
  
  return archivos;
};

/**
 * Valida que los parámetros requeridos existan
 */
export const validarParametros = (parametros) => {
  const errores = [];
  
  for (const [proveedorId, params] of Object.entries(parametros)) {
    // Verificar si hay cuentas en cualquiera de las dos estructuras
    const tieneCuentas = 
      (params.cuentas && Object.keys(params.cuentas).length > 0) ||
      (params.cuentaCargo && Object.keys(params.cuentaCargo).length > 0);
    
    if (!tieneCuentas) {
      errores.push('El proveedor ' + proveedorId + ' no tiene cuentas configuradas');
    }
    
    if (!params.impuestos || Object.keys(params.impuestos).length === 0) {
      errores.push('El proveedor ' + proveedorId + ' no tiene impuestos configurados');
    }
  }
  
  return errores;
};

/**
 * Obtiene estadísticas del procesamiento
 */
export const obtenerEstadisticas = (resultado) => {
  if (!resultado || !resultado.success) return null;
  
  const stats = {
    totalLineas: 0,
    totalPorProveedor: {},
    totalNotasCredito: resultado.notasCredito.length,
    totalErrores: resultado.errores?.length || 0,
    archivosGenerados: resultado.archivosCSV.length
  };
  
  for (const archivo of resultado.archivosCSV) {
    stats.totalLineas += archivo.cantidadLineas;
    stats.totalPorProveedor[archivo.proveedorNombre] = archivo.cantidadLineas;
  }
  
  return stats;
};
