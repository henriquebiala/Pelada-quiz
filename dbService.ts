
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { 
  getFirestore, collection, addDoc, getDocs, query, where, 
  updateDoc, doc, setDoc, getDoc, deleteDoc, orderBy, limit 
} from "firebase/firestore";
import { firebaseConfig } from "./firebaseConfig";
import { Question, Theme, Difficulty, UserProfile } from './types';

// Inicialização do Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore = getFirestore(app);

const USER_SESSION_KEY = 'pelada_session';

export const db = {
  // --- QUESTÕES (Firestore) ---
  getQuestions: async (theme?: Theme, onlyApproved: boolean = true): Promise<Question[]> => {
    try {
      const qRef = collection(firestore, "questions");
      let q;
      
      if (theme) {
        q = query(qRef, where("theme", "==", theme));
      } else {
        q = qRef;
      }

      const querySnapshot = await getDocs(q);
      let questions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
      
      if (onlyApproved) {
        questions = questions.filter(q => q.approved);
      }
      
      return questions; 
    } catch (e) {
      console.error("Erro ao buscar questões:", e);
      return [];
    }
  },

  getPendingQuestions: async (): Promise<Question[]> => {
    try {
      const q = query(collection(firestore, "questions"), where("approved", "==", false));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
    } catch (e) {
      return [];
    }
  },

  saveQuestion: async (question: Question): Promise<void> => {
    try {
      const { id, ...data } = question; // Não salvar o ID local como campo se o Firestore gerar um
      await addDoc(collection(firestore, "questions"), {
        ...data,
        approved: question.approved || false,
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      console.error("Erro ao salvar questão:", e);
    }
  },

  approveQuestion: async (id: string): Promise<void> => {
    const docRef = doc(firestore, "questions", id);
    await updateDoc(docRef, { approved: true });
  },

  deleteQuestion: async (id: string): Promise<void> => {
    await deleteDoc(doc(firestore, "questions", id));
  },

  // --- USUÁRIOS & PERFIL ---
  getCurrentUser: (): UserProfile | null => {
    const raw = localStorage.getItem(USER_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  setCurrentUser: (user: UserProfile | null) => {
    if (user) {
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
      db.syncUserToFirestore(user);
    } else {
      localStorage.removeItem(USER_SESSION_KEY);
    }
  },

  syncUserToFirestore: async (user: UserProfile) => {
    try {
      const userRef = doc(firestore, "users", user.uid);
      await setDoc(userRef, user, { merge: true });
    } catch (e) {
      console.error("Erro na sincronização:", e);
    }
  },

  getUserFromFirestore: async (uid: string): Promise<UserProfile | null> => {
    try {
      const docRef = doc(firestore, "users", uid);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? (docSnap.data() as UserProfile) : null;
    } catch (e) {
      return null;
    }
  },

  getAllUsers: async (): Promise<UserProfile[]> => {
    const querySnapshot = await getDocs(collection(firestore, "users"));
    return querySnapshot.docs.map(doc => doc.data() as UserProfile);
  },

  toggleUserAdmin: async (uid: string) => {
    const userRef = doc(firestore, "users", uid);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserProfile;
      const newRole = userData.role === 'admin' ? 'user' : 'admin';
      await updateDoc(userRef, { role: newRole });
      
      const current = db.getCurrentUser();
      if (current && current.uid === uid) {
        db.setCurrentUser({ ...current, role: newRole });
      }
    }
  },

  saveScore: async (uid: string, theme: Theme, points: number) => {
    const userRef = doc(firestore, "users", uid);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserProfile;
      const newScores = [...(userData.scores || []), { theme, points, date: new Date().toISOString() }];
      await updateDoc(userRef, { scores: newScores });
      
      const current = db.getCurrentUser();
      if (current && current.uid === uid) {
        db.setCurrentUser({ ...current, scores: newScores });
      }
    }
  },

  logout: async () => {
    await signOut(auth);
    localStorage.removeItem(USER_SESSION_KEY);
  }
};
