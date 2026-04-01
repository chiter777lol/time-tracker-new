import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhostoolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: JSON.parse(localStorage.getItem('user')), isAuthenticated: !!localStorage.getItem('user') },
  reducers: {
    login: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      localStorage.setItem('user', JSON.stringify(action.payload));
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      localStorage.clear();
    },
  },
});

const timerSlice = createSlice({
  name: 'timer',
  initialState: { active: null, elapsed: 0, running: false },
  reducers: {
    start: (state, action) => {
      state.active = action.payload;
      state.running = true;
      state.elapsed = 0;
    },
    tick: (state) => { if (state.running) state.elapsed++; },
    stop: (state) => {
      state.active = null;
      state.running = false;
      state.elapsed = 0;
    },
  },
});

export const { login, logout } = authSlice.actions;
export const { start, tick, stop } = timerSlice.actions;
export const store = configureStore({ reducer: { auth: authSlice.reducer, timer: timerSlice.reducer } });
