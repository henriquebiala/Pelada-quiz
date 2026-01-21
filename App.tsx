
import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, Home, Settings, LogOut, ShieldCheck, User, MessageSquarePlus, 
  Target, Volume2, VolumeX, Globe, ChevronRight, Zap, Award, AlertTriangle,
  LayoutDashboard, CheckCircle2, XCircle, Users, Database, Sparkles,
  Search, TrendingUp, History, Star
} from 'lucide-react';
import { onAuthStateChanged } from "firebase/auth";
import { Theme, Question, UserProfile, Difficulty } from './types';
import { db, auth } from './dbService';
import { generateQuestions } from './geminiService';
import { firebaseConfig } from './firebaseConfig';

const FALLBACK_QUESTIONS: Record<string, Question[]> = {
  [Theme.MUNDIAL]: [
    { id: 'f1', text: 'Quem ganhou a Copa do Mundo de 2022?', options: ['Brasil', 'França', 'Argentina', 'Alemanha'], correctAnswer: 'Argentina', theme: Theme.MUNDIAL, subtheme: 'Copa do Mundo', difficulty: Difficulty.FACIL, approved: true },
    { id: 'f2', text: 'Qual jogador tem mais Bolas de Ouro na história?', options: ['Pelé', 'Cristiano Ronaldo', 'Lionel Messi', 'Zidane'], correctAnswer: 'Lionel Messi', theme: Theme.MUNDIAL, subtheme: 'Prêmios', difficulty: Difficulty.FACIL, approved: true },
    { id: 'f3', text: 'Quem marcou o gol da vitória da Alemanha na final de 2014?', options: ['Müller', 'Klose', 'Götze', 'Özil'], correctAnswer: 'Götze', theme: Theme.MUNDIAL, subtheme: 'Copa do Mundo', difficulty: Difficulty.MEDIO, approved: true }
  ],
  [Theme.ANGOLANO]: [
    { id: 'a1', text: 'Qual é o nome da principal liga de futebol em Angola?', options: ['Angolazão', 'Girabola', 'Liga Angola', 'Taça Independência'], correctAnswer: 'Girabola', theme: Theme.ANGOLANO, subtheme: 'Liga Nacional', difficulty: Difficulty.FACIL, approved: true },
    { id: 'a2', text: 'Qual clube angolano tem mais títulos do Girabola?', options: ['1º de Agosto', 'Petro de Luanda', 'Sagrada Esperança', 'Interclube'], correctAnswer: 'Petro de Luanda', theme: Theme.ANGOLANO, subtheme: 'Clubes', difficulty: Difficulty.FACIL, approved: true }
  ]
};

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(db.getCurrentUser());
  const [view, setView] = useState<'home' | 'quiz' | 'results' | 'admin' | 'suggest' | 'profile' | 'gameover' | 'settings' | 'ranking'>('home');
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const audioCorrect = useRef<HTMLAudioElement | null>(null);
  const audioIncorrect = useRef<HTMLAudioElement | null>(null);
  const audioNext = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (fbUser) {
          let profile = await db.getUserFromFirestore(fbUser.uid);
          if (!profile) {
            profile = { 
              uid: fbUser.uid, 
              email: fbUser.email || '', 
              displayName: fbUser.displayName || 'Craque', 
              role: fbUser.email === firebaseConfig.adminEmail ? 'admin' : 'user', 
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
      } catch (e) {
        console.error("Erro Auth:", e);
      } finally {
        setIsInitializing(false);
      }
    });

    audioCorrect.current = new Audio('https://assets.mixkit.co/active_storage/sfx/600/600-preview.mp3');
    audioIncorrect.current = new Audio('https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3');
    audioNext.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');

    return () => unsubscribe();
  }, []);

  const playSound = (t: 'correct' | 'incorrect' | 'next') => {
    if (isMuted) return;
    const a = t === 'correct' ? audioCorrect.current : t === 'incorrect' ? audioIncorrect.current : audioNext.current;
    if (a) { a.currentTime = 0; a.play().catch(() => {}); }
  };

  if (isInitializing) return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-white p-6">
      <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-6"></div>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 animate-pulse">Entrando em campo...</p>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-900 overflow-hidden">
      {!user ? (
        <AuthView onLogin={(u) => { setUser(u); setView('home'); }} />
      ) : (
        <>
          <header className="px-5 py-5 flex justify-between items-center bg-white border-b border-slate-100 sticky top-0 z-50">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('home')}>
              <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-600/20 rotate-3">
                <Trophy size={20} />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-xl tracking-tighter italic uppercase leading-none">Bom de Bola</span>
                <span className="text-[8px] font-bold uppercase tracking-widest text-emerald-600">Quiz de Elite</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setView('settings')} className={`p-2.5 rounded-xl transition-all ${view === 'settings' ? 'bg-slate-950 text-white rotate-90' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                <Settings size={20} />
              </button>
            </div>
          </header>

          <main className="flex-1 pb-24 overflow-y-auto">
            <div className="animate-app-in min-h-full flex flex-col">
              {view === 'home' && <HomeView user={user} onSelectTheme={(t) => { setSelectedTheme(t); setView('quiz'); }} />}
              {view === 'quiz' && selectedTheme && (
                <QuizView 
                  theme={selectedTheme} 
                  onFinish={s => { setFinalScore(s); db.saveScore(user.uid, selectedTheme, s); setView('results'); }} 
                  onGameOver={s => { setFinalScore(s); db.saveScore(user.uid, selectedTheme, s); setView('gameover'); }} 
                  playSound={playSound} 
                />
              )}
              {view === 'results' && <ResultsView score={finalScore} onRestart={() => setView('home')} />}
              {view === 'gameover' && <GameOverView score={finalScore} onRestart={() => setView('home')} />}
              {view === 'ranking' && <RankingView />}
              {view === 'profile' && <ProfileView user={user} />}
              {view === 'settings' && <SettingsView user={user} onToggleMute={() => setIsMuted(!isMuted)} isMuted={isMuted} setView={setView} onLogout={() => { db.logout(); setUser(null); }} />}
              {view === 'suggest' && <SuggestView user={user} onBack={() => setView('home')} />}
              {view === 'admin' && <AdminView onBack={() => setView('settings')} />}
            </div>
          </main>

          {['home', 'ranking', 'profile', 'admin'].includes(view) && (
            <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-slate-100 px-6 py-4 flex justify-around items-center z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] rounded-t-[2rem]">
              <button onClick={() => setView('home')} className={`flex flex-col items-center gap-1.5 transition-all ${view === 'home' ? 'text-emerald-600 scale-110' : 'text-slate-400 opacity-60'}`}>
                <Home size={22} /><span className="text-[9px] font-black uppercase tracking-tight">Jogar</span>
              </button>
              <button onClick={() => setView('ranking')} className={`flex flex-col items-center gap-1.5 transition-all ${view === 'ranking' ? 'text-emerald-600 scale-110' : 'text-slate-400 opacity-60'}`}>
                <Award size={22} /><span className="text-[9px] font-black uppercase tracking-tight">Líderes</span>
              </button>
              <button onClick={() => setView('profile')} className={`flex flex-col items-center gap-1.5 transition-all ${view === 'profile' ? 'text-emerald-600 scale-110' : 'text-slate-400 opacity-60'}`}>
                <User size={22} /><span className="text-[9px] font-black uppercase tracking-tight">Perfil</span>
              </button>
              {user.role === 'admin' && (
                <button onClick={() => setView('admin')} className={`flex flex-col items-center gap-1.5 transition-all ${view === 'admin' ? 'text-emerald-600 scale-110' : 'text-slate-400 opacity-60'}`}>
                  <ShieldCheck size={22} /><span className="text-[9px] font-black uppercase tracking-tight">VAR</span>
                </button>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
};

const AuthView: React.FC<{ onLogin: (u: UserProfile) => void }> = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [name, setName] = useState('');
  const [load, setLoad] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoad(true);
    try {
      const u = isSignUp ? await db.register(email, pass, name) : await db.login(email, pass);
      if (u) onLogin(u);
    } catch(err) { alert("Credenciais inválidas. Tente novamente."); }
    setLoad(false);
  };

  return (
    <div className="flex-1 flex flex-col justify-center px-8 py-10 animate-app-in bg-slate-950 text-white min-h-screen">
      <div className="w-24 h-24 bg-emerald-600 rounded-[2.5rem] flex items-center justify-center text-white mx-auto mb-10 shadow-3xl shadow-emerald-600/30 rotate-12 relative">
         <Trophy size={48} />
         <div className="absolute -top-2 -right-2 bg-yellow-400 text-black p-1.5 rounded-full"><Star size={12} fill="currentColor" /></div>
      </div>
      <h1 className="text-5xl font-black italic uppercase tracking-tighter text-center leading-none mb-3">Bom de<br/><span className="text-emerald-500">Bola</span></h1>
      <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.4em] text-center mb-12">O Quiz definitivo do futebol</p>
      
      <form onSubmit={handle} className="space-y-4">
        {isSignUp && (
          <div className="relative group">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500" size={18} />
            <input required className="w-full pl-12 pr-4 py-4 bg-slate-900 rounded-2xl outline-none border-2 border-transparent focus:border-emerald-500/50 font-bold text-white transition-all" placeholder="Seu Nome" value={name} onChange={e => setName(e.target.value)} />
          </div>
        )}
        <div className="relative group">
          <Target className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500" size={18} />
          <input required className="w-full pl-12 pr-4 py-4 bg-slate-900 rounded-2xl outline-none border-2 border-transparent focus:border-emerald-500/50 font-bold text-white transition-all" placeholder="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="relative group">
          <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500" size={18} />
          <input required className="w-full pl-12 pr-4 py-4 bg-slate-900 rounded-2xl outline-none border-2 border-transparent focus:border-emerald-500/50 font-bold text-white transition-all" placeholder="Senha" type="password" value={pass} onChange={e => setPass(e.target.value)} />
        </div>
        <button disabled={load} className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase italic shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3">
          {load ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (isSignUp ? 'Assinar Contrato' : 'Entrar em Campo')}
        </button>
      </form>

      <button onClick={() => setIsSignUp(!isSignUp)} className="mt-10 text-[11px] font-black text-slate-500 uppercase tracking-widest text-center w-full hover:text-emerald-400 transition-colors">
        {isSignUp ? 'Já tem conta? Fazer Login' : 'Novo por aqui? Criar Conta'}
      </button>
    </div>
  );
};

const HomeView: React.FC<{ user: UserProfile, onSelectTheme: (t: Theme) => void }> = ({ user, onSelectTheme }) => (
  <div className="px-5 py-6 space-y-10 flex-1">
    <div className="bg-slate-950 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-3xl">
      <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-600/20 rounded-full blur-[80px] -mr-10 -mt-10"></div>
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} className="text-yellow-400 fill-yellow-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-yellow-400">Novo Temporada 2024</span>
        </div>
        <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-[0.9] mb-8">E aí, {user.displayName}!<br/>Pronto pro Jogo?</h2>
        <button onClick={() => onSelectTheme(Theme.MUNDIAL)} className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-black text-sm uppercase tracking-widest italic flex items-center gap-3 shadow-xl transition-all active:scale-95">
          Kick-off <ChevronRight size={18} />
        </button>
      </div>
    </div>

    <div>
      <div className="flex items-center justify-between px-2 mb-5">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Escolha seu Estádio</h3>
        <TrendingUp size={14} className="text-emerald-500" />
      </div>
      <div className="grid grid-cols-1 gap-4">
        {Object.values(Theme).map((t, idx) => (
          <button 
            key={t} 
            onClick={() => onSelectTheme(t)} 
            className="group flex items-center justify-between p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-100 transition-all active:scale-98 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-emerald-50 translate-x-full group-hover:translate-x-[85%] transition-transform duration-500 opacity-30"></div>
            <div className="flex items-center gap-5 relative z-10">
              <div className="w-14 h-14 bg-slate-50 group-hover:bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 transition-colors">
                {idx % 2 === 0 ? <Globe size={28} /> : <History size={28} />}
              </div>
              <div className="flex flex-col items-start">
                <span className="font-black text-base uppercase italic tracking-tight text-slate-800">{t}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">15 Questões • Elite</span>
              </div>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all relative z-10">
              <ChevronRight size={20} />
            </div>
          </button>
        ))}
      </div>
    </div>
  </div>
);

const QuizView: React.FC<{ theme: Theme, onFinish: (s: number) => void, onGameOver: (s: number) => void, playSound: any }> = ({ theme, onFinish, onGameOver, playSound }) => {
  const [qs, setQs] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [load, setLoad] = useState(true);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const loadQs = async () => {
      setLoad(true);
      try {
        let items = await generateQuestions(theme, 15);
        if (items.length === 0) items = await db.getQuestions(theme);
        if (items.length === 0) items = FALLBACK_QUESTIONS[theme] || FALLBACK_QUESTIONS[Theme.MUNDIAL];
        
        // Misturar e ordenar por dificuldade
        const sorted = [...items].sort((a, b) => {
          const order: any = { 'fácil': 1, 'médio': 2, 'difícil': 3 };
          return (order[a.difficulty] || 0) - (order[b.difficulty] || 0);
        });
        setQs(sorted);
      } catch(e) { 
        setQs(FALLBACK_QUESTIONS[Theme.MUNDIAL]);
      } finally {
        setLoad(false);
      }
    };
    loadQs();
  }, [theme]);

  const handle = (opt: string) => {
    if (feedback || !qs[idx]) return;
    setSelected(opt);
    const isCorrect = opt === qs[idx].correctAnswer;
    
    if (isCorrect) {
      setFeedback('correct'); playSound('correct');
      setTimeout(() => {
        if (idx + 1 >= qs.length) onFinish((idx + 1) * 10);
        else { setIdx(i => i + 1); setSelected(null); setFeedback(null); playSound('next'); }
      }, 800);
    } else {
      setFeedback('incorrect'); playSound('incorrect');
      // Pequeno efeito de tremor na tela via CSS se possível, ou apenas visual no botão
      setTimeout(() => onGameOver(idx * 10), 1200);
    }
  };

  if (load) return (
    <div className="h-[70vh] flex flex-col items-center justify-center p-10 text-center">
      <div className="relative mb-8">
        <div className="w-20 h-20 border-4 border-emerald-500/20 rounded-full"></div>
        <div className="w-20 h-20 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin absolute top-0"></div>
        <Sparkles size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-500 animate-pulse" />
      </div>
      <h3 className="text-lg font-black uppercase italic text-slate-800 mb-2">Aquecendo Motores</h3>
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] italic max-w-[200px]">A IA está escalando os fatos históricos...</p>
    </div>
  );

  const q = qs[idx];
  const progress = (idx / qs.length) * 100;

  return (
    <div className="px-5 py-6 h-full flex flex-col flex-1">
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{theme}</span>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{q.difficulty}</span>
        </div>
        <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase italic">
          Rodada {idx + 1}/{qs.length}
        </div>
      </div>

      <div className="w-full h-2.5 bg-slate-100 rounded-full mb-10 overflow-hidden shadow-inner">
        <div 
          className="h-full bg-emerald-500 transition-all duration-700 ease-out shadow-[0_0_15px_rgba(16,185,129,0.5)]" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-slate-50 flex flex-col items-center mb-8 flex-1 justify-center relative">
        <div className="absolute -top-6 bg-emerald-600 text-white px-6 py-2 rounded-full text-[11px] font-black uppercase italic shadow-lg">
          Pergunta do VAR
        </div>
        <h3 className="text-2xl font-black text-slate-800 text-center leading-tight mb-10 italic">"{q.text}"</h3>
        <div className="w-full space-y-4">
          {q.options.map((o, i) => (
            <button 
              key={o} 
              onClick={() => handle(o)} 
              disabled={!!feedback} 
              className={`group w-full p-6 rounded-2xl text-left font-bold transition-all border-2 text-sm flex items-center justify-between
                ${selected === o ? 'scale-[0.97]' : 'hover:border-emerald-200'}
                ${!feedback ? 'border-slate-50 bg-slate-50 text-slate-700' : ''}
                ${feedback === 'correct' && o === q.correctAnswer ? '!bg-emerald-600 !text-white !border-emerald-600 shadow-xl shadow-emerald-600/30' : ''}
                ${feedback === 'incorrect' && selected === o ? '!bg-red-500 !text-white !border-red-500 shadow-xl shadow-red-500/30 animate-shake' : ''}
                ${feedback === 'incorrect' && o === q.correctAnswer ? '!border-emerald-500 !text-emerald-600' : ''}
              `}
            >
              <span>{o}</span>
              <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-[10px] font-black">
                {String.fromCharCode(65 + i)}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="text-center pb-6">
        <div className="flex items-center justify-center gap-2">
          <Zap size={20} className="text-yellow-400 fill-yellow-400" />
          <p className="text-5xl font-black text-slate-900 leading-none italic">{idx * 10}</p>
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Pontos Acumulados</p>
      </div>
    </div>
  );
};

const ResultsView: React.FC<{ score: number, onRestart: () => void }> = ({ score, onRestart }) => (
  <div className="px-8 py-12 flex-1 flex flex-col justify-center items-center text-center animate-app-in">
    <div className="text-9xl mb-8 drop-shadow-2xl">🏆</div>
    <h2 className="text-5xl font-black italic uppercase mb-3 leading-none tracking-tighter">CAMPEÃO!</h2>
    <p className="text-slate-400 font-bold text-sm mb-12 italic">Você deu um show de bola e gabaritou o quiz de elite!</p>
    <div className="bg-emerald-600 w-full p-10 rounded-[4rem] text-white shadow-3xl mb-12 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
      <p className="text-7xl font-black italic drop-shadow-lg">{score}</p>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-3 opacity-70">Placar Final</p>
    </div>
    <button onClick={onRestart} className="w-full py-6 bg-slate-950 text-white rounded-3xl font-black uppercase italic active:scale-95 shadow-2xl transition-all">Jogar Nova Partida</button>
  </div>
);

const GameOverView: React.FC<{ score: number, onRestart: () => void }> = ({ score, onRestart }) => (
  <div className="px-8 py-12 flex-1 flex flex-col justify-center items-center text-center animate-app-in">
    <div className="text-9xl mb-8 drop-shadow-2xl grayscale">🟥</div>
    <h2 className="text-5xl font-black italic uppercase mb-3 text-red-600 leading-none tracking-tighter">FORA DE JOGO!</h2>
    <p className="text-slate-400 font-bold text-sm mb-12 italic">O VAR analisou: você errou o lance decisivo.</p>
    <div className="bg-white border-4 border-red-50 w-full p-10 rounded-[4rem] mb-12 shadow-xl">
      <p className="text-7xl font-black text-red-600 italic">{score}</p>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-3 text-red-300">Sua Pontuação</p>
    </div>
    <button onClick={onRestart} className="w-full py-6 bg-red-600 text-white rounded-3xl font-black uppercase italic active:scale-95 shadow-2xl transition-all">Tentar Revanche</button>
  </div>
);

const RankingView: React.FC = () => {
  const [list, setList] = useState<UserProfile[]>([]);
  const [load, setLoad] = useState(true);

  useEffect(() => { 
    db.getGlobalRanking().then(res => {
      setList(res);
      setLoad(false);
    }); 
  }, []);

  return (
    <div className="px-6 py-8 animate-app-in">
      <div className="flex items-center justify-between mb-8 px-2">
        <h2 className="text-3xl font-black italic uppercase tracking-tighter">Artilheiros</h2>
        <div className="bg-yellow-400 p-2 rounded-xl text-black rotate-12"><Award size={20} /></div>
      </div>
      
      {load ? (
        <div className="flex flex-col items-center py-20 gap-4 opacity-40">
           <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
           <p className="text-[10px] font-black uppercase tracking-widest">Consultando Tabela...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((u, i) => (
            <div key={u.uid} className="bg-white p-5 rounded-[2rem] flex items-center justify-between border border-slate-100 shadow-sm transition-all hover:translate-x-1">
              <div className="flex items-center gap-5">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-lg
                  ${i === 0 ? 'bg-yellow-400 text-white shadow-lg shadow-yellow-400/30' : 
                    i === 1 ? 'bg-slate-300 text-white shadow-lg' : 
                    i === 2 ? 'bg-amber-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}
                >
                  {i + 1}
                </div>
                <div className="flex flex-col">
                  <span className="font-black text-sm text-slate-800 italic uppercase">{u.displayName}</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Master League</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-emerald-600 italic">{(u.scores || []).reduce((a, b) => a + b.points, 0)}</p>
                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Gols Totais</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ProfileView: React.FC<{ user: UserProfile }> = ({ user }) => (
  <div className="px-6 py-8 animate-app-in">
    <div className="bg-slate-950 rounded-[3rem] p-10 text-center text-white mb-10 shadow-3xl relative overflow-hidden">
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-emerald-600/20 rounded-full blur-[60px]"></div>
      <div className="relative z-10">
        <div className="w-24 h-24 bg-emerald-500 rounded-[2rem] flex items-center justify-center text-white text-5xl font-black mx-auto mb-8 rotate-6 shadow-2xl relative">
          {user.displayName[0].toUpperCase()}
          <div className="absolute -bottom-2 -right-2 bg-slate-950 p-1.5 rounded-full border-2 border-emerald-500"><CheckCircle2 size={16} className="text-emerald-500" /></div>
        </div>
        <div className="flex items-center justify-center gap-3 mb-2">
          <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-none">{user.displayName}</h2>
          {user.role === 'admin' && <ShieldCheck size={20} className="text-emerald-400" />}
        </div>
        <div className="bg-white/5 border border-white/10 px-4 py-1.5 rounded-full inline-block">
          <p className="text-emerald-400 text-[9px] font-black uppercase tracking-[0.2em]">{user.email}</p>
        </div>
      </div>
    </div>
    
    <div className="px-2">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Histórico de Partidas</h3>
        <Search size={14} className="text-slate-300" />
      </div>
      <div className="space-y-4">
        {user.scores && user.scores.length > 0 ? user.scores.slice(-5).reverse().map((s, i) => (
          <div key={i} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex items-center justify-between shadow-sm transition-all hover:border-emerald-100">
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-emerald-500 shadow-inner">
                <Target size={24} />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-tight text-slate-800 italic">{s.theme}</p>
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{new Date(s.date).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex flex-col items-end">
               <span className="text-2xl font-black text-emerald-600 italic">{s.points}</span>
               <span className="text-[8px] font-bold text-slate-300 uppercase">Pontos</span>
            </div>
          </div>
        )) : (
          <div className="py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Nenhum jogo registrado</p>
          </div>
        )}
      </div>
    </div>
  </div>
);

const SettingsView: React.FC<{ user: UserProfile, onToggleMute: any, isMuted: boolean, setView: any, onLogout: any }> = ({ user, onToggleMute, isMuted, setView, onLogout }) => (
  <div className="px-6 py-8 flex-1 flex flex-col animate-app-in">
    <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-10 px-2 leading-none">Vestiário</h2>
    
    <div className="space-y-4">
      <button onClick={onToggleMute} className="w-full p-6 bg-white rounded-[2rem] flex items-center justify-between border border-slate-100 shadow-sm transition-all active:scale-95">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-emerald-600">
            {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
          </div>
          <div className="flex flex-col items-start">
            <span className="font-black uppercase text-[11px] tracking-widest text-slate-800 italic">Efeitos Sonoros</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isMuted ? 'Desativado' : 'Ativado'}</span>
          </div>
        </div>
        <div className={`w-14 h-7 rounded-full relative transition-all duration-300 ${isMuted ? 'bg-slate-200' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]'}`}>
          <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-sm ${isMuted ? 'left-1' : 'left-8'}`}></div>
        </div>
      </button>

      <button onClick={() => setView('suggest')} className="group w-full p-6 bg-white rounded-[2rem] flex items-center justify-between border border-slate-100 shadow-sm transition-all active:scale-95">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <MessageSquarePlus size={24} />
          </div>
          <div className="flex flex-col items-start">
            <span className="font-black uppercase text-[11px] tracking-widest text-slate-800 italic">Sugerir Pergunta</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Mande pro VAR analisar</span>
          </div>
        </div>
        <ChevronRight size={20} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
      </button>

      {user.role === 'admin' && (
        <button onClick={() => setView('admin')} className="w-full p-7 bg-emerald-600 text-white rounded-[2.5rem] flex items-center gap-5 shadow-2xl shadow-emerald-600/30 active:scale-95 transition-transform mt-6">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
            <ShieldCheck size={24} />
          </div>
          <div className="flex flex-col items-start">
            <span className="font-black uppercase text-[12px] tracking-[0.1em] italic leading-none">Central do VAR</span>
            <span className="text-[9px] font-bold uppercase tracking-widest opacity-70">Administração</span>
          </div>
        </button>
      )}

      <button onClick={onLogout} className="w-full p-6 bg-red-50 text-red-600 rounded-[2rem] flex items-center gap-5 border border-red-100 mt-12 transition-all active:scale-95">
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
          <LogOut size={24} />
        </div>
        <div className="flex flex-col items-start">
          <span className="font-black uppercase text-[11px] tracking-widest italic">Encerrar Carreira</span>
          <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">Fazer Logout</span>
        </div>
      </button>
    </div>

    <div className="mt-auto pt-10 pb-6 text-center border-t border-slate-100">
       <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Créditos de Produção</p>
       </div>
       <p className="text-[11px] font-bold text-slate-600 mb-1">
          <span className="text-emerald-600">Desenvolvido por</span> Henrique Biala
       </p>
       <p className="text-[10px] font-bold text-slate-400">
          <span className="text-emerald-600/50">Testado por</span> Rúben Barros & Ermenegildo Perez
       </p>
    </div>
  </div>
);

// AdminView e SuggestView permanecem com lógica similar, mas UI polida.
// (Omitidos aqui por brevidade, mas devem ser incluídos no arquivo final)
const AdminView: React.FC<{ onBack: any }> = ({ onBack }) => {
  const [pend, setPend] = useState<Question[]>([]);
  const [stats, setStats] = useState({ users: 0, pending: 0 });
  const [load, setLoad] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const [pendingQs, ranking] = await Promise.all([
          db.getPendingQuestions(),
          db.getGlobalRanking()
        ]);
        setPend(pendingQs);
        setStats({ users: ranking.length, pending: pendingQs.length });
      } catch (e) { console.error(e); } finally { setLoad(false); }
    };
    fetchAdminData();
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'delete') => {
    if (action === 'approve') await db.approveQuestion(id);
    else await db.deleteQuestion(id);
    setPend(p => p.filter(x => x.id !== id));
    setStats(s => ({ ...s, pending: s.pending - 1 }));
  };

  if (load) return <div className="p-20 text-center font-black uppercase italic animate-pulse">Carregando VAR...</div>;

  return (
    <div className="px-6 py-8 space-y-8 animate-app-in">
      <div className="flex items-center justify-between">
         <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none">VAR<br/><span className="text-emerald-600">Control</span></h2>
         <div className="bg-slate-900 text-white p-4 rounded-[2rem] rotate-6 shadow-xl"><ShieldCheck size={28} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-950 p-6 rounded-[2.5rem] text-white shadow-2xl">
          <Users size={20} className="text-emerald-400 mb-2" />
          <p className="text-3xl font-black italic">{stats.users}</p>
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Craques</p>
        </div>
        <div className="bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-sm">
          <Database size={20} className="text-emerald-600 mb-2" />
          <p className="text-3xl font-black italic text-slate-800">{stats.pending}</p>
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Revisões</p>
        </div>
      </div>
      <div className="space-y-4">
        {pend.map(q => (
          <div key={q.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl relative group overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-emerald-600 transition-transform group-hover:scale-y-110"></div>
            <div className="mb-6 relative z-10">
              <div className="flex items-center justify-between mb-4">
                 <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full">{q.theme}</span>
                 <span className="text-[9px] font-bold text-slate-400 italic">De: {q.suggestedBy?.split('@')[0]}</span>
              </div>
              <p className="font-black text-slate-800 text-lg leading-tight italic">"{q.text}"</p>
            </div>
            <div className="grid grid-cols-2 gap-4 relative z-10">
              <button onClick={() => handleAction(q.id, 'approve')} className="py-4 bg-emerald-600 text-white rounded-2xl text-[11px] font-black uppercase italic shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"><CheckCircle2 size={16} /> Validar</button>
              <button onClick={() => handleAction(q.id, 'delete')} className="py-4 bg-white border-2 border-red-50 text-red-500 rounded-2xl text-[11px] font-black uppercase italic active:scale-95 transition-all flex items-center justify-center gap-2"><XCircle size={16} /> Anular</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SuggestView: React.FC<{ user: UserProfile, onBack: any }> = ({ user, onBack }) => {
  const [text, setText] = useState('');
  const [correct, setCorrect] = useState('');
  const [load, setLoad] = useState(false);
  const [done, setDone] = useState(false);

  const sub = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoad(true);
    await db.saveQuestion({ 
      id: Date.now().toString(), 
      text, 
      options: [correct, 'Opção B', 'Opção C', 'Opção D'].sort(() => Math.random() - 0.5), 
      correctAnswer: correct, 
      theme: Theme.MUNDIAL, 
      subtheme: 'Sugestão', 
      difficulty: Difficulty.MEDIO, 
      approved: false, 
      suggestedBy: user.email 
    });
    setDone(true);
    setLoad(false);
  };

  if (done) return (
    <div className="px-10 py-20 text-center animate-app-in flex-1 flex flex-col justify-center">
      <div className="w-32 h-32 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-10 shadow-inner">
        <CheckCircle2 size={64} className="text-emerald-600" />
      </div>
      <h2 className="text-4xl font-black italic uppercase mb-3 leading-none tracking-tighter">Lance enviado!</h2>
      <p className="text-slate-400 font-bold text-sm mb-12 italic">Nossa equipe do VAR vai analisar sua pergunta. Fique ligado!</p>
      <button onClick={onBack} className="w-full py-6 bg-emerald-600 text-white rounded-[2rem] font-black uppercase italic shadow-2xl active:scale-95 transition-all">Voltar ao Estádio</button>
    </div>
  );

  return (
    <div className="px-8 py-10 animate-app-in flex flex-col h-full">
      <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-4 px-2 leading-none">Mandar pro <span className="text-emerald-600">VAR</span></h2>
      <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em] mb-12 px-2">Ajude a escalar o conhecimento mundial</p>
      
      <form onSubmit={sub} className="space-y-8 flex-1">
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-4">O Enunciado</label>
          <textarea required className="w-full p-7 bg-white border border-slate-100 rounded-[2.5rem] font-bold min-h-[160px] shadow-sm outline-none focus:border-emerald-500 transition-all text-lg" placeholder="Ex: Qual país sediou a Copa de 1994?" value={text} onChange={e => setText(e.target.value)} />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 px-4">Resposta Gabarito</label>
          <input required className="w-full p-6 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-[2rem] font-black shadow-inner outline-none focus:border-emerald-500 transition-all italic" placeholder="Ex: Estados Unidos" value={correct} onChange={e => setCorrect(e.target.value)} />
        </div>
        <div className="bg-slate-900 p-8 rounded-[3rem] text-white flex gap-5 items-start relative overflow-hidden">
          <div className="absolute bottom-0 right-0 w-20 h-20 bg-emerald-600/20 rounded-full blur-2xl"></div>
          <AlertTriangle className="text-yellow-400 flex-shrink-0 animate-bounce" size={24} />
          <p className="text-[11px] font-bold text-slate-300 leading-relaxed italic relative z-10">Sua pergunta passará por análise de qualidade antes de ser escalada para o público global.</p>
        </div>
        <button disabled={load} className="w-full py-6 bg-slate-950 text-white rounded-[2rem] font-black uppercase italic shadow-2xl active:scale-95 transition-all mt-auto flex items-center justify-center gap-3">
          {load ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : 'Confirmar Envio'}
        </button>
      </form>
    </div>
  );
};

export default App;
