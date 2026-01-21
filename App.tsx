
import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, Home, Settings, LogOut, ShieldCheck, User, MessageSquarePlus, 
  Play, CheckCircle, XCircle, Star, Target, Volume2, VolumeX, 
  AlertTriangle, RefreshCcw, Mail, Lock, UserPlus, LogIn, Plus, Trash2, Users, FileText, ChevronLeft
} from 'lucide-react';
import { onAuthStateChanged } from "firebase/auth";
import { Theme, Question, UserProfile, Difficulty } from './types';
import { db, auth } from './dbService';
import { generateQuestions } from './geminiService';

const SOUND_URLS = {
  correct: 'https://assets.mixkit.co/active_storage/sfx/600/600-preview.mp3',
  incorrect: 'https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3',
  next: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  ambient: 'https://cdn.pixabay.com/audio/2023/05/08/audio_24e3934d40.mp3' 
};

// --- Componentes ---

const Navbar: React.FC<{ 
  user: UserProfile | null; 
  onLogout: () => void; 
  onOpenSettings: () => void;
  setView: (v: any) => void;
}> = ({ user, onLogout, onOpenSettings, setView }) => (
  <nav className="bg-slate-900 text-white p-4 shadow-xl sticky top-0 z-50">
    <div className="max-w-5xl mx-auto flex justify-between items-center">
      <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setView('home')}>
        <div className="bg-emerald-500 p-2 rounded-xl text-white shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
          <Trophy size={20} />
        </div>
        <h1 className="font-black text-2xl tracking-tighter uppercase italic bg-gradient-to-r from-white via-emerald-200 to-emerald-500 bg-clip-text text-transparent">Pelada</h1>
      </div>
      {user && (
        <div className="flex items-center gap-1">
          <button onClick={onOpenSettings} className="p-2.5 hover:bg-white/10 rounded-full transition-all text-emerald-400">
            <Settings size={22} />
          </button>
          <button onClick={onLogout} className="p-2.5 text-white/40 hover:text-red-400 transition-colors">
            <LogOut size={22} />
          </button>
        </div>
      )}
    </div>
  </nav>
);

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(db.getCurrentUser());
  const [view, setView] = useState<'home' | 'quiz' | 'results' | 'admin' | 'suggest' | 'profile' | 'gameover' | 'settings'>('home');
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const ambient = useRef<HTMLAudioElement | null>(null);
  const audioCorrect = useRef<HTMLAudioElement | null>(null);
  const audioIncorrect = useRef<HTMLAudioElement | null>(null);
  const audioNext = useRef<HTMLAudioElement | null>(null);

  // Listener de Autenticação do Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const profile = await db.getUserFromFirestore(fbUser.uid);
        if (profile) {
          setUser(profile);
          db.setCurrentUser(profile);
        } else {
          // Fallback se o profile ainda não existir no Firestore
          const newProfile: UserProfile = {
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || 'Craque',
            role: fbUser.email === 'admin@bola.com' ? 'admin' : 'user',
            scores: []
          };
          setUser(newProfile);
          db.setCurrentUser(newProfile);
        }
      } else {
        setUser(null);
        localStorage.removeItem('pelada_session');
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
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-emerald-500 font-black uppercase tracking-widest text-xs">Aquecendo Motores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16 bg-slate-50 selection:bg-emerald-500 selection:text-white" onClick={ensureMusic}>
      <Navbar user={user} onLogout={() => db.logout().then(() => { setUser(null); setView('home'); })} onOpenSettings={() => setView('settings')} setView={setView} />
      
      <main className="mt-8 px-4">
        {!user ? (
          <AuthView onLogin={(u) => { setUser(u); db.setCurrentUser(u); setView('home'); }} />
        ) : (
          <div className="max-w-5xl mx-auto">
            {view === 'settings' && <SettingsView user={user} isMuted={isMuted} onToggleMute={() => setIsMuted(!isMuted)} onViewChange={setView} onClose={() => setView('home')} />}
            {view === 'home' && <HomeView onSelectTheme={(t) => { setSelectedTheme(t); setView('quiz'); }} />}
            {view === 'quiz' && selectedTheme && <QuizView theme={selectedTheme} onFinish={s => { setFinalScore(s); db.saveScore(user.uid, selectedTheme, s); setView('results'); }} onGameOver={s => { setFinalScore(s); db.saveScore(user.uid, selectedTheme, s); setView('gameover'); }} playSound={playSound} />}
            {view === 'admin' && <AdminView onBack={() => setView('settings')} />}
            {view === 'suggest' && <SuggestView user={user} onBack={() => setView('settings')} />}
            {view === 'profile' && <ProfileView user={user} onBack={() => setView('settings')} />}
            
            {view === 'results' && (
              <div className="p-4 flex items-center justify-center min-h-[60vh] animate-scale-up text-center">
                <div className="bg-white rounded-[3rem] shadow-2xl p-12 border border-slate-100 max-w-sm w-full">
                  <div className="text-7xl mb-8">🏆</div>
                  <h2 className="text-3xl font-black text-slate-900 mb-2 italic uppercase">Campeão!</h2>
                  <div className="bg-emerald-600 text-white px-10 py-6 rounded-[2rem] inline-block mb-10 shadow-xl shadow-emerald-500/30">
                    <p className="text-5xl font-black">{finalScore}</p>
                    <p className="text-[10px] font-black uppercase mt-1 opacity-70">Pontos Finais</p>
                  </div>
                  <button onClick={() => setView('home')} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black shadow-lg uppercase tracking-widest italic hover:bg-emerald-600 transition-colors">Novo Jogo</button>
                </div>
              </div>
            )}
            
            {view === 'gameover' && (
              <div className="px-4 flex items-center justify-center min-h-[60vh] animate-scale-up text-center">
                <div className="bg-white rounded-[3rem] shadow-2xl p-12 max-w-sm w-full border-4 border-red-50">
                  <div className="bg-red-500 w-20 h-20 rounded-[2rem] flex items-center justify-center text-white mx-auto mb-8 shadow-xl shadow-red-500/30 animate-pulse"><XCircle size={40} /></div>
                  <h2 className="text-3xl font-black text-red-900 mb-2 italic uppercase">Expulso!</h2>
                  <div className="bg-red-50 p-8 rounded-[2rem] mb-10 border-2 border-red-100">
                    <p className="text-5xl font-black text-red-900">{finalScore}</p>
                  </div>
                  <button onClick={() => setView('home')} className="w-full py-5 bg-red-600 text-white rounded-3xl font-black shadow-xl uppercase tracking-widest italic flex items-center justify-center gap-3 hover:bg-red-700 transition-colors"><RefreshCcw size={22} /> Recomeçar</button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleUp { from { transform: scale(0.96); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes shakeHorizontal { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        .animate-scale-up { animation: scaleUp 0.3s ease-out forwards; }
        .shake-horizontal { animation: shakeHorizontal 0.1s 3; }
      `}</style>
    </div>
  );
};

// --- Sub-componentes auxiliares (Auth, Home, Quiz, Admin, etc.) ---

const AuthView: React.FC<{ onLogin: (u: UserProfile) => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [load, setLoad] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setLoad(true);
    setError('');
    try {
      // Nota: Em uma app 100% real, aqui você usaria auth.signInWithEmailAndPassword
      // Para o seu teste rápido, simulamos o login e criamos o perfil
      const mockUid = "user-" + email.replace(/[^a-zA-Z0-9]/g, "");
      const profile: UserProfile = { 
        uid: mockUid, 
        email, 
        displayName: 'Craque', 
        role: email === 'admin@bola.com' ? 'admin' : 'user', 
        scores: [] 
      };
      await db.syncUserToFirestore(profile);
      onLogin(profile);
    } catch (err) {
      setError('Falha ao entrar em campo. Verifique os dados.');
    } finally {
      setLoad(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4">
      <div className="bg-white p-12 rounded-[4rem] shadow-2xl w-full max-w-sm text-center animate-scale-up border border-slate-100">
        <div className="inline-block p-4 bg-emerald-600 text-white rounded-[2rem] mb-6 shadow-xl shadow-emerald-600/20"><Trophy size={32} /></div>
        <h2 className="text-4xl font-black text-slate-900 mb-1 italic uppercase tracking-tighter">Pelada</h2>
        <p className="text-emerald-500 font-black uppercase text-[10px] tracking-[0.4em] mb-12">Quiz Oficial de Futebol</p>
        
        {error && <p className="text-red-500 text-[10px] font-bold uppercase mb-4">{error}</p>}

        <form onSubmit={handleLogin} className="space-y-4">
          <input required className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl outline-none focus:border-emerald-500 font-bold text-sm" placeholder="EMAIL" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          <input required className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl outline-none focus:border-emerald-500 font-bold text-sm" placeholder="SENHA" type="password" value={pass} onChange={e => setPass(e.target.value)} />
          <button disabled={load} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black shadow-2xl hover:bg-emerald-600 transition-all uppercase tracking-widest italic">
            {load ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div> : 'Entrar em Campo'}
          </button>
        </form>
        <p className="mt-8 text-[7px] text-slate-300 font-black uppercase tracking-widest italic">Dica: Use admin@bola.com para acesso total</p>
      </div>
    </div>
  );
};

const SettingsView: React.FC<{ 
  user: UserProfile, 
  isMuted: boolean, 
  onToggleMute: () => void, 
  onViewChange: (v: any) => void,
  onClose: () => void 
}> = ({ user, isMuted, onToggleMute, onViewChange, onClose }) => (
  <div className="max-w-md mx-auto p-4 animate-scale-up">
    <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
      <div className="bg-slate-900 p-8 text-white flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase italic tracking-tight leading-none mb-1">Definições</h2>
          <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Estádio Virtual</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full bg-white/5"><XCircle size={24} /></button>
      </div>
      
      <div className="p-8 space-y-6">
        <button onClick={onToggleMute} className="w-full flex items-center justify-between p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl hover:border-emerald-500 transition-all group">
          <div className="flex items-center gap-3">
            <div className="text-emerald-500">{isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}</div>
            <span className="font-bold text-slate-700">Som Ambiente</span>
          </div>
          <div className={`w-12 h-6 rounded-full relative transition-colors ${isMuted ? 'bg-slate-200' : 'bg-emerald-500'}`}>
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isMuted ? 'left-1' : 'left-7'}`}></div>
          </div>
        </button>

        <button onClick={() => onViewChange('suggest')} className="w-full flex items-center gap-4 p-5 bg-white border-2 border-slate-100 rounded-2xl hover:border-emerald-500 transition-all text-left">
          <div className="text-emerald-500"><MessageSquarePlus size={20} /></div>
          <div>
            <p className="font-bold text-slate-700">Sugerir Pergunta</p>
            <p className="text-[10px] text-slate-400 font-medium italic">Ajude o VAR</p>
          </div>
        </button>

        {user.role === 'admin' && (
          <button onClick={() => onViewChange('admin')} className="w-full flex items-center gap-4 p-5 bg-amber-50 border-2 border-amber-100 rounded-2xl hover:border-amber-500 transition-all text-left">
            <div className="text-amber-600"><ShieldCheck size={20} /></div>
            <div>
              <p className="font-black text-amber-900 leading-none">Painel Administrativo</p>
              <p className="text-[10px] text-amber-600/60 font-bold uppercase tracking-tighter mt-1">Gestão Total</p>
            </div>
          </button>
        )}

        <button onClick={() => onViewChange('profile')} className="w-full py-4 bg-slate-100 text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-2xl">
          Estatísticas do Craque
        </button>
      </div>
    </div>
  </div>
);

const HomeView: React.FC<{ onSelectTheme: (t: Theme) => void }> = ({ onSelectTheme }) => (
  <div className="max-w-6xl mx-auto py-10">
    <div className="text-center mb-16 animate-fade-in">
      <h2 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 tracking-tighter italic uppercase">Pelada <span className="text-emerald-500">Master.</span></h2>
      <p className="text-slate-400 text-sm font-black uppercase tracking-[0.3em]">Responde a 15 lances. Errou? Cartão Vermelho!</p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Object.values(Theme).map((theme) => (
        <button key={theme} onClick={() => onSelectTheme(theme)} className="group flex flex-col p-10 bg-white border border-slate-100 rounded-[3rem] shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all text-left">
          <div className="bg-emerald-600 w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-8 group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/20">
            <Play size={24} fill="currentColor" />
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2 uppercase italic">{theme}</h3>
          <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Aquecer e Jogar</p>
        </button>
      ))}
    </div>
  </div>
);

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
          const aiQs = await generateQuestions(theme, 8);
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
      }, 800);
    } else {
      setFeedback('incorrect'); playSound('incorrect');
      setTimeout(() => onGameOver(currentIndex * 10), 800);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] animate-pulse">
      <div className="w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-6"></div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entrando em campo...</p>
    </div>
  );

  const q = questions[currentIndex];
  return (
    <div className="max-w-2xl mx-auto p-4 animate-fade-in">
      <div className="mb-6 flex justify-between items-center bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex gap-4 items-center">
           <div className="bg-emerald-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center font-black italic shadow-lg">{currentIndex + 1}</div>
           <div>
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{theme}</p>
             <p className="text-xs font-black text-slate-800">Jogada de Mestre</p>
           </div>
        </div>
        <p className="text-2xl font-black text-emerald-600">{currentIndex * 10} pts</p>
      </div>

      <div className="bg-white rounded-[3rem] shadow-2xl p-8 md:p-12 border border-slate-100 relative overflow-hidden">
        <h3 className="text-2xl md:text-3xl font-black text-slate-900 mb-10 leading-tight tracking-tight">{q.text}</h3>
        <div className="grid grid-cols-1 gap-3">
          {q.options.map((opt, i) => (
            <button
              key={i}
              disabled={!!feedback}
              onClick={() => handleAnswer(opt)}
              className={`w-full p-6 rounded-3xl text-left font-black transition-all border-4 
                ${selectedOption === opt ? 'border-emerald-500 bg-emerald-50' : 'border-slate-50 bg-slate-50'}
                ${feedback === 'correct' && opt === q.correctAnswer ? '!bg-emerald-600 !border-emerald-600 !text-white' : ''}
                ${feedback === 'incorrect' && selectedOption === opt && opt !== q.correctAnswer ? '!bg-red-500 !border-red-500 !text-white shake-horizontal' : ''}
              `}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const ProfileView: React.FC<{ user: UserProfile, onBack: () => void }> = ({ user, onBack }) => (
  <div className="max-w-md mx-auto animate-scale-up mt-10">
    <div className="bg-white p-10 rounded-[3rem] shadow-2xl text-center border border-slate-100">
      <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 font-black text-3xl">{user.email[0].toUpperCase()}</div>
      <h2 className="text-xl font-black text-slate-900 break-all mb-1">{user.email}</h2>
      <span className="text-[9px] font-black bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full uppercase tracking-widest">{user.role}</span>
      <div className="space-y-3 text-left mt-8">
         <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b pb-3 mb-4">Sala de Troféus</h3>
         {(!user.scores || user.scores.length === 0) ? <p className="text-center py-6 text-slate-300 italic text-sm">Sem golos marcados ainda.</p> : 
           user.scores.slice(-5).reverse().map((s, i) => (
           <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
             <span className="text-slate-800 font-bold text-sm">{s.theme}</span>
             <span className="text-emerald-600 font-black text-lg">{s.points}</span>
           </div>
         ))}
      </div>
      <button onClick={onBack} className="mt-10 w-full py-4 bg-slate-100 text-slate-600 font-black rounded-2xl text-[10px] uppercase tracking-widest">Fechar Histórico</button>
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
      <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
        <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
          <h2 className="text-2xl font-black uppercase italic tracking-tight">Admin Pelada</h2>
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full"><ChevronLeft size={24} /></button>
        </div>
        <div className="flex bg-slate-50 p-2 gap-2">
          <button onClick={() => setTab('var')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all ${tab === 'var' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400'}`}>
            VAR ({pending.length})
          </button>
          <button onClick={() => setTab('membros')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all ${tab === 'membros' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400'}`}>
            Membros
          </button>
        </div>
        <div className="p-8">
          {tab === 'var' && (
            <div className="space-y-4">
              {pending.length === 0 ? <p className="text-center py-20 text-slate-300 font-black uppercase text-xs">VAR sem ocorrências.</p> : 
                pending.map(q => (
                  <div key={q.id} className="p-5 bg-slate-50 rounded-2xl border flex justify-between items-center gap-4">
                    <div className="flex-1 text-sm font-bold text-slate-800">{q.text}</div>
                    <div className="flex gap-2">
                      <button onClick={async () => { await db.approveQuestion(q.id); setRefresh(r => r+1); }} className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"><CheckCircle size={18} /></button>
                      <button onClick={async () => { await db.deleteQuestion(q.id); setRefresh(r => r+1); }} className="p-3 bg-red-500 text-white rounded-xl hover:bg-red-600"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))
              }
            </div>
          )}
          {tab === 'membros' && (
             <div className="space-y-2">
               {users.map(u => (
                 <div key={u.uid} className="flex justify-between items-center p-4 bg-white border border-slate-100 rounded-2xl">
                   <div className="flex flex-col"><p className="font-bold text-slate-700 text-sm">{u.email}</p><span className="text-[8px] font-black uppercase text-slate-400">{u.role}</span></div>
                   <button onClick={() => db.toggleUserAdmin(u.uid).then(() => setRefresh(r => r+1))} className="text-[10px] font-black uppercase text-emerald-600 hover:underline">
                     Alternar Role
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
    <div className="text-center p-10 bg-white rounded-[2.5rem] shadow-xl animate-scale-up">
      <CheckCircle size={48} className="text-emerald-500 mx-auto mb-4" />
      <h3 className="text-xl font-black text-slate-900 mb-2">Lance Registrado!</h3>
      <p className="text-slate-500 text-sm mb-6">{adminMode ? 'Pergunta adicionada!' : 'Enviado para o VAR.'}</p>
      <button onClick={onBack} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold">FECHAR</button>
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-4 animate-fade-in bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-inner max-w-2xl mx-auto">
      <textarea required placeholder="Pergunta" className="w-full p-5 bg-white rounded-2xl border-2 border-slate-100 outline-none text-sm font-bold" value={formData.text} onChange={e => setFormData({...formData, text: e.target.value})} />
      <input required placeholder="Certa" className="w-full p-4 bg-white rounded-2xl border-2 border-emerald-100 outline-none text-sm font-black text-emerald-700" value={formData.correct} onChange={e => setFormData({...formData, correct: e.target.value})} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <input required placeholder="Errada 1" className="p-3 bg-white rounded-xl border border-slate-100 outline-none text-xs" value={formData.o2} onChange={e => setFormData({...formData, o2: e.target.value})} />
        <input required placeholder="Errada 2" className="p-3 bg-white rounded-xl border border-slate-100 outline-none text-xs" value={formData.o3} onChange={e => setFormData({...formData, o3: e.target.value})} />
        <input required placeholder="Errada 3" className="p-3 bg-white rounded-xl border border-slate-100 outline-none text-xs" value={formData.o4} onChange={e => setFormData({...formData, o4: e.target.value})} />
      </div>
      <button type="submit" className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black shadow-xl hover:bg-emerald-700 transition-all uppercase tracking-widest italic">
        {adminMode ? 'Injetar Pergunta' : 'Sugerir ao VAR'}
      </button>
      {!adminMode && <button type="button" onClick={onBack} className="w-full py-2 text-slate-400 text-[10px] font-black uppercase tracking-widest">Cancelar</button>}
    </form>
  );
};

export default App;
