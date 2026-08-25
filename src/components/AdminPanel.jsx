// src/components/AdminPanel.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  getParametrosProveedor, 
  updateParametrosProveedor,
  getAllProveedores
} from '../services/firestoreService';

/**
 * Panel de administración para gestionar parámetros
 */
const AdminPanel = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [proveedores, setProveedores] = useState([]);
  const [selectedProveedor, setSelectedProveedor] = useState(null);
  const [parametros, setParametros] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [message, setMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('cuentas'); // 'cuentas' | 'impuestos'

  // Lista de proveedores soportados
  const PROVEEDORES_LIST = [
    { id: 'arca_colombia', nombre: 'ARCA COLOMBIA S.A.S.' },
    { id: 'march_inmobiliaria', nombre: 'MARCH INMOBILIARIA S.A.S.' },
    { id: 'union_colombiana', nombre: 'UNION COLOMBIANA DE BUSES S.A.' }
  ];

  // Cargar parámetros al seleccionar proveedor
  useEffect(() => {
    if (selectedProveedor) {
      cargarParametros(selectedProveedor);
    }
  }, [selectedProveedor]);

  const cargarParametros = async (proveedorId) => {
    setLoading(true);
    setMessage(null);
    try {
      const params = await getParametrosProveedor(proveedorId);
      setParametros(params);
      setEditData(params);
      setEditing(false);
    } catch (error) {
      console.error('Error cargando parámetros:', error);
      setMessage({ type: 'error', text: `Error cargando parámetros: ${error.message}` });
      setParametros(null);
    } finally {
      setLoading(false);
    }
  };

  // Guardar cambios
  const handleSave = async () => {
    if (!selectedProveedor) return;
    
    setSaving(true);
    setMessage(null);
    try {
      await updateParametrosProveedor(selectedProveedor, editData);
      setParametros(editData);
      setEditing(false);
      setMessage({ type: 'success', text: 'Parámetros actualizados correctamente' });
    } catch (error) {
      console.error('Error guardando parámetros:', error);
      setMessage({ type: 'error', text: `Error guardando: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  // Cancelar edición
  const handleCancel = () => {
    setEditData(parametros);
    setEditing(false);
    setMessage(null);
  };

  // Actualizar campo de cuenta
  const updateCuenta = (cuentaKey, field, value) => {
    setEditData(prev => ({
      ...prev,
      cuentaCargo: {
        ...(prev.cuentaCargo || {}),
        [cuentaKey]: {
          ...(prev.cuentaCargo || {})[cuentaKey],
          [field]: value
        }
      }
    }));
  };

  // Eliminar cuenta
  const deleteCuenta = (cuentaKey) => {
    if (!window.confirm(`¿Eliminar la cuenta "${cuentaKey}"?`)) return;
    
    const newCuentas = { ...(editData.cuentaCargo || {}) };
    delete newCuentas[cuentaKey];
    setEditData(prev => ({
      ...prev,
      cuentaCargo: newCuentas
    }));
  };

  // Agregar nueva cuenta
  const addCuenta = () => {
    const cuentaKey = prompt('Ingrese el código de la cuenta (ej: 41354860_VENTA_DE_HERRAMIENTAS):');
    if (!cuentaKey) return;
    
    const cargo = prompt('Ingrese el cargo correspondiente (ej: OTRAS COMPRAS TRANSPORTE (COSTO 61450589)):');
    if (!cargo) return;
    
    setEditData(prev => ({
      ...prev,
      cuentaCargo: {
        ...(prev.cuentaCargo || {}),
        [cuentaKey]: {
          cargo: cargo,
          tipo: 'cuenta'
        }
      }
    }));
  };

  // Actualizar impuesto
  const updateImpuesto = (impuestoKey, value) => {
    setEditData(prev => ({
      ...prev,
      impuestos: {
        ...(prev.impuestos || {}),
        [impuestoKey]: {
          impuestoId: value
        }
      }
    }));
  };

  // Agregar nuevo impuesto
  const addImpuesto = () => {
    const impuestoKey = prompt('Ingrese el nombre del impuesto (ej: IVA 19%):');
    if (!impuestoKey) return;
    
    const impuestoId = prompt('Ingrese el ID del impuesto (ej: MAYOR COSTO IVA 19% xCOMPRA (61)):');
    if (!impuestoId) return;
    
    setEditData(prev => ({
      ...prev,
      impuestos: {
        ...(prev.impuestos || {}),
        [impuestoKey]: {
          impuestoId: impuestoId
        }
      }
    }));
  };

  // Eliminar impuesto
  const deleteImpuesto = (impuestoKey) => {
    if (!window.confirm(`¿Eliminar el impuesto "${impuestoKey}"?`)) return;
    
    const newImpuestos = { ...(editData.impuestos || {}) };
    delete newImpuestos[impuestoKey];
    setEditData(prev => ({
      ...prev,
      impuestos: newImpuestos
    }));
  };

  // Renderizar mensaje
  const renderMessage = () => {
    if (!message) return null;
    return (
      <div className={`message ${message.type}`}>
        {message.type === 'success' ? '✅' : '❌'} {message.text}
      </div>
    );
  };

  // Renderizar lista de cuentas
  const renderCuentas = () => {
    const cuentas = editData?.cuentaCargo || {};
    const entries = Object.entries(cuentas);

    if (entries.length === 0) {
      return (
        <div className="empty-state">
          <p>No hay cuentas configuradas</p>
        </div>
      );
    }

    return (
      <table className="admin-table">
        <thead>
          <tr>
            <th>Cuenta</th>
            <th>Cargo</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key}>
              <td className="cuenta-cell">{key}</td>
              <td>
                {editing ? (
                  <input
                    type="text"
                    value={value.cargo || ''}
                    onChange={(e) => updateCuenta(key, 'cargo', e.target.value)}
                    className="input-edit"
                    placeholder="Ingrese el cargo"
                  />
                ) : (
                  <span>{value.cargo || '-'}</span>
                )}
              </td>
              <td>
                {editing ? (
                  <button
                    onClick={() => deleteCuenta(key)}
                    className="btn-delete"
                  >
                    🗑️
                  </button>
                ) : (
                  <span className="idle-text">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // Renderizar lista de impuestos
  const renderImpuestos = () => {
    const impuestos = editData?.impuestos || {};
    const entries = Object.entries(impuestos);

    if (entries.length === 0) {
      return (
        <div className="empty-state">
          <p>No hay impuestos configurados</p>
        </div>
      );
    }

    return (
      <table className="admin-table">
        <thead>
          <tr>
            <th>Impuesto</th>
            <th>ID de Impuesto</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key}>
              <td>{key}</td>
              <td>
                {editing ? (
                  <input
                    type="text"
                    value={value.impuestoId || ''}
                    onChange={(e) => updateImpuesto(key, e.target.value)}
                    className="input-edit"
                    placeholder="Ingrese el ID del impuesto"
                  />
                ) : (
                  <span>{value.impuestoId || '-'}</span>
                )}
              </td>
              <td>
                {editing ? (
                  <button
                    onClick={() => deleteImpuesto(key)}
                    className="btn-delete"
                  >
                    🗑️
                  </button>
                ) : (
                  <span className="idle-text">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // Si no está autenticado o no es admin
  if (!user || user.role !== 'admin') {
    return (
      <div className="admin-container">
        <div className="unauthorized">
          <h2>⛔ Acceso no autorizado</h2>
          <p>Esta sección es solo para administradores.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>⚙️ Panel de Administración</h1>
        <div className="admin-user-info">
          <span className="admin-user">👤 {user.email}</span>
          <button onClick={logout} className="btn btn-danger">
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Selector de proveedor */}
      <div className="admin-section">
        <h2>Seleccionar Proveedor</h2>
        <div className="proveedor-selector">
          {PROVEEDORES_LIST.map(prov => (
            <button
              key={prov.id}
              className={`btn-proveedor ${selectedProveedor === prov.id ? 'active' : ''}`}
              onClick={() => setSelectedProveedor(prov.id)}
            >
              {prov.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido de parámetros */}
      {selectedProveedor && (
        <div className="admin-section">
          <div className="section-header">
            <h2>
              Parámetros: {PROVEEDORES_LIST.find(p => p.id === selectedProveedor)?.nombre}
            </h2>
            <div className="section-actions">
              {!editing ? (
                <button 
                  className="btn btn-primary"
                  onClick={() => setEditing(true)}
                >
                  ✏️ Editar
                </button>
              ) : (
                <>
                  <button 
                    className="btn btn-success"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? 'Guardando...' : '💾 Guardar'}
                  </button>
                  <button 
                    className="btn btn-outline"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    ❌ Cancelar
                  </button>
                </>
              )}
            </div>
          </div>

          {renderMessage()}

          {loading ? (
            <div className="loading-spinner">Cargando parámetros...</div>
          ) : (
            <>
              {/* Tabs */}
              <div className="tabs">
                <button
                  className={`tab ${activeTab === 'cuentas' ? 'active' : ''}`}
                  onClick={() => setActiveTab('cuentas')}
                >
                  📊 Cuentas y Cargos
                </button>
                <button
                  className={`tab ${activeTab === 'impuestos' ? 'active' : ''}`}
                  onClick={() => setActiveTab('impuestos')}
                >
                  🏷️ Impuestos
                </button>
              </div>

              {/* Contenido de tabs */}
              <div className="tab-content">
                {activeTab === 'cuentas' && (
                  <div className="tab-panel">
                    {editing && (
                      <button 
                        className="btn-add"
                        onClick={addCuenta}
                      >
                        ➕ Agregar Cuenta
                      </button>
                    )}
                    {renderCuentas()}
                  </div>
                )}

                {activeTab === 'impuestos' && (
                  <div className="tab-panel">
                    {editing && (
                      <button 
                        className="btn-add"
                        onClick={addImpuesto}
                      >
                        ➕ Agregar Impuesto
                      </button>
                    )}
                    {renderImpuestos()}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Información de ayuda */}
      <div className="admin-section help-section">
        <h2>📖 Ayuda</h2>
        <div className="help-content">
          <h4>Cuentas y Cargos</h4>
          <p>
            Define la relación entre las cuentas contables y los cargos que aparecerán 
            en los archivos planos.
          </p>
          <ul>
            <li><strong>Cuenta:</strong> Código exacto de la cuenta (ej: 41354860_VENTA_DE_HERRAMIENTAS)</li>
            <li><strong>Cargo:</strong> Descripción del cargo que aparecerá en el CSV</li>
          </ul>

          <h4>Impuestos</h4>
          <p>
            Define la relación entre los impuestos en el archivo fuente y los IDs de impuestos 
            que aparecerán en los archivos planos.
          </p>
          <ul>
            <li><strong>Impuesto:</strong> Valor de la columna "Impuesto" en el archivo origen</li>
            <li><strong>ID de Impuesto:</strong> Valor que aparecerá en la columna de impuestos del CSV</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;