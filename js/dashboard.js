/* ============================================================
   dashboard.js — Dashboard (data per user)
   ============================================================ */

let dashChart;

async function loadDashboard() {
  if(!db){ financeData=JSON.parse(localStorage.getItem(lsKey('financeData'))||'[]'); }
  else {
    try {
      const snap=await firestore.getDocs(
        firestore.query(firestore.collection(db,'users',getUID(),'finance'),firestore.orderBy('date','desc'))
      );
      financeData=snap.docs.map(d=>({id:d.id,...d.data()}));
      localStorage.setItem(lsKey('financeData'),JSON.stringify(financeData));
    } catch(e){ financeData=JSON.parse(localStorage.getItem(lsKey('financeData'))||'[]'); }
  }
  updateDashboard();
}

function updateDashboard() {
  const income=financeData.filter(f=>f.type==='income').reduce((s,f)=>s+Number(f.amount),0);
  const expense=financeData.filter(f=>f.type==='expense').reduce((s,f)=>s+Number(f.amount),0);
  const balance=income-expense;
  const balEl=$('#dash-balance');
  if(balEl){ balEl.textContent=`Rp ${fmt(Math.abs(balance))}`; balEl.style.color=balance>=0?'var(--success)':'var(--danger)'; }
  const todayStudy=studyData.filter(s=>s.date===today()&&s.status==='done').length;
  if($('#dash-study')) $('#dash-study').textContent=todayStudy;
  const total=scheduleData.length, done=scheduleData.filter(s=>s.done).length;
  if($('#dash-schedule')) $('#dash-schedule').textContent=(total?Math.round((done/total)*100):0)+'%';
  if(gradeHistory.length&&$('#dash-grade')) $('#dash-grade').textContent=gradeHistory[0].avg;
  initDashChart();
}

function initDashChart() {
  if(dashChart){dashChart.destroy();dashChart=null;}
  const last7=[];
  for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);last7.push(d.toISOString().split('T')[0]);}
  const incomes=last7.map(date=>financeData.filter(f=>f.type==='income'&&f.date===date).reduce((s,f)=>s+Number(f.amount),0));
  const expenses=last7.map(date=>financeData.filter(f=>f.type==='expense'&&f.date===date).reduce((s,f)=>s+Number(f.amount),0));
  const ctx=document.getElementById('dash-chart'); if(!ctx) return;
  const isDark=document.documentElement.getAttribute('data-theme')==='dark';
  const gc=isDark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.06)', tc=isDark?'#8892b0':'#4a5580';
  dashChart=new Chart(ctx,{type:'line',data:{labels:last7.map(d=>d.slice(5)),datasets:[
    {label:'Pemasukan',data:incomes,borderColor:'#34d399',backgroundColor:'rgba(52,211,153,0.08)',tension:0.4,fill:true,pointRadius:4},
    {label:'Pengeluaran',data:expenses,borderColor:'#f87171',backgroundColor:'rgba(248,113,113,0.08)',tension:0.4,fill:true,pointRadius:4}
  ]},options:{responsive:true,plugins:{legend:{labels:{color:tc,font:{family:"'Plus Jakarta Sans'"}}}},
    scales:{x:{grid:{color:gc},ticks:{color:tc}},y:{grid:{color:gc},ticks:{color:tc,callback:v=>'Rp '+fmt(v)}}}}});
}
