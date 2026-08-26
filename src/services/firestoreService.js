import { 
  doc, getDoc, setDoc, updateDoc, 
  collection, query, getDocs, deleteDoc, where 
} from 'firebase/firestore';
import { db } from './firebase';

// Obtener parámetros de un proveedor específico
export const getParametrosProveedor = async (proveedorId) => {
  try {
    const docRef = doc(db, 'parametros', proveedorId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      throw new Error('Parámetros no encontrados');
    }
  } catch (error) {
    console.error('Error obteniendo parámetros:', error);
    throw error;
  }
};

// Actualizar parámetros de un proveedor
export const updateParametrosProveedor = async (proveedorId, data) => {
  try {
    const docRef = doc(db, 'parametros', proveedorId);
    await setDoc(docRef, data, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error actualizando parámetros:', error);
    throw error;
  }
};

// Obtener información de un usuario por email
export const getUserByEmail = async (email) => {
  try {
    const usersRef = collection(db, 'usuarios');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    throw error;
  }
};
