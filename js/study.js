/* ============================================================
   study.js — Monitoring Belajar
   FIX: event delegation langsung ke #study-list (bukan document)
        agar tombol dinamis selalu terdeteksi
   ============================================================ */

let studyData = [], studyTimers = {};
const studyCol = () => firestore.collection(db, 'users', getUID(), 'study');

async function loadStudy() {
  if (!db) {
    studyData = JSON.parse(localStorage.getItem(lsKey('studyData')) || '[]');
    renderStudy(); return;
  }
  try {
    const snap = await firestore.getDocs(
      firestore.query(studyCol(), firestore.orderBy('createdAt','desc'))
    );
    studyData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    localStorage.setItem(lsKey('studyData'), JSON.stringify(studyData));
    renderStudy();
  } catch(e) {
    studyData = JSON.parse(localStorage.getItem(lsKey('studyData')) || '[]');
    renderStudy();
  }
}

function renderStudy() {
  const list = document.getElementById('study-list');
  if (!list) return;

  if (!studyData.length) {
    list.innerHTML = `
      <div style="text-align:center;color:var(--text-muted);padding:40px;font-size:13px;">
        <i class="bi bi-book" style="font-size:32px;display:block;margin-bottom:8px;"></i>
        Belum ada sesi belajar
      </div>`;
  } else {
    list.innerHTML = studyData.map(s => {
      const progress = s.status === 'done' ? 100
        : s.status === 'fail' ? 0
        : (s.elapsed ? Math.min(100, Math.round((s.elapsed / (s.duration * 60)) * 100)) : 0);

      const statusBadge = s.status === 'done'
        ? `<span class="badge" style="background:rgba(52,211,153,0.15);color:var(--success)"><i class="bi bi-check-circle-fill"></i> Berhasil</span>`
        : s.status === 'fail'
        ? `<span class="badge" style="background:rgba(248,113,113,0.15);color:var(--danger)"><i class="bi bi-x-circle-fill"></i> Gagal</span>`
        : `<span class="badge badge-pending"><i class="bi bi-hourglass-split"></i> Berjalan</span>`;

      const elapsed   = studyTimers[s.id]?.elapsed || s.elapsed || 0;
      const remaining = Math.max(0, s.duration * 60 - elapsed);
      const remStr    = `${String(Math.floor(remaining/60)).padStart(2,'0')}:${String(remaining%60).padStart(2,'0')}`;
      const barColor  = s.status === 'done' ? 'var(--success)'
        : s.status === 'fail' ? 'var(--danger)'
        : 'linear-gradient(90deg,var(--accent),var(--accent-2))';

      const timerTxt = s.status ? (s.status === 'done' ? 'Selesai ✓' : 'Gagal ✗') : remStr;

      return `
        <div class="study-item" data-id="${s.id}">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;gap:8px;flex-wrap:wrap;">
            <div style="font-weight:700;font-size:15px;flex:1;">${s.name}</div>
            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
              ${statusBadge}
              <button class="btn btn-danger btn-sm" onclick="delStudy('${s.id}')">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">
            🎯 Target: <strong>${s.duration} menit</strong>
            &nbsp;·&nbsp; ⏱ Sisa: <span id="timer-${s.id}" style="font-family:var(--font-mono);font-weight:700;">${timerTxt}</span>
          </div>
          <div class="progress-bar-wrap" style="margin-bottom:10px;">
            <div class="progress-bar-fill" id="bar-${s.id}" style="width:${progress}%;background:${barColor}"></div>
          </div>
          ${!s.status ? `
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn btn-primary btn-sm" onclick="startStudy('${s.id}')">
              <i class="bi bi-play-fill"></i> Mulai
            </button>
            <button class="btn btn-success btn-sm" onclick="markStudy('${s.id}','done')">
              <i class="bi bi-check-lg"></i> Berhasil
            </button>
            <button class="btn btn-danger btn-sm" onclick="markStudy('${s.id}','fail')">
              <i class="bi bi-x-lg"></i> Gagal
            </button>
          </div>` : ''}
        </div>`;
    }).join('');

    // Resume timer yang masih berjalan
    studyData.forEach(s => {
      if (!s.status && studyTimers[s.id]?.interval) startStudyTimer(s.id);
    });
  }

  // Update counter
  const doneCount = studyData.filter(s => s.status === 'done').length;
  const failCount = studyData.filter(s => s.status === 'fail').length;
  const sd = document.getElementById('study-stat-done');
  const sf = document.getElementById('study-stat-fail');
  if (sd) sd.textContent = doneCount;
  if (sf) sf.textContent = failCount;
}

// ---- Fungsi global (dipanggil langsung dari onclick HTML) ----

window.startStudy = function(id) {
  if (studyTimers[id]?.interval) return showToast('Timer sudah berjalan!', 'info');
  startStudyTimer(id);
  showToast('Timer dimulai! ⏱', 'success');
};

function startStudyTimer(id) {
  const s = studyData.find(x => x.id === id);
  if (!s) return;
  const totalSec = s.duration * 60;
  if (!studyTimers[id]) studyTimers[id] = { elapsed: s.elapsed || 0, interval: null };
  clearInterval(studyTimers[id].interval);

  studyTimers[id].interval = setInterval(() => {
    studyTimers[id].elapsed++;
    const remaining = Math.max(0, totalSec - studyTimers[id].elapsed);
    const timerEl = document.getElementById(`timer-${id}`);
    const barEl   = document.getElementById(`bar-${id}`);
    if (timerEl) timerEl.textContent =
      `${String(Math.floor(remaining/60)).padStart(2,'0')}:${String(remaining%60).padStart(2,'0')}`;
    if (barEl) barEl.style.width =
      Math.min(100, Math.round((studyTimers[id].elapsed / totalSec) * 100)) + '%';
    if (remaining <= 0) {
      clearInterval(studyTimers[id].interval);
      markStudy(id, 'done');
      showToast('Waktu belajar selesai! 🎉', 'success');
    }
  }, 1000);
}

window.markStudy = async function(id, status) {
  const idx = studyData.findIndex(x => x.id === id);
  if (idx < 0) return;
  if (studyTimers[id]) clearInterval(studyTimers[id].interval);
  studyData[idx].status  = status;
  studyData[idx].elapsed = studyTimers[id]?.elapsed || 0;
  if (db) {
    try {
      await firestore.updateDoc(
        firestore.doc(db, 'users', getUID(), 'study', id),
        { status, elapsed: studyData[idx].elapsed }
      );
    } catch(e) {}
  }
  localStorage.setItem(lsKey('studyData'), JSON.stringify(studyData));
  renderStudy();
  updateDashboard();
  showToast(
    status === 'done' ? 'Sesi belajar berhasil! 🎉' : 'Sesi dicatat sebagai gagal',
    status === 'done' ? 'success' : 'error'
  );
};

window.delStudy = async function(id) {
  if (!confirm('Hapus sesi belajar ini?')) return;
  if (studyTimers[id]) clearInterval(studyTimers[id].interval);
  if (db) {
    try { await firestore.deleteDoc(firestore.doc(db, 'users', getUID(), 'study', id)); }
    catch(e) {}
  }
  studyData = studyData.filter(s => s.id !== id);
  delete studyTimers[id];
  localStorage.setItem(lsKey('studyData'), JSON.stringify(studyData));
  renderStudy();
  showToast('Sesi dihapus', 'info');
};

// ---- Tambah sesi ----
document.getElementById('study-add-btn').addEventListener('click', async () => {
  const name     = document.getElementById('study-name').value.trim();
  const duration = parseInt(document.getElementById('study-duration').value);
  if (!name) return showToast('Isi nama pelajaran!', 'error');

  const item = { name, duration, status: null, elapsed: 0, date: today(), createdAt: Date.now() };
  if (db) {
    try {
      const ref = await firestore.addDoc(studyCol(), item);
      item.id = ref.id;
    } catch(e) { item.id = Date.now().toString(); }
  } else { item.id = Date.now().toString(); }

  studyData.unshift(item);
  localStorage.setItem(lsKey('studyData'), JSON.stringify(studyData));
  document.getElementById('study-name').value = '';
  renderStudy();
  showToast('Sesi belajar ditambahkan!', 'success');
});
