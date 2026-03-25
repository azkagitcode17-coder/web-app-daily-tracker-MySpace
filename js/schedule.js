/* ============================================================
   schedule.js — Jadwal Harian
   FIX: onclick langsung pada tombol, donut canvas di-reset ulang
   ============================================================ */

let scheduleData = [], allScheduleItems = [], holidayData = {}, donutChart;
const scheduleCol = () => firestore.collection(db, 'users', getUID(), 'schedule');
const holidayDocRef = (d) => firestore.doc(db, 'users', getUID(), 'holidays', d);
const holidayColRef = () => firestore.collection(db, 'users', getUID(), 'holidays');

function renderToday() {
  const d = new Date();
  const days   = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli',
                  'Agustus','September','Oktober','November','Desember'];
  const el = document.getElementById('today-date-label');
  if (el) el.textContent =
    `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  checkHoliday();
}

async function loadSchedule() {
  const todayStr = today();
  if (!db) {
    allScheduleItems = JSON.parse(localStorage.getItem(lsKey('scheduleData')) || '[]');
    holidayData      = JSON.parse(localStorage.getItem(lsKey('holidayData'))  || '{}');
    scheduleData     = allScheduleItems.filter(s => s.date === todayStr);
    renderScheduleList(); checkHoliday(); return;
  }
  try {
    const snap = await firestore.getDocs(
      firestore.query(scheduleCol(), firestore.orderBy('time','asc'))
    );
    allScheduleItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    scheduleData     = allScheduleItems.filter(s => s.date === todayStr);
    localStorage.setItem(lsKey('scheduleData'), JSON.stringify(allScheduleItems));
    renderScheduleList();
  } catch(e) {
    allScheduleItems = JSON.parse(localStorage.getItem(lsKey('scheduleData')) || '[]');
    scheduleData     = allScheduleItems.filter(s => s.date === todayStr);
    renderScheduleList();
  }
  try {
    const snap = await firestore.getDocs(holidayColRef());
    snap.docs.forEach(d => { holidayData[d.id] = d.data(); });
    localStorage.setItem(lsKey('holidayData'), JSON.stringify(holidayData));
  } catch(e) {
    holidayData = JSON.parse(localStorage.getItem(lsKey('holidayData')) || '{}');
  }
  checkHoliday();
}

function renderScheduleList() {
  const list = document.getElementById('schedule-list');
  if (!list) return;

  if (!scheduleData.length) {
    list.innerHTML = `
      <div style="text-align:center;color:var(--text-muted);padding:40px;font-size:13px;">
        <i class="bi bi-calendar-check" style="font-size:32px;display:block;margin-bottom:8px;"></i>
        Belum ada jadwal hari ini
      </div>`;
  } else {
    list.innerHTML = scheduleData.map(s => `
      <div class="schedule-item ${s.done ? 'done' : ''}" data-id="${s.id}">
        <input type="checkbox" ${s.done ? 'checked' : ''}
          onchange="toggleSchedule('${s.id}', this.checked)"
          style="width:18px;height:18px;accent-color:var(--accent);cursor:pointer;flex-shrink:0;"/>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;font-size:14px;" class="item-label">${s.name}</div>
          <div style="font-size:11px;color:var(--text-muted);">${s.time || ''} · ${s.cat || ''}</div>
        </div>
        <button class="btn btn-danger btn-sm" onclick="delSchedule('${s.id}')" style="flex-shrink:0;">
          <i class="bi bi-trash"></i>
        </button>
      </div>`
    ).join('');
  }
  updateDonut();
  updateDashboard();
}

// ---- Donut chart — FIX: destroy + ganti canvas baru ----
function updateDonut() {
  const total = scheduleData.length;
  const done  = scheduleData.filter(s => s.done).length;
  const pct   = total ? Math.round((done / total) * 100) : 0;

  const pctEl = document.getElementById('schedule-pct');
  if (pctEl) pctEl.textContent = pct + '%';

  // Destroy chart lama
  if (donutChart) { donutChart.destroy(); donutChart = null; }

  // Ganti canvas lama dengan yang baru (mencegah "Canvas is already in use")
  const wrap = document.querySelector('.donut-wrap');
  if (!wrap) return;
  const oldCanvas = document.getElementById('schedule-donut');
  if (oldCanvas) oldCanvas.remove();
  const newCanvas = document.createElement('canvas');
  newCanvas.id     = 'schedule-donut';
  newCanvas.width  = 140;
  newCanvas.height = 140;
  wrap.insertBefore(newCanvas, wrap.firstChild);

  const isDark  = document.documentElement.getAttribute('data-theme') === 'dark';
  const bgColor = isDark ? '#1c2030' : '#f0f2f8';

  donutChart = new Chart(newCanvas, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: total ? [done, total - done] : [0, 1],
        backgroundColor: ['#6c8fff', bgColor],
        borderWidth: 0, hoverOffset: 0
      }]
    },
    options: {
      cutout: '72%',
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      animation: { duration: 500 }
    }
  });
}

// ---- Global functions (dipanggil via onclick) ----

window.toggleSchedule = async function(id, done) {
  const idx    = scheduleData.findIndex(s => s.id === id);
  const allIdx = allScheduleItems.findIndex(s => s.id === id);
  if (idx < 0) return;
  scheduleData[idx].done = done;
  if (allIdx >= 0) allScheduleItems[allIdx].done = done;
  if (db) {
    try {
      await firestore.updateDoc(
        firestore.doc(db, 'users', getUID(), 'schedule', id), { done }
      );
    } catch(e) {}
  }
  localStorage.setItem(lsKey('scheduleData'), JSON.stringify(allScheduleItems));
  renderScheduleList();
};

window.delSchedule = async function(id) {
  if (!confirm('Hapus jadwal ini?')) return;
  if (db) {
    try { await firestore.deleteDoc(firestore.doc(db, 'users', getUID(), 'schedule', id)); }
    catch(e) {}
  }
  scheduleData     = scheduleData.filter(s => s.id !== id);
  allScheduleItems = allScheduleItems.filter(s => s.id !== id);
  localStorage.setItem(lsKey('scheduleData'), JSON.stringify(allScheduleItems));
  renderScheduleList();
  showToast('Jadwal dihapus', 'info');
};

// ---- Modal ----
document.getElementById('add-schedule-btn').addEventListener('click',
  () => document.getElementById('modal-schedule').classList.add('open'));
document.getElementById('close-modal-schedule').addEventListener('click',
  () => document.getElementById('modal-schedule').classList.remove('open'));
document.getElementById('modal-schedule').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-schedule'))
    document.getElementById('modal-schedule').classList.remove('open');
});

const _nowSch = new Date();
document.getElementById('sch-time').value =
  `${String(_nowSch.getHours()).padStart(2,'0')}:${String(_nowSch.getMinutes()).padStart(2,'0')}`;

document.getElementById('sch-save-btn').addEventListener('click', async () => {
  const name = document.getElementById('sch-name').value.trim();
  const time = document.getElementById('sch-time').value;
  const cat  = document.getElementById('sch-cat').value;
  if (!name) return showToast('Isi nama kegiatan!', 'error');

  const item = { name, time, cat, done: false, date: today(), createdAt: Date.now() };
  if (db) {
    try {
      const ref = await firestore.addDoc(scheduleCol(), item);
      item.id = ref.id;
    } catch(e) { item.id = Date.now().toString(); }
  } else { item.id = Date.now().toString(); }

  scheduleData.push(item);
  scheduleData.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  allScheduleItems.push(item);
  localStorage.setItem(lsKey('scheduleData'), JSON.stringify(allScheduleItems));
  document.getElementById('sch-name').value = '';
  renderScheduleList();
  document.getElementById('modal-schedule').classList.remove('open');
  showToast('Jadwal ditambahkan!', 'success');
});

// ---- Hari Libur ----
function checkHoliday() {
  const t      = today();
  const banner = document.getElementById('holiday-banner');
  if (!banner) return;
  if (holidayData[t]) {
    banner.style.display = 'flex';
    const txt = document.getElementById('holiday-text');
    if (txt) txt.textContent = `Hari ini: ${holidayData[t].note || 'Hari libur / acara penting!'}`;
  } else {
    banner.style.display = 'none';
  }
}

document.getElementById('mark-holiday-btn').addEventListener('click', async () => {
  const note = prompt('Keterangan (opsional):') || 'Hari libur';
  const t    = today();
  holidayData[t] = { note };
  if (db) { try { await firestore.setDoc(holidayDocRef(t), { note }); } catch(e) {} }
  localStorage.setItem(lsKey('holidayData'), JSON.stringify(holidayData));
  checkHoliday();
  showToast('Hari libur ditandai! ⭐', 'success');
});

document.getElementById('unmark-holiday-btn').addEventListener('click', async () => {
  const t = today();
  delete holidayData[t];
  if (db) { try { await firestore.deleteDoc(holidayDocRef(t)); } catch(e) {} }
  localStorage.setItem(lsKey('holidayData'), JSON.stringify(holidayData));
  checkHoliday();
  showToast('Tanda libur dihapus', 'info');
});
