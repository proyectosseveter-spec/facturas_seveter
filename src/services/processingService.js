// src/services/processingService.js
import * as XLSX from 'xlsx';

const PROVEEDORES_CONFIG = {
  '860502253': {
    id: 'union_colombiana',
    nombre: 'UNION COLOMBIANA DE BUSES S.A.',
    precioLista: 'Precios de Compra Ucoltur',
    actividad: 'TRANSPORTE ESPECIAL',
    prefijoProyecto: '',
    sufijoProyecto: ' Transporte Especial',
    nombreCliente: 'UCOLTUR S.A.'
  },
  '901007844': {
    id: 'arca_colombia',
    nombre: 'ARCA COLOMBIA S.A.S.',
    precioLista: 'Precios de Compra ARCA',
    actividad: 'FLOTA PROPIA',
    prefijoProyecto: 'Arca_',
    sufijoProyecto: '',
    nombreCliente: 'ARCA COLOMBIA S.A.S.'
  },
  '900469624': {
    id: 'march_inmobiliaria',
    nombre: 'MARCH INMOBILIARIA S.A.S.',
    precioLista: 'Precios de Compra MInmobiliaria',
    actividad: 'FLOTA PROPIA',
    prefijoProyecto: 'mi_',
    sufijoProyecto: '',
    nombreCliente: 'MARCH INMOBILIARIA S.A.S.'
  }
};

const VALORES_FIJOS = {
  organizacion: 'SEVETER S.A.',
  tipoDocumento: 'Factura Proveedor',
  socioNegocio: 'SERVICIOS PARA VEHICULOS DE TRANSPORTE S.A.',
  ubicacionSocio: '1015056',
  terminoPago: '1000001',
  descripcionBase: 'REPUESTOS - PARTES - SERVICIOS DE MANTENIMIENTO - {mesAnio} - PLACA: {placa}'
};

const HEADERS = [
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

// Columnas que se llenan solo en la primera línea de cada factura
const METADATA_HEADERS = [
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
  'DateAcct'
];

export const procesarArchivo = async (file, parametrosFirestore) => {
  try {
    const data = await readExcelFile(file);
    const lineasFiltradas = filtrarLineasPorCuenta(data);
    const { lineasPorProveedor, notasCredito, errores } = await procesarLineas(
      lineasFiltradas,
      parametrosFirestore
    );

    // Renumerar Line/K secuencialmente (10, 20, 30...) por factura
    renumerarLineasPorFactura(lineasPorProveedor);

    // Generar archivos XLSX
    const archivos = generarArchivosXLSX(lineasPorProveedor);

    return {
      success: true,
      archivos,
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

const readExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // raw: true para que mantenga los tipos nativos
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { 
          raw: true, 
          range: 1 
        });
        
        if (jsonData.length > 0) {
          console.log('📋 Columnas detectadas:', Object.keys(jsonData[0]));
          console.log('📊 Total de filas a procesar:', jsonData.length);
          console.log('📅 Ejemplo de "Fecha Contable":', jsonData[0]['Fecha Contable']);
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

const procesarLineas = async (lineas, parametrosFirestore) => {
  const lineasPorProveedor = {};
  const notasCredito = [];
  const errores = [];

  for (const [index, linea] of lineas.entries()) {
    try {
      const nit = String(linea['CC/NIT'] || '').trim();
      const proveedorConfig = PROVEEDORES_CONFIG[nit];

      if (!proveedorConfig) {
        errores.push({ linea: index + 2, mensaje: 'Proveedor no soportado: ' + (linea['Tercero'] || nit) });
        continue;
      }

      const params = parametrosFirestore[proveedorConfig.id];
      if (!params) {
        errores.push({ linea: index + 2, mensaje: 'Parámetros no encontrados para: ' + proveedorConfig.nombre });
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

      const lineaPlano = crearLineaPlano(linea, proveedorConfig, params, numeroFactura, placa);

      if (!lineasPorProveedor[proveedorConfig.id]) {
        lineasPorProveedor[proveedorConfig.id] = {
          proveedor: proveedorConfig.nombre,
          cliente: proveedorConfig.nombreCliente,
          lineas: []
        };
      }
      lineasPorProveedor[proveedorConfig.id].lineas.push(lineaPlano);
    } catch (error) {
      errores.push({ linea: index + 2, mensaje: error.message || 'Error procesando línea' });
    }
  }

  return { lineasPorProveedor, notasCredito, errores };
};

const extraerNumeroFactura = (descripcion) => {
  if (!descripcion) return '';
  return descripcion.split(' ')[0] || '';
};

const extraerPlaca = (descripcion) => {
  if (!descripcion) return '';
  const patterns = [
    /PLACA:\s*([A-Z0-9]+)/i,
    /PLACA\s+([A-Z0-9]+)/i,
    /PLACAS?\s+([A-Z0-9]{6,7})/i,
    /\(([A-Z]{2,3}\d{3,4})\)/
  ];
  for (const pattern of patterns) {
    const match = descripcion.match(pattern);
    if (match) return match[1];
  }
  return '';
};

const esNotaCredito = (numeroFactura) => {
  if (!numeroFactura) return false;
  return numeroFactura.toUpperCase().startsWith('NC');
};

const crearLineaPlano = (lineaOriginal, proveedorConfig, params, numeroFactura, placa) => {
  const fecha = parseDate(lineaOriginal['Fecha Contable']);

  const cuenta = lineaOriginal['Cuenta'] || '';
  const cargo = params.cuentas?.[cuenta]?.cargo || params.cuentaCargo?.[cuenta]?.cargo || '';

  const impuestoOriginal = lineaOriginal['Impuesto'] || '';
  const taxInfo = params.impuestos?.[impuestoOriginal] || {};
  const taxId = taxInfo.impuestoId || '';

  const esDebito = (lineaOriginal['Débito'] || 0) > 0;
  const qtyEntered = esDebito ? -1 : 1;

  const valor = Math.abs(lineaOriginal['Débito'] || 0) || Math.abs(lineaOriginal['Crédito'] || 0);

  const producto = lineaOriginal['Producto'] || '';
  const descripcionLinea = producto.replace(/,/g, '.') + ' - PLACA: ' + placa;

  const mesAnio = formatMesAnio(fecha);
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
    'DocumentNo': numeroFactura,
    'C_PaymentTerm_ID[Value]': VALORES_FIJOS.terminoPago,
    'C_Activity_ID[Name]': proveedorConfig.actividad,
    'DateInvoiced': formatDateTime(fecha),
    'C_Project_ID[Value]': proyecto,
    'Description': descripcionGeneral,
    'DateAcct': formatDate(fecha),
    'C_InvoiceLine>C_Invoice_ID[DocumentNo]/K': numeroFactura,
    'C_InvoiceLine>Line/K': '',   // se asigna en renumerarLineasPorFactura
    'C_InvoiceLine>Description': descripcionLinea,
    'C_InvoiceLine>M_Product_ID[Value]': '',
    'C_InvoiceLine>C_Charge_ID[Name]': cargo,
    'C_InvoiceLine>QtyEntered': qtyEntered,
    'C_InvoiceLine>C_Tax_ID[Name]': taxId,
    'C_InvoiceLine>TaxAmt': '',
    'C_InvoiceLine>PriceEntered': valor,
    '_numeroFactura': numeroFactura  // campo temporal para renumerar
  };
};

// Parseo robusto de fecha (Date / número Excel / string)
const parseDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'number') {
    // Serial de Excel: días desde 1899-12-30 (ajuste del bug del año 1900)
    const ms = (value - 25569) * 86400 * 1000;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    // Formato "YYYY-MM-DD HH:mm:ss" o "YYYY-MM-DD"
    const m = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
    const parsed = new Date(trimmed);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

// Formato YYYY-MM-DD (sin hora)
const formatDate = (date) => {
  if (!date || isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Formato YYYY-MM-DD 00:00:00
const formatDateTime = (date) => {
  const dateStr = formatDate(date);
  return dateStr ? `${dateStr} 00:00:00` : '';
};

const formatMesAnio = (date) => {
  if (!date || isNaN(date.getTime())) return '';
  const meses = [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
  ];
  return `${meses[date.getMonth()]} ${date.getFullYear()}`;
};

// Renumera Line/K como 10, 20, 30... por factura dentro de cada proveedor
const renumerarLineasPorFactura = (lineasPorProveedor) => {
  for (const data of Object.values(lineasPorProveedor)) {
    const contadores = {};
    for (const linea of data.lineas) {
      const factura = linea['_numeroFactura'];
      if (!contadores[factura]) contadores[factura] = 10;
      linea['C_InvoiceLine>Line/K'] = contadores[factura];
      contadores[factura] += 10;
      delete linea['_numeroFactura'];
    }
  }
};

const generarArchivosXLSX = (lineasPorProveedor) => {
  const archivos = [];

  for (const [proveedorId, data] of Object.entries(lineasPorProveedor)) {
    if (data.lineas.length === 0) continue;

    // Construir matriz (array de arrays) para aoa_to_sheet
    const rows = [HEADERS];
    let lastInvoice = null;

    for (const linea of data.lineas) {
      const factura = linea['C_InvoiceLine>C_Invoice_ID[DocumentNo]/K'];
      const isFirstLine = factura !== lastInvoice;

      const row = HEADERS.map(header => {
        // Metadata: solo en la primera línea de cada factura
        if (METADATA_HEADERS.includes(header) && !isFirstLine) {
          return '';
        }
        const val = linea[header];
        return val === undefined || val === null ? '' : val;
      });

      rows.push(row);
      lastInvoice = factura;
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hoja1');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    archivos.push({
      proveedorId,
      proveedorNombre: data.proveedor,
      cliente: data.cliente,
      nombreArchivo: `plano_${proveedorId}.xlsx`,
      contenido: blob,
      cantidadLineas: data.lineas.length
    });
  }

  return archivos;
};

export const validarParametros = (parametros) => {
  const errores = [];
  for (const [proveedorId, params] of Object.entries(parametros)) {
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

export const obtenerEstadisticas = (resultado) => {
  if (!resultado || !resultado.success) return null;
  const stats = {
    totalLineas: 0,
    totalPorProveedor: {},
    totalNotasCredito: resultado.notasCredito.length,
    totalErrores: resultado.errores?.length || 0,
    archivosGenerados: resultado.archivos.length
  };
  for (const archivo of resultado.archivos) {
    stats.totalLineas += archivo.cantidadLineas;
    stats.totalPorProveedor[archivo.proveedorNombre] = archivo.cantidadLineas;
  }
  return stats;
};
