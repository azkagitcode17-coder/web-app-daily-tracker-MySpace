/* ============================================================
   utils.js — Fungsi utilitas & inisialisasi global
   Berisi: cache buster, helper, theme, navigation,
           sidebar, search, user info, logout, init data
   ============================================================ */

// =================== CACHE BUSTER ===================
const APP_VERSION = '1.1.4';
const storedVersion = localStorage.getItem('app_version');
if (storedVersion !== APP_VERSION) {
  localStorage.setItem('app_version', APP_VERSION);
  if ('caches' in window) {
    caches.keys().then(keys => keys.forEach(key => caches.delete(key)));
  }
  if (storedVersion !== null) {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('_v')) {
      url.searchParams.set('_v', Date.now());
      window.location.replace(url.toString());
    }
  }
}

// =================== HELPER FUNCTIONS ===================
const $  = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const fmt   = (n) => new Intl.NumberFormat('id-ID').format(n);
const today = ()  => new Date().toISOString().split('T')[0];

// Ambil uid user yang sedang login (dipakai untuk isolasi data)
const getUID = () => window.currentUser?.uid || 'local';

function showToast(msg, type = 'info') {
  const icon = {
    success: 'check-circle-fill',
    error:   'x-circle-fill',
    info:    'info-circle-fill'
  }[type];
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="bi bi-${icon}"></i> ${msg}`;
  $('#toast-container').appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// =================== THEME ===================
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

const updateThemeIcon = () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  $('#theme-icon').className = isDark ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
};
updateThemeIcon();

$('#theme-toggle').addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeIcon();
  setTimeout(() => {
    if (typeof initFinanceChart === 'function') initFinanceChart();
    if (typeof initDashChart    === 'function') initDashChart();
    if (typeof updateDonut      === 'function') updateDonut();
  }, 100);
});

// =================== USER INFO DI SIDEBAR ===================
function renderUserInfo(user) {
  const el = $('#sidebar-user');
  if (!el || !user) return;
  const name   = user.displayName || 'Pengguna';
  const email  = user.email || '';
  // Avatar: inisial nama
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;
      border-radius:12px;background:var(--bg-card);border:1px solid var(--border);">
      <div style="width:36px;height:36px;border-radius:10px;flex-shrink:0;
        background:linear-gradient(135deg,var(--accent),var(--accent-2));
        display:flex;align-items:center;justify-content:center;
        font-weight:800;font-size:13px;color:white;">
        ${initials}
      </div>
      <div style="overflow:hidden;flex:1;" class="nav-label">
        <div style="font-weight:700;font-size:13px;white-space:nowrap;
          overflow:hidden;text-overflow:ellipsis;">${name}</div>
        <div style="font-size:10px;color:var(--text-muted);white-space:nowrap;
          overflow:hidden;text-overflow:ellipsis;">${email}</div>
      </div>
    </div>`;
}

// =================== LOGOUT ===================
function handleLogout() {
  if (!window.auth || !window.authSignOut) {
    localStorage.clear();
    window.location.replace('login.html');
    return;
  }
  window.authSignOut(window.auth).then(() => {
    localStorage.removeItem('financeData');
    localStorage.removeItem('studyData');
    localStorage.removeItem('gradeHistory');
    localStorage.removeItem('scheduleData');
    localStorage.removeItem('holidayData');
    window.location.replace('login.html');
  });
}

$('#logout-btn')?.addEventListener('click', handleLogout);

// =================== NAVIGATION ===================
const pageNames = {
  dashboard: 'Dashboard',
  finance:   'Keuangan',
  study:     'Monitoring Belajar',
  grades:    'Rata-rata Nilai',
  schedule:  'Jadwal Harian',
  calendar:  'Kalender',
  clock:     'Jam Indonesia',
  calc:      'Kalkulator'
};

function navigate(page) {
  $$('.page').forEach(p => p.classList.remove('active'));
  $$('.nav-item').forEach(n => n.classList.remove('active'));
  $(`#page-${page}`).classList.add('active');
  document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
  $('#topbar-title').textContent = pageNames[page] || page;

  if (page === 'clock')     startClock();
  if (page === 'calendar')  renderCalendar();
  if (page === 'finance')   loadFinance();
  if (page === 'study')     loadStudy();
  if (page === 'schedule')  { renderToday(); loadSchedule(); }
  if (page === 'grades')    loadGrades();
  if (page === 'dashboard') loadDashboard();

  if (window.innerWidth <= 768) {
    $('#sidebar').classList.remove('mobile-open');
    $('#overlay-bg').classList.remove('show');
  }
}

$$('.nav-item[data-page]').forEach(item => {
  item.addEventListener('click', () => navigate(item.dataset.page));
});

// =================== SIDEBAR TOGGLE ===================
let sidebarCollapsed = false;
$('#toggle-sidebar-btn').addEventListener('click', () => {
  if (window.innerWidth > 768) {
    sidebarCollapsed = !sidebarCollapsed;
    $('#sidebar').classList.toggle('collapsed', sidebarCollapsed);
    $('#main-content').classList.toggle('sidebar-collapsed', sidebarCollapsed);
    $('#toggle-icon').className = sidebarCollapsed
      ? 'bi bi-layout-sidebar-inset'
      : 'bi bi-layout-sidebar-inset-reverse';
  }
});
$('#mobile-toggle').addEventListener('click', () => {
  $('#sidebar').classList.toggle('mobile-open');
  $('#overlay-bg').classList.toggle('show');
});
$('#overlay-bg').addEventListener('click', () => {
  $('#sidebar').classList.remove('mobile-open');
  $('#overlay-bg').classList.remove('show');
});

// =================== JQUERY SEARCH ===================
const searchItems = [
  { label: 'Dashboard',          icon: 'grid-fill',       page: 'dashboard' },
  { label: 'Keuangan',           icon: 'wallet2',          page: 'finance'   },
  { label: 'Monitoring Belajar', icon: 'book-fill',        page: 'study'     },
  { label: 'Rata-rata Nilai',    icon: 'mortarboard-fill', page: 'grades'    },
  { label: 'Jadwal Harian',      icon: 'check2-square',    page: 'schedule'  },
  { label: 'Kalender',           icon: 'calendar3',        page: 'calendar'  },
  { label: 'Jam Indonesia',      icon: 'clock-fill',       page: 'clock'     },
  { label: 'Kalkulator',         icon: 'calculator-fill',  page: 'calc'      },
];

jQuery('#global-search').on('input', function () {
  const q        = jQuery(this).val().toLowerCase().trim();
  const $results = jQuery('#search-results');
  if (!q) { $results.hide(); return; }
  const filtered = searchItems.filter(i => i.label.toLowerCase().includes(q));
  if (!filtered.length) { $results.hide(); return; }
  $results.html(
    filtered.map(i =>
      `<div class="search-result-item" data-page="${i.page}">
        <i class="bi bi-${i.icon}" style="color:var(--accent)"></i> ${i.label}
      </div>`
    ).join('')
  ).show();
});

jQuery(document).on('click', '.search-result-item', function () {
  navigate(jQuery(this).data('page'));
  jQuery('#global-search').val('');
  jQuery('#search-results').hide();
});

jQuery(document).on('click', function (e) {
  if (!jQuery(e.target).closest('.search-wrap').length)
    jQuery('#search-results').hide();
});

// =================== FIREBASE READY ===================
let db, firestore;
document.addEventListener('firebaseReady', () => {
  db        = window.db;
  firestore = window.firestore;

  // Tampilkan info user di sidebar
  renderUserInfo(window.currentUser);

  // Firebase siap — load data dari server
  window._localInitDone = false;
  loadDashboard();
  loadSchedule();
});

// =================== INIT DATA ===================
// Key localStorage pakai uid agar data tiap user terpisah
const lsKey = (key) => `${getUID()}_${key}`;

function initLocalFallback() {
  if (window._localInitDone) return;
  window._localInitDone = true;
  financeData      = JSON.parse(localStorage.getItem(lsKey('financeData'))  || '[]');
  studyData        = JSON.parse(localStorage.getItem(lsKey('studyData'))    || '[]');
  gradeHistory     = JSON.parse(localStorage.getItem(lsKey('gradeHistory')) || '[]');
  allScheduleItems = JSON.parse(localStorage.getItem(lsKey('scheduleData'))|| '[]');
  holidayData      = JSON.parse(localStorage.getItem(lsKey('holidayData'))  || '{}');
  scheduleData     = allScheduleItems.filter(s => s.date === today());
  updateDashboard();
  checkHoliday();
  renderScheduleList();
}

// Hanya jalankan local fallback kalau Firebase sudah konfirmasi ada user
// (firebase.js akan redirect ke login.html kalau belum login)
// Fallback ini jalan kalau ada masalah koneksi setelah login
setTimeout(() => {
  if (!window.firebaseReady && window.currentUser) initLocalFallback();
}, 3000);
