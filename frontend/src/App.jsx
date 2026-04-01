import { useState, useEffect } from 'react';
import api, * as apiFunctions from './api';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [sessionNote, setSessionNote] = useState('');
  const [timerRunning, setTimerRunning] = useState(false);
  const [view, setView] = useState('home');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [statsPeriod, setStatsPeriod] = useState('week');

  // Загрузка данных после входа
  const loadProjects = async () => {
    if (!token) return;
    try {
      const res = await apiFunctions.getProjects();
      setProjects(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadActiveSession = async () => {
    if (!token) return;
    try {
      const res = await apiFunctions.getActiveSession();
      if (res.data) {
        setActiveSession(res.data);
        setTimerRunning(true);
        const startTime = new Date(res.data.startTime);
        const elapsedMs = Date.now() - startTime;
        setElapsed(Math.floor(elapsedMs / 1000));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadStats = async () => {
    if (!token) return;
    try {
      const res = await apiFunctions.getStats({ period: statsPeriod });
      setStats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadSessions = async () => {
    if (!token) return;
    try {
      const res = await apiFunctions.getSessions({ limit: 20 });
      setSessions(res.data?.sessions || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) {
      loadProjects();
      loadActiveSession();
      loadStats();
      loadSessions();
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [token]);

  // Таймер
  useEffect(() => {
    let interval;
    if (timerRunning) {
      interval = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatDuration = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h} ч ${m} мин` : `${m} мин`;
  };

  const startTimer = async () => {
    if (!selectedProject) {
      alert('Выберите проект');
      return;
    }
    try {
      const res = await apiFunctions.startSession({ projectId: selectedProject, note: sessionNote });
      setActiveSession(res.data);
      setTimerRunning(true);
      setElapsed(0);
      setSessionNote('');
    } catch (err) {
      alert('Ошибка');
    }
  };

  const stopTimer = async () => {
    if (!activeSession) return;
    try {
      await apiFunctions.stopSession(activeSession._id);
      setActiveSession(null);
      setTimerRunning(false);
      setElapsed(0);
      loadProjects();
      loadStats();
      loadSessions();
    } catch (err) {
      alert('Ошибка');
    }
  };

  const createProject = async () => {
    if (!newProjectName.trim()) {
      alert('Введите название проекта');
      return;
    }
    try {
      await apiFunctions.createProject({ name: newProjectName, description: newProjectDesc });
      setNewProjectName('');
      setNewProjectDesc('');
      loadProjects();
    } catch (err) {
      alert('Ошибка');
    }
  };

  const deleteProject = async (id) => {
    if (confirm('Удалить проект?')) {
      try {
        await apiFunctions.deleteProject(id);
        loadProjects();
      } catch (err) {
        alert('Ошибка');
      }
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFunctions.login({ email: loginEmail, password: loginPassword });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setToken(res.data.token);
      setUser(res.data.user);
      setLoginEmail('');
      setLoginPassword('');
    } catch (err) {
      alert('Ошибка входа');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (regPassword !== regConfirm) {
      alert('Пароли не совпадают');
      return;
    }
    try {
      const res = await apiFunctions.register({ name: regName, email: regEmail, password: regPassword });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setToken(res.data.token);
      setUser(res.data.user);
      setRegName('');
      setRegEmail('');
      setRegPassword('');
      setRegConfirm('');
    } catch (err) {
      alert('Ошибка регистрации');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setProjects([]);
    setActiveSession(null);
    setTimerRunning(false);
    setView('home');
  };

  useEffect(() => {
    if (statsPeriod) {
      loadStats();
    }
  }, [statsPeriod]);

  // Страница входа/регистрации
  if (!token) {
    return (
      <div style={{ maxWidth: '400px', margin: '4rem auto', padding: '2rem', background: 'white', borderRadius: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <button onClick={() => setAuthMode('login')} style={{ flex: 1, padding: '0.5rem', background: authMode === 'login' ? '#4f46e5' : '#e2e8f0', color: authMode === 'login' ? 'white' : 'black', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>Вход</button>
          <button onClick={() => setAuthMode('register')} style={{ flex: 1, padding: '0.5rem', background: authMode === 'register' ? '#4f46e5' : '#e2e8f0', color: authMode === 'register' ? 'white' : 'black', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>Регистрация</button>
        </div>

        {authMode === 'login' ? (
          <form onSubmit={handleLogin}>
            <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Вход</h2>
            <input type="email" placeholder="Email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} required />
            <input type="password" placeholder="Пароль" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} required />
            <button type="submit" style={{ width: '100%', padding: '0.5rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>Войти</button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Регистрация</h2>
            <input type="text" placeholder="Имя" value={regName} onChange={e => setRegName(e.target.value)} style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} required />
            <input type="email" placeholder="Email" value={regEmail} onChange={e => setRegEmail(e.target.value)} style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} required />
            <input type="password" placeholder="Пароль" value={regPassword} onChange={e => setRegPassword(e.target.value)} style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} required />
            <input type="password" placeholder="Подтвердите пароль" value={regConfirm} onChange={e => setRegConfirm(e.target.value)} style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} required />
            <button type="submit" style={{ width: '100%', padding: '0.5rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>Зарегистрироваться</button>
          </form>
        )}
      </div>
    );
  }

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Загрузка...</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
      {/* Шапка */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={() => setView('home')} style={{ background: view === 'home' ? '#4f46e5' : 'white', color: view === 'home' ? 'white' : '#4f46e5', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #4f46e5', cursor: 'pointer' }}>Главная</button>
          <button onClick={() => setView('projects')} style={{ background: view === 'projects' ? '#4f46e5' : 'white', color: view === 'projects' ? 'white' : '#4f46e5', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #4f46e5', cursor: 'pointer' }}>Проекты</button>
          <button onClick={() => { setView('analytics'); loadStats(); loadSessions(); }} style={{ background: view === 'analytics' ? '#4f46e5' : 'white', color: view === 'analytics' ? 'white' : '#4f46e5', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #4f46e5', cursor: 'pointer' }}>Аналитика</button>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span>{user?.name}</span>
          <button onClick={handleLogout} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Выйти</button>
        </div>
      </div>

      {/* Главная страница */}
      {view === 'home' && (
        <>
          <div style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', borderRadius: '1rem', padding: '2rem', color: 'white', textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '3rem', fontFamily: 'monospace', marginBottom: '1rem' }}>{formatTime(elapsed)}</div>
            {!timerRunning ? (
              <>
                <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', color: 'black' }}>
                  <option value="">Выберите проект</option>
                  {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
                <input type="text" placeholder="Заметка" value={sessionNote} onChange={e => setSessionNote(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', color: 'black' }} />
                <button onClick={startTimer} style={{ background: '#10b981', padding: '0.75rem 2rem', borderRadius: '2rem', border: 'none', color: 'white', cursor: 'pointer' }}>▶ Начать</button>
              </>
            ) : (
              <>
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                  <strong>{projects.find(p => p._id === activeSession?.projectId)?.name || 'Проект'}</strong>
                  {activeSession?.note && <div style={{ marginTop: '0.5rem' }}>{activeSession.note}</div>}
                </div>
                <button onClick={stopTimer} style={{ background: '#ef4444', padding: '0.75rem 2rem', borderRadius: '2rem', border: 'none', color: 'white', cursor: 'pointer' }}>⏹ Стоп</button>
              </>
            )}
          </div>

          <h2 style={{ marginBottom: '1rem' }}>Мои проекты ({projects.length})</h2>
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(250px,1fr))' }}>
            {projects.map(p => (
              <div key={p._id} style={{ borderLeft: `4px solid #4f46e5`, padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                <strong>{p.name}</strong>
                {p.description && <p style={{ color: '#64748b', marginTop: '0.5rem' }}>{p.description}</p>}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Страница проектов */}
      {view === 'projects' && (
        <>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Создать проект</h3>
            <input type="text" placeholder="Название" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} />
            <input type="text" placeholder="Описание" value={newProjectDesc} onChange={e => setNewProjectDesc(e.target.value)} style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} />
            <button onClick={createProject} style={{ background: '#4f46e5', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}>+ Добавить проект</button>
          </div>

          <h3>Все проекты ({projects.length})</h3>
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))' }}>
            {projects.map(p => (
              <div key={p._id} style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                <strong>{p.name}</strong>
                {p.description && <p style={{ color: '#64748b', marginTop: '0.5rem' }}>{p.description}</p>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button onClick={() => deleteProject(p._id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>��� Удалить</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Страница аналитики */}
      {view === 'analytics' && (
        <>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Аналитика</h1>
          
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <select value={statsPeriod} onChange={e => setStatsPeriod(e.target.value)} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
              <option value="day">День</option>
              <option value="week">Неделя</option>
              <option value="month">Месяц</option>
            </select>
          </div>

          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4f46e5' }}>{formatDuration(stats.total)}</div>
                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Всего времени</div>
              </div>
              <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4f46e5' }}>{stats.sessionsCount}</div>
                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Сессий</div>
              </div>
              <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4f46e5' }}>{Object.keys(stats.byProject || {}).length}</div>
                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Проектов</div>
              </div>
            </div>
          )}

          <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Статистика по проектам</h3>
            {stats?.byProject && Object.entries(stats.byProject).map(([id, minutes]) => {
              const project = projects.find(p => p._id === id);
              return (
                <div key={id} style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>{project?.name || 'Неизвестно'}</span>
                    <span>{formatDuration(minutes)}</span>
                  </div>
                  <div style={{ background: '#e2e8f0', height: '0.5rem', borderRadius: '0.25rem', overflow: 'hidden' }}>
                    <div style={{ width: `${(minutes / (stats.total || 1)) * 100}%`, background: '#4f46e5', height: '100%' }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
            <h3 style={{ marginBottom: '1rem' }}>История сессий</h3>
            {sessions.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#64748b' }}>Нет записей</p>
            ) : (
              sessions.map(s => (
                <div key={s._id} style={{ borderBottom: '1px solid #e2e8f0', padding: '0.75rem 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{projects.find(p => p._id === s.projectId)?.name || 'Проект'}</strong>
                    <span style={{ color: '#4f46e5' }}>{formatDuration(s.duration)}</span>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                    {new Date(s.startTime).toLocaleString()} — {s.endTime ? new Date(s.endTime).toLocaleString() : 'в процессе'}
                  </div>
                  {s.note && <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.25rem' }}>��� {s.note}</div>}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
