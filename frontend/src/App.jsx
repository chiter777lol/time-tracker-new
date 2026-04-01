import { useState, useEffect } from 'react';
import * as api from './api';

function App() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProjects()
      .then(res => {
        setProjects(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Загрузка...</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <h1>TimeTracker</h1>
      <h2>Проекты ({projects.length})</h2>
      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(250px,1fr))' }}>
        {projects.map(p => (
          <div key={p._id} style={{ border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '0.5rem' }}>
            <strong>{p.name}</strong>
            {p.description && <p style={{ color: '#64748b', marginTop: '0.5rem' }}>{p.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
