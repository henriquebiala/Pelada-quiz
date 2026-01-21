import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, Home, Settings, LogOut, ShieldCheck, User, MessageSquarePlus, 
  Target, Volume2, VolumeX, Globe, ChevronRight, Zap, Award, AlertTriangle
} from 'lucide-react';
import { onAuthStateChanged } from "firebase/auth";
import { Theme, Question, UserProfile, Difficulty } from './types';
import { db, auth } from './dbService';
import { generateQuestions } from './geminiService';

const FALLBACK_QUESTIONS: Record<string, Question[]> = {
  [Theme.MUNDIAL]: [
    { id: 'f1', text: 'Quem ganhou a Copa do Mundo de 2022?', options: ['Brasil', 'França', 'Argentina', 'Alemanha'], correctAnswer: 'Argentina', theme: Theme.MUNDIAL, subtheme: 'Copa do Mundo', difficulty: Difficulty.FACIL, approved: true },
    { id: 'f2', text: 'Qual jogador tem mais Bolas de Ouro na história?', options: ['Pelé', 'Cristiano Ronaldo', 'Lionel Messi', 'Zidane'], correctAnswer: 'Lionel Messi', theme: Theme.MUNDIAL, subtheme: 'Prêmios', difficulty: Difficulty.FACIL, approved: true },
    { id: 'f3', text: 'Em que país foi inventado o futebol moderno?', options: ['Brasil', 'Inglaterra', 'Itália', 'China'], correctAnswer: 'Inglaterra', theme: Theme.MUNDIAL, subtheme: 'História', difficulty: Difficulty.FACIL, approved: true },
    { id: 'f4', text: 'Qual seleção tem mais títulos de Copa do Mundo?', options: ['Alemanha', 'Itália', 'Brasil', 'Argentina'], correctAnswer: 'Brasil', theme: Theme.MUNDIAL, subtheme: 'Copa do Mundo', difficulty: Difficulty.FACIL, approved: true },
    { id: 'f5', text: 'Quem venceu a Champions League 2022/23?', options: ['Real Madrid', 'Inter de Milão', 'Manchester City', 'Liverpool'], correctAnswer: 'Manchester City', theme: Theme.MUNDIAL, subtheme: 'Clubes', difficulty: Difficulty.FACIL, approved: true },
    { id: 'f6', text: 'Qual era o primeiro clube profissional de Cristiano Ronaldo?', options: ['Man United', 'Real Madrid', 'Sporting CP', 'Juventus'], correctAnswer: 'Sporting CP', theme: Theme.MUNDIAL, subtheme: 'Jogadores', difficulty: Difficulty.MEDIO, approved: true },
    { id: 'f7', text: 'Onde foi realizada a Copa do Mundo de 2014?', options: ['África do Sul', 'Rússia', 'Brasil', 'Alemanha'], correctAnswer: 'Brasil', theme: Theme.MUNDIAL, subtheme: 'Copa do Mundo', difficulty: Difficulty.MEDIO, approved: true },
    { id: 'f8', text: 'Em que ano aconteceu o "Maracanazo"?', options: ['1950', '1954', '1958', '1962'], correctAnswer: '1950', theme: Theme.MUNDIAL, subtheme: 'História', difficulty: Difficulty.MEDIO, approved: true },
    { id: 'f9', text: 'Quem venceu a Eurocopa 2024?', options: ['Inglaterra', 'França', 'Espanha', 'Portugal'], correctAnswer: 'Espanha', theme: Theme.MUNDIAL, subtheme: 'Seleções', difficulty: Difficulty.MEDIO, approved: true },
    { id: 'f10', text: 'Qual número Pelé imortalizou na Seleção Brasileira?', options: ['7', '9', '10', '11'], correctAnswer: '10', theme: Theme.MUNDIAL, subtheme: 'Jogadores', difficulty: Difficulty.MEDIO, approved: true },
    { id: 'f11', text: 'Quem ganhou a primeira Copa do Mundo em 1930?', options: ['Brasil', 'Argentina', 'Uruguai', 'EUA'], correctAnswer: 'Uruguai', theme: Theme.MUNDIAL, subtheme: 'História', difficulty: Difficulty.DIFICIL, approved: true },
    { id: 'f12', text: 'Quem marcou o "Gol do Século" contra a Inglaterra em 1986?', options: ['Pele', 'Maradona', 'Zico', 'Platini'], correctAnswer: 'Maradona', theme: Theme.MUNDIAL, subtheme: 'Jogadores', difficulty: Difficulty.DIFICIL, approved: true },
    { id: 'f13', text: 'Qual o apelido histórico de Pelé?', options: ['Fenômeno', 'Rei do Futebol', 'Pérola Negra', 'Mestre'], correctAnswer: 'Rei do Futebol', theme: Theme.MUNDIAL, subtheme: 'Jogadores', difficulty: Difficulty.DIFICIL, approved: true },
    { id: 'f14', text: 'Qual o nome do estádio do Real Madrid?', options: ['Camp Nou', 'Wanda Metropolitano', 'Santiago Bernabéu', 'Mestalla'], correctAnswer: 'Santiago Bernabéu', theme: Theme.MUNDIAL, subtheme: 'Clubes', difficulty: Difficulty.DIFICIL, approved: true },
    { id: 'f15', text: 'Quem detém o recorde de mais gols em uma única edição de Copa?', options: ['Muller', 'Just Fontaine', 'Klose', 'Ronaldo'], correctAnswer: 'Just Fontaine', theme: Theme.MUNDIAL, subtheme: 'Recordes', difficulty: Difficulty.DIFICIL, approved: true }
  ],
  [Theme.ANGOLANO]: [
    { id: 'a1', text: 'Qual é o nome da principal liga de futebol em Angola?', options: ['Angolazão', 'Girabola', 'Liga Angola', 'Taça Independência'], correctAnswer: 'Girabola', theme: Theme.ANGOLANO, subtheme: 'Liga Nacional', difficulty: Difficulty.FACIL, approved: true },
    { id: 'a2', text: 'Em que ano Angola participou pela primeira vez num Mundial?', options: ['2002', '2006', '2010', '1998'], correctAnswer: '2006', theme: Theme.ANGOLANO, subtheme: 'Seleção', difficulty: Difficulty.FACIL, approved: true },
    { id: 'a3', text: 'Qual clube angolano tem mais títulos do Girabola?', options: ['1º de Agosto', 'Petro de Luanda', 'Sagrada Esperança', 'Interclube'], correctAnswer: 'Petro de Luanda', theme: Theme.ANGOLANO, subtheme: 'Clubes', difficulty: Difficulty.FACIL, approved: true },
    { id: 'a4', text: 'Qual o apelido da seleção nacional de Angola?', options: ['Leões', 'Águias', 'Palancas Negras', 'Elefantes'], correctAnswer: 'Palancas Negras', theme: Theme.ANGOLANO, subtheme: 'Seleção', difficulty: Difficulty.FACIL, approved: true },
    { id: 'a5', text: 'Em qual província fica o Estádio 11 de Novembro?', options: ['Benguela', 'Huíla', 'Luanda', 'Cabinda'], correctAnswer: 'Luanda', theme: Theme.ANGOLANO, subtheme: 'Infraestrutura', difficulty: Difficulty.FACIL, approved: true },
    { id: 'a6', text: 'Quem é o lendário capitão de Angola no Mundial 2006?', options: ['Mantorras', 'Akwa', 'Flávio', 'Gilberto'], correctAnswer: 'Akwa', theme: Theme.ANGOLANO, subtheme: 'Jogadores', difficulty: Difficulty.MEDIO, approved: true },
    { id: 'a7', text: 'Em que ano Angola organizou o CAN (Campeonato Africano)?', options: ['2008', '2010', '2012', '2014'], correctAnswer: '2010', theme: Theme.ANGOLANO, subtheme: 'História', difficulty: Difficulty.MEDIO, approved: true },
    { id: 'a8', text: 'Pedro Mantorras brilhou em qual grande clube europeu?', options: ['Porto', 'Sporting', 'Benfica', 'Real Madrid'], correctAnswer: 'Benfica', theme: Theme.ANGOLANO, subtheme: 'Jogadores', difficulty: Difficulty.MEDIO, approved: true },
    { id: 'a9', text: 'Qual clube representa a Polícia Nacional de Angola?', options: ['1º de Agosto', 'Petro', 'Interclube', 'Progresso'], correctAnswer: 'Interclube', theme: Theme.ANGOLANO, subtheme: 'Clubes', difficulty: Difficulty.MEDIO, approved: true },
    { id: 'a10', text: 'Gelson Dala começou sua carreira em qual clube angolano?', options: ['Petro', '1º de Agosto', 'Kabuscorp', 'Recreativo do Libolo'], correctAnswer: '1º de Agosto', theme: Theme.ANGOLANO, subtheme: 'Jogadores', difficulty: Difficulty.MEDIO, approved: true },
    { id: 'a11', text: 'Flávio Amado é ídolo histórico em qual gigante do Egito?', options: ['Zamalek', 'Al Ahly', 'Pyramids', 'Ismaily'], correctAnswer: 'Al Ahly', theme: Theme.ANGOLANO, subtheme: 'Jogadores', difficulty: Difficulty.DIFICIL, approved: true },
    { id: 'a12', text: 'Qual foi o ano de fundação do Girabola?', options: ['1975', '1979', '1981', '1985'], correctAnswer: '1979', theme: Theme.ANGOLANO, subtheme: 'História', difficulty: Difficulty.DIFICIL, approved: true },
    { id: 'a13', text: 'Qual a melhor classificação de Angola num CAN até hoje?', options: ['Campeão', 'Finalista', 'Quartos-de-final', 'Fase de Grupos'], correctAnswer: 'Quartos-de-final', theme: Theme.ANGOLANO, subtheme: 'Seleção', difficulty: Difficulty.DIFICIL, approved: true },
    { id: 'a14', text: 'O 1º de Agosto pertence a qual instituição?', options: ['Polícia', 'Forças Armadas', 'Caminhos de Ferro', 'Petróleos'], correctAnswer: 'Forças Armadas', theme: Theme.ANGOLANO, subtheme: 'Clubes', difficulty: Difficulty.DIFICIL, approved: true },
    { id: 'a15', text: 'Manucho Gonçalves jogou em qual gigante da Inglaterra?', options: ['Chelsea', 'Man United', 'Arsenal', 'Liverpool'], correctAnswer: 'Man United', theme: Theme.ANGOLANO, subtheme: 'Jogadores', difficulty: Difficulty.DIFICIL, approved: true }
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
            profile = { uid: fbUser.uid, email: fbUser.email || '', displayName: fbUser.displayName || 'Jogador', role: fbUser.email === 'admin@bola.com' ? 'admin' : 'user', scores: [] };
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

  const Credits = () => (
    <div className="mt-auto py-8 px-6 text-center border-t border-slate-100 bg-slate-50/50">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Créditos de Produção</p>
      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] font-bold text-slate-600">
          <span className="text-emerald-600">Desenvolvido por</span> Henrique Biala
        </p>
        <p className="text-[11px] font-bold text-slate-600">
          <span className="text-emerald-600">Testado por</span> Rúben Barros & Ermenegildo Perez
        </p>
      </div>
    </div>
  );

  if (isInitializing) return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white p-6">
      <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 animate-pulse">Entrando em campo...</p>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-900 overflow-hidden">
      {!user ? (
        <AuthView onLogin={(u) => { setUser(u); setView('home'); }} />
      ) : (
        <>
          <header className="px-5 py-4 flex justify-between items-center bg-white border-b border-slate-100 sticky top-0 z-50">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('home')}>
              <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/20 rotate-3">
                <Trophy size={18} />
              </div>
              <span className="font-black text-lg tracking-tighter italic uppercase">Bom de Bola</span>
            </div>
            <button onClick={() => setView('settings')} className="p-2 bg-slate-100 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors">
              <Settings size={20} />
            </button>
          </header>

          <main className="flex-1 pb-24 overflow-y-auto">
            <div className="animate-app-in min-h-full flex flex-col">
              {view === 'home' && (
                <>
                  <HomeView onSelectTheme={(t) => { setSelectedTheme(t); setView('quiz'); }} />
                  <Credits />
                </>
              )}
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
              {view === 'ranking' && <RankingView onBack={() => setView('home')} />}
              {view === 'profile' && <ProfileView user={user} onBack={() => setView('home')} />}
              {view === 'settings' && (
                <>
                  <SettingsView user={user} onToggleMute={() => setIsMuted(!isMuted)} isMuted={isMuted} setView={setView} onLogout={() => { db.logout(); setUser(null); }} />
                  <Credits />
                </>
              )}
              {view === 'suggest' && <SuggestView user={user} onBack={() => setView('home')} />}
              {view === 'admin' && <AdminView onBack={() => setView('settings')} />}
            </div>
          </main>

          {['home', 'ranking', 'profile'].includes(view) && (
            <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-slate-100 px-6 py-3 flex justify-around items-center z-50 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
              <button onClick={() => setView('home')} className={`flex flex-col items-center gap-1 ${view === 'home' ? 'text-emerald-600' : 'text-slate-400'}`}>
                <Home size={22} /><span className="text-[10px] font-bold uppercase tracking-tight">Jogar</span>
              </button>
              <button onClick={() => setView('ranking')} className={`flex flex-col items-center gap-1 ${view === 'ranking' ? 'text-emerald-600' : 'text-slate-400'}`}>
                <Award size={22} /><span className="text-[10px] font-bold uppercase tracking-tight">Placar</span>
              </button>
              <button onClick={() => setView('profile')} className={`flex flex-col items-center gap-1 ${view === 'profile' ? 'text-emerald-600' : 'text-slate-400'}`}>
                <User size={22} /><span className="text-[10px] font-bold uppercase tracking-tight">Perfil</span>
              </button>
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
    } catch(err) { alert("Credenciais inválidas."); }
    setLoad(false);
  };

  return (
    <div className="flex-1 flex flex-col justify-center px-8 py-10 animate-app-in">
      <div className="w-20 h-20 bg-emerald-600 rounded-[2rem] flex items-center justify-center text-white mx-auto mb-8 shadow-2xl rotate-6">
        <Trophy size={40} />
      </div>
      <h1 className="text-4xl font-black italic uppercase tracking-tighter text-center leading-none mb-2">Bom de Bola</h1>
      <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] text-center mb-10">O quiz oficial da resenha</p>
      <form onSubmit={handle} className="space-y-3">
        {isSignUp && <input required className="w-full p-4 bg-slate-100 rounded-2xl outline-none border-2 border-transparent focus:border-emerald-500 font-bold" placeholder="Nome" value={name} onChange={e => setName(e.target.value)} />}
        <input required className="w-full p-4 bg-slate-100 rounded-2xl outline-none border-2 border-transparent focus:border-emerald-500 font-bold" placeholder="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        <input required className="w-full p-4 bg-slate-100 rounded-2xl outline-none border-2 border-transparent focus:border-emerald-500 font-bold" placeholder="Senha" type="password" value={pass} onChange={e => setPass(e.target.value)} />
        <button disabled={load} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase italic shadow-xl">
          {load ? 'Entrando...' : isSignUp ? 'Criar Conta' : 'Entrar em Campo'}
        </button>
      </form>
      <button onClick={() => setIsSignUp(!isSignUp)} className="mt-8 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center w-full">
        {isSignUp ? 'Já tem conta? Fazer Login' : 'Novo por aqui? Criar Conta'}
      </button>
    </div>
  );
};

const HomeView: React.FC<{ onSelectTheme: (t: Theme) => void }> = ({ onSelectTheme }) => (
  <div className="px-5 py-6 space-y-8 flex-1">
    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={14} className="text-emerald-400 fill-emerald-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Novo Desafio</span>
        </div>
        <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none mb-6">Mostre que você<br/>é o camisa 10!</h2>
        <button onClick={() => onSelectTheme(Theme.MUNDIAL)} className="px-6 py-3 bg-emerald-500 rounded-xl font-black text-sm uppercase tracking-widest italic flex items-center gap-2">Jogar Agora <ChevronRight size={16} /></button>
      </div>
    </div>
    <div>
      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 px-2">Escolha seu Estádio</h3>
      <div className="grid grid-cols-1 gap-3">
        {Object.values(Theme).map(t => (
          <button key={t} onClick={() => onSelectTheme(t)} className="flex items-center justify-between p-5 bg-white rounded-3xl border border-slate-100 shadow-sm active:scale-98">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-emerald-600"><Globe size={24} /></div>
              <span className="font-bold text-sm uppercase italic tracking-tight">{t}</span>
            </div>
            <ChevronRight className="text-slate-300" size={20} />
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
        
        // Garantir que temos 15 se for fallback de teste ou completar com mundiais
        if (items.length < 15 && items.length > 0) {
            const filler = (FALLBACK_QUESTIONS[Theme.MUNDIAL]).filter(f => !items.find(it => it.text === f.text));
            items = [...items, ...filler].slice(0, 15);
        }

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
      }, 700);
    } else {
      setFeedback('incorrect'); playSound('incorrect');
      setTimeout(() => onGameOver(idx * 10), 1000);
    }
  };

  if (load) return (
    <div className="h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest italic">A IA está escalando os craques...</p>
    </div>
  );

  const q = qs[idx];
  const progress = (idx / qs.length) * 100;

  return (
    <div className="px-5 py-4 h-full flex flex-col flex-1">
      <div className="flex justify-between items-center mb-6 px-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{theme} • {q.difficulty}</span>
        <span className="text-xs font-black text-slate-900 uppercase">RODADA {idx + 1}/{qs.length}</span>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full mb-8 overflow-hidden">
        <div className="h-full bg-emerald-500 transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" style={{ width: `${progress}%` }}></div>
      </div>
      <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-50 flex flex-col items-center mb-6 flex-1 justify-center">
        <h3 className="text-xl font-black text-slate-800 text-center leading-tight mb-8">{q.text}</h3>
        <div className="w-full space-y-3">
          {q.options.map(o => (
            <button key={o} onClick={() => handle(o)} disabled={!!feedback} className={`w-full p-5 rounded-2xl text-left font-bold transition-all border-2 text-sm ${selected === o ? 'border-emerald-500 scale-[0.98]' : 'border-slate-50 bg-slate-50'} ${feedback === 'correct' && o === q.correctAnswer ? '!bg-emerald-600 !text-white !border-emerald-600 shadow-lg shadow-emerald-600/20' : ''} ${feedback === 'incorrect' && selected === o ? '!bg-red-500 !text-white !border-red-500 shadow-lg shadow-red-500/20' : ''}`}>{o}</button>
          ))}
        </div>
      </div>
      <div className="text-center pb-4"><p className="text-3xl font-black text-emerald-600 leading-none">{idx * 10}</p><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">PONTOS</p></div>
    </div>
  );
};

const ResultsView: React.FC<{ score: number, onRestart: () => void }> = ({ score, onRestart }) => (
  <div className="px-8 py-12 flex-1 flex flex-col justify-center items-center text-center animate-app-in">
    <div className="text-8xl mb-6">🏆</div>
    <h2 className="text-4xl font-black italic uppercase mb-2">CAMPEÃO!</h2>
    <p className="text-slate-400 font-bold text-sm mb-10 italic">Você completou o desafio de elite!</p>
    <div className="bg-emerald-600 w-full p-8 rounded-[3rem] text-white shadow-2xl mb-10"><p className="text-6xl font-black">{score}</p><p className="text-[10px] font-bold uppercase tracking-widest mt-2 opacity-70">Placar Final</p></div>
    <button onClick={onRestart} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase italic active:scale-95 shadow-xl">Jogar de Novo</button>
  </div>
);

const GameOverView: React.FC<{ score: number, onRestart: () => void }> = ({ score, onRestart }) => (
  <div className="px-8 py-12 flex-1 flex flex-col justify-center items-center text-center animate-app-in">
    <div className="text-8xl mb-6">🟥</div>
    <h2 className="text-4xl font-black italic uppercase mb-2 text-red-600">EXPULSO!</h2>
    <p className="text-slate-400 font-bold text-sm mb-10 italic">O juiz apitou o fim do jogo para você.</p>
    <div className="bg-red-50 w-full p-8 rounded-[3rem] border-2 border-red-100 mb-10"><p className="text-6xl font-black text-red-600">{score}</p><p className="text-[10px] font-bold uppercase tracking-widest mt-2 text-red-400">Sua Pontuação</p></div>
    <button onClick={onRestart} className="w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase italic active:scale-95 shadow-xl">Tentar Revanche</button>
  </div>
);

const SettingsView: React.FC<{ user: UserProfile, onToggleMute: any, isMuted: boolean, setView: any, onLogout: any }> = ({ user, onToggleMute, isMuted, setView, onLogout }) => (
  <div className="px-6 py-8 flex-1 flex flex-col animate-app-in">
    <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-8 px-2">Opções</h2>
    <div className="space-y-3">
      <button onClick={onToggleMute} className="w-full p-5 bg-white rounded-3xl flex items-center justify-between border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-emerald-600">{isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}</div>
          <span className="font-bold uppercase text-[11px] tracking-widest">{isMuted ? 'Som: Mudo' : 'Som: Ligado'}</span>
        </div>
        <div className={`w-12 h-6 rounded-full relative transition-all ${isMuted ? 'bg-slate-200' : 'bg-emerald-500'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isMuted ? 'left-1' : 'left-7'}`}></div></div>
      </button>
      <button onClick={() => setView('suggest')} className="w-full p-5 bg-white rounded-3xl flex items-center gap-4 border border-slate-100"><div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-emerald-600"><MessageSquarePlus size={20} /></div><span className="font-bold uppercase text-[11px] tracking-widest">Sugerir Pergunta</span></button>
      {user.role === 'admin' && <button onClick={() => setView('admin')} className="w-full p-5 bg-emerald-50 rounded-3xl flex items-center gap-4 border border-emerald-100"><div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600"><ShieldCheck size={20} /></div><span className="font-bold uppercase text-[11px] tracking-widest text-emerald-700">Painel do VAR</span></button>}
      <button onClick={onLogout} className="w-full p-5 bg-red-50 text-red-600 rounded-3xl flex items-center gap-4 border border-red-100 mt-10"><LogOut size={20} /><span className="font-bold uppercase text-[11px] tracking-widest">Sair da Conta</span></button>
    </div>
  </div>
);

const RankingView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [list, setList] = useState<UserProfile[]>([]);
  useEffect(() => { db.getGlobalRanking().then(setList); }, []);
  return (
    <div className="px-5 py-6 animate-app-in">
      <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-8 px-2">Top 10 Global</h2>
      <div className="space-y-2">{list.map((u, i) => (
        <div key={u.uid} className="bg-white p-4 rounded-2xl flex items-center justify-between border border-slate-50"><div className="flex items-center gap-4"><div className={`w-9 h-9 rounded-lg flex items-center justify-center font-black ${i === 0 ? 'bg-amber-400 text-white' : 'bg-slate-100 text-slate-400'}`}>{i + 1}</div><span className="font-bold text-sm">{u.displayName}</span></div><div className="text-right"><p className="text-lg font-black text-emerald-600">{(u.scores || []).reduce((a, b) => a + b.points, 0)}</p><p className="text-[8px] font-bold text-slate-300 uppercase">PTS</p></div></div>
      ))}</div>
    </div>
  );
};

const ProfileView: React.FC<{ user: UserProfile, onBack: () => void }> = ({ user, onBack }) => (
  <div className="px-6 py-8 animate-app-in">
    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-center text-white mb-8"><div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center text-white text-4xl font-black mx-auto mb-6 rotate-6">{user.displayName[0].toUpperCase()}</div><h2 className="text-2xl font-black uppercase italic mb-1">{user.displayName}</h2><p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">{user.email}</p></div>
    <div className="px-2"><h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Últimos Jogos</h3><div className="space-y-3">{user.scores?.slice(-5).reverse().map((s, i) => (
      <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between"><div className="flex items-center gap-4"><div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-emerald-500"><Target size={20} /></div><div><p className="text-xs font-bold uppercase tracking-tight">{s.theme}</p><p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(s.date).toLocaleDateString()}</p></div></div><span className="text-xl font-black text-emerald-600">{s.points}</span></div>
    ))}</div></div>
  </div>
);

const AdminView: React.FC<{ onBack: any }> = ({ onBack }) => {
  const [pend, setPend] = useState<Question[]>([]);
  useEffect(() => { db.getPendingQuestions().then(setPend); }, []);
  return (
    <div className="px-6 py-6 animate-app-in">
      <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-8">Central do VAR</h2>
      <div className="space-y-4">{pend.map(q => (
        <div key={q.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm"><p className="font-bold text-sm mb-4">"{q.text}"</p><div className="flex gap-2"><button onClick={() => db.approveQuestion(q.id).then(() => setPend(p => p.filter(x => x.id !== q.id)))} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase italic">Aprovar</button><button onClick={() => db.deleteQuestion(q.id).then(() => setPend(p => p.filter(x => x.id !== q.id)))} className="flex-1 py-3 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase italic">Recusar</button></div></div>
      ))}</div>
    </div>
  );
};

const SuggestView: React.FC<{ user: UserProfile, onBack: any }> = ({ user, onBack }) => {
  const [text, setText] = useState('');
  const [correct, setCorrect] = useState('');
  const [done, setDone] = useState(false);
  const sub = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.saveQuestion({ id: Date.now().toString(), text, options: [correct, 'Opção B', 'Opção C', 'Opção D'].sort(() => Math.random() - 0.5), correctAnswer: correct, theme: Theme.MUNDIAL, subtheme: 'Sugestão', difficulty: Difficulty.MEDIO, approved: false, suggestedBy: user.email });
    setDone(true);
  };
  if (done) return <div className="px-8 py-20 text-center"><div className="text-6xl mb-6">✅</div><h2 className="text-2xl font-black italic uppercase mb-10">Enviado pro VAR!</h2><button onClick={onBack} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase italic">Voltar</button></div>;
  return (
    <div className="px-6 py-8 animate-app-in"><h2 className="text-3xl font-black italic uppercase tracking-tighter mb-8">Sugerir Lance</h2><form onSubmit={sub} className="space-y-4"><textarea required className="w-full p-4 bg-white border border-slate-100 rounded-2xl font-bold min-h-[120px]" placeholder="Sua pergunta..." value={text} onChange={e => setText(e.target.value)} /><input required className="w-full p-4 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl font-black" placeholder="Resposta Correta" value={correct} onChange={e => setCorrect(e.target.value)} /><button className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase italic shadow-xl mt-4">Mandar pro VAR</button></form></div>
  );
};

export default App;