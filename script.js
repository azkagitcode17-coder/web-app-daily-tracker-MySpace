// ==================== GLOBAL VARIABLES ====================
let db, firestore;
let financeData = [];
let studyData = [];
let studyTimers = {};
let gradeHistory = [];
let scheduleData = [];
let allScheduleItems = [];
let holidayData = {};
let donutChart;
let studyDonutChart; // for study page
let financeChart;
let dashChart;
let clockInterval;
let calYear, calMonth;
let sidebarCollapsed = false;
let calcState = { display: '0', expr: '', op: null, prev: null, newNum: true };

// ==================== UTILS ====================
function fmt(n) { return new Intl.NumberFormat('id-ID').format(n); }
function today() { return new Date().toISOString().split('T')[0]; }

function showToast(msg, type = 'info') {
  const icon = { success: 'check-circle-fill', error: 'x-circle-fill', info: 'info-circle-fill' }[type];
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="bi bi-${icon}"></i> ${msg}`;
  document.getElementById('toast-container').appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ==================== THEME ====================
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
const updateThemeIcon = () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const icon = document.getElementById('theme-icon');
  if (icon) icon.className = isDark ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
};
updateThemeIcon();
document.getElementById('theme-toggle')?.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeIcon();
  setTimeout(() => { if (typeof initFinanceChart === 'function') initFinanceChart(); if (typeof initDashChart === 'function') initDashChart(); if (typeof updateDonut === 'function') updateDonut(); if (typeof updateStudyDonut === 'function') updateStudyDonut(); }, 100);
});

// ==================== NAVIGATION ====================
const pages = { dashboard: 'Dashboard', finance: 'Keuangan', study: 'Monitoring Belajar', grades: 'Rata-rata Nilai', schedule: 'Jadwal Harian', calendar: 'Kalender', clock: 'Jam Indonesia', calc: 'Kalkulator' };

function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelector(`[data-page="${page}"]`).classList.add('active');
  const title = document.getElementById('topbar-title');
  if (title) title.textContent = pages[page] || page;
  if (page === 'clock') startClock();
  if (page === 'calendar') renderCalendar();
  if (page === 'finance') loadFinance();
  if (page === 'study') loadStudy();
  if (page === 'schedule') { renderToday(); loadSchedule(); }
  if (page === 'grades') loadGrades();
  if (page === 'dashboard') loadDashboard();
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar')?.classList.remove('mobile-open');
    document.getElementById('overlay-bg')?.classList.remove('show');
  }
}

document.querySelectorAll('.nav-item[data-page]').forEach(item => {
  item.addEventListener('click', () => navigate(item.dataset.page));
});

// ==================== SIDEBAR TOGGLE ====================
document.getElementById('toggle-sidebar-btn')?.addEventListener('click', () => {
  if (window.innerWidth > 768) {
    sidebarCollapsed = !sidebarCollapsed;
    document.getElementById('sidebar')?.classList.toggle('collapsed', sidebarCollapsed);
    document.getElementById('main-content')?.classList.toggle('sidebar-collapsed', sidebarCollapsed);
    const icon = document.getElementById('toggle-icon');
    if (icon) icon.className = sidebarCollapsed ? 'bi bi-layout-sidebar-inset' : 'bi bi-layout-sidebar-inset-reverse';
  }
});
document.getElementById('mobile-toggle')?.addEventListener('click', () => {
  document.getElementById('sidebar')?.classList.toggle('mobile-open');
  document.getElementById('overlay-bg')?.classList.toggle('show');
});
document.getElementById('overlay-bg')?.addEventListener('click', () => {
  document.getElementById('sidebar')?.classList.remove('mobile-open');
  document.getElementById('overlay-bg')?.classList.remove('show');
});

// ==================== SEARCH ====================
const searchItems = [
  { label: 'Dashboard', icon: 'grid-fill', page: 'dashboard' },
  { label: 'Keuangan', icon: 'wallet2', page: 'finance' },
  { label: 'Monitoring Belajar', icon: 'book-fill', page: 'study' },
  { label: 'Rata-rata Nilai', icon: 'mortarboard-fill', page: 'grades' },
  { label: 'Jadwal Harian', icon: 'check2-square', page: 'schedule' },
  { label: 'Kalender', icon: 'calendar3', page: 'calendar' },
  { label: 'Jam Indonesia', icon: 'clock-fill', page: 'clock' },
  { label: 'Kalkulator', icon: 'calculator-fill', page: 'calc' },
];
jQuery('#global-search').on('input', function() {
  const q = jQuery(this).val().toLowerCase().trim();
  const $results = jQuery('#search-results');
  if (!q) { $results.hide(); return; }
  const filtered = searchItems.filter(i => i.label.toLowerCase().includes(q));
  if (!filtered.length) { $results.hide(); return; }
  $results.html(filtered.map(i => `<div class="search-result-item" data-page="${i.page}"><i class="bi bi-${i.icon}" style="color:var(--accent)"></i> ${i.label}</div>`).join('')).show();
});
jQuery(document).on('click', '.search-result-item', function() {
  const page = jQuery(this).data('page');
  navigate(page);
  jQuery('#global-search').val('');
  jQuery('#search-results').hide();
});
jQuery(document).on('click', function(e) {
  if (!jQuery(e.target).closest('.search-wrap').length) jQuery('#search-results').hide();
});

// ==================== CLOCK ====================
function startClock() {
  clearInterval(clockInterval);
  updateClock();
  clockInterval = setInterval(updateClock, 1000);
}
function updateClock() {
  const now = new Date();
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const zones = [
    { id: 'wib', offset: 7 },
    { id: 'wita', offset: 8 },
    { id: 'wit', offset: 9 }
  ];
  zones.forEach(({ id, offset }) => {
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const tz = new Date(utc + 3600000 * offset);
    const hh = String(tz.getHours()).padStart(2, '0');
    const mm = String(tz.getMinutes()).padStart(2, '0');
    const clockElem = document.getElementById(`clock-${id}`);
    if (clockElem) clockElem.textContent = `${hh}:${mm}`;
    const dateElem = document.getElementById(`date-${id}`);
    if (dateElem) {
      const day = dayNames[tz.getDay()];
      const date = tz.getDate();
      const month = monthNames[tz.getMonth()];
      const year = tz.getFullYear();
      dateElem.textContent = `${day}, ${date} ${month} ${year}`;
    }
  });
}

// ==================== CALENDAR ====================
function renderCalendar() {
  const now = new Date();
  if (!calYear) { calYear = now.getFullYear(); calMonth = now.getMonth(); }
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const monthLabel = document.getElementById('cal-month-label');
  if (monthLabel) monthLabel.textContent = `${months[calMonth]} ${calYear}`;
  const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const grid = document.getElementById('cal-grid');
  if (!grid) return;
  grid.innerHTML = days.map(d => `<div class="cal-day-header">${d}</div>`).join('');
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const prevDays = new Date(calYear, calMonth, 0).getDate();
  for (let i = firstDay - 1; i >= 0; i--) {
    grid.innerHTML += `<div class="cal-day other-month">${prevDays - i}</div>`;
  }
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    grid.innerHTML += `<div class="cal-day ${isToday ? 'today' : ''}" data-date="${dateStr}">${d}</div>`;
  }
  const remaining = 42 - firstDay - daysInMonth;
  for (let d = 1; d <= remaining; d++) {
    grid.innerHTML += `<div class="cal-day other-month">${d}</div>`;
  }
  document.querySelectorAll('.cal-day[data-date]').forEach(el => {
    el.addEventListener('click', () => showCalendarDay(el.dataset.date));
  });
}
document.getElementById('cal-prev')?.addEventListener('click', () => { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar(); });
document.getElementById('cal-next')?.addEventListener('click', () => { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendar(); });
function showCalendarDay(dateStr) {
  const selected = document.getElementById('cal-selected-date');
  if (selected) selected.textContent = dateStr;
  const userId = localStorage.getItem('userEmail') || 'anonymous';
  const items = allScheduleItems.filter(i => i.date === dateStr && i.userId === userId);
  const eventsDiv = document.getElementById('cal-events');
  if (!eventsDiv) return;
  if (!items.length) {
    eventsDiv.innerHTML = '<div style="font-size:13px;color:var(--text-muted);">Tidak ada jadwal pada tanggal ini.</div>';
  } else {
    eventsDiv.innerHTML = items.map(i => `<div class="schedule-item ${i.done ? 'done' : ''}"><span>${i.time || ''}</span><span style="font-weight:600;">${i.name}</span><span class="badge badge-pending">${i.cat || ''}</span></div>`).join('');
  }
}

// ==================== CALCULATOR ====================
function updateCalcDisplay() {
  const resultDiv = document.getElementById('calc-result');
  const exprDiv = document.getElementById('calc-expr');
  if (resultDiv) resultDiv.textContent = calcState.display;
  if (exprDiv) exprDiv.textContent = calcState.expr;
}
document.querySelectorAll('.calc-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    if (action === 'num') {
      const n = btn.dataset.num;
      if (calcState.newNum) { calcState.display = n; calcState.newNum = false; }
      else { calcState.display = calcState.display === '0' ? n : calcState.display + n; }
    } else if (action === 'dot') {
      if (!calcState.display.includes('.')) calcState.display += '.';
      calcState.newNum = false;
    } else if (action === 'clear') {
      calcState = { display: '0', expr: '', op: null, prev: null, newNum: true };
    } else if (action === 'sign') {
      calcState.display = String(-parseFloat(calcState.display));
    } else if (action === 'percent') {
      calcState.display = String(parseFloat(calcState.display) / 100);
    } else if (action === 'op') {
      const op = btn.dataset.op;
      calcState.prev = parseFloat(calcState.display);
      calcState.op = op;
      const opDisplay = { '+': '+', '-': '−', '*': '×', '/': '÷' }[op];
      calcState.expr = `${calcState.prev} ${opDisplay}`;
      calcState.newNum = true;
    } else if (action === 'equals') {
      if (calcState.op && calcState.prev !== null) {
        const curr = parseFloat(calcState.display);
        let res;
        if (calcState.op === '+') res = calcState.prev + curr;
        else if (calcState.op === '-') res = calcState.prev - curr;
        else if (calcState.op === '*') res = calcState.prev * curr;
        else if (calcState.op === '/') res = curr !== 0 ? calcState.prev / curr : 'Error';
        calcState.expr = `${calcState.expr} ${curr} =`;
        calcState.display = String(parseFloat(res.toFixed(10)));
        calcState.op = null; calcState.prev = null; calcState.newNum = true;
      }
    }
    updateCalcDisplay();
  });
});

// ==================== FIREBASE READY ====================
document.addEventListener('firebaseReady', () => {
  db = window.db;
  firestore = window.firestore;
  loadDashboard();
  loadSchedule();
  loadStudy();
  loadFinance();
  loadGrades();
});

// ==================== FINANCE ====================
async function loadFinance() {
  const userId = localStorage.getItem('userEmail') || 'anonymous';
  if (!db) {
    const allData = JSON.parse(localStorage.getItem('financeData') || '[]');
    financeData = allData.filter(f => f.userId === userId);
    renderFinance();
    return;
  }
  try {
    const snap = await firestore.getDocs(firestore.query(firestore.collection(db, 'finance'), firestore.orderBy('date', 'desc')));
    const allData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    financeData = allData.filter(f => f.userId === userId);
    renderFinance();
  } catch (e) {
    const allData = JSON.parse(localStorage.getItem('financeData') || '[]');
    financeData = allData.filter(f => f.userId === userId);
    renderFinance();
  }
}
function renderFinance() {
  const income = financeData.filter(f => f.type === 'income').reduce((s, f) => s + Number(f.amount), 0);
  const expense = financeData.filter(f => f.type === 'expense').reduce((s, f) => s + Number(f.amount), 0);
  const balance = income - expense;
  const totalIncome = document.getElementById('total-income');
  const totalExpense = document.getElementById('total-expense');
  const totalBalance = document.getElementById('total-balance');
  if (totalIncome) totalIncome.textContent = `Rp ${fmt(income)}`;
  if (totalExpense) totalExpense.textContent = `Rp ${fmt(expense)}`;
  if (totalBalance) {
    totalBalance.textContent = `Rp ${fmt(Math.abs(balance))}${balance < 0 ? ' (minus)' : ''}`;
    totalBalance.style.color = balance >= 0 ? 'var(--success)' : 'var(--danger)';
  }
  renderFinanceList();
  initFinanceChart();
  updateDashboard();
}
function renderFinanceList() {
  const list = document.getElementById('finance-list');
  if (!list) return;
  if (!financeData.length) { list.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:20px;font-size:13px;">Belum ada transaksi</div>'; return; }
  list.innerHTML = financeData.slice(0, 20).map(f => `<div class="finance-item"><div class="finance-item-left"><div class="finance-icon ${f.type === 'income' ? 'income-icon' : 'expense-icon'}"><i class="bi bi-${f.type === 'income' ? 'arrow-down-circle-fill' : 'arrow-up-circle-fill'}"></i></div><div><div style="font-weight:600;font-size:13px;">${f.desc}</div><div style="font-size:11px;color:var(--text-muted);">${f.cat || ''} · ${f.date || ''}</div></div></div><div style="display:flex;align-items:center;gap:8px;"><span style="font-weight:700;font-size:13px;color:${f.type === 'income' ? 'var(--success)' : 'var(--danger)'}">${f.type === 'income' ? '+' : '-'}Rp ${fmt(f.amount)}</span><button class="btn btn-danger btn-sm del-finance" data-id="${f.id}"><i class="bi bi-trash"></i></button></div></div>`).join('');
}
function initFinanceChart() {
  if (financeChart) { financeChart.destroy(); financeChart = null; }
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    last7.push(d.toISOString().split('T')[0]);
  }
  const incomes = last7.map(date => financeData.filter(f => f.type === 'income' && f.date === date).reduce((s, f) => s + Number(f.amount), 0));
  const expenses = last7.map(date => financeData.filter(f => f.type === 'expense' && f.date === date).reduce((s, f) => s + Number(f.amount), 0));
  const labels = last7.map(d => d.slice(5));
  const ctx = document.getElementById('finance-chart');
  if (!ctx) return;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#8892b0' : '#4a5580';
  financeChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label: 'Pemasukan', data: incomes, borderColor: '#34d399', backgroundColor: 'rgba(52,211,153,0.1)', tension: 0.4, fill: true, pointRadius: 4 }, { label: 'Pengeluaran', data: expenses, borderColor: '#f87171', backgroundColor: 'rgba(248,113,113,0.1)', tension: 0.4, fill: true, pointRadius: 4 }] },
    options: { responsive: true, plugins: { legend: { labels: { color: textColor, font: { family: "'Plus Jakarta Sans'" } } } }, scales: { x: { grid: { color: gridColor }, ticks: { color: textColor } }, y: { grid: { color: gridColor }, ticks: { color: textColor, callback: v => 'Rp ' + fmt(v) } } } }
  });
}
document.getElementById('fin-add-btn')?.addEventListener('click', async () => {
  const desc = document.getElementById('fin-desc')?.value.trim() || '';
  const amount = parseFloat(document.getElementById('fin-amount')?.value);
  const cat = document.getElementById('fin-cat')?.value.trim() || '';
  const type = document.getElementById('fin-type')?.value;
  const date = document.getElementById('fin-date')?.value || today();
  if (!desc || !amount) return showToast('Isi deskripsi dan jumlah!', 'error');
  const userId = localStorage.getItem('userEmail') || 'anonymous';
  const item = { desc, amount, cat, type, date, userId, createdAt: Date.now() };
  if (db) { try { const ref = await firestore.addDoc(firestore.collection(db, 'finance'), item); item.id = ref.id; } catch (e) { item.id = Date.now().toString(); } }
  else { item.id = Date.now().toString(); }
  financeData.unshift(item);
  const allData = JSON.parse(localStorage.getItem('financeData') || '[]');
  allData.push(item);
  localStorage.setItem('financeData', JSON.stringify(allData));
  if (document.getElementById('fin-desc')) document.getElementById('fin-desc').value = '';
  if (document.getElementById('fin-amount')) document.getElementById('fin-amount').value = '';
  if (document.getElementById('fin-cat')) document.getElementById('fin-cat').value = '';
  renderFinance();
  showToast('Transaksi ditambahkan!', 'success');
});
if (document.getElementById('fin-date')) document.getElementById('fin-date').value = today();
jQuery(document).on('click', '.del-finance', async function () {
  const id = jQuery(this).data('id');
  if (db) { try { await firestore.deleteDoc(firestore.doc(db, 'finance', id)); } catch (e) { } }
  financeData = financeData.filter(f => f.id !== id);
  const allData = JSON.parse(localStorage.getItem('financeData') || '[]').filter(f => f.id !== id);
  localStorage.setItem('financeData', JSON.stringify(allData));
  renderFinance();
  showToast('Transaksi dihapus', 'info');
});

// ==================== STUDY ====================
async function loadStudy() {
  const userId = localStorage.getItem('userEmail') || 'anonymous';
  if (!db) {
    const allData = JSON.parse(localStorage.getItem('studyData') || '[]');
    studyData = allData.filter(s => s.userId === userId);
    renderStudy();
    return;
  }
  try {
    const snap = await firestore.getDocs(firestore.query(firestore.collection(db, 'study'), firestore.orderBy('createdAt', 'desc')));
    const allData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    studyData = allData.filter(s => s.userId === userId);
    renderStudy();
  } catch (e) {
    const allData = JSON.parse(localStorage.getItem('studyData') || '[]');
    studyData = allData.filter(s => s.userId === userId);
    renderStudy();
  }
}
function renderStudy() {
  const list = document.getElementById('study-list');
  if (!list) return;
  if (!studyData.length) { list.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:40px;font-size:13px;"><i class="bi bi-book" style="font-size:32px;display:block;margin-bottom:8px;"></i>Belum ada sesi belajar</div>`; return; }
  list.innerHTML = studyData.map(s => {
    const progress = s.status === 'done' ? 100 : s.status === 'fail' ? 0 : (s.elapsed ? Math.min(100, Math.round((s.elapsed / (s.duration * 60)) * 100)) : 0);
    const statusBadge = s.status === 'done' ? `<span class="badge" style="background:rgba(52,211,153,0.15);color:var(--success)"><i class="bi bi-check-circle-fill"></i> Berhasil</span>` : s.status === 'fail' ? `<span class="badge" style="background:rgba(248,113,113,0.15);color:var(--danger)"><i class="bi bi-x-circle-fill"></i> Gagal</span>` : `<span class="badge badge-pending"><i class="bi bi-hourglass-split"></i> Berjalan</span>`;
    const elapsed = studyTimers[s.id]?.elapsed || s.elapsed || 0;
    const remaining = Math.max(0, s.duration * 60 - elapsed);
    const remStr = `${Math.floor(remaining / 60).toString().padStart(2, '0')}:${(remaining % 60).toString().padStart(2, '0')}`;
    return `<div class="study-item" data-id="${s.id}"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;"><div style="font-weight:700;font-size:15px;">${s.name}</div><div style="display:flex;align-items:center;gap:6px;">${statusBadge}<button class="btn btn-danger btn-sm del-study" data-id="${s.id}"><i class="bi bi-trash"></i></button></div></div><div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">Target: ${s.duration} menit · Sisa: <span class="timer-display" id="timer-${s.id}">${s.status ? (s.status === 'done' ? 'Selesai' : 'Gagal') : remStr}</span></div><div class="progress-bar-wrap" style="margin-bottom:10px;"><div class="progress-bar-fill" style="width:${progress}%;background:${s.status === 'done' ? 'var(--success)' : s.status === 'fail' ? 'var(--danger)' : 'linear-gradient(90deg,var(--accent),var(--accent-2))'}"></div></div><div style="display:flex;gap:8px;flex-wrap:wrap;" class="${s.status ? 'hidden' : ''}">${!s.status ? `<button class="btn btn-primary btn-sm start-study" data-id="${s.id}"><i class="bi bi-play-fill"></i> Mulai</button><button class="btn btn-success btn-sm mark-done" data-id="${s.id}"><i class="bi bi-check-lg"></i> Berhasil</button><button class="btn btn-danger btn-sm mark-fail" data-id="${s.id}"><i class="bi bi-x-lg"></i> Gagal</button>` : ''}</div></div>`;
  }).join('');
  studyData.forEach(s => { if (!s.status && studyTimers[s.id]) startStudyTimer(s.id); });
  updateStudyDonut(); // refresh study donut
}
function startStudyTimer(id) {
  const s = studyData.find(x => x.id === id);
  if (!s) return;
  const totalSec = s.duration * 60;
  if (!studyTimers[id]) studyTimers[id] = { elapsed: s.elapsed || 0, interval: null };
  clearInterval(studyTimers[id].interval);
  studyTimers[id].interval = setInterval(() => {
    studyTimers[id].elapsed++;
    const remaining = Math.max(0, totalSec - studyTimers[id].elapsed);
    const timerSpan = document.getElementById(`timer-${id}`);
    if (timerSpan) timerSpan.textContent = `${Math.floor(remaining / 60).toString().padStart(2, '0')}:${(remaining % 60).toString().padStart(2, '0')}`;
    const pct = Math.min(100, Math.round((studyTimers[id].elapsed / totalSec) * 100));
    const bar = document.querySelector(`.study-item[data-id="${id}"] .progress-bar-fill`);
    if (bar) bar.style.width = pct + '%';
    if (remaining <= 0) { clearInterval(studyTimers[id].interval); markStudy(id, 'done'); showToast('Waktu belajar selesai! 🎉', 'success'); }
  }, 1000);
}
async function markStudy(id, status) {
  const idx = studyData.findIndex(x => x.id === id);
  if (idx < 0) return;
  if (studyTimers[id]) clearInterval(studyTimers[id].interval);
  studyData[idx].status = status;
  studyData[idx].elapsed = studyTimers[id]?.elapsed || 0;
  if (db) { try { await firestore.updateDoc(firestore.doc(db, 'study', id), { status, elapsed: studyData[idx].elapsed }); } catch (e) { } }
  const allData = JSON.parse(localStorage.getItem('studyData') || '[]');
  const allIdx = allData.findIndex(x => x.id === id);
  if (allIdx >= 0) allData[allIdx] = studyData[idx];
  localStorage.setItem('studyData', JSON.stringify(allData));
  renderStudy();
  updateDashboard();
  showToast(status === 'done' ? 'Sesi belajar berhasil! 🎉' : 'Dicatat sebagai gagal', status === 'done' ? 'success' : 'error');
}
jQuery(document).on('click', '.start-study', function () { const id = jQuery(this).data('id'); if (studyTimers[id]) return; startStudyTimer(id); showToast('Timer dimulai!', 'success'); });
jQuery(document).on('click', '.mark-done', async function () { await markStudy(jQuery(this).data('id'), 'done'); });
jQuery(document).on('click', '.mark-fail', async function () { await markStudy(jQuery(this).data('id'), 'fail'); });
jQuery(document).on('click', '.del-study', async function () {
  const id = jQuery(this).data('id');
  if (studyTimers[id]) clearInterval(studyTimers[id].interval);
  if (db) { try { await firestore.deleteDoc(firestore.doc(db, 'study', id)); } catch (e) { } }
  studyData = studyData.filter(s => s.id !== id);
  delete studyTimers[id];
  const allData = JSON.parse(localStorage.getItem('studyData') || '[]').filter(s => s.id !== id);
  localStorage.setItem('studyData', JSON.stringify(allData));
  renderStudy();
  showToast('Sesi belajar dihapus', 'info');
});
document.getElementById('study-add-btn')?.addEventListener('click', async () => {
  const name = document.getElementById('study-name')?.value.trim() || '';
  const duration = parseInt(document.getElementById('study-duration')?.value);
  if (!name) return showToast('Isi nama pelajaran!', 'error');
  const userId = localStorage.getItem('userEmail') || 'anonymous';
  const item = { name, duration, status: null, elapsed: 0, date: today(), userId, createdAt: Date.now() };
  if (db) { try { const ref = await firestore.addDoc(firestore.collection(db, 'study'), item); item.id = ref.id; } catch (e) { item.id = Date.now().toString(); } }
  else { item.id = Date.now().toString(); }
  studyData.unshift(item);
  const allData = JSON.parse(localStorage.getItem('studyData') || '[]');
  allData.push(item);
  localStorage.setItem('studyData', JSON.stringify(allData));
  if (document.getElementById('study-name')) document.getElementById('study-name').value = '';
  renderStudy();
  showToast('Sesi belajar ditambahkan!', 'success');
});

// ==================== STUDY DONUT ====================
function initStudyDonut() {
  const total = studyData.length;
  const done = studyData.filter(s => s.status === 'done').length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const pctElem = document.getElementById('study-pct');
  if (pctElem) pctElem.textContent = pct + '%';
  const ctx = document.getElementById('study-donut');
  if (!ctx) return;
  if (studyDonutChart) {
    studyDonutChart.data.datasets[0].data = total ? [done, total - done] : [0, 1];
    studyDonutChart.update();
  } else {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const bgColor = isDark ? '#1c2030' : '#f0f2f8';
    studyDonutChart = new Chart(ctx, {
      type: 'doughnut',
      data: { datasets: [{ data: total ? [done, total - done] : [0, 1], backgroundColor: ['#6c8fff', bgColor], borderWidth: 0, hoverOffset: 0 }] },
      options: { cutout: '70%', plugins: { legend: { display: false }, tooltip: { enabled: false } }, animation: { duration: 600 } }
    });
  }
}
function updateStudyDonut() {
  const total = studyData.length;
  const done = studyData.filter(s => s.status === 'done').length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const pctElem = document.getElementById('study-pct');
  if (pctElem) pctElem.textContent = pct + '%';
  if (studyDonutChart) {
    studyDonutChart.data.datasets[0].data = total ? [done, total - done] : [0, 1];
    studyDonutChart.update();
  } else {
    initStudyDonut();
  }
}

// ==================== GRADES ====================
async function loadGrades() {
  const userId = localStorage.getItem('userEmail') || 'anonymous';
  if (!db) {
    const allData = JSON.parse(localStorage.getItem('gradeHistory') || '[]');
    gradeHistory = allData.filter(g => g.userId === userId);
    renderGradeHistory();
    return;
  }
  try {
    const snap = await firestore.getDocs(firestore.query(firestore.collection(db, 'grades'), firestore.orderBy('createdAt', 'desc')));
    const allData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    gradeHistory = allData.filter(g => g.userId === userId);
    renderGradeHistory();
  } catch (e) {
    const allData = JSON.parse(localStorage.getItem('gradeHistory') || '[]');
    gradeHistory = allData.filter(g => g.userId === userId);
    renderGradeHistory();
  }
}
document.getElementById('add-grade-row')?.addEventListener('click', () => {
  const container = document.getElementById('grade-inputs');
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'grade-row';
  row.innerHTML = `<input class="form-input" placeholder="Nama Mapel" style="flex:2"/><input class="form-input" type="number" placeholder="Nilai" min="0" max="100"/><button class="btn btn-danger btn-sm remove-grade-row"><i class="bi bi-trash"></i></button>`;
  container.appendChild(row);
});
jQuery(document).on('click', '.remove-grade-row', function () { if (document.querySelectorAll('#grade-inputs .grade-row').length > 1) jQuery(this).closest('.grade-row').remove(); });
function calcAvg() {
  const rows = document.querySelectorAll('#grade-inputs .grade-row');
  const vals = [];
  rows.forEach(r => {
    const inputs = r.querySelectorAll('input');
    const v = parseFloat(inputs[1]?.value);
    if (!isNaN(v)) vals.push(v);
  });
  if (!vals.length) { showToast('Isi minimal satu nilai!', 'error'); return null; }
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
document.getElementById('calc-avg-btn')?.addEventListener('click', () => {
  const avg = calcAvg();
  if (avg === null) return;
  const resultDiv = document.getElementById('grade-result');
  const avgResult = document.getElementById('avg-result');
  const avgLabel = document.getElementById('avg-grade-label');
  if (resultDiv) resultDiv.style.display = 'block';
  if (avgResult) avgResult.textContent = avg.toFixed(2);
  const label = avg >= 90 ? '🌟 Sangat Baik (A)' : avg >= 80 ? '✅ Baik (B)' : avg >= 70 ? '👍 Cukup (C)' : avg >= 60 ? '⚠️ Kurang (D)' : '❌ Sangat Kurang (E)';
  if (avgLabel) avgLabel.textContent = label;
  if (avgResult) avgResult.style.color = avg >= 80 ? 'var(--success)' : avg >= 60 ? 'var(--warning)' : 'var(--danger)';
});
document.getElementById('save-grade-btn')?.addEventListener('click', async () => {
  const avg = calcAvg();
  if (avg === null) return;
  const setName = document.getElementById('grade-set-name')?.value.trim() || `Set ${new Date().toLocaleDateString('id-ID')}`;
  const rows = document.querySelectorAll('#grade-inputs .grade-row');
  const subjects = [];
  rows.forEach(r => {
    const inputs = r.querySelectorAll('input');
    const name = inputs[0]?.value.trim() || 'Mapel';
    const val = parseFloat(inputs[1]?.value);
    if (!isNaN(val)) subjects.push({ name, value: val });
  });
  const userId = localStorage.getItem('userEmail') || 'anonymous';
  const item = { setName, subjects, avg: avg.toFixed(2), date: today(), userId, createdAt: Date.now() };
  if (db) { try { const ref = await firestore.addDoc(firestore.collection(db, 'grades'), item); item.id = ref.id; } catch (e) { item.id = Date.now().toString(); } }
  else { item.id = Date.now().toString(); }
  gradeHistory.unshift(item);
  const allData = JSON.parse(localStorage.getItem('gradeHistory') || '[]');
  allData.push(item);
  localStorage.setItem('gradeHistory', JSON.stringify(allData));
  renderGradeHistory();
  updateDashboard();
  showToast('Nilai disimpan!', 'success');
});
function renderGradeHistory() {
  const list = document.getElementById('grade-history-list');
  if (!list) return;
  if (!gradeHistory.length) { list.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:20px;font-size:13px;">Belum ada riwayat</div>'; return; }
  list.innerHTML = gradeHistory.map(g => `<div style="border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:8px;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;"><span style="font-weight:700;font-size:14px;">${g.setName}</span><div style="display:flex;align-items:center;gap:6px;"><span style="font-size:20px;font-weight:800;color:${g.avg >= 80 ? 'var(--success)' : g.avg >= 60 ? 'var(--warning)' : 'var(--danger)'};">${g.avg}</span><button class="btn btn-danger btn-sm del-grade" data-id="${g.id}"><i class="bi bi-trash"></i></button></div></div><div style="font-size:11px;color:var(--text-muted);">${g.date} · ${g.subjects.length} mapel</div><div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px;">${g.subjects.map(s => `<span class="badge badge-pending">${s.name}: ${s.value}</span>`).join('')}</div></div>`).join('');
}
jQuery(document).on('click', '.del-grade', async function () {
  const id = jQuery(this).data('id');
  if (db) { try { await firestore.deleteDoc(firestore.doc(db, 'grades', id)); } catch (e) { } }
  gradeHistory = gradeHistory.filter(g => g.id !== id);
  const allData = JSON.parse(localStorage.getItem('gradeHistory') || '[]').filter(g => g.id !== id);
  localStorage.setItem('gradeHistory', JSON.stringify(allData));
  renderGradeHistory();
  showToast('Riwayat nilai dihapus', 'info');
});

// ==================== SCHEDULE ====================
function renderToday() {
  const d = new Date();
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const label = document.getElementById('today-date-label');
  if (label) label.textContent = `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  checkHoliday();
}
async function loadSchedule() {
  const todayStr = today();
  const userId = localStorage.getItem('userEmail') || 'anonymous';
  if (!db) {
    allScheduleItems = JSON.parse(localStorage.getItem('scheduleData') || '[]');
    holidayData = JSON.parse(localStorage.getItem('holidayData') || '{}');
    scheduleData = allScheduleItems.filter(s => s.date === todayStr && s.userId === userId);
    renderScheduleList();
    return;
  }
  try {
    const snap = await firestore.getDocs(firestore.query(firestore.collection(db, 'schedule'), firestore.orderBy('time', 'asc')));
    allScheduleItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    scheduleData = allScheduleItems.filter(s => s.date === todayStr && s.userId === userId);
    renderScheduleList();
  } catch (e) {
    allScheduleItems = JSON.parse(localStorage.getItem('scheduleData') || '[]');
    scheduleData = allScheduleItems.filter(s => s.date === todayStr && s.userId === userId);
    renderScheduleList();
  }
  if (db) {
    try {
      const snap = await firestore.getDocs(firestore.collection(db, 'holidays'));
      snap.docs.forEach(d => { if (d.data().userId === userId) holidayData[d.id] = d.data(); });
    } catch (e) { }
  } else {
    holidayData = JSON.parse(localStorage.getItem('holidayData') || '{}');
  }
  checkHoliday();
}
function checkHoliday() {
  const t = today();
  const userId = localStorage.getItem('userEmail') || 'anonymous';
  const banner = document.getElementById('holiday-banner');
  if (!banner) return;
  if (holidayData[t] && holidayData[t].userId === userId) {
    banner.style.display = 'flex';
    const textSpan = document.getElementById('holiday-text');
    if (textSpan) textSpan.textContent = `Hari ini: ${holidayData[t].note || 'Hari libur / acara penting!'}`;
  } else {
    banner.style.display = 'none';
  }
}
function renderScheduleList() {
  const list = document.getElementById('schedule-list');
  if (!list) return;
  if (!scheduleData.length) {
    list.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:40px;font-size:13px;"><i class="bi bi-calendar-check" style="font-size:32px;display:block;margin-bottom:8px;"></i>Belum ada jadwal hari ini</div>`;
  } else {
    list.innerHTML = scheduleData.map(s => `<div class="schedule-item ${s.done ? 'done' : ''}" data-id="${s.id}"><input type="checkbox" ${s.done ? 'checked' : ''} class="sch-check" data-id="${s.id}" style="width:16px;height:16px;accent-color:var(--accent);cursor:pointer;flex-shrink:0;"/><div style="flex:1;"><div style="font-weight:600;font-size:14px;" class="item-label">${s.name}</div><div style="font-size:11px;color:var(--text-muted);">${s.time || ''} · ${s.cat || ''}</div></div><button class="btn btn-danger btn-sm del-schedule" data-id="${s.id}"><i class="bi bi-trash"></i></button></div>`).join('');
  }
  updateDonut();
  updateDashboard();
}
function updateDonut() {
  const total = scheduleData.length;
  const done = scheduleData.filter(s => s.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const pctElem = document.getElementById('schedule-pct');
  if (pctElem) pctElem.textContent = pct + '%';
  const ctx = document.getElementById('schedule-donut');
  if (!ctx) return;
  if (donutChart) {
    donutChart.data.datasets[0].data = total ? [done, total - done] : [0, 1];
    donutChart.update();
  } else {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const bgColor = isDark ? '#1c2030' : '#f0f2f8';
    donutChart = new Chart(ctx, { type: 'doughnut', data: { datasets: [{ data: total ? [done, total - done] : [0, 1], backgroundColor: ['#6c8fff', bgColor], borderWidth: 0, hoverOffset: 0 }] }, options: { cutout: '70%', plugins: { legend: { display: false }, tooltip: { enabled: false } }, animation: { duration: 600 } } });
  }
}
jQuery(document).on('change', '.sch-check', async function () {
  const id = jQuery(this).data('id');
  const done = jQuery(this).is(':checked');
  const idx = scheduleData.findIndex(s => s.id === id);
  if (idx !== -1) scheduleData[idx].done = done;
  const allIdx = allScheduleItems.findIndex(s => s.id === id);
  if (allIdx !== -1) allScheduleItems[allIdx].done = done;
  if (db) { try { await firestore.updateDoc(firestore.doc(db, 'schedule', id), { done }); } catch (e) { } }
  let allData = JSON.parse(localStorage.getItem('scheduleData') || '[]');
  const storageIdx = allData.findIndex(s => s.id === id);
  if (storageIdx !== -1) { allData[storageIdx].done = done; localStorage.setItem('scheduleData', JSON.stringify(allData)); }
  updateDonut();
  updateDashboard();
});
jQuery(document).on('click', '.del-schedule', async function () {
  const id = jQuery(this).data('id');
  if (db) { try { await firestore.deleteDoc(firestore.doc(db, 'schedule', id)); } catch (e) { } }
  scheduleData = scheduleData.filter(s => s.id !== id);
  allScheduleItems = allScheduleItems.filter(s => s.id !== id);
  let allData = JSON.parse(localStorage.getItem('scheduleData') || '[]');
  allData = allData.filter(s => s.id !== id);
  localStorage.setItem('scheduleData', JSON.stringify(allData));
  renderScheduleList();
  showToast('Jadwal dihapus', 'info');
});
jQuery(document).on('click', '#add-schedule-btn', function () { const modal = document.getElementById('modal-schedule'); if (modal) modal.classList.add('open'); });
jQuery(document).on('click', '#close-modal-schedule', function () { const modal = document.getElementById('modal-schedule'); if (modal) modal.classList.remove('open'); });
jQuery(document).on('click', '#modal-schedule', function (e) { if (e.target === document.getElementById('modal-schedule')) document.getElementById('modal-schedule')?.classList.remove('open'); });
jQuery(document).on('click', '#sch-save-btn', async function () {
  const name = document.getElementById('sch-name')?.value.trim() || '';
  const time = document.getElementById('sch-time')?.value;
  const cat = document.getElementById('sch-cat')?.value;
  if (!name) return showToast('Isi nama kegiatan!', 'error');
  const userId = localStorage.getItem('userEmail') || 'anonymous';
  const item = { name, time, cat, done: false, date: today(), userId, createdAt: Date.now() };
  if (db) { try { const ref = await firestore.addDoc(firestore.collection(db, 'schedule'), item); item.id = ref.id; } catch (e) { item.id = Date.now().toString(); } }
  else { item.id = Date.now().toString(); }
  scheduleData.push(item);
  scheduleData.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  allScheduleItems.push(item);
  const allData = JSON.parse(localStorage.getItem('scheduleData') || '[]');
  allData.push(item);
  localStorage.setItem('scheduleData', JSON.stringify(allData));
  if (document.getElementById('sch-name')) document.getElementById('sch-name').value = '';
  renderScheduleList();
  const modal = document.getElementById('modal-schedule');
  if (modal) modal.classList.remove('open');
  showToast('Jadwal ditambahkan!', 'success');
});
jQuery(document).on('click', '#mark-holiday-btn', async function () {
  const note = prompt('Keterangan hari libur / acara penting (opsional):') || 'Hari libur';
  const t = today();
  const userId = localStorage.getItem('userEmail') || 'anonymous';
  holidayData[t] = { note, userId };
  if (db) { try { await firestore.setDoc(firestore.doc(db, 'holidays', t), { note, userId }); } catch (e) { } }
  const allHolidayData = JSON.parse(localStorage.getItem('holidayData') || '{}');
  allHolidayData[t] = { note, userId };
  localStorage.setItem('holidayData', JSON.stringify(allHolidayData));
  checkHoliday();
  showToast('Hari libur ditandai!', 'success');
});
jQuery(document).on('click', '#unmark-holiday-btn', async function () {
  const t = today();
  const userId = localStorage.getItem('userEmail') || 'anonymous';
  if (holidayData[t] && holidayData[t].userId === userId) delete holidayData[t];
  if (db) { try { await firestore.deleteDoc(firestore.doc(db, 'holidays', t)); } catch (e) { } }
  const allHolidayData = JSON.parse(localStorage.getItem('holidayData') || '{}');
  delete allHolidayData[t];
  localStorage.setItem('holidayData', JSON.stringify(allHolidayData));
  checkHoliday();
  showToast('Tanda libur dihapus', 'info');
});

// ==================== DASHBOARD ====================
function initDashChart() {
  if (dashChart) { dashChart.destroy(); dashChart = null; }
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    last7.push(d.toISOString().split('T')[0]);
  }
  const incomes = last7.map(date => financeData.filter(f => f.type === 'income' && f.date === date).reduce((s, f) => s + Number(f.amount), 0));
  const expenses = last7.map(date => financeData.filter(f => f.type === 'expense' && f.date === date).reduce((s, f) => s + Number(f.amount), 0));
  const labels = last7.map(d => d.slice(5));
  const ctx = document.getElementById('dash-chart');
  if (!ctx) return;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#8892b0' : '#4a5580';
  dashChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label: 'Pemasukan', data: incomes, borderColor: '#34d399', backgroundColor: 'rgba(52,211,153,0.08)', tension: 0.4, fill: true, pointRadius: 4 }, { label: 'Pengeluaran', data: expenses, borderColor: '#f87171', backgroundColor: 'rgba(248,113,113,0.08)', tension: 0.4, fill: true, pointRadius: 4 }] },
    options: { responsive: true, plugins: { legend: { labels: { color: textColor, font: { family: "'Plus Jakarta Sans'" } } } }, scales: { x: { grid: { color: gridColor }, ticks: { color: textColor } }, y: { grid: { color: gridColor }, ticks: { color: textColor, callback: v => 'Rp ' + fmt(v) } } } }
  });
}
async function loadDashboard() {
  const userId = localStorage.getItem('userEmail') || 'anonymous';
  if (!db) {
    const allFinance = JSON.parse(localStorage.getItem('financeData') || '[]');
    financeData = allFinance.filter(f => f.userId === userId);
  } else {
    try {
      const snap = await firestore.getDocs(firestore.query(firestore.collection(db, 'finance'), firestore.orderBy('date', 'desc')));
      const allFinance = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      financeData = allFinance.filter(f => f.userId === userId);
    } catch (e) {
      const allFinance = JSON.parse(localStorage.getItem('financeData') || '[]');
      financeData = allFinance.filter(f => f.userId === userId);
    }
  }
  updateDashboard();
}
function updateDashboard() {
  const income = financeData.filter(f => f.type === 'income').reduce((s, f) => s + Number(f.amount), 0);
  const expense = financeData.filter(f => f.type === 'expense').reduce((s, f) => s + Number(f.amount), 0);
  const balance = income - expense;
  const balEl = document.getElementById('dash-balance');
  if (balEl) {
    balEl.textContent = `Rp ${fmt(Math.abs(balance))}`;
    balEl.style.color = balance >= 0 ? 'var(--success)' : 'var(--danger)';
  }
  const studyDoneToday = studyData.filter(s => s.date === today() && s.status === 'done').length;
  const studyElem = document.getElementById('dash-study');
  if (studyElem) studyElem.textContent = studyDoneToday;
  const total = scheduleData.length;
  const done = scheduleData.filter(s => s.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const scheduleElem = document.getElementById('dash-schedule');
  if (scheduleElem) scheduleElem.textContent = pct + '%';
  const gradeElem = document.getElementById('dash-grade');
  if (gradeElem && gradeHistory.length) gradeElem.textContent = gradeHistory[0].avg;
  initDashChart();
}

// ==================== INITIALIZATION ====================
startClock();
renderToday();
setTimeout(() => {
  if (!window.firebaseReady) {
    const userId = localStorage.getItem('userEmail') || 'anonymous';
    financeData = (JSON.parse(localStorage.getItem('financeData') || '[]')).filter(f => f.userId === userId);
    studyData = (JSON.parse(localStorage.getItem('studyData') || '[]')).filter(s => s.userId === userId);
    gradeHistory = (JSON.parse(localStorage.getItem('gradeHistory') || '[]')).filter(g => g.userId === userId);
    allScheduleItems = JSON.parse(localStorage.getItem('scheduleData') || '[]');
    scheduleData = allScheduleItems.filter(s => s.date === today() && s.userId === userId);
    const allHoliday = JSON.parse(localStorage.getItem('holidayData') || '{}');
    holidayData = {};
    Object.keys(allHoliday).forEach(key => { if (allHoliday[key].userId === userId) holidayData[key] = allHoliday[key]; });
    updateDashboard();
    checkHoliday();
  }
}, 2000);