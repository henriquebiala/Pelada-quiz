import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, Home, Settings, LogOut, ShieldCheck, User, MessageSquarePlus, 
  Play, CheckCircle, XCircle, Star, Target, Volume2, VolumeX, 
  AlertTriangle, RefreshCcw, Mail, Lock, UserPlus, LogIn, Plus, Trash2, Users, FileText, ChevronLeft,
  Globe, Flag, Calendar, Users as UsersIcon, Shield, LayoutGrid, Heart
} from 'lucide-react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { Theme, Question, UserProfile, Difficulty } from './types';
import { db, auth } from './dbService';
import { generateQuestions } from './geminiService';

const SOUND_URLS = {
  correct: 'https://assets.mixkit.co/active_storage/sfx/600/600-preview.mp3',
  incorrect: 'https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3',
  next: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  ambient: 'https://cdn.pixabay.com/audio/2023/05/08/audio_24e3934d40.mp3' 
};

// --- Helpers ---
const getThemeIcon = (theme: Theme) => {
  switch(theme) {
    case Theme.MUNDIAL: return <Globe className="text-blue-500" />;
    case Theme.ANGOLANO: return <Flag className="text-red-500" />;
    case Theme.AFRICANO: return <Flag className="text-emerald-500" />;
    case Theme.COPA: return <Trophy className="text-amber-500" />;
    case Theme.CLUBES: return <Shield className="text-indigo-500" />;
    case Theme.JOGADORES: return <UsersIcon className="text-orange-500" />;
    case Theme.EUROPEU: return <Globe className="text-purple-500" />;
    default: return <Play className="text-emerald-500" />;
  }
};

// --- Componentes ---

const Navbar: React.FC<{ 
  user: UserProfile | null; 
  onLogout: () => void; 
  onOpenSettings: () => void;
  setView: (v: any) => void;
}> = ({ user, onLogout, onOpenSettings, setView }) => (
  <nav className="bg-slate-900/95 backdrop-blur-md text-white p-4 shadow-2xl sticky top-0 z-50 border-b border-white/10">
    <div className="max-w-6xl mx-auto flex justify-between items-center">
      <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('home')}>
        <div className="bg-emerald-500 p-2.5 rounded-2xl text-white shadow-lg shadow-emerald-500/40 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
          <Trophy size={22} />
        </div>
        <div>
          <h1 className="font-black text-2xl tracking-tighter uppercase italic bg-gradient-to-r from-white via-emerald-200 to-emerald-400 bg-clip-text text-transparent leading-none">Bom de Bola</h1>
          <p className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest mt-0.5">O Quiz de Elite</p>
        </div>
      </div>
      {user && (
        <div className="flex items-center gap-3">
          <button onClick={() => setView('ranking')} className="p-2.5 text-amber-400 hover:bg-white/10 rounded-xl transition-all hover:scale-105 active:scale-95" title="Ranking Global">
            <LayoutGrid size={22} />
          </button>
          <button onClick={() => setView('profile')} className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 hover:bg-white/10 rounded-full transition-all border border-white/10 group">
            <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-black group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/20">
              {user.displayName[0].toUpperCase()}
            </div>
            <span className="text-xs font-bold tracking-tight">{user.displayName}</span>
          </button>
          <button onClick={onOpenSettings} className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-emerald-400 hover:scale-105 active:scale-95">
            <Settings size={22} />
          </button>
          <button onClick={onLogout} className="p-2.5 text-white/40 hover:text-red-400 transition-colors hover:scale-105 active:scale-95">
            <LogOut size={22} />
          </button>
        </div>
      )}
    </div>
  </nav>
);

const Footer: React.FC = () => (
  <footer className="mt-20 py-12 text-center border-t border-slate-100 bg-white/50 backdrop-blur-sm">
    <div className="max-w-6xl mx-auto px-4">
      <div className="flex flex-col items-center gap-4">
        <div className="bg-slate-100 p-3 rounded-2xl text-slate-400 mb-2">
          <Trophy size={20} />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Equipe Técnica</p>
          <p className="text-[13px] font-black text-slate-900 uppercase italic tracking-tighter">
            Desenvolvido por <span className="text-emerald-600">Henrique Biala</span>
          </p>
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <Shield size={12} className="text-amber-500" />
            <p className="text-[10px] font-bold uppercase tracking-widest">
              Testado por Rúben Barros e Ermenegildo Perez
            </p>
          </div>
        </div>
        <p className="mt-4 text-[9px] font-black text-slate-300 uppercase tracking-[0.5em]">Angola &copy; 2025 • Versão Pro</p>
      </div>
    </div>
  </footer>
);

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(db.getCurrentUser());
  const [view, setView] = useState<'home' | 'quiz' | 'results' | 'admin' | 'suggest' | 'profile' | 'gameover' | 'settings' | 'ranking'>('home');
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const ambient = useRef<HTMLAudioElement | null>(null);
  const audioCorrect = useRef<HTMLAudioElement | null>(null);
  const audioIncorrect = useRef<HTMLAudioElement | null>(null);
  const audioNext = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        let profile = await db.getUserFromFirestore(fbUser.uid);
        if (!profile) {
          profile = {
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Craque',
            role: fbUser.email === 'admin@bola.com' ? 'admin' : 'user',
            scores: []
          };
          await db.syncUserToFirestore(profile);
        }
        setUser(profile);
        db.setCurrentUser(profile);
      } else {
        setUser(null);
        db.setCurrentUser(null);
      }
      setIsInitializing(false);
    });

    ambient.current = new Audio(SOUND_URLS.ambient); ambient.current.loop = true; ambient.current.volume = 0.05;
    audioCorrect.current = new Audio(SOUND_URLS.correct); audioIncorrect.current = new Audio(SOUND_URLS.incorrect);
    audioNext.current = new Audio(SOUND_URLS.next);

    return () => {
      unsubscribe();
      if (ambient.current) ambient.current.pause();
    };
  }, []);

  const playSound = (t: 'correct' | 'incorrect' | 'next') => {
    if (isMuted) return;
    const a = t === 'correct' ? audioCorrect.current : t === 'incorrect' ? audioIncorrect.current : audioNext.current;
    if (a) { a.currentTime = 0; a.play().catch(() => {}); }
  };

  const ensureMusic = () => { 
    if (ambient.current && !isMuted && user) {
      ambient.current.play().catch(() => {});
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-6 shadow-[0_0_20px_rgba(16,185,129,0.3)]"></div>
          <p className="text-emerald-500 font-black uppercase tracking-widest text-[10px] animate-pulse">Entrando em Campo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-emerald-500 selection:text-white" onClick={ensureMusic}>
      <Navbar user={user} onLogout={() => db.logout().then(() => { setUser(null); setView('home'); })} onOpenSettings={() => setView('settings')} setView={setView} />
      
      <main className="flex-grow mt-4 md:mt-8 px-4">
        {!user ? (
          <AuthView onLogin={(u) => { setUser(u); setView('home'); }} />
        ) : (
          <div className="max-w-6xl mx-auto">
            {view === 'settings' && <SettingsView user={user} isMuted={isMuted} onToggleMute={() => setIsMuted(!isMuted)} onViewChange={setView} onClose={() => setView('home')} />}
            {view === 'home' && <HomeView onSelectTheme={(t) => { setSelectedTheme(t); setView('quiz'); }} onShowRanking={() => setView('ranking')} />}
            {view === 'ranking' && <RankingView onBack={() => setView('home')} />}
            {view === 'quiz' && selectedTheme && <QuizView theme={selectedTheme} onFinish={s => { setFinalScore(s); db.saveScore(user.uid, selectedTheme, s); setView('results'); }} onGameOver={s => { setFinalScore(s); db.saveScore(user.uid, selectedTheme, s); setView('gameover'); }} playSound={playSound} />}
            {view === 'admin' && <AdminView onBack={() => setView('settings')} />}
            {view === 'suggest' && <SuggestView user={user} onBack={() => setView('settings')} />}
            {view === 'profile' && <ProfileView user={user} onBack={() => setView('settings')} />}
            
            {view === 'results' && (
              <div className="p-4 flex items-center justify-center min-h-[70vh] animate-scale-up text-center">
                <div className="bg-white rounded-[4rem] shadow-2xl p-12 border border-slate-100 max-w-md w-full relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-50 rounded-full blur-3xl opacity-60"></div>
                  <div className="text-8xl mb-8 animate-bounce">🏆</div>
                  <h2 className="text-5xl font-black text-slate-900 mb-2 italic uppercase tracking-tighter">Golaço!</h2>
                  <p className="text-slate-400 font-bold mb-10 text-sm">Você dominou o gramado com maestria.</p>
                  <div className="bg-emerald-600 text-white px-14 py-10 rounded-[3.5rem] inline-block mb-10 shadow-[0_20px_40px_rgba(5,150,105,0.4)] relative">
                    <p className="text-7xl font-black leading-none">{finalScore}</p>
                    <p className="text-[10px] font-black uppercase mt-2 opacity-70 tracking-[0.3em]">Pontos Totais</p>
                  </div>
                  <button onClick={() => setView('home')} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black shadow-xl uppercase tracking-widest italic hover:bg-emerald-600 transition-all hover:scale-[1.02] active:scale-95">Próximo Campeonato</button>
                </div>
              </div>
            )}
            
            {view === 'gameover' && (
              <div className="px-4 flex items-center justify-center min-h-[70vh] animate-scale-up text-center">
                <div className="bg-white rounded-[4rem] shadow-2xl p-12 max-w-md w-full border-2 border-red-50 relative overflow-hidden">
                  <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-red-50 rounded-full blur-3xl opacity-60"></div>
                  <div className="bg-red-500 w-24 h-24 rounded-[2.5rem] flex items-center justify-center text-white mx-auto mb-8 shadow-2xl shadow-red-500/40 animate-pulse relative z-10"><XCircle size={56} /></div>
                  <h2 className="text-4xl font-black text-red-900 mb-2 italic uppercase tracking-tighter">Cartão Vermelho!</h2>
                  <p className="text-slate-400 font-bold mb-10 text-sm">O juiz não perdoou o seu erro fatal.</p>
                  <div className="bg-red-50 p-10 rounded-[3.5rem] mb-10 border-2 border-red-100/50">
                    <p className="text-6xl font-black text-red-900 tabular-nums">{finalScore}</p>
                    <p className="text-[10px] font-black uppercase mt-2 text-red-400 tracking-widest">Placar Final</p>
                  </div>
                  <button onClick={() => setView('home')} className="w-full py-6 bg-red-600 text-white rounded-[2rem] font-black shadow-2xl uppercase tracking-widest italic flex items-center justify-center gap-3 hover:bg-red-700 transition-all hover:scale-[1.02] active:scale-95"><RefreshCcw size={22} /> Tentar Revanche</button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {view !== 'quiz' && <Footer />}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes shakeHorizontal { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-8px); } 75% { transform: translateX(8px); } }
        @keyframes flashCorrect { 0% { background-color: transparent; } 50% { background-color: rgba(16, 185, 129, 0.15); } 100% { background-color: transparent; } }
        @keyframes flashIncorrect { 0% { background-color: transparent; } 50% { background-color: rgba(239, 68, 68, 0.15); } 100% { background-color: transparent; } }
        .animate-fade-in { animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-scale-up { animation: scaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .shake-horizontal { animation: shakeHorizontal 0.1s linear 3; }
        .flash-correct { animation: flashCorrect 0.6s ease-out; }
        .flash-incorrect { animation: flashIncorrect 0.6s ease-out; }
      `}</style>
    </div>
  );
};

// --- Sub-componentes ---

const SettingsView: React.FC<{ 
  user: UserProfile; 
  isMuted: boolean; 
  onToggleMute: () => void; 
  onViewChange: (v: any) => void;
  onClose: () => void;
}> = ({ user, isMuted, onToggleMute, onViewChange, onClose }) => (
  <div className="max-w-md mx-auto animate-scale-up mt-12 p-4">
    <div className="bg-white p-12 rounded-[4.5rem] shadow-2xl border border-slate-100 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-10 text-emerald-500/5 -rotate-12"><Settings size={140} /></div>
      <div className="flex justify-between items-center mb-10 relative z-10">
        <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Vestiário</h2>
        <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-2xl transition-all"><XCircle size={24} /></button>
      </div>
      
      <div className="space-y-4 relative z-10">
        <button onClick={onToggleMute} className="w-full flex items-center justify-between p-6 bg-slate-50 rounded-[2.5rem] border-2 border-slate-50 hover:border-emerald-200 transition-all group">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-2xl text-emerald-500 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
              {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </div>
            <span className="font-black text-slate-800 uppercase italic text-sm tracking-tight">{isMuted ? 'Áudio Mutado' : 'Áudio Ativado'}</span>
          </div>
          <div className={`w-12 h-6 rounded-full transition-colors relative ${isMuted ? 'bg-slate-300' : 'bg-emerald-500'}`}>
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isMuted ? 'left-1' : 'left-7'}`}></div>
          </div>
        </button>

        <button onClick={() => onViewChange('profile')} className="w-full flex items-center justify-between p-6 bg-slate-50 rounded-[2.5rem] border-2 border-slate-50 hover:border-emerald-200 transition-all group">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-2xl text-emerald-500 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
              <User size={24} />
            </div>
            <span className="font-black text-slate-800 uppercase italic text-sm tracking-tight">Meu Perfil</span>
          </div>
          <ChevronLeft className="rotate-180 text-slate-300" size={20} />
        </button>

        <button onClick={() => onViewChange('suggest')} className="w-full flex items-center justify-between p-6 bg-slate-50 rounded-[2.5rem] border-2 border-slate-50 hover:border-emerald-200 transition-all group">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-2xl text-emerald-500 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
              <MessageSquarePlus size={24} />
            </div>
            <span className="font-black text-slate-800 uppercase italic text-sm tracking-tight">Sugerir Pergunta</span>
          </div>
          <ChevronLeft className="rotate-180 text-slate-300" size={20} />
        </button>

        {user.role === 'admin' && (
          <button onClick={() => onViewChange('admin')} className="w-full flex items-center justify-between p-6 bg-emerald-50 rounded-[2.5rem] border-2 border-emerald-100 hover:bg-emerald-100 transition-all group">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-2xl text-amber-500 shadow-sm border border-amber-100 group-hover:scale-110 transition-transform">
                <ShieldCheck size={24} />
              </div>
              <span className="font-black text-emerald-900 uppercase italic text-sm tracking-tight">Painel Admin (VAR)</span>
            </div>
            <ChevronLeft className="rotate-180 text-emerald-400" size={20} />
          </button>
        )}
      </div>

      <button onClick={onClose} className="mt-12 w-full py-6 bg-slate-900 text-white rounded-[2.2rem] font-black uppercase tracking-[0.4em] italic shadow-2xl hover:bg-emerald-600 transition-all active:scale-95">Voltar ao Gramado</button>
    </div>
  </div>
);

const AuthView: React.FC<{ onLogin: (u: UserProfile) => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [load, setLoad] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: any) => {
    e.preventDefault();
    setLoad(true);
    setError('');
    try {
      if (isSignUp) {
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        const profile: UserProfile = {
          uid: res.user.uid,
          email,
          displayName: name || email.split('@')[0],
          role: email === 'admin@bola.com' ? 'admin' : 'user',
          scores: []
        };
        await db.syncUserToFirestore(profile);
        onLogin(profile);
      } else {
        const res = await signInWithEmailAndPassword(auth, email, pass);
        const profile = await db.getUserFromFirestore(res.user.uid);
        if (profile) onLogin(profile);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.code === 'auth/user-not-found' ? 'Usuário não convocado.' : 'Erro na escalação do time.');
    } finally {
      setLoad(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[85vh] px-4">
      <div className="bg-white p-10 md:p-14 rounded-[4.5rem] shadow-[0_30px_60px_rgba(15,23,42,0.15)] w-full max-w-md text-center animate-scale-up border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2.5 bg-gradient-to-r from-emerald-600 via-emerald-300 to-emerald-600"></div>
        <div className="inline-block p-6 bg-emerald-600 text-white rounded-[2.5rem] mb-8 shadow-2xl shadow-emerald-600/30 ring-8 ring-emerald-50"><Trophy size={44} /></div>
        <h2 className="text-5xl font-black text-slate-900 mb-2 italic uppercase tracking-tighter">Bom de Bola</h2>
        <p className="text-emerald-500 font-black uppercase text-[9px] tracking-[0.6em] mb-12">{isSignUp ? 'Inscrição de Novo Atleta' : 'O Quiz Oficial do Futebol'}</p>
        
        {error && <div className="bg-red-50 text-red-500 text-[11px] font-bold uppercase p-4 rounded-2xl mb-8 border border-red-100 animate-pulse">{error}</div>}

        <form onSubmit={handleAuth} className="space-y-5">
          {isSignUp && (
            <div className="relative group">
              <User className="absolute left-6 top-6 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={20} />
              <input required className="w-full pl-16 pr-8 py-6 bg-slate-50 border-2 border-slate-50 rounded-[2rem] outline-none focus:border-emerald-500 focus:bg-white font-bold text-sm transition-all shadow-sm" placeholder="NOME DO JOGADOR" type="text" value={name} onChange={e => setName(e.target.value)} />
            </div>
          )}
          <div className="relative group">
            <Mail className="absolute left-6 top-6 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={20} />
            <input required className="w-full pl-16 pr-8 py-6 bg-slate-50 border-2 border-slate-50 rounded-[2rem] outline-none focus:border-emerald-500 focus:bg-white font-bold text-sm transition-all shadow-sm" placeholder="SEU EMAIL" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="relative group">
            <Lock className="absolute left-6 top-6 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={20} />
            <input required className="w-full pl-16 pr-8 py-6 bg-slate-50 border-2 border-slate-50 rounded-[2rem] outline-none focus:border-emerald-500 focus:bg-white font-bold text-sm transition-all shadow-sm" placeholder="SUA SENHA" type="password" value={pass} onChange={e => setPass(e.target.value)} />
          </div>
          <button disabled={load} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black shadow-2xl hover:bg-emerald-600 transition-all uppercase tracking-widest italic flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 mt-4">
            {load ? <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div> : (isSignUp ? <UserPlus size={22} /> : <LogIn size={22} />)}
            {load ? '' : (isSignUp ? 'Realizar Inscrição' : 'Entrar em Campo')}
          </button>
        </form>

        <button onClick={() => setIsSignUp(!isSignUp)} className="mt-8 text-[10px] font-black uppercase text-slate-400 hover:text-emerald-600 transition-colors tracking-widest">
          {isSignUp ? 'Já tem uma conta? Faça Login' : 'Ainda não joga? Inscreva-se'}
        </button>

        <p className="mt-12 text-[9px] text-slate-300 font-black uppercase tracking-widest italic leading-relaxed">Desenvolvido para os apaixonados por futebol<br/>Angola • África • Mundo</p>
      </div>
    </div>
  );
};

const HomeView: React.FC<{ onSelectTheme: (t: Theme) => void, onShowRanking: () => void }> = ({ onSelectTheme, onShowRanking }) => (
  <div className="max-w-6xl mx-auto py-12 md:py-20">
    <div className="text-center mb-16 animate-fade-in px-4">
      <div className="inline-block px-6 py-2 bg-emerald-100 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 shadow-sm">Temporada 2025 Aberta</div>
      <h2 className="text-6xl md:text-8xl font-black text-slate-900 mb-8 tracking-tighter italic uppercase leading-none">Bom de <span className="text-emerald-500 underline decoration-8 underline-offset-12">Bola?</span></h2>
      <p className="text-slate-400 text-xs font-black uppercase tracking-[0.5em] max-w-xl mx-auto leading-relaxed opacity-80 mb-10">Acerte o passe para avançar. No futebol, o conhecimento é o seu melhor drible.</p>
      
      <button onClick={onShowRanking} className="group inline-flex items-center gap-4 bg-amber-500 text-white px-10 py-5 rounded-[2rem] font-black uppercase italic tracking-widest shadow-xl shadow-amber-500/30 hover:bg-amber-600 transition-all hover:scale-105 active:scale-95">
        <Trophy size={24} className="group-hover:rotate-12 transition-transform" />
        Ranking dos Craques
      </button>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 px-4 md:px-2">
      {Object.values(Theme).map((theme) => (
        <button key={theme} onClick={() => onSelectTheme(theme)} className="group relative flex flex-col p-12 bg-white border border-slate-100 rounded-[4rem] shadow-xl hover:shadow-[0_40px_80px_rgba(15,23,42,0.1)] hover:-translate-y-3 transition-all duration-500 text-left overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-slate-50 rounded-full opacity-0 group-hover:opacity-100 group-hover:scale-150 transition-all duration-700"></div>
          <div className="bg-emerald-50 w-20 h-20 rounded-[2.2rem] flex items-center justify-center mb-10 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300 shadow-md">
            {React.cloneElement(getThemeIcon(theme) as React.ReactElement, { size: 32, className: "group-hover:text-white transition-colors" })}
          </div>
          <h3 className="text-3xl font-black text-slate-800 mb-3 uppercase italic tracking-tighter leading-tight">{theme}</h3>
          <p className="text-[11px] text-emerald-500 font-black uppercase tracking-widest flex items-center gap-3 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
            Jogar Partida <ChevronLeft className="rotate-180" size={16} />
          </p>
        </button>
      ))}
    </div>
  </div>
);

const RankingView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [ranking, setRanking] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.getGlobalRanking().then(res => {
      setRanking(res);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-4 animate-fade-in mt-10">
      <div className="bg-white rounded-[4rem] shadow-2xl overflow-hidden border border-slate-100">
        <div className="bg-amber-500 p-12 text-white flex justify-between items-center relative">
          <div className="absolute top-0 right-0 p-12 text-white/20"><Trophy size={120} /></div>
          <div className="relative z-10">
            <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-none mb-2">Hall da Fama</h2>
            <p className="text-[11px] text-white/80 font-black uppercase tracking-[0.5em]">Os 10 Maiores Pontuadores</p>
          </div>
          <button onClick={onBack} className="p-4 hover:bg-white/20 rounded-2xl bg-white/10 transition-all relative z-10"><XCircle size={28} /></button>
        </div>
        
        <div className="p-10 space-y-4">
          {loading ? (
            <div className="py-20 text-center animate-pulse text-slate-400 font-black uppercase tracking-widest">Calculando Placar...</div>
          ) : (
            ranking.map((u, i) => {
              const totalPoints = (u.scores || []).reduce((acc, curr) => acc + curr.points, 0);
              return (
                <div key={u.uid} className={`flex justify-between items-center p-6 rounded-[2.5rem] border-2 transition-all ${i === 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-50 hover:bg-white hover:border-emerald-100'}`}>
                  <div className="flex items-center gap-6">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg border-2 ${i === 0 ? 'bg-amber-500 text-white border-amber-400' : i === 1 ? 'bg-slate-300 text-white border-slate-200' : i === 2 ? 'bg-orange-400 text-white border-orange-300' : 'bg-slate-900 text-emerald-400 border-slate-800'}`}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-black text-slate-800 uppercase italic tracking-tighter text-lg">{u.displayName}</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{u.scores?.length || 0} Partidas Disputadas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-4xl font-black tabular-nums leading-none ${i === 0 ? 'text-amber-600' : 'text-slate-900'}`}>{totalPoints}</p>
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">Pontos Acumulados</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      <button onClick={onBack} className="mt-10 w-full py-6 text-slate-400 text-[11px] font-black uppercase tracking-[0.4em] hover:text-slate-900 transition-colors">Voltar ao Gramado</button>
    </div>
  );
};

const QuizView: React.FC<{ 
  theme: Theme; 
  onFinish: (score: number) => void;
  onGameOver: (score: number) => void;
  playSound: (type: 'correct' | 'incorrect' | 'next') => void;
}> = ({ theme, onFinish, onGameOver, playSound }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const local = await db.getQuestions(theme);
        let combined = [...local];
        if (combined.length < 5) {
          const aiQs = await generateQuestions(theme, 10);
          combined = [...combined, ...aiQs];
        }
        setQuestions(combined.sort(() => Math.random() - 0.5).slice(0, 15));
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [theme]);

  const handleAnswer = (option: string) => {
    if (feedback) return;
    setSelectedOption(option);
    const correct = option === questions[currentIndex].correctAnswer;
    if (correct) {
      setFeedback('correct'); playSound('correct');
      setTimeout(() => {
        if (currentIndex + 1 >= questions.length) onFinish((currentIndex + 1) * 10);
        else {
          setCurrentIndex(i => i + 1); setSelectedOption(null); setFeedback(null); playSound('next');
        }
      }, 900);
    } else {
      setFeedback('incorrect'); playSound('incorrect');
      setTimeout(() => onGameOver(currentIndex * 10), 900);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <div className="relative mb-10">
        <div className="w-24 h-24 border-8 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin shadow-2xl"></div>
        <Trophy className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-500 animate-pulse" size={32} />
      </div>
      <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.5em] animate-pulse">Escalando o time de perguntas...</p>
    </div>
  );

  const q = questions[currentIndex];
  const progress = ((currentIndex) / questions.length) * 100;

  return (
    <div className={`max-w-3xl mx-auto p-4 animate-fade-in transition-all duration-500 ${feedback === 'correct' ? 'flash-correct' : feedback === 'incorrect' ? 'flash-incorrect' : ''}`}>
      <div className="mb-8 flex justify-between items-center bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-100 relative overflow-hidden group">
        <div className="absolute bottom-0 left-0 h-1.5 bg-emerald-500 transition-all duration-1000 ease-out" style={{ width: `${progress}%` }}></div>
        <div className="absolute bottom-0 left-0 w-full h-1.5 bg-slate-100"></div>
        <div className="flex gap-6 items-center relative z-10">
           <div className="bg-slate-900 text-white w-16 h-16 rounded-[1.8rem] flex items-center justify-center font-black italic shadow-2xl text-2xl group-hover:rotate-12 transition-transform duration-500">{currentIndex + 1}</div>
           <div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{theme}</p>
             <p className="text-lg font-black text-slate-800 uppercase italic tracking-tighter">Passe de Mestre</p>
           </div>
        </div>
        <div className="text-right relative z-10">
          <p className="text-4xl font-black text-emerald-600 tabular-nums leading-none drop-shadow-sm">{currentIndex * 10}</p>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">Golos Marcados</p>
        </div>
      </div>

      <div className="bg-white rounded-[4.5rem] shadow-[0_40px_100px_rgba(15,23,42,0.12)] p-12 md:p-20 border border-slate-50 relative overflow-hidden">
        <div className="mb-14 relative">
          <span className="absolute -left-10 -top-10 text-emerald-500/5 font-black text-[12rem] pointer-events-none select-none">?</span>
          <h3 className="text-3xl md:text-5xl font-black text-slate-900 leading-[1.05] tracking-tighter relative z-10">{q.text}</h3>
        </div>
        
        <div className="grid grid-cols-1 gap-5">
          {q.options.map((opt, i) => (
            <button
              key={i}
              disabled={!!feedback}
              onClick={() => handleAnswer(opt)}
              className={`group w-full p-8 rounded-[2.5rem] text-left font-black transition-all border-2 flex justify-between items-center relative overflow-hidden
                ${selectedOption === opt ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-50 bg-slate-50 hover:bg-white hover:border-emerald-200 hover:shadow-xl'}
                ${feedback === 'correct' && opt === q.correctAnswer ? '!bg-emerald-600 !border-emerald-600 !text-white !shadow-[0_20px_40px_rgba(5,150,105,0.3)] scale-[1.02]' : ''}
                ${feedback === 'incorrect' && selectedOption === opt && opt !== q.correctAnswer ? '!bg-red-500 !border-red-500 !text-white shake-horizontal' : ''}
              `}
            >
              <span className="text-xl relative z-10">{opt}</span>
              <div className="relative z-10">
                {feedback === 'correct' && opt === q.correctAnswer && <CheckCircle size={32} className="animate-scale-up" />}
                {feedback === 'incorrect' && selectedOption === opt && opt !== q.correctAnswer && <XCircle size={32} className="animate-scale-up" />}
                {!feedback && <div className="w-8 h-8 rounded-full border-2 border-slate-200 group-hover:border-emerald-400 group-hover:bg-emerald-50 transition-all duration-300"></div>}
              </div>
            </button>
          ))}
        </div>
      </div>
      
      <p className="text-center mt-14 text-[11px] font-black text-slate-300 uppercase tracking-[0.6em] italic animate-pulse">Cuidado com o fora de jogo!</p>
    </div>
  );
};

const ProfileView: React.FC<{ user: UserProfile, onBack: () => void }> = ({ user, onBack }) => (
  <div className="max-w-md mx-auto animate-scale-up mt-12 p-4">
    <div className="bg-white p-12 rounded-[4.5rem] shadow-2xl text-center border border-slate-100 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-10 text-emerald-500/5 rotate-12"><Trophy size={140} /></div>
      <div className="bg-slate-900 w-28 h-28 rounded-[3rem] flex items-center justify-center mx-auto mb-8 text-emerald-400 font-black text-5xl shadow-2xl border-6 border-emerald-50 group transition-transform hover:scale-110 duration-500">
        {user.displayName[0].toUpperCase()}
      </div>
      <h2 className="text-3xl font-black text-slate-900 break-all mb-1.5 tracking-tighter uppercase italic">{user.displayName}</h2>
      <p className="text-slate-400 text-sm font-bold mb-6 opacity-60">{user.email}</p>
      <div className="inline-block bg-emerald-100 text-emerald-600 px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.2em] mb-12 shadow-sm border border-emerald-200">{user.role} de Elite</div>
      
      <div className="space-y-4 text-left">
         <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-6">
            <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-900">Histórico de Partidas</h3>
            <div className="bg-slate-50 p-2 rounded-xl text-emerald-500"><Target size={20} /></div>
         </div>
         {(!user.scores || user.scores.length === 0) ? (
           <div className="py-16 text-center">
             <div className="text-slate-100 mb-6"><Shield size={56} className="mx-auto" /></div>
             <p className="text-slate-300 italic text-xs font-black uppercase tracking-[0.3em] leading-relaxed">Você ainda não entrou no campo oficial.</p>
           </div>
         ) : (
           user.scores.slice(-5).reverse().map((s, i) => (
             <div key={i} className="flex justify-between items-center p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 transition-all hover:bg-white hover:shadow-2xl hover:scale-[1.02]">
               <div className="flex items-center gap-4">
                 <div className="bg-white p-3 rounded-2xl text-emerald-500 shadow-sm border border-slate-100">{getThemeIcon(s.theme as Theme)}</div>
                 <div>
                    <span className="text-slate-800 font-black text-sm uppercase italic block leading-none mb-1.5">{s.theme}</span>
                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{new Date(s.date).toLocaleDateString('pt-AO')}</span>
                 </div>
               </div>
               <div className="text-right">
                 <span className="text-emerald-600 font-black text-3xl tabular-nums leading-none">{s.points}</span>
                 <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-1">PTS</p>
               </div>
             </div>
           ))
         )}
      </div>
      <button onClick={onBack} className="mt-14 w-full py-6 bg-slate-100 text-slate-600 font-black rounded-[2.2rem] text-[11px] uppercase tracking-[0.4em] hover:bg-slate-900 hover:text-white transition-all shadow-sm active:scale-95">Voltar para o Menu</button>
    </div>
  </div>
);

const AdminView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [tab, setTab] = useState<'var' | 'membros'>('var');
  const [pending, setPending] = useState<Question[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    db.getPendingQuestions().then(setPending);
    db.getAllUsers().then(setUsers);
  }, [refresh]);

  return (
    <div className="max-w-4xl mx-auto p-4 animate-fade-in">
      <div className="bg-white rounded-[4rem] shadow-2xl overflow-hidden border border-slate-100">
        <div className="bg-slate-900 p-12 text-white flex justify-between items-center">
          <div>
            <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-none mb-2">VAR Central</h2>
            <p className="text-[11px] text-emerald-400 font-black uppercase tracking-[0.5em]">Gestão Administrativa Bom de Bola</p>
          </div>
          <button onClick={onBack} className="p-4 hover:bg-white/10 rounded-2xl bg-white/5 transition-all shadow-inner"><ChevronLeft size={28} /></button>
        </div>
        <div className="flex bg-slate-50 p-4 gap-4">
          <button onClick={() => setTab('var')} className={`flex-1 py-6 text-[12px] font-black uppercase tracking-[0.2em] rounded-[2.5rem] transition-all flex items-center justify-center gap-3 ${tab === 'var' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-500/30' : 'text-slate-400 bg-white border border-slate-100 hover:text-slate-600'}`}>
            <AlertTriangle size={18} /> Pendentes ({pending.length})
          </button>
          <button onClick={() => setTab('membros')} className={`flex-1 py-6 text-[12px] font-black uppercase tracking-[0.2em] rounded-[2.5rem] transition-all flex items-center justify-center gap-3 ${tab === 'membros' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-500/30' : 'text-slate-400 bg-white border border-slate-100 hover:text-slate-600'}`}>
            <Users size={18} /> Jogadores ({users.length})
          </button>
        </div>
        <div className="p-12">
          {tab === 'var' && (
            <div className="space-y-8">
              {pending.length === 0 ? (
                <div className="text-center py-32 text-slate-300">
                   <CheckCircle size={80} className="mx-auto mb-8 opacity-10" />
                   <p className="font-black uppercase text-xs tracking-[0.4em]">Decisões em dia no VAR.</p>
                </div>
              ) : (
                pending.map(q => (
                  <div key={q.id} className="p-8 bg-slate-50 rounded-[3rem] border-2 border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8 group hover:bg-white hover:border-emerald-200 transition-all duration-500">
                    <div className="flex-1">
                       <p className="text-lg font-black text-slate-800 mb-4 leading-tight uppercase italic group-hover:text-emerald-700 transition-colors">"{q.text}"</p>
                       <div className="flex flex-wrap gap-3">
                         <span className="text-[9px] font-black bg-white px-4 py-1.5 rounded-full uppercase text-slate-400 border border-slate-100 tracking-widest">{q.theme}</span>
                         <span className="text-[9px] font-black bg-emerald-50 px-4 py-1.5 rounded-full uppercase text-emerald-600 border border-emerald-100 tracking-widest">Autor: {q.suggestedBy}</span>
                       </div>
                    </div>
                    <div className="flex gap-4 shrink-0">
                      <button onClick={async () => { await db.approveQuestion(q.id); setRefresh(r => r+1); }} className="p-5 bg-emerald-600 text-white rounded-[1.5rem] hover:bg-emerald-700 shadow-xl shadow-emerald-500/20 active:scale-90 transition-all"><CheckCircle size={24} /></button>
                      <button onClick={async () => { await db.deleteQuestion(q.id); setRefresh(r => r+1); }} className="p-5 bg-red-500 text-white rounded-[1.5rem] hover:bg-red-600 shadow-xl shadow-red-500/20 active:scale-90 transition-all"><Trash2 size={24} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          {tab === 'membros' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {users.map(u => (
                 <div key={u.uid} className="flex justify-between items-center p-8 bg-white border-2 border-slate-100 rounded-[3rem] hover:border-emerald-100 hover:shadow-2xl transition-all duration-500">
                   <div className="flex items-center gap-5">
                     <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center font-black text-emerald-400 text-xl shadow-lg border-2 border-slate-800">{u.displayName[0].toUpperCase()}</div>
                     <div className="flex flex-col">
                       <p className="font-black text-slate-800 text-sm uppercase tracking-tighter truncate w-40">{u.displayName}</p>
                       <span className={`text-[9px] font-black uppercase tracking-widest mt-1.5 px-3 py-1 rounded-full border inline-block w-fit ${u.role === 'admin' ? 'text-amber-500 bg-amber-50 border-amber-100' : 'text-slate-400 bg-slate-50 border-slate-100'}`}>{u.role}</span>
                     </div>
                   </div>
                   <button onClick={() => db.toggleUserAdmin(u.uid).then(() => setRefresh(r => r+1))} className="text-[10px] font-black uppercase text-slate-900 bg-slate-100 px-5 py-3 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-95">
                     Alternar
                   </button>
                 </div>
               ))}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SuggestView: React.FC<{ user: UserProfile, onBack: () => void, adminMode?: boolean }> = ({ user, onBack, adminMode }) => {
  const [formData, setFormData] = useState({ text: '', correct: '', o2: '', o3: '', o4: '', theme: Theme.ANGOLANO });
  const [status, setStatus] = useState(false);

  const submit = async (e: any) => {
    e.preventDefault();
    const q: Question = {
      id: `q-${Date.now()}`,
      text: formData.text,
      options: [formData.correct, formData.o2, formData.o3, formData.o4].sort(() => Math.random() - 0.5),
      correctAnswer: formData.correct,
      theme: formData.theme,
      difficulty: Difficulty.MEDIO,
      subtheme: 'Comunidade',
      approved: !!adminMode,
      suggestedBy: user.email
    };
    await db.saveQuestion(q);
    setStatus(true);
  };

  if (status) return (
    <div className="text-center p-14 bg-white rounded-[5rem] shadow-[0_40px_100px_rgba(15,23,42,0.1)] animate-scale-up border border-slate-50 max-w-md mx-auto">
      <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-xl ring-8 ring-emerald-50"><CheckCircle size={48} /></div>
      <h3 className="text-4xl font-black text-slate-900 mb-3 italic uppercase tracking-tighter">Lance Registrado!</h3>
      <p className="text-slate-400 text-sm mb-12 leading-relaxed px-8 font-medium">{adminMode ? 'Pergunta injetada com sucesso no sistema oficial!' : 'Sua sugestão foi enviada para o VAR. Nossa equipe técnica analisará o lance em breve.'}</p>
      <button onClick={onBack} className="w-full py-6 bg-emerald-600 text-white rounded-[2.2rem] font-black shadow-2xl shadow-emerald-500/30 hover:bg-emerald-700 transition-all uppercase tracking-[0.2em] italic active:scale-95">Continuar no Jogo</button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="bg-white rounded-[4.5rem] shadow-2xl overflow-hidden border border-slate-50">
        <div className="bg-slate-900 p-10 text-white relative">
          <div className="absolute top-0 right-0 p-12 text-emerald-500/10"><MessageSquarePlus size={100} /></div>
          <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-1.5 relative z-10">Sugerir Pergunta</h2>
          <p className="text-[11px] text-emerald-400 font-black uppercase tracking-[0.5em] relative z-10">Olheiro de Talentos Bom de Bola</p>
        </div>
        <form onSubmit={submit} className="p-10 md:p-14 space-y-8">
          <div className="group">
            <label className="text-[11px] font-black uppercase text-slate-400 tracking-[0.3em] mb-3 block ml-6">O Que Você Quer Perguntar?</label>
            <textarea required placeholder="Ex: Qual clube angolano possui mais títulos do Girabola?" className="w-full p-8 bg-slate-50 rounded-[2.5rem] border-2 border-slate-50 outline-none text-base font-bold focus:border-emerald-500 focus:bg-white transition-all h-40 resize-none shadow-inner" value={formData.text} onChange={e => setFormData({...formData, text: e.target.value})} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="group">
              <label className="text-[11px] font-black uppercase text-emerald-500 tracking-[0.3em] mb-3 block ml-6">A Resposta Certa</label>
              <input required placeholder="Petro de Luanda" className="w-full p-6 bg-emerald-50/50 rounded-[2rem] border-2 border-emerald-100 outline-none text-base font-black text-emerald-700 focus:border-emerald-500 focus:bg-white transition-all" value={formData.correct} onChange={e => setFormData({...formData, correct: e.target.value})} />
            </div>
            <div className="group">
               <label className="text-[11px] font-black uppercase text-slate-400 tracking-[0.3em] mb-3 block ml-6">Escolha a Liga</label>
               <select className="w-full p-6 bg-slate-50 rounded-[2rem] border-2 border-slate-100 outline-none text-base font-bold appearance-none hover:bg-white transition-all cursor-pointer" value={formData.theme} onChange={e => setFormData({...formData, theme: e.target.value as Theme})}>
                 {Object.values(Theme).map(t => <option key={t} value={t}>{t}</option>)}
               </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-black uppercase text-red-400 tracking-[0.3em] mb-3 block ml-6">Opções de Distração (Erros)</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input required placeholder="1º de Agosto" className="p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 outline-none text-sm font-bold focus:border-red-400 transition-all shadow-sm" value={formData.o2} onChange={e => setFormData({...formData, o2: e.target.value})} />
              <input required placeholder="Sagrada Esperança" className="p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 outline-none text-sm font-bold focus:border-red-400 transition-all shadow-sm" value={formData.o3} onChange={e => setFormData({...formData, o3: e.target.value})} />
              <input required placeholder="Interclube" className="p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 outline-none text-sm font-bold focus:border-red-400 transition-all shadow-sm" value={formData.o4} onChange={e => setFormData({...formData, o4: e.target.value})} />
            </div>
          </div>

          <div className="pt-8 flex flex-col gap-4">
            <button type="submit" className="w-full py-7 bg-slate-900 text-white rounded-[2.5rem] font-black shadow-2xl hover:bg-emerald-600 transition-all uppercase tracking-[0.3em] italic flex items-center justify-center gap-4 active:scale-95 group">
              <Plus size={24} className="group-hover:rotate-90 transition-transform" /> {adminMode ? 'Injetar no Banco de Dados' : 'Submeter Sugestão ao VAR'}
            </button>
            <button type="button" onClick={onBack} className="w-full py-4 text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] hover:text-red-500 transition-colors">Cancelar Operação</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default App;