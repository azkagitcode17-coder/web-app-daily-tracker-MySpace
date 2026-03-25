/* ============================================================
   finance.js — Finance Tracker
   FIX: tombol hapus pakai onclick global
   ============================================================ */

let financeData = [];
let financeChart;
const finCol = () => firestore.collection(db, 'users', getUID(), 'finance');

async function loadFinance() {
  if (!db) {
    financeData = JSON.parse(localStorage.getItem(lsKey('financeData')) || '[]');
    renderFinance(); return;
  }
  try {
    const snap = await firestore.getDocs(
      firestore.query(finCol(), firestore.orderBy('date','desc'))
    );
    financeData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    localStorage.setItem(lsKey('financeData'), JSON.stringify(financeData));
    renderFinance();
  } catch(e) {
    financeData = JSON.parse(localStorage.getItem(lsKey('financeData')) || '[]');
    renderFinance();
  }
}

function renderFinance() {
  const income  = financeData.filter(f => f.type==='income').reduce((s,f)=>s+Number(f.amount),0);
  const expense = financeData.filter(f => f.type==='expense').reduce((s,f)=>s+Number(f.amount),0);
  const balance = income - expense;
  document.getElementById('total-income').textContent  = `Rp ${fmt(income)}`;
  document.getElementById('total-expense').textContent = `Rp ${fmt(expense)}`;
  const balEl = document.getElementById('total-balance');
  balEl.textContent = `Rp ${fmt(Math.abs(balance))}${balance < 0 ? ' (minus)' : ''}`;
  balEl.style.color = balance >= 0 ? 'var(--success)' : 'var(--danger)';
  renderFinanceList();
  initFinanceChart();
  updateDashboard();
}

function renderFinanceList() {
  const list = document.getElementById('finance-list');
  if (!list) return;
  if (!financeData.length) {
    list.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:20px;font-size:13px;">Belum ada transaksi</div>';
    return;
  }
  list.innerHTML = financeData.slice(0, 30).map(f => `
    <div class="finance-item">
      <div class="finance-item-left">
        <div class="finance-icon ${f.type==='income'?'income-icon':'expense-icon'}">
          <i class="bi bi-${f.type==='income'?'arrow-down-circle-fill':'arrow-up-circle-fill'}"></i>
        </div>
        <div>
          <div style="font-weight:600;font-size:13px;">${f.desc}</div>
          <div style="font-size:11px;color:var(--text-muted);">${f.cat||''} · ${f.date||''}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
        <span style="font-weight:700;font-size:13px;color:${f.type==='income'?'var(--success)':'var(--danger)'}">
          ${f.type==='income'?'+':'-'}Rp ${fmt(f.amount)}
        </span>
        <button class="btn btn-danger btn-sm" onclick="delFinance('${f.id}')">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    </div>`
  ).join('');
}

function initFinanceChart() {
  if (financeChart) { financeChart.destroy(); financeChart = null; }
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate()-i);
    last7.push(d.toISOString().split('T')[0]);
  }
  const incomes  = last7.map(dt => financeData.filter(f=>f.type==='income'&&f.date===dt).reduce((s,f)=>s+Number(f.amount),0));
  const expenses = last7.map(dt => financeData.filter(f=>f.type==='expense'&&f.date===dt).reduce((s,f)=>s+Number(f.amount),0));
  const ctx = document.getElementById('finance-chart');
  if (!ctx) return;
  const isDark = document.documentElement.getAttribute('data-theme')==='dark';
  const gc = isDark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.06)';
  const tc = isDark?'#8892b0':'#4a5580';
  financeChart = new Chart(ctx, {
    type:'line',
    data:{ labels:last7.map(d=>d.slice(5)), datasets:[
      {label:'Pemasukan',data:incomes,borderColor:'#34d399',backgroundColor:'rgba(52,211,153,0.1)',tension:0.4,fill:true,pointRadius:4},
      {label:'Pengeluaran',data:expenses,borderColor:'#f87171',backgroundColor:'rgba(248,113,113,0.1)',tension:0.4,fill:true,pointRadius:4}
    ]},
    options:{responsive:true,
      plugins:{legend:{labels:{color:tc,font:{family:"'Plus Jakarta Sans'"}}}},
      scales:{x:{grid:{color:gc},ticks:{color:tc}},y:{grid:{color:gc},ticks:{color:tc,callback:v=>'Rp '+fmt(v)}}}}
  });
}

document.getElementById('fin-add-btn').addEventListener('click', async () => {
  const desc   = document.getElementById('fin-desc').value.trim();
  const amount = parseFloat(document.getElementById('fin-amount').value);
  const cat    = document.getElementById('fin-cat').value.trim();
  const type   = document.getElementById('fin-type').value;
  const date   = document.getElementById('fin-date').value || today();
  if (!desc || !amount) return showToast('Isi deskripsi dan jumlah!', 'error');

  const item = { desc, amount, cat, type, date, createdAt: Date.now() };
  if (db) {
    try { const ref = await firestore.addDoc(finCol(), item); item.id = ref.id; }
    catch(e) { item.id = Date.now().toString(); }
  } else { item.id = Date.now().toString(); }
  financeData.unshift(item);
  localStorage.setItem(lsKey('financeData'), JSON.stringify(financeData));
  document.getElementById('fin-desc').value  = '';
  document.getElementById('fin-amount').value = '';
  document.getElementById('fin-cat').value    = '';
  renderFinance();
  showToast('Transaksi ditambahkan!', 'success');
});

window.delFinance = async function(id) {
  if (!confirm('Hapus transaksi ini?')) return;
  if (db) {
    try { await firestore.deleteDoc(firestore.doc(db,'users',getUID(),'finance',id)); }
    catch(e) {}
  }
  financeData = financeData.filter(f => f.id !== id);
  localStorage.setItem(lsKey('financeData'), JSON.stringify(financeData));
  renderFinance();
  showToast('Transaksi dihapus', 'info');
};

document.getElementById('fin-date').value = today();
