
// Acesso seguro e resiliente às chaves do Firebase
const getFirebaseApiKey = (): string => {
  // Tenta pegar do ambiente, senão usa o fallback padrão do projeto
  return (process.env as any).FIREBASE_API_KEY || "AIzaSyDlo0VEa5CHZqS-iSM5G005BuUpE8X3GG4";
};

export const firebaseConfig = {
  apiKey: getFirebaseApiKey(),
  authDomain: "pelada-6d29b.firebaseapp.com",
  projectId: "pelada-6d29b",
  storageBucket: "pelada-6d29b.firebasestorage.app",
  messagingSenderId: "102151876007",
  appId: "1:102151876007:web:e665a50272e6e650cb5a82",
  measurementId: "G-8V25SSD7R2",
  // ALTERE O E-MAIL ABAIXO PARA DEFINIR O NOVO ADMIN PADRÃO
  adminEmail: "admin@bola.com"
};
