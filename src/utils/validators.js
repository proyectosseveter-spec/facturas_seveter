export const validateExcelFile = (file) => {
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];
  
  if (!file) {
    return { valid: false, error: 'No se seleccionó ningún archivo' };
  }

  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'El archivo debe ser de tipo Excel (.xlsx o .xls)' };
  }

  if (file.size > 10 * 1024 * 1024) { // 10MB
    return { valid: false, error: 'El archivo no debe superar los 10MB' };
  }

  return { valid: true };
};