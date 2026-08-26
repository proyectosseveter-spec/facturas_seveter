// src/services/firestoreService.js
import { 
  doc, getDoc, setDoc, updateDoc, 
  collection, query, getDocs, deleteDoc,
  where  // ✅ Importación correcta de where
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Obtiene los parámetros de un proveedor específico
 * @param {string} proveedorId - ID del proveedor (arca_colombia, march_inmobiliaria, union_colombiana)
 * @returns {Promise<Object>} - Datos de los parámetros
 */
export const getParametrosProveedor = async (proveedorId) => {
  try {
    console.log(`🔍 Buscando parámetros para: ${proveedorId}`);
    const docRef = doc(db, 'parametros', proveedorId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      console.log(`✅ Parámetros encontrados para: ${proveedorId}`);
      return docSnap.data();
    } else {
      console.warn(`⚠️ Parámetros NO encontrados para: ${proveedorId}`);
      // Retornar estructura vacía para evitar errores
      return { cuentaCargo: {}, impuestos: {} };
    }
  } catch (error) {
    console.error(`❌ Error obteniendo parámetros para ${proveedorId}:`, error);
    // Retornar estructura vacía para evitar errores
    return { cuentaCargo: {}, impuestos: {} };
  }
};

export const getUserByEmail = async (email) => {
  try {
    console.log(`🔍 Buscando usuario: ${email}`);
    const usersRef = collection(db, 'usuarios');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      console.log(`✅ Usuario encontrado: ${email}`);
      return { id: doc.id, ...doc.data() };
    }
    console.log(`⚠️ Usuario NO encontrado: ${email}`);
    return null;
  } catch (error) {
    console.warn('⚠️ No se pudo verificar el usuario:', error.message);
    // Retornar null en lugar de lanzar error
    return null;
  }
};

/**
 * Actualiza los parámetros de un proveedor
 * @param {string} proveedorId - ID del proveedor
 * @param {Object} data - Nuevos datos de parámetros
 * @returns {Promise<Object>} - Resultado de la operación
 */
export const updateParametrosProveedor = async (proveedorId, data) => {
  try {
    console.log(`📝 Actualizando parámetros para: ${proveedorId}`);
    const docRef = doc(db, 'parametros', proveedorId);
    await setDoc(docRef, data, { merge: true });
    console.log(`✅ Parámetros actualizados para: ${proveedorId}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Error actualizando parámetros para ${proveedorId}:`, error);
    throw error;
  }
};

/**
 * Obtiene un usuario por su email
 * @param {string} email - Email del usuario
 * @returns {Promise<Object|null>} - Datos del usuario o null
 */
export const getUserByEmail = async (email) => {
  try {
    console.log(`🔍 Buscando usuario: ${email}`);
    const usersRef = collection(db, 'usuarios');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      console.log(`✅ Usuario encontrado: ${email}`);
      return { id: doc.id, ...doc.data() };
    }
    console.log(`⚠️ Usuario NO encontrado: ${email}`);
    return null;
  } catch (error) {
    console.error('❌ Error obteniendo usuario:', error);
    // Si el error es por falta de colección, retornar null
    if (error.code === 'permission-denied') {
      console.warn('⚠️ Permiso denegado para leer usuarios');
      return null;
    }
    throw error;
  }
};

/**
 * Obtiene todos los proveedores disponibles
 * @returns {Promise<Object>} - Objeto con todos los proveedores
 */
export const getAllProveedores = async () => {
  try {
    console.log('🔍 Obteniendo todos los proveedores...');
    const proveedoresRef = collection(db, 'parametros');
    const querySnapshot = await getDocs(proveedoresRef);
    const proveedores = {};
    
    querySnapshot.forEach((doc) => {
      proveedores[doc.id] = doc.data();
    });
    
    console.log(`✅ ${Object.keys(proveedores).length} proveedores encontrados`);
    return proveedores;
  } catch (error) {
    console.error('❌ Error obteniendo proveedores:', error);
    return {};
  }
};

/**
 * Verifica si un usuario es administrador
 * @param {string} uid - UID del usuario
 * @returns {Promise<boolean>} - true si es admin
 */
export const isUserAdmin = async (uid) => {
  try {
    if (!uid) return false;
    const docRef = doc(db, 'usuarios', uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.role === 'admin';
    }
    return false;
  } catch (error) {
    console.error('❌ Error verificando rol de usuario:', error);
    return false;
  }
};

// Exportar funciones por defecto
export default {
  getParametrosProveedor,
  updateParametrosProveedor,
  getUserByEmail,
  getAllProveedores,
  isUserAdmin
};
