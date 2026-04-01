const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect('mongodb+srv://maria-user:Juliasha2005@cluster0.ojkt6xh.mongodb.net/time-tracker?retryWrites=true&w=majority');

const User = mongoose.model('User', {
  name: String,
  email: String,
  password: String,
});

const Project = mongoose.model('Project', {
  name: String,
  userId: String,
});

const Session = mongoose.model('Session', {
  projectId: String,
  userId: String,
  startTime: Date,
  endTime: Date,
  duration: Number,
  note: String,
});

app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ name, email, password: hashed });
  await user.save();
  const token = jwt.sign({ id: user._id }, 'secret');
  res.json({ token, user: { id: user._id, name, email } });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Неверные данные' });
  }
  const token = jwt.sign({ id: user._id }, 'secret');
  res.json({ token, user: { id: user._id, name: user.name, email } });
});

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Нет токена' });
  try {
    const decoded = jwt.verify(token, 'secret');
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ error: 'Неверный токен' });
  }
};

app.get('/api/projects', auth, async (req, res) => {
  const projects = await Project.find({ userId: req.userId });
  res.json(projects);
});

app.post('/api/projects', auth, async (req, res) => {
  const project = new Project({ ...req.body, userId: req.userId });
  await project.save();
  res.json(project);
});

app.put('/api/projects/:id', auth, async (req, res) => {
  const project = await Project.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    req.body,
    { new: true }
  );
  res.json(project);
});

app.delete('/api/projects/:id', auth, async (req, res) => {
  await Project.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  res.json({ success: true });
});

app.post('/api/sessions/start', auth, async (req, res) => {
  const session = new Session({
    ...req.body,
    userId: req.userId,
    startTime: new Date(),
  });
  await session.save();
  res.json(session);
});

app.put('/api/sessions/:id/stop', auth, async (req, res) => {
  const session = await Session.findOne({ _id: req.params.id, userId: req.userId });
  session.endTime = new Date();
  session.duration = Math.round((session.endTime - session.startTime) / 60000);
  session.isActive = false;
  await session.save();
  res.json(session);
});

app.get('/api/sessions/active', auth, async (req, res) => {
  const session = await Session.findOne({ userId: req.userId, isActive: true });
  res.json(session);
});

app.get('/api/sessions', auth, async (req, res) => {
  const { projectId, page = 1, limit = 10 } = req.query;
  const query = { userId: req.userId };
  if (projectId) query.projectId = projectId;
  const sessions = await Session.find(query).sort({ startTime: -1 }).limit(limit * 1).skip((page - 1) * limit);
  const total = await Session.countDocuments(query);
  res.json({ sessions, total, pages: Math.ceil(total / limit) });
});

app.get('/api/sessions/stats', auth, async (req, res) => {
  const { projectId, period = 'week' } = req.query;
  let startDate = new Date();
  if (period === 'week') startDate.setDate(startDate.getDate() - 7);
  if (period === 'month') startDate.setMonth(startDate.getMonth() - 1);
  const query = { userId: req.userId, startTime: { $gte: startDate }, isActive: false };
  if (projectId) query.projectId = projectId;
  const sessions = await Session.find(query);
  const total = sessions.reduce((sum, s) => sum + s.duration, 0);
  const byProject = {};
  sessions.forEach(s => {
    byProject[s.projectId] = (byProject[s.projectId] || 0) + s.duration;
  });
  res.json({ total, sessionsCount: sessions.length, byProject });
});

const PORT = 5001;
app.listen(PORT, () => console.log(`Сервер на порту ${PORT}`));
