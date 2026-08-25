// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { getUserByEmail } from '../services/firestoreService';

// Crear el contexto
export const AuthContext = createContext();

// Provider del contexto
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  // Efecto para escuchar cambios en la autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Obtener rol del usuario desde Firestore
          const userData = await getUserByEmail(firebaseUser.email);
          if (userData) {
            setUser({
              ...firebaseUser,
              role: userData.role,
              userData: userData
            });
            setUserRole(userData.role);
          } else {
            setUser(firebaseUser);
            setUserRole(null);
          }
        } catch (error) {
          console.error('Error obteniendo datos del usuario:', error);
          setUser(firebaseUser);
          setUserRole(null);
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    // Limpiar suscripción al desmontar
    return () => unsubscribe();
  }, []);

  // Función de login
  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  };

  // Función de logout
  const logout = async () => {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      console.error('Error en logout:', error);
      throw error;
    }
  };

  // Función para restablecer contraseña
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      console.error('Error enviando correo de restablecimiento:', error);
      throw error;
    }
  };

  // Función para actualizar perfil
  const updateUserProfile = async (displayName) => {
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName });
        setUser({
          ...user,
          displayName: displayName
        });
        return { success: true };
      }
      return { success: false, error: 'No hay usuario autenticado' };
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      throw error;
    }
  };

  // Valor del contexto
  const value = {
    user,
    userRole,
    loading,
    isAdmin: userRole === 'admin',
    isAuthenticated: !!user,
    login,
    logout,
    resetPassword,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook para consumir el contexto (exportación por defecto y nombrada)
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

export default AuthProvider;