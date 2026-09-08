import { createClient } from '@supabase/supabase-js';
import './style.css';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '');

const days = [
  { id: 0, name: 'Sunday' }, { id: 1, name: 'Monday' }, { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' }, { id: 4, name: 'Thursday' }, { id: 5, name: 'Friday' },
  { id: 6, name: 'Saturday' }
];

const app = document.querySelector('#app');
let user = null;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
}[c]));

function dateISO(d = new Date()) {
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return x.toISOString().slice(0, 10);
}
function todayDay() { return new Date().getDay(); }
function path() { return location.hash.replace(/^#/, '') || '/'; }
function routeDay() {
  const m = path().match(/^\/day\/([0-6])$/);
  return m ? Number(m[1]) : null;
}
function setNotice(text, type='success') {
  const el = document.querySelector('#notice');
  if (el) el.innerHTML = `<div class="${type}">${esc(text)}</div>`;
}

async function init() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    renderSetup();
    return;
  }
  const { data } = await supabase.auth.getSession();
  user = data.session?.user ?? null;
  supabase.auth.onAuthStateChange((_event, session) => {
    user = session?.user ?? null;
    render();
  });
  render();
}

function renderSetup() {
  app.innerHTML = `
    <div class="login-wrap"><div class="card login-card">
      <h1>Study Routine</h1>
      <p class="muted">Supabase is not configured yet.</p>
      <div class="notice">Copy <code>.env.example</code> to <code>.env</code> and add your Supabase project URL and anon key, then run the site.</div>
    </div></div>`;
}

function loginView() {
  app.innerHTML = `
    <div class="login-wrap"><div class="card login-card">
      <h1>Study Routine</h1>
      <p class="muted">Your weekly routine and private study log.</p>
      <div id="notice"></div>
      <form id="login" class="form">
        <div><label>Email</label><input id="email" type="email" required autocomplete="email"></div>
        <div><label>Password</label><input id="password" type="password" required autocomplete="current-password"></div>
        <button class="btn" type="submit">Log in</button>
        <button class="btn secondary" type="button" id="signup">Create account</button>
      </form>
    </div></div>`;
  document.querySelector('#login').onsubmit = async e => {
    e.preventDefault();
    const email = document.querySelector('#email').value;
    const password = document.querySelector('#password').value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setNotice(error.message, 'error');
  };
  document.querySelector('#signup').onclick = async () => {
    const email = document.querySelector('#email').value;
    const password = document.querySelector('#password').value;
    if (!email || !password) return setNotice('Enter an email and password first.', 'error');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setNotice(error.message, 'error');
    else setNotice('Account created. Check your email if confirmation is enabled.', 'success');
  };
}

function nav() {
  return `<div class="nav">
    <a href="#/" class="${path()==='/'?'active':''}">Home</a>
    ${days.map(d => `<a href="#/day/${d.id}" class="${routeDay()===d.id?'active':''}">${d.name.slice(0,3)}</a>`).join('')}
  </div>`;
}

function shell(content) {
  app.innerHTML = `<div class="app">
    <header class="topbar">
      <div class="brand">📚 Study Routine</div>
      ${nav()}
      <button id="logout" class="btn secondary small">Log out</button>
    </header>
    <main class="container">${content}</main>
  </div>`;
  document.querySelector('#logout').onclick = () => supabase.auth.signOut();
}

async function getSchedule(dayId) {
  const { data, error } = await supabase.from('schedule_items')
    .select('*').eq('user_id', user.id).eq('day_of_week', dayId)
    .order('start_time', { ascending: true });
  return { data: data || [], error };
}

async function getLogs(dayId, fromDate=null, toDate=null) {
  let q = supabase.from('study_logs').select('*')
    .eq('user_id', user.id).eq('day_of_week', dayId)
    .order('study_date', { ascending: false }).order('created_at', { ascending: false });
  if (fromDate) q = q.gte('study_date', fromDate);
  if (toDate) q = q.lte('study_date', toDate);
  return q;
}

function scheduleHTML(items, editable=true) {
  if (!items.length) return `<div class="empty">No routine items for this day.</div>`;
  return items.map(x => `<div class="schedule-item">
    <div>
      <div class="time">${esc(x.start_time)}${x.end_time ? ` – ${esc(x.end_time)}` : ''}</div>
      <strong>${esc(x.subject)}</strong>
      ${x.topic ? `<div class="muted">${esc(x.topic)}</div>` : ''}
    </div>
    ${editable ? `<button class="btn danger small delete-schedule" data-id="${x.id}">Delete</button>` : ''}
  </div>`).join('');
}

function displayDate(iso) {
  const [y,m,d] = iso.split('-');
  return `${d}/${m}/${y.slice(2)}`;
}
function logsHTML(logs) {
  if (!logs.length) return `<div class="empty">No study logs yet.</div>`;
  return logs.map(x => `<div class="log-item">
    <div><strong>${displayDate(esc(x.study_date))}</strong></div>
    <div class="time">${Number(x.hours).toLocaleString()} h</div>
  </div>`).join('');
}

async function homeView() {
  const { data: recent } = await supabase.from('study_logs').select('*')
    .eq('user_id', user.id).order('study_date', { ascending: false })
    .order('created_at', { ascending: false }).limit(8);

  const { data: todaySchedule } = await getSchedule(todayDay());
  shell(`
    <div class="day-head">
      <div><h1>Weekly Study Dashboard</h1><p class="muted">The routine repeats every week. Your study logs are saved by date.</p></div>
    </div>
    <div class="grid">
      <section class="card">
        <h2>Today</h2>
        <p class="muted">${new Date().toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
        ${scheduleHTML(todaySchedule, false)}
        <div class="row" style="margin-top:14px"><a class="btn" href="#/day/${todayDay()}">Open today</a></div>
      </section>
      <section class="card">
        <h2>Quick stats</h2>
        <div class="stat">${recent?.reduce((a,x)=>a+Number(x.hours||0),0) || 0} h</div>
        <div class="muted">in the latest saved logs shown below</div>
      </section>
    </div>
    <section class="card" style="margin-top:16px">
      <h2>Recent study log</h2>
      ${logsHTML(recent || [])}
    </section>`);
}

async function dayView(dayId) {
  const day = days[dayId];
  const { data: items } = await getSchedule(dayId);
  const { data: logs } = await getLogs(dayId);

  shell(`
    <div class="day-head">
      <div>
        <h1>${day.name}</h1>
        <p class="muted">Repeating weekly schedule</p>
      </div>
      <button class="btn" id="open-schedule">＋ Add to Schedule</button>
    </div>

    <div id="notice"></div>

    <section class="card">
      <h2>Weekly Schedule</h2>
      <div class="schedule-grid">${scheduleHTML(items)}</div>
    </section>

    <div class="schedule-divider"><span>END OF SCHEDULE</span></div>

    <section class="card logs-section">
      <h2>Study Log</h2>
      <p class="muted">One total-study entry per date. Entries are appended week after week.</p>
      <div class="log-grid">${logsHTML(logs || [])}</div>
    </section>

    <button class="floating-add" id="open-log" aria-label="Add study log">＋</button>

    <div class="modal-backdrop" id="schedule-modal">
      <div class="modal card">
        <div class="modal-head"><h2>Add to Schedule</h2><button class="icon-btn" data-close="schedule-modal">×</button></div>
        <form id="schedule-form" class="form">
          <div><label>Subject / activity</label><input id="subject" required placeholder="Physics"></div>
          <div><label>Topic (optional)</label><input id="topic" placeholder="Kinematics"></div>
          <div class="row">
            <div style="flex:1"><label>Start</label><input id="start" type="time" required></div>
            <div style="flex:1"><label>End</label><input id="end" type="time"></div>
          </div>
          <div class="row modal-actions"><button type="button" class="btn secondary" data-close="schedule-modal">Cancel</button><button class="btn">Add</button></div>
        </form>
      </div>
    </div>

    <div class="modal-backdrop" id="log-modal">
      <div class="modal card">
        <div class="modal-head"><h2>Add Study Log</h2><button class="icon-btn" data-close="log-modal">×</button></div>
        <form id="log-form" class="form">
          <div><label>Date</label><input id="study-date" type="text" inputmode="numeric" placeholder="DD/MM/YY" required></div>
          <div><label>Total hours studied</label><input id="hours" type="number" min="0.1" step="0.1" required placeholder="6.5"></div>
          <div class="row modal-actions"><button type="button" class="btn secondary" data-close="log-modal">Cancel</button><button class="btn">Add Log</button></div>
        </form>
      </div>
    </div>`);

  const scheduleModal = document.querySelector('#schedule-modal');
  const logModal = document.querySelector('#log-modal');
  document.querySelector('#open-schedule').onclick = () => scheduleModal.classList.add('show');
  document.querySelector('#open-log').onclick = () => {
    document.querySelector('#study-date').value = dateISO().split('-').reverse().map((v,i)=>i===2?v.slice(2):v).join('/');
    logModal.classList.add('show');
  };
  document.querySelectorAll('[data-close]').forEach(b => {
    b.onclick = () => document.getElementById(b.dataset.close).classList.remove('show');
  });
  [scheduleModal, logModal].forEach(m => m.onclick = e => {
    if (e.target === m) m.classList.remove('show');
  });

  document.querySelector('#schedule-form').onsubmit = async e => {
    e.preventDefault();
    const payload = {
      user_id:user.id, day_of_week:dayId,
      subject:document.querySelector('#subject').value.trim(),
      topic:document.querySelector('#topic').value.trim() || null,
      start_time:document.querySelector('#start').value,
      end_time:document.querySelector('#end').value || null
    };
    const { error } = await supabase.from('schedule_items').insert(payload);
    if (error) setNotice(error.message,'error'); else dayView(dayId);
  };

  document.querySelectorAll('.delete-schedule').forEach(btn => {
    btn.onclick = async () => {
      const { error } = await supabase.from('schedule_items').delete()
        .eq('id', btn.dataset.id).eq('user_id',user.id);
      if (error) setNotice(error.message,'error'); else dayView(dayId);
    };
  });

  document.querySelector('#log-form').onsubmit = async e => {
    e.preventDefault();
    const raw = document.querySelector('#study-date').value.trim();
    const m = raw.match(/^(\\d{1,2})\\/(\\d{1,2})\\/(\\d{2})$/);
    if (!m) return setNotice('Use date format DD/MM/YY.', 'error');
    const dd = m[1].padStart(2,'0'), mm = m[2].padStart(2,'0'), yy = m[3];
    const fullYear = Number(yy) >= 70 ? 1900 + Number(yy) : 2000 + Number(yy);
    const iso = `${fullYear}-${mm}-${dd}`;
    const test = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(test.getTime()) || test.getFullYear() !== fullYear ||
        test.getMonth()+1 !== Number(mm) || test.getDate() !== Number(dd)) {
      return setNotice('Enter a valid date.', 'error');
    }
    const payload = {
      user_id:user.id,
      study_date:iso,
      day_of_week:test.getDay(),
      hours:Number(document.querySelector('#hours').value)
    };
    // study_logs stores hours in this version.
    const { error } = await supabase.from('study_logs').insert(payload);
    if (error) setNotice(error.message,'error'); else dayView(dayId);
  };
}

async function render() {
  if (!user) return loginView();
  const d = routeDay();
  if (d !== null) return dayView(d);
  return homeView();
}
window.addEventListener('hashchange', render);
init();