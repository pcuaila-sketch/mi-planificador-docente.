import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, addDoc, onSnapshot, deleteDoc, updateDoc 
} from 'firebase/firestore';
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile 
} from 'firebase/auth';
import { 
  Calendar, ChevronLeft, ChevronRight, Plus, Trash2, X, Loader2, Clock, 
  PanelLeftClose, PanelLeft, LogOut, User, Mail, Lock, ArrowRight, Settings 
} from 'lucide-react';

// --- CONFIGURACIÓN FIREBASE (Tus datos de la captura) ---
const firebaseConfig = {
  apiKey: "AIzaSyCGuuZofHBvFI56NPhPzGvjNjp16WSy0qc",
  authDomain: "planificadores-80294.firebaseapp.com",
  projectId: "planificadores-80294",
  storageBucket: "planificadores-80294.firebasestorage.app",
  messagingSenderId: "246279673142",
  appId: "1:246279673142:web:0dbad831503c233f844f97",
  measurementId: "G-4WS7PVBV9W"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoginView, setIsLoginView] = useState(true);
  const [planners, setPlanners] = useState([]);
  const [activePlannerId, setActivePlannerId] = useState(null);
  const [activities, setActivities] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const plannersRef = collection(db, "mis_datos", user.uid, "planners");
    return onSnapshot(plannersRef, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setPlanners(docs);
      if (docs.length > 0 && !activePlannerId) setActivePlannerId(docs[0].id);
    });
  }, [user, activePlannerId]);

  useEffect(() => {
    if (!user || !activePlannerId) return;
    const actsRef = collection(db, "mis_datos", user.uid, "planners", activePlannerId, "activities");
    return onSnapshot(actsRef, (snapshot) => {
      setActivities(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [user, activePlannerId]);

  const actsByDate = useMemo(() => {
    const map = {};
    activities.forEach(a => {
      const d = String(a.date);
      if (!map[d]) map[d] = [];
      map[d].push(a);
    });
    return map;
  }, [activities]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isLoginView) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(res.user, { displayName: name });
      }
    } catch (err) { setError("Error en Firebase: Revisa tus datos."); }
    finally { setLoading(false); }
  };

  const saveActivity = async () => {
    if (!activePlannerId) return;
    const ref = collection(db, "mis_datos", user.uid, "planners", activePlannerId, "activities");
    if (editingActivity?.id) {
      await updateDoc(doc(ref, editingActivity.id), editingActivity);
    } else {
      await addDoc(ref, { ...editingActivity, createdAt: Date.now() });
    }
    setIsModalOpen(false);
    setEditingActivity(null);
  };

  const calendarDays = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const start = new Date(y, m, 1).getDay();
    const total = new Date(y, m + 1, 0).getDate();
    const res = [];
    const prevLast = new Date(y, m, 0).getDate();
    for (let i = start - 1; i >= 0; i--) res.push({ d: prevLast - i, m: m - 1, y, current: false });
    for (let i = 1; i <= total; i++) res.push({ d: i, m, y, current: true });
    return res;
  }, [currentDate]);

  if (isAuthLoading) return <div className="h-screen flex items-center justify-center font-black text-slate-300">CARGANDO...</div>;

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-indigo-600 p-6 font-sans">
      <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden p-10 space-y-6">
        <div className="text-center">
          <Calendar className="mx-auto text-indigo-600 mb-2" size={48} />
          <h1 className="text-3xl font-black italic text-slate-800 tracking-tighter leading-none">DocentePlan</h1>
        </div>
        <form onSubmit={handleAuth} className="space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl">{error}</div>}
          {!isLoginView && <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" placeholder="Tu Nombre" />}
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" placeholder="Email" />
          <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" placeholder="Contraseña" />
          <button disabled={loading} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-xl uppercase">
            {loading ? '...' : (isLoginView ? 'Entrar' : 'Registrar')}
          </button>
          <button type="button" onClick={() => setIsLoginView(!isLoginView)} className="w-full text-center text-xs font-black text-slate-400 mt-4 uppercase underline">
            {isLoginView ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Entra'}
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-white font-sans overflow-hidden">
      {/* Sidebar */}
      <div className={`bg-slate-900 text-white transition-all duration-300 flex flex-col ${isSidebarOpen ? 'w-64 p-6' : 'w-0 p-0 opacity-0 overflow-hidden'}`}>
        <div className="flex items-center gap-2 mb-10 min-w-[200px]"><Calendar className="text-indigo-400" /><h1 className="text-xl font-black italic">DocentePlan</h1></div>
        <div className="flex-1 min-w-[200px]">
          <p className="text-[10px] font-black text-slate-500 uppercase mb-4 tracking-widest">Planes</p>
          <div className="space-y-2">
            {planners.map(p => (
              <button key={p.id} onClick={() => setActivePlannerId(p.id)} className={`w-full text-left p-3 rounded-xl text-sm font-bold ${activePlannerId === p.id ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>
                {String(p.name)}
              </button>
            ))}
            <button onClick={() => {
              const n = prompt("Nombre del plan:");
              if (n) addDoc(collection(db, "mis_datos", user.uid, "planners"), { name: n, createdAt: Date.now() });
            }} className="w-full p-3 border-2 border-dashed border-slate-700 rounded-xl text-xs font-bold text-slate-500 hover:text-indigo-400">+ NUEVO PLAN</button>
          </div>
        </div>
        <div className="pt-6 border-t border-slate-800 min-w-[200px]">
          <button onClick={() => signOut(auth)} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-red-400"><LogOut size={16} /> Salir</button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-white">
        <header className="h-20 border-b flex items-center justify-between px-8 bg-white">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-slate-50 rounded-xl text-slate-500 hover:text-indigo-600"><PanelLeft size={24}/></button>
            <h2 className="text-xl font-black uppercase text-slate-800 tracking-tighter">Panel Docente</h2>
          </div>
          <button onClick={() => { setEditingActivity({ date: currentDate.toISOString().split('T')[0] }); setIsModalOpen(true); }} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl">+ ACTIVIDAD</button>
        </header>
        
        <main className="flex-1 p-10 bg-slate-50 overflow-auto">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
              <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tighter">¡Hola, {user.displayName || 'Profesor/a'}!</h2>
              <p className="text-slate-500 font-bold mb-8 uppercase tracking-widest text-[10px]">Configuración completada. Empieza a planificar.</p>
              <div className="grid grid-cols-7 gap-2 opacity-10">
                 {Array.from({length: 35}).map((_, i) => <div key={i} className="aspect-square bg-slate-200 rounded-xl"></div>)}
              </div>
            </div>
          </div>
        </main>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white p-10 rounded-[48px] w-full max-w-lg shadow-2xl animate-in zoom-in duration-300 border border-slate-100">
             <div className="flex justify-between items-center mb-8">
               <h3 className="text-2xl font-black text-slate-800 italic tracking-tighter">Sincronizar Tarea</h3>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-400 p-2"><X /></button>
             </div>
             <div className="space-y-4">
                <input className="w-full p-4 bg-slate-50 border rounded-2xl font-bold outline-none focus:border-indigo-600" placeholder="Título de la clase" value={editingActivity?.title || ''} onChange={e => setEditingActivity({...editingActivity, title: e.target.value})} />
                <button onClick={saveActivity} className="w-full bg-indigo-600 text-white py-5 rounded-[24px] font-black text-lg shadow-xl shadow-indigo-100 transition-all active:scale-95">GUARDAR EN LA NUBE</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}