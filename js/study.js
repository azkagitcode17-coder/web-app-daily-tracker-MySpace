/* ============================================================
   study.js — Monitoring Belajar (data per user)
   Firestore path: users/{uid}/study
   ============================================================ */

let studyData = [], studyTimers = {};
const studyCol = () => firestore.collection(db, 'users', getUID(), 'study');

async function loadStudy() {
  if (!db) { studyData=JSON.parse(localStorage.getItem(lsKey('studyData'))||'[]'); renderStudy(); return; }
  try {
    const snap=await firestore.getDocs(firestore.query(studyCol(),firestore.orderBy('createdAt','desc')));
    studyData=snap.docs.map(d=>({id:d.id,...d.data()}));
    localStorage.setItem(lsKey('studyData'),JSON.stringify(studyData)); renderStudy();
  } catch(e) { studyData=JSON.parse(localStorage.getItem(lsKey('studyData'))||'[]'); renderStudy(); }
}

function renderStudy() {
  const list=$('#study-list');
  if (!studyData.length) {
    list.innerHTML=`<div style="text-align:center;color:var(--text-muted);padding:40px;font-size:13px;">
      <i class="bi bi-book" style="font-size:32px;display:block;margin-bottom:8px;"></i>Belum ada sesi belajar</div>`;
  } else {
    list.innerHTML=studyData.map(s=>{
      const progress=s.status==='done'?100:s.status==='fail'?0:(s.elapsed?Math.min(100,Math.round((s.elapsed/(s.duration*60))*100)):0);
      const statusBadge=s.status==='done'
        ?`<span class="badge" style="background:rgba(52,211,153,0.15);color:var(--success)"><i class="bi bi-check-circle-fill"></i> Berhasil</span>`
        :s.status==='fail'
        ?`<span class="badge" style="background:rgba(248,113,113,0.15);color:var(--danger)"><i class="bi bi-x-circle-fill"></i> Gagal</span>`
        :`<span class="badge badge-pending"><i class="bi bi-hourglass-split"></i> Berjalan</span>`;
      const elapsed=studyTimers[s.id]?.elapsed||s.elapsed||0;
      const remaining=Math.max(0,s.duration*60-elapsed);
      const remStr=`${Math.floor(remaining/60).toString().padStart(2,'0')}:${(remaining%60).toString().padStart(2,'0')}`;
      const barColor=s.status==='done'?'var(--success)':s.status==='fail'?'var(--danger)':'linear-gradient(90deg,var(--accent),var(--accent-2))';
      return `<div class="study-item" data-id="${s.id}">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <div style="font-weight:700;font-size:15px;">${s.name}</div>
          <div style="display:flex;align-items:center;gap:6px;">${statusBadge}
            <button class="btn btn-danger btn-sm del-study" data-id="${s.id}"><i class="bi bi-trash"></i></button>
          </div>
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">Target: ${s.duration} menit · Sisa: <span id="timer-${s.id}">${s.status?(s.status==='done'?'Selesai':'Gagal'):remStr}</span></div>
        <div class="progress-bar-wrap" style="margin-bottom:10px;"><div class="progress-bar-fill" style="width:${progress}%;background:${barColor}"></div></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${!s.status?`<button class="btn btn-primary btn-sm start-study" data-id="${s.id}"><i class="bi bi-play-fill"></i> Mulai</button>
          <button class="btn btn-success btn-sm mark-done" data-id="${s.id}"><i class="bi bi-check-lg"></i> Berhasil</button>
          <button class="btn btn-danger btn-sm mark-fail" data-id="${s.id}"><i class="bi bi-x-lg"></i> Gagal</button>`:''}
        </div></div>`;
    }).join('');
    studyData.forEach(s=>{ if (!s.status&&studyTimers[s.id]) startStudyTimer(s.id); });
  }
  const doneCount=studyData.filter(s=>s.status==='done').length;
  const failCount=studyData.filter(s=>s.status==='fail').length;
  const sd=$('#study-stat-done'), sf=$('#study-stat-fail');
  if(sd) sd.textContent=doneCount; if(sf) sf.textContent=failCount;
}

jQuery(document).on('click','.start-study',function(){
  const id=jQuery(this).data('id'); if(studyTimers[id]) return;
  startStudyTimer(id); showToast('Timer dimulai!','success');
});

function startStudyTimer(id) {
  const s=studyData.find(x=>x.id===id); if(!s) return;
  const totalSec=s.duration*60;
  if(!studyTimers[id]) studyTimers[id]={elapsed:s.elapsed||0,interval:null};
  clearInterval(studyTimers[id].interval);
  studyTimers[id].interval=setInterval(()=>{
    studyTimers[id].elapsed++;
    const remaining=Math.max(0,totalSec-studyTimers[id].elapsed);
    const el=$(`#timer-${id}`), bar=document.querySelector(`[data-id="${id}"] .progress-bar-fill`);
    if(el) el.textContent=`${Math.floor(remaining/60).toString().padStart(2,'0')}:${(remaining%60).toString().padStart(2,'0')}`;
    if(bar) bar.style.width=Math.min(100,Math.round((studyTimers[id].elapsed/totalSec)*100))+'%';
    if(remaining<=0){ clearInterval(studyTimers[id].interval); markStudy(id,'done'); showToast('Waktu belajar selesai! 🎉','success'); }
  },1000);
}

jQuery(document).on('click','.mark-done',async function(){await markStudy(jQuery(this).data('id'),'done');});
jQuery(document).on('click','.mark-fail',async function(){await markStudy(jQuery(this).data('id'),'fail');});

async function markStudy(id,status) {
  const idx=studyData.findIndex(x=>x.id===id); if(idx<0) return;
  if(studyTimers[id]) clearInterval(studyTimers[id].interval);
  studyData[idx].status=status; studyData[idx].elapsed=studyTimers[id]?.elapsed||0;
  if(db){try{await firestore.updateDoc(firestore.doc(db,'users',getUID(),'study',id),{status,elapsed:studyData[idx].elapsed});}catch(e){}}
  localStorage.setItem(lsKey('studyData'),JSON.stringify(studyData));
  renderStudy(); updateDashboard();
  showToast(status==='done'?'Sesi belajar berhasil! 🎉':'Dicatat sebagai gagal',status==='done'?'success':'error');
}

jQuery(document).on('click','.del-study',async function(){
  const id=jQuery(this).data('id'); if(studyTimers[id]) clearInterval(studyTimers[id].interval);
  if(db){try{await firestore.deleteDoc(firestore.doc(db,'users',getUID(),'study',id));}catch(e){}}
  studyData=studyData.filter(s=>s.id!==id); delete studyTimers[id];
  localStorage.setItem(lsKey('studyData'),JSON.stringify(studyData)); renderStudy();
});

$('#study-add-btn').addEventListener('click',async()=>{
  const name=$('#study-name').value.trim(), duration=parseInt($('#study-duration').value);
  if(!name) return showToast('Isi nama pelajaran!','error');
  const item={name,duration,status:null,elapsed:0,date:today(),createdAt:Date.now()};
  if(db){try{const ref=await firestore.addDoc(studyCol(),item);item.id=ref.id;}catch(e){item.id=Date.now().toString();}}
  else{item.id=Date.now().toString();}
  studyData.unshift(item); localStorage.setItem(lsKey('studyData'),JSON.stringify(studyData));
  $('#study-name').value=''; renderStudy(); showToast('Sesi belajar ditambahkan!','success');
});
