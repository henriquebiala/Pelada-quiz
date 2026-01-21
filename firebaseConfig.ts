
// O valor da API Key agora é buscado de forma segura das variáveis de ambiente.
// No seu ambiente de deploy (Netlify/Vercel), adicione a variável FIREBASE_API_KEY.
export const firebaseConfig = {
  apiKey: (process.env.FIREBASE_API_KEY as string) || "AIzaSyDlo0VEa5CHZqS-iSM5G005BuUpE8X3GG4",
  authDomain: "pelada-6d29b.firebaseapp.com",
  projectId: "pelada-6d29b",
  storageBucket: "pelada-6d29b.firebasestorage.app",
  messagingSenderId: "102151876007",
  appId: "1:102151876007:web:e665a50272e6e650cb5a82",
  measurementId: "G-8V25SSD7R2"
};
