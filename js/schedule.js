/* ============================================================
   schedule.js — Jadwal Harian (data per user)
   Firestore path: users/{uid}/schedule & users/{uid}/holidays
   ============================================================ */

let scheduleData=[], allScheduleItems=[], holidayData={}, donutChart;
const scheduleCol = () => firestore.collection(db,'users',getUID(),'schedule');
const holidayDoc  = (d) => firestore.doc(db,'users',getUID(),'holidays',d);
const holidayCol  = () => firestore.collection(db,'users',getUID(),'holidays');

function renderToday() {
  const d=new Date();
  const days=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const months=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  $('#today-date-label').textContent=`${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  checkHoliday();
}

async function loadSchedule() {
  const todayStr=today();
  if(!db){
    allScheduleItems=JSON.parse(localStorage.getItem(lsKey('scheduleData'))||'[]');
    holidayData=JSON.parse(localStorage.getItem(lsKey('holidayData'))||'{}');
    scheduleData=allScheduleItems.filter(s=>s.date===todayStr);
    renderScheduleList(); checkHoliday(); return;
  }
  try {
    const snap=await firestore.getDocs(firestore.query(scheduleCol(),firestore.orderBy('time','asc')));
    allScheduleItems=snap.docs.map(d=>({id:d.id,...d.data()}));
    scheduleData=allScheduleItems.filter(s=>s.date===todayStr);
    localStorage.setItem(lsKey('scheduleData'),JSON.stringify(allScheduleItems));
    renderScheduleList();
  } catch(e){
    allScheduleItems=JSON.parse(localStorage.getItem(lsKey('scheduleData'))||'[]');
    scheduleData=allScheduleItems.filter(s=>s.date===todayStr); renderScheduleList();
  }
  try {
    const snap=await firestore.getDocs(holidayCol());
    snap.docs.forEach(d=>{holidayData[d.id]=d.data();});
    localStorage.setItem(lsKey('holidayData'),JSON.stringify(holidayData));
  } catch(e){ holidayData=JSON.parse(localStorage.getItem(lsKey('holidayData'))||'{}'); }
  checkHoliday();
}

function renderScheduleList() {
  const list=$('#schedule-list');
  if(!scheduleData.length){
    list.innerHTML=`<div style="text-align:center;color:var(--text-muted);padding:40px;font-size:13px;">
      <i class="bi bi-calendar-check" style="font-size:32px;display:block;margin-bottom:8px;"></i>Belum ada jadwal hari ini</div>`;
  } else {
    list.innerHTML=scheduleData.map(s=>
      `<div class="schedule-item ${s.done?'done':''}" data-id="${s.id}">
        <input type="checkbox" ${s.done?'checked':''} class="sch-check" data-id="${s.id}"
          style="width:16px;height:16px;accent-color:var(--accent);cursor:pointer;flex-shrink:0;"/>
        <div style="flex:1;">
          <div style="font-weight:600;font-size:14px;" class="item-label">${s.name}</div>
          <div style="font-size:11px;color:var(--text-muted);">${s.time||''} · ${s.cat||''}</div>
        </div>
        <button class="btn btn-danger btn-sm del-schedule" data-id="${s.id}"><i class="bi bi-trash"></i></button>
      </div>`
    ).join('');
  }
  updateDonut(); updateDashboard();
}

function updateDonut() {
  const total=scheduleData.length, done=scheduleData.filter(s=>s.done).length;
  const pct=total?Math.round((done/total)*100):0;
  $('#schedule-pct').textContent=pct+'%';
  if(donutChart) donutChart.destroy();
  const isDark=document.documentElement.getAttribute('data-theme')==='dark';
  const ctx=document.getElementById('schedule-donut'); if(!ctx) return;
  donutChart=new Chart(ctx,{type:'doughnut',data:{datasets:[{
    data:total?[done,total-done]:[0,1],
    backgroundColor:['#6c8fff',isDark?'#1c2030':'#f0f2f8'],
    borderWidth:0,hoverOffset:0
  }]},options:{cutout:'70%',plugins:{legend:{display:false},tooltip:{enabled:false}},animation:{duration:600}}});
}

jQuery(document).on('change','.sch-check',async function(){
  const id=jQuery(this).data('id'), done=jQuery(this).is(':checked');
  const idx=scheduleData.findIndex(s=>s.id===id); if(idx<0) return;
  scheduleData[idx].done=done;
  const allIdx=allScheduleItems.findIndex(s=>s.id===id);
  if(allIdx>=0) allScheduleItems[allIdx].done=done;
  if(db){try{await firestore.updateDoc(firestore.doc(db,'users',getUID(),'schedule',id),{done});}catch(e){}}
  localStorage.setItem(lsKey('scheduleData'),JSON.stringify(allScheduleItems)); renderScheduleList();
});

jQuery(document).on('click','.del-schedule',async function(){
  const id=jQuery(this).data('id');
  if(db){try{await firestore.deleteDoc(firestore.doc(db,'users',getUID(),'schedule',id));}catch(e){}}
  scheduleData=scheduleData.filter(s=>s.id!==id); allScheduleItems=allScheduleItems.filter(s=>s.id!==id);
  localStorage.setItem(lsKey('scheduleData'),JSON.stringify(allScheduleItems)); renderScheduleList();
});

$('#add-schedule-btn').addEventListener('click',()=>$('#modal-schedule').classList.add('open'));
$('#close-modal-schedule').addEventListener('click',()=>$('#modal-schedule').classList.remove('open'));
$('#modal-schedule').addEventListener('click',e=>{if(e.target===$('#modal-schedule'))$('#modal-schedule').classList.remove('open');});

const _now=new Date();
$('#sch-time').value=`${String(_now.getHours()).padStart(2,'0')}:${String(_now.getMinutes()).padStart(2,'0')}`;

$('#sch-save-btn').addEventListener('click',async()=>{
  const name=$('#sch-name').value.trim(), time=$('#sch-time').value, cat=$('#sch-cat').value;
  if(!name) return showToast('Isi nama kegiatan!','error');
  const item={name,time,cat,done:false,date:today(),createdAt:Date.now()};
  if(db){try{const ref=await firestore.addDoc(scheduleCol(),item);item.id=ref.id;}catch(e){item.id=Date.now().toString();}}
  else{item.id=Date.now().toString();}
  scheduleData.push(item); scheduleData.sort((a,b)=>(a.time||'').localeCompare(b.time||''));
  allScheduleItems.push(item); localStorage.setItem(lsKey('scheduleData'),JSON.stringify(allScheduleItems));
  $('#sch-name').value=''; renderScheduleList(); $('#modal-schedule').classList.remove('open');
  showToast('Jadwal ditambahkan!','success');
});

function checkHoliday() {
  const t=today(), banner=$('#holiday-banner');
  if(holidayData[t]){ banner.style.display='flex'; $('#holiday-text').textContent=`Hari ini: ${holidayData[t].note||'Hari libur / acara penting!'}`; }
  else { banner.style.display='none'; }
}

$('#mark-holiday-btn').addEventListener('click',async()=>{
  const note=prompt('Keterangan hari libur / acara penting (opsional):')||'Hari libur';
  const t=today(); holidayData[t]={note};
  if(db){try{await firestore.setDoc(holidayDoc(t),{note});}catch(e){}}
  localStorage.setItem(lsKey('holidayData'),JSON.stringify(holidayData)); checkHoliday(); showToast('Hari libur ditandai!','success');
});
$('#unmark-holiday-btn').addEventListener('click',async()=>{
  const t=today(); delete holidayData[t];
  if(db){try{await firestore.deleteDoc(holidayDoc(t));}catch(e){}}
  localStorage.setItem(lsKey('holidayData'),JSON.stringify(holidayData)); checkHoliday(); showToast('Tanda libur dihapus','info');
});
