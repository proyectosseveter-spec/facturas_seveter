// scripts/initParams.js
// Este script se ejecuta una sola vez para inicializar los parámetros en Firestore

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// Configuración de Firebase (usa tus credenciales)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Datos iniciales de parámetros
const parametrosIniciales = {
  arca_colombia: {
    cuentaCargo: {
      "41354860_VENTA DE HERRAMIENTAS Y ARTICULOS DE FERRETERIA": {
        cargo: "OTRAS COMPRAS TRANSPORTE (COSTO 61450589)",
        tipo: "cuenta"
      },
      "41350640_VENTA DE PARTES Y REPUESTOS DE VEHICULOS": {
        cargo: "Transporte E REPUESTOS (61450555)",
        tipo: "cuenta"
      },
      "41350480_MANTENIMIENTO REPARACION Y LAVADO DE VEHICULOS": {
        cargo: "Transporte E MANTENIMIENTO Y REPARACIONES (61450545)",
        tipo: "cuenta"
      },
      "41351030_VENTA LUBRICANTES": {
        cargo: "LUBRICANTES (COSTO 614505/arc)",
        tipo: "cuenta"
      },
      "41350670_VENTA DE ACCESORIOS Y LUJOS DE VEHICULOS": {
        cargo: "Transporte E REPUESTOS (61450555)",
        tipo: "cuenta"
      },
      "41351020_VENTA DE LLANTAS Y ACCESORIOS": {
        cargo: "LLANTAS COMPRA (COSTO 614505/arc)",
        tipo: "cuenta"
      },
      "41750510_DESCUENTO VENTAS": {
        cargo: "Transporte E REPUESTOS (61450555)",
        tipo: "cuenta"
      }
    },
    impuestos: {
      "IVA implicito": { impuestoId: "IVA implicito" },
      "IVA 19%": { impuestoId: "MAYOR COSTO IVA 19% xCOMPRA (61)" },
      "IVA 19% xSERVICIO": { impuestoId: "MAYOR COSTO IVA 19% xSERVICIO (61)" }
    }
  },
  march_inmobiliaria: {
    cuentaCargo: {
      "41354860_VENTA DE HERRAMIENTAS Y ARTICULOS DE FERRETERIA": {
        cargo: "OTRAS COMPRAS TRANSPORTE (COSTO 61450589)",
        tipo: "cuenta"
      },
      "41350640_VENTA DE PARTES Y REPUESTOS DE VEHICULOS": {
        cargo: "Transporte E REPUESTOS (61450555)",
        tipo: "cuenta"
      },
      "41350480_MANTENIMIENTO REPARACION Y LAVADO DE VEHICULOS": {
        cargo: "Transporte E MANTENIMIENTO Y REPARACIONES (61450545)",
        tipo: "cuenta"
      },
      "41351030_VENTA LUBRICANTES": {
        cargo: "Transporte E MANTENIMIENTO Y REPARACIONES (61450545)",
        tipo: "cuenta"
      },
      "41350670_VENTA DE ACCESORIOS Y LUJOS DE VEHICULOS": {
        cargo: "Transporte E REPUESTOS (61450555)",
        tipo: "cuenta"
      },
      "41351020_VENTA DE LLANTAS Y ACCESORIOS": {
        cargo: "Transporte E REPUESTOS (61450555)",
        tipo: "cuenta"
      },
      "41750510_DESCUENTO VENTAS": {
        cargo: "Transporte E REPUESTOS (61450555)",
        tipo: "cuenta"
      }
    },
    impuestos: {
      "IVA implicito": { impuestoId: "IVA implicito" },
      "IVA 19%": { impuestoId: "MAYOR COSTO IVA 19% xCOMPRA (61)" },
      "IVA 19% xSERVICIO": { impuestoId: "MAYOR COSTO IVA 19% xSERVICIO (61)" }
    }
  },
  union_colombiana: {
    cuentaCargo: {
      "41354860_VENTA DE HERRAMIENTAS Y ARTICULOS DE FERRETERIA": {
        cargo: "OTRAS COMPRAS TRANSPORTE (COSTO 61450589)",
        tipo: "cuenta"
      },
      "41350640_VENTA DE PARTES Y REPUESTOS DE VEHICULOS": {
        cargo: "Transporte E REPUESTOS (61450555)",
        tipo: "cuenta"
      },
      "41350480_MANTENIMIENTO REPARACION Y LAVADO DE VEHICULOS": {
        cargo: "Transporte E MANTENIMIENTO Y REPARACIONES (61450545)",
        tipo: "cuenta"
      },
      "41351030_VENTA LUBRICANTES": {
        cargo: "Buses Lubricantes (COSTO 614505/u)",
        tipo: "cuenta"
      },
      "41350670_VENTA DE ACCESORIOS Y LUJOS DE VEHICULOS": {
        cargo: "Transporte E REPUESTOS (61450555)",
        tipo: "cuenta"
      },
      "41351020_VENTA DE LLANTAS Y ACCESORIOS": {
        cargo: "Transporte E REPUESTOS (61450555)",
        tipo: "cuenta"
      },
      "41750510_DESCUENTO VENTAS": {
        cargo: "Transporte E REPUESTOS (61450555)",
        tipo: "cuenta"
      }
    },
    impuestos: {
      "IVA implicito": { impuestoId: "IVA implicito" },
      "IVA 19%": { impuestoId: "MAYOR COSTO IVA 19% xCOMPRA (61)" },
      "IVA 19% xSERVICIO": { impuestoId: "MAYOR COSTO IVA 19% xSERVICIO (61)" }
    }
  }
};

// Función para inicializar datos
async function initParams() {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      'admin@tudominio.com',
      'tu_contraseña_admin'
    );
    console.log('✅ Autenticado como admin');

    for (const [proveedorId, data] of Object.entries(parametrosIniciales)) {
      const docRef = doc(db, 'parametros', proveedorId);
      await setDoc(docRef, data, { merge: true });
      console.log(`✅ Parámetros guardados para: ${proveedorId}`);
    }

    console.log('🎉 Inicialización completada exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error inicializando:', error);
    process.exit(1);
  }
}

initParams();
