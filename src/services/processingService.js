import * as XLSX from 'xlsx';
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
 * @param {File} file - Archivo Excel subido por el usuario
 * @param {Object} parametrosFirestore - Parámetros obtenidos de Firestore
 * @returns {Object} Resultados del procesamiento
 */
export const procesarArchivo = async (file, parametrosFirestore) => {
  try {
    // 1. Leer el archivo Excel
    const data = await readExcelFile(file);
    
    // 2. Filtrar líneas con cuentas que empiezan con '41'
    const lineasFiltradas = filtrarLineasPorCuenta(data);
    
    // 3. Procesar líneas y agrupar por proveedor
    const { lineasPorProveedor, notasCredito, errores } = await procesarLineas(
      lineasFiltradas, 
      parametrosFirestore,
      console.log(`📅 Fecha Contable: "${lineaOriginal['Fecha Contable']}"`
    );
    
    // 4. Generar archivos CSV
    const archivosCSV = generarArchivosCSV(lineasPorProveedor);
    
    // 5. Retornar resultados
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
  console.log(`📊 Total de líneas en el archivo: ${data.length}`);
  
  // Mostrar las primeras 5 cuentas para depurar
  console.log('🔍 Primeras 5 cuentas del archivo:');
  data.slice(0, 5).forEach((row, index) => {
    console.log(`  ${index + 1}. Cod. Cuenta: "${row['Cod. Cuenta']}"`);
  });
  
  const filtradas = data.filter(row => {
    const cuenta = row['Cod. Cuenta'] || '';
    const comienzaCon41 = String(cuenta).startsWith('41');
    if (comienzaCon41) {
      console.log(`✅ Cuenta encontrada: "${cuenta}"`);
    }
    return comienzaCon41;
  });
  
  console.log(`✅ Líneas filtradas (cuentas que comienzan con 41): ${filtradas.length}`);
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
      // Identificar proveedor
      const nit = String(linea['CC/NIT'] || '').trim();
      const proveedorConfig = PROVEEDORES_CONFIG[nit];
      
      if (!proveedorConfig) {
        errores.push({
          linea: index + 2, // +2 por header + offset
          mensaje: `Proveedor no soportado: ${linea['Tercero'] || nit}`
        });
        continue;
      }

      // Obtener parámetros del proveedor
      const params = parametrosFirestore[proveedorConfig.id];
      if (!params) {
        errores.push({
          linea: index + 2,
          mensaje: `Parámetros no encontrados para: ${proveedorConfig.nombre}`
        });
        continue;
      }

      // Extraer número de factura y placa
      const descripcionOriginal = linea['Descripción'] || '';
      const numeroFactura = extraerNumeroFactura(descripcionOriginal);
      const placa = extraerPlaca(descripcionOriginal);

      // Verificar si es nota crédito
      if (esNotaCredito(numeroFactura)) {
        notasCredito.push({
          factura: numeroFactura,
          placa: placa,
          valor: Math.abs(linea['Débito'] || 0) || Math.abs(linea['Crédito'] || 0),
          tercero: linea['Tercero']
        });
        continue;
      }

      // Si no hay placa, intentar extraer de otra forma
      const placaFinal = placa || extraerPlacaAlternativa(descripcionOriginal);

      // Crear línea del archivo plano
      const lineaPlano = await crearLineaPlano(
        linea, 
        proveedorConfig, 
        params, 
        numeroFactura, 
        placaFinal
      );

      // Agrupar por proveedor
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
 * Extrae placa de forma alternativa (de diferentes formatos)
 */
const extraerPlacaAlternativa = (descripcion) => {
  if (!descripcion) return '';
  // Buscar en formato: "Placa: XXXX" o "PLACA XXXX"
  const patterns = [
    /PLACA:\s*([A-Z0-9]+)/i,
    /PLACA\s+([A-Z0-9]+)/i,
    /Placa:\s*([A-Z0-9]+)/i,
    /\(([A-Z0-9]{6,7})\)/ // formato: (SPN875)
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
  const fecha = new Date(lineaOriginal['Fecha Contable']);
  const mesAnio = formatMesAnio(fecha);
  
  // Obtener cargo desde parámetros
  const cuenta = lineaOriginal['Cuenta'] || '';
  const cargo = params.cuentaCargo?.[cuenta]?.cargo || '';
  
  // Obtener impuesto desde parámetros
  const impuestoOriginal = lineaOriginal['Impuesto'] || '';
  const taxInfo = params.impuestos?.[impuestoOriginal] || {};
  const taxId = taxInfo.impuestoId || '';
  
  // Determinar QtyEntered (1 si es crédito, -1 si es débito)
  const esDebito = (lineaOriginal['Débito'] || 0) > 0;
  const qtyEntered = esDebito ? -1 : 1;
  
  // Valor para PriceEntered (valor absoluto del débito o crédito)
  const valor = Math.abs(lineaOriginal['Débito'] || 0) || Math.abs(lineaOriginal['Crédito'] || 0);
  
  // Descripción de línea (Producto - PLACA: XXXX)
  const producto = lineaOriginal['Producto'] || '';
  const descripcionLinea = `${producto.replace(/,/g, '.')} - PLACA: ${placa}`;
  
  // Descripción general
  const descripcionGeneral = VALORES_FIJOS.descripcionBase
    .replace('{mesAnio}', mesAnio)
    .replace('{placa}', placa);
  
  // Proyecto
  const proyecto = `${proveedorConfig.prefijoProyecto}${placa}${proveedorConfig.sufijoProyecto}`;
  
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
  // Si date es un string, convertirlo a Date
  if (typeof date === 'string') {
    date = new Date(date);
  }
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
  const año = date.getFullYear();
  return `${mes} ${año}`;
};

/**
 * Genera los archivos CSV por proveedor
 */
const generarArchivosCSV = (lineasPorProveedor) => {
  const archivos = [];
  
  for (const [proveedorId, data] of Object.entries(lineasPorProveedor)) {
    if (data.lineas.length === 0) continue;
    
    // Generar contenido CSV
    const csvContent = generateCSV(data.lineas, CSV_HEADERS);
    
    // Crear nombre de archivo
    const nombreArchivo = `plano_${proveedorId}.csv`;
    
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
    if (!params.cuentas || Object.keys(params.cuentas).length === 0) {
      errores.push(`El proveedor ${proveedorId} no tiene cuentas configuradas`);
    }
    if (!params.impuestos || Object.keys(params.impuestos).length === 0) {
      errores.push(`El proveedor ${proveedorId} no tiene impuestos configurados`);
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
