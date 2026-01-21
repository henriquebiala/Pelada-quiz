
// Acesso seguro às variáveis de ambiente para evitar ReferenceError no navegador
const getEnv = (key: string): string | undefined => {
  try {
    return (window as any).process?.env?.[key] || (process as any)?.env?.[key];
  } catch {
    return undefined;
  }
};

export const firebaseConfig = {
  apiKey: getEnv('FIREBASE_API_KEY') || "AIzaSyDlo0VEa5CHZqS-iSM5G005BuUpE8X3GG4",
  authDomain: "pelada-6d29b.firebaseapp.com",
  projectId: "pelada-6d29b",
  storageBucket: "pelada-6d29b.firebasestorage.app",
  messagingSenderId: "102151876007",
  appId: "1:102151876007:web:e665a50272e6e650cb5a82",
  measurementId: "G-8V25SSD7R2"
};