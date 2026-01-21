
import { initializeApp } from "firebase/app";
import { 
  getAuth, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile 
} from "firebase/auth";
import { 
  getFirestore, collection, addDoc, getDocs, query, where, 
  updateDoc, doc, setDoc, getDoc, deleteDoc
} from "firebase/firestore";
import { firebaseConfig } from "./firebaseConfig";
import { Question, Theme, UserProfile } from './types';

// Inicialização do Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore = getFirestore(app);

const USER_SESSION_KEY = 'pelada_session_v2';

export const db = {
  // --- QUESTÕES ---
  getQuestions: async (theme: Theme): Promise<Question[]> => {
    try {
      const qRef = collection(firestore, "questions");
      const q = query(qRef, where("theme", "==", theme), where("approved", "==", true));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Question));
    } catch (e) {
      console.error("Erro Firestore:", e);
      return [];
    }
  },

  getPendingQuestions: async (): Promise<Question[]> => {
    const q = query(collection(firestore, "questions"), where("approved", "==", false));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Question));
  },

  saveQuestion: async (q: Question) => {
    const { id, ...data } = q;
    await addDoc(collection(firestore, "questions"), { ...data, createdAt: new Date().toISOString() });
  },

  approveQuestion: async (id: string) => {
    await updateDoc(doc(firestore, "questions", id), { approved: true });
  },

  deleteQuestion: async (id: string) => {
    await deleteDoc(doc(firestore, "questions", id));
  },

  // --- AUTH ---
  login: async (email: string, pass: string): Promise<UserProfile | null> => {
    const res = await signInWithEmailAndPassword(auth, email, pass);
    return await db.getUserFromFirestore(res.user.uid);
  },

  register: async (email: string, pass: string, name: string): Promise<UserProfile | null> => {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(res.user, { displayName: name });
    const profile: UserProfile = {
      uid: res.user.uid,
      email,
      displayName: name,
      role: email === firebaseConfig.adminEmail ? 'admin' : 'user',
      scores: []
    };
    await db.syncUserToFirestore(profile);
    return profile;
  },

  logout: async () => {
    await signOut(auth);
    localStorage.removeItem(USER_SESSION_KEY);
  },

  // --- PERFIL ---
  getCurrentUser: (): UserProfile | null => {
    const raw = localStorage.getItem(USER_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  setCurrentUser: (user: UserProfile | null) => {
    if (user) localStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_SESSION_KEY);
  },

  syncUserToFirestore: async (user: UserProfile) => {
    await setDoc(doc(firestore, "users", user.uid), user, { merge: true });
  },

  getUserFromFirestore: async (uid: string): Promise<UserProfile | null> => {
    const snap = await getDoc(doc(firestore, "users", uid));
    return snap.exists() ? (snap.data() as UserProfile) : null;
  },

  getGlobalRanking: async (): Promise<UserProfile[]> => {
    const snap = await getDocs(collection(firestore, "users"));
    const users = snap.docs.map(d => d.data() as UserProfile);
    return users.sort((a, b) => {
      const sumA = (a.scores || []).reduce((acc, curr) => acc + curr.points, 0);
      const sumB = (b.scores || []).reduce((acc, curr) => acc + curr.points, 0);
      return sumB - sumA;
    }).slice(0, 10);
  },

  saveScore: async (uid: string, theme: Theme, points: number) => {
    const userRef = doc(firestore, "users", uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      const newScores = [...(data.scores || []), { theme, points, date: new Date().toISOString() }];
      await updateDoc(userRef, { scores: newScores });
      const current = db.getCurrentUser();
      if (current && current.uid === uid) db.setCurrentUser({ ...current, scores: newScores });
    }
  }
};
