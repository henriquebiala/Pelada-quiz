
export enum Difficulty {
  FACIL = 'fácil',
  MEDIO = 'médio',
  DIFICIL = 'difícil'
}

export enum Theme {
  MUNDIAL = 'Futebol Mundial',
  AFRICANO = 'Futebol Africano',
  ANGOLANO = 'Futebol Angolano',
  EUROPEU = 'Ligas Europeias',
  COPA = 'Copas do Mundo',
  JOGADORES = 'Jogadores Históricos',
  CLUBES = 'Clubes Históricos'
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  theme: Theme;
  subtheme: string;
  difficulty: Difficulty;
  approved: boolean;
  suggestedBy?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  scores: Array<{
    theme: Theme;
    points: number;
    date: string;
  }>;
}

export interface GameState {
  currentTheme: Theme | null;
  questions: Question[];
  currentIndex: number;
  score: number;
  isFinished: boolean;
}
