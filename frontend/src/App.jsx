import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Toaster, toast } from 'react-hot-toast';
import { login, logout, start, tick, stop } from './store';
import * as api from './api';

const queryClient = new QueryClient();

function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector(s => s.auth);
  const handleLogout = () => { dispatch(logout()); navigate('/login'); };
  if (!isAuthenticated) return <Outlet />;
  return (
    <>
      <div style={{ background: 'white', padding: '1rem', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/" style={{ fontWeight: 'bold', fontSize: '1.25rem', color: '#4f46e5' }}>TimeTracker</Link>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <Link to="/" style={{ color: location.pathname === '/' ? '#4f46e5' : '#64748b' }}>Главная</Link>
            <Link to="/projects" style={{ color: location.pathname === '/projects' ? '#4f46e5' : '#64748b' }}>Проекты</Link>
            <Link to="/analytics" style={{ color: location.pathname === '/analytics' ? '#4f46e5' : '#64748b' }}>Аналитика</Link>
            <Link to="/settings" style={{ color: location.pathname === '/settings' ? '#4f46e5' : '#64748b' }}>Настройки</Link>
            <span>{user?.name}</span>
            <button onClick={handleLogout} style={{ color: '#ef4444' }}>Выйти</button>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1rem' }}><Outlet /></div>
    </>
  );
}

function PrivateRoute({ children }) {
  const { isAuthenticated } = useSelector(s => s.auth);
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function Timer({ projects }) {
  const dispatch = useDispatch();
  const { active, elapsed, running } = useSelector(s => s.timer);
  useEffect(() => {
    let interval;
    if (running) interval = setInterval(() => dispatch(tick()), 1000);
    return () => clearInterval(interval);
  }, [running, dispatch]);
  const format = (s) => `${Math.floor(s / 3600).toString().padStart(2, '0')}:${Math.floor((s % 3600) / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const startSession = useMutation({ mutationFn: api.startSession, onSuccess: (data) => dispatch(start(data.data)) });
  const stopSession = useMutation({ mutationFn: api.stopSession, onSuccess: () => dispatch(stop()) });
  const [projectId, setProjectId] = useState('');
  const [note, setNote] = useState('');
  return (
    <div style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', borderRadius: '1rem', padding: '2rem', color: 'white', textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', fontFamily: 'monospace', marginBottom: '1rem' }}>{format(elapsed)}</div>
      {!running ? (
        <>
          <select value={projectId} onChange={e => setProjectId(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
            <option value="">Выберите проект</option>
            {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
          <input type="text" placeholder="Заметка" value={note} onChange={e => setNote(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem' }} />
          <button onClick={() => startSession.mutate({ projectId, note })} disabled={!projectId} style={{ background: '#10b981', padding: '0.75rem 2rem', borderRadius: '2rem', border: 'none', color: 'white' }}>▶ Начать</button>
        </>
      ) : (
        <>
          <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>{active?.projectId}</div>
          <button onClick={() => stopSession.mutate(active._id)} style={{ background: '#ef4444', padding: '0.75rem 2rem', borderRadius: '2rem', border: 'none', color: 'white' }}>⏹ Стоп</button>
        </>
      )}
    </div>
  );
}

function HomePage() {
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: api.getProjects });
  return (
    <div>
      <div style={{ background: 'white', borderRadius: '1rem', padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Текущий таймер</h2>
        <Timer projects={projects} />
      </div>
      <div style={{ background: 'white', borderRadius: '1rem', padding: '1.5rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Мои проекты</h2>
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(250px,1fr))' }}>
          {projects.map(p => (
            <div key={p._id} style={{ borderLeft: `4px solid #4f46e5`, padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
              <strong>{p.name}</strong>
              {p.description && <p style={{ color: '#64748b', marginTop: '0.5rem' }}>{p.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProjectsPage() {
  const queryClient = useQueryClient();
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: api.getProjects });
  const create = useMutation({ mutationFn: api.createProject, onSuccess: () => queryClient.invalidateQueries(['projects']) });
  const update = useMutation({ mutationFn: ({ id, data }) => api.updateProject(id, data), onSuccess: () => queryClient.invalidateQueries(['projects']) });
  const del = useMutation({ mutationFn: api.deleteProject, onSuccess: () => queryClient.invalidateQueries(['projects']) });
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const handleSubmit = () => {
    if (modal?.id) update.mutate({ id: modal.id, data: form });
    else create.mutate(form);
    setModal(null);
    setForm({ name: '', description: '' });
  };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Проекты</h1>
        <button onClick={() => setModal({})} style={{ background: '#4f46e5', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.5rem' }}>+ Добавить</button>
      </div>
      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))' }}>
        {projects.map(p => (
          <div key={p._id} style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontWeight: 'bold' }}>{p.name}</h3>
            {p.description && <p style={{ color: '#64748b', marginTop: '0.5rem' }}>{p.description}</p>}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => { setModal(p); setForm({ name: p.name, description: p.description || '' }); }} style={{ color: '#4f46e5' }}>Редактировать</button>
              <button onClick={() => del.mutate(p._id)} style={{ color: '#ef4444' }}>Удалить</button>
            </div>
          </div>
        ))}
      </div>
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', width: '400px' }}>
            <h3 style={{ marginBottom: '1rem' }}>{modal.id ? 'Редактировать' : 'Новый проект'}</h3>
            <input placeholder="Название" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} />
            <textarea placeholder="Описание" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} rows="3" />
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => { setModal(null); setForm({ name: '', description: '' }); }}>Отмена</button>
              <button onClick={handleSubmit} style={{ background: '#4f46e5', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.5rem' }}>Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnalyticsPage() {
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: api.getProjects });
  const [filters, setFilters] = useState({ projectId: '', period: 'week', page: 1 });
  const { data: stats } = useQuery({ queryKey: ['stats', filters], queryFn: () => api.getStats(filters) });
  const { data: sessions } = useQuery({ queryKey: ['sessions', filters], queryFn: () => api.getSessions({ ...filters, limit: 10 }) });
  const format = (m) => { const h = Math.floor(m / 60); const min = m % 60; return h > 0 ? `${h} ч ${min} мин` : `${min} мин`; };
  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Аналитика</h1>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <select value={filters.projectId} onChange={e => setFilters({ ...filters, projectId: e.target.value, page: 1 })} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
          <option value="">Все проекты</option>
          {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
        <select value={filters.period} onChange={e => setFilters({ ...filters, period: e.target.value, page: 1 })} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
          <option value="day">День</option>
          <option value="week">Неделя</option>
          <option value="month">Месяц</option>
        </select>
      </div>
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}><div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4f46e5' }}>{format(stats.total)}</div><div>Всего времени</div></div>
          <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}><div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4f46e5' }}>{stats.sessionsCount}</div><div>Сессий</div></div>
          <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}><div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4f46e5' }}>{Object.keys(stats.byProject || {}).length}</div><div>Проектов</div></div>
        </div>
      )}
      <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Статистика по проектам</h3>
        {stats?.byProject && Object.entries(stats.byProject).map(([id, minutes]) => {
          const project = projects.find(p => p._id === id);
          return <div key={id} style={{ marginBottom: '0.5rem' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{project?.name || 'Неизвестно'}</span><span>{format(minutes)}</span></div><div style={{ background: '#e2e8f0', height: '0.5rem', borderRadius: '0.25rem', overflow: 'hidden' }}><div style={{ width: `${(minutes / stats.total) * 100}%`, background: '#4f46e5', height: '100%' }} /></div></div>;
        })}
      </div>
      <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>История сессий</h3>
        {sessions?.sessions?.map(s => (
          <div key={s._id} style={{ borderBottom: '1px solid #e2e8f0', padding: '0.5rem 0' }}>
            <div><strong>{projects.find(p => p._id === s.projectId)?.name || 'Проект'}</strong> — {format(s.duration)}</div>
            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>{new Date(s.startTime).toLocaleString()} — {s.endTime ? new Date(s.endTime).toLocaleString() : 'в процессе'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsPage() {
  const { user } = useSelector(s => s.auth);
  const dispatch = useDispatch();
  const [name, setName] = useState(user?.name || '');
  const handleSave = () => {
    const updated = { ...user, name };
    dispatch(login(updated));
    localStorage.setItem('user', JSON.stringify(updated));
    toast.success('Сохранено');
  };
  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Настройки</h1>
      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', maxWidth: '400px' }}>
        <div style={{ width: '80px', height: '80px', background: '#e0e7ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 1rem' }}>{user?.name?.charAt(0) || 'U'}</div>
        <input value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', marginBottom: '1rem' }} />
        <button onClick={handleSave} style={{ background: '#4f46e5', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.5rem', width: '100%' }}>Сохранить</button>
      </div>
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [form, setForm] = useState({ email: '', password: '' });
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.login(form);
      localStorage.setItem('token', res.data.token);
      dispatch(login(res.data.user));
      navigate('/');
    } catch { toast.error('Ошибка входа'); }
  };
  return (
    <div style={{ maxWidth: '400px', margin: '4rem auto' }}>
      <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem', textAlign: 'center', marginBottom: '1.5rem' }}>Вход</h1>
        <form onSubmit={handleSubmit}>
          <input type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} required />
          <input type="password" placeholder="Пароль" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} required />
          <button type="submit" style={{ background: '#4f46e5', color: 'white', padding: '0.5rem', borderRadius: '0.5rem', width: '100%' }}>Войти</button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '1rem' }}>Нет аккаунта? <Link to="/register">Регистрация</Link></p>
      </div>
    </div>
  );
}

function RegisterPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.register(form);
      localStorage.setItem('token', res.data.token);
      dispatch(login(res.data.user));
      navigate('/');
    } catch { toast.error('Ошибка регистрации'); }
  };
  return (
    <div style={{ maxWidth: '400px', margin: '4rem auto' }}>
      <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem', textAlign: 'center', marginBottom: '1.5rem' }}>Регистрация</h1>
        <form onSubmit={handleSubmit}>
          <input type="text" placeholder="Имя" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} required />
          <input type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} required />
          <input type="password" placeholder="Пароль" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} required />
          <button type="submit" style={{ background: '#4f46e5', color: 'white', padding: '0.5rem', borderRadius: '0.5rem', width: '100%' }}>Зарегистрироваться</button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '1rem' }}>Уже есть аккаунт? <Link to="/login">Войти</Link></p>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route element={<Layout />}>
              <Route path="/" element={<PrivateRoute><HomePage /></PrivateRoute>} />
              <Route path="/projects" element={<PrivateRoute><ProjectsPage /></PrivateRoute>} />
              <Route path="/analytics" element={<PrivateRoute><AnalyticsPage /></PrivateRoute>} />
              <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
            </Route>
          </Routes>
          <Toaster />
        </BrowserRouter>
      </Provider>
    </QueryClientProvider>
  );
}

export default App;
