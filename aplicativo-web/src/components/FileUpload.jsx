import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

const FileUpload = ({ onFileUpload, isProcessing }) => {
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      onFileUpload(acceptedFiles[0]);
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxSize: 10485760, // 10MB
    multiple: false,
    disabled: isProcessing
  });

  return (
    <div className="upload-container">
      <div 
        {...getRootProps()} 
        className={`dropzone ${isDragActive ? 'active' : ''} ${isProcessing ? 'disabled' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="dropzone-content">
          <i className="fas fa-cloud-upload-alt"></i>
          <p>
            {isDragActive 
              ? 'Suelta el archivo aquí' 
              : 'Arrastra y suelta tu archivo Excel aquí, o haz clic para seleccionarlo'}
          </p>
          <p className="dropzone-hint">Solo archivos .xlsx y .xls (máx. 10MB)</p>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;