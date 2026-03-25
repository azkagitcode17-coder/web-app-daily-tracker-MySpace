/* ============================================================
   grades.js — Rata-rata Nilai
   FIX: tombol hapus pakai onclick global
   ============================================================ */

let gradeHistory = [];
const gradesCol = () => firestore.collection(db, 'users', getUID(), 'grades');

async function loadGrades() {
  if (!db) {
    gradeHistory = JSON.parse(localStorage.getItem(lsKey('gradeHistory')) || '[]');
    renderGradeHistory(); return;
  }
  try {
    const snap = await firestore.getDocs(
      firestore.query(gradesCol(), firestore.orderBy('createdAt','desc'))
    );
    gradeHistory = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    localStorage.setItem(lsKey('gradeHistory'), JSON.stringify(gradeHistory));
    renderGradeHistory();
  } catch(e) {
    gradeHistory = JSON.parse(localStorage.getItem(lsKey('gradeHistory')) || '[]');
    renderGradeHistory();
  }
}

document.getElementById('add-grade-row').addEventListener('click', () => {
  const row = document.createElement('div');
  row.className = 'grade-row';
  row.innerHTML = `
    <input class="form-input" placeholder="Nama Mapel" style="flex:2"/>
    <input class="form-input" type="number" placeholder="Nilai" min="0" max="100"/>
    <button type="button" class="btn btn-danger btn-sm remove-grade-row">
      <i class="bi bi-trash"></i>
    </button>`;
  document.getElementById('grade-inputs').appendChild(row);
});

jQuery(document).on('click', '.remove-grade-row', function() {
  const rows = document.getElementById('grade-inputs').querySelectorAll('.grade-row');
  if (rows.length > 1) jQuery(this).closest('.grade-row').remove();
});

function calcAvg() {
  const rows = document.querySelectorAll('#grade-inputs .grade-row');
  const vals = [];
  rows.forEach(r => {
    const v = parseFloat(r.querySelectorAll('input')[1].value);
    if (!isNaN(v)) vals.push(v);
  });
  if (!vals.length) { showToast('Isi minimal satu nilai!', 'error'); return null; }
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

document.getElementById('calc-avg-btn').addEventListener('click', () => {
  const avg = calcAvg();
  if (avg === null) return;
  document.getElementById('grade-result').style.display = 'block';
  document.getElementById('avg-result').textContent = avg.toFixed(2);
  const label = avg >= 90 ? '🌟 Sangat Baik (A)'
    : avg >= 80 ? '✅ Baik (B)'
    : avg >= 70 ? '👍 Cukup (C)'
    : avg >= 60 ? '⚠️ Kurang (D)'
    : '❌ Sangat Kurang (E)';
  document.getElementById('avg-grade-label').textContent = label;
  document.getElementById('avg-result').style.color =
    avg >= 80 ? 'var(--success)' : avg >= 60 ? 'var(--warning)' : 'var(--danger)';
});

document.getElementById('save-grade-btn').addEventListener('click', async () => {
  const avg = calcAvg();
  if (avg === null) return;
  const setName  = document.getElementById('grade-set-name').value.trim()
    || `Set ${new Date().toLocaleDateString('id-ID')}`;
  const rows     = document.querySelectorAll('#grade-inputs .grade-row');
  const subjects = [];
  rows.forEach(r => {
    const inputs = r.querySelectorAll('input');
    const name   = inputs[0].value.trim() || 'Mapel';
    const val    = parseFloat(inputs[1].value);
    if (!isNaN(val)) subjects.push({ name, value: val });
  });
  const item = { setName, subjects, avg: avg.toFixed(2), date: today(), createdAt: Date.now() };
  if (db) {
    try {
      const ref = await firestore.addDoc(gradesCol(), item);
      item.id = ref.id;
    } catch(e) { item.id = Date.now().toString(); }
  } else { item.id = Date.now().toString(); }
  gradeHistory.unshift(item);
  localStorage.setItem(lsKey('gradeHistory'), JSON.stringify(gradeHistory));
  renderGradeHistory();
  updateDashboard();
  showToast('Nilai disimpan!', 'success');
});

function renderGradeHistory() {
  const list = document.getElementById('grade-history-list');
  if (!list) return;
  if (!gradeHistory.length) {
    list.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:20px;font-size:13px;">Belum ada riwayat</div>';
    return;
  }
  list.innerHTML = gradeHistory.map(g => `
    <div style="border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;gap:8px;">
        <span style="font-weight:700;font-size:14px;flex:1;">${g.setName}</span>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
          <span style="font-size:20px;font-weight:800;color:${g.avg>=80?'var(--success)':g.avg>=60?'var(--warning)':'var(--danger)'};">
            ${g.avg}
          </span>
          <button class="btn btn-danger btn-sm" onclick="delGrade('${g.id}')">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
      <div style="font-size:11px;color:var(--text-muted);">${g.date} · ${g.subjects.length} mapel</div>
      <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px;">
        ${g.subjects.map(s => `<span class="badge badge-pending">${s.name}: ${s.value}</span>`).join('')}
      </div>
    </div>`
  ).join('');
}

window.delGrade = async function(id) {
  if (!confirm('Hapus riwayat nilai ini?')) return;
  if (db) {
    try { await firestore.deleteDoc(firestore.doc(db, 'users', getUID(), 'grades', id)); }
    catch(e) {}
  }
  gradeHistory = gradeHistory.filter(g => g.id !== id);
  localStorage.setItem(lsKey('gradeHistory'), JSON.stringify(gradeHistory));
  renderGradeHistory();
  showToast('Riwayat dihapus', 'info');
};
