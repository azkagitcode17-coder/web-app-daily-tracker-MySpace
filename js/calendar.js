/* ============================================================
   calendar.js — Kalender Bulanan
   Berisi: render kalender, navigasi bulan, tampil jadwal per hari
   ============================================================ */

let calYear, calMonth;

function renderCalendar() {
  const now = new Date();
  if (!calYear) { calYear = now.getFullYear(); calMonth = now.getMonth(); }

  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli',
                  'Agustus','September','Oktober','November','Desember'];
  const days   = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

  $('#cal-month-label').textContent = `${months[calMonth]} ${calYear}`;

  const grid = $('#cal-grid');
  grid.innerHTML = days.map(d => `<div class="cal-day-header">${d}</div>`).join('');

  const firstDay     = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth  = new Date(calYear, calMonth + 1, 0).getDate();
  const prevDays     = new Date(calYear, calMonth, 0).getDate();

  // Hari bulan sebelumnya
  for (let i = firstDay - 1; i >= 0; i--) {
    grid.innerHTML += `<div class="cal-day other-month">${prevDays - i}</div>`;
  }

  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  // Hari bulan ini
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = dateStr === todayStr;
    const hasEvt  = allScheduleItems.some(s => s.date === dateStr);
    grid.innerHTML += `<div class="cal-day ${isToday ? 'today' : ''} ${hasEvt ? 'has-event' : ''}" data-date="${dateStr}">${d}</div>`;
  }

  // Hari bulan berikutnya
  const remaining = 42 - firstDay - daysInMonth;
  for (let d = 1; d <= remaining; d++) {
    grid.innerHTML += `<div class="cal-day other-month">${d}</div>`;
  }

  // Event listener klik tanggal
  $$('.cal-day[data-date]').forEach(el => {
    el.addEventListener('click', () => showCalendarDay(el.dataset.date));
  });
}

// ---- Tampilkan jadwal pada tanggal yang dipilih ----
function showCalendarDay(dateStr) {
  $('#cal-selected-date').textContent = dateStr;
  const items = allScheduleItems.filter(i => i.date === dateStr);
  if (!items.length) {
    $('#cal-events').innerHTML = '<div style="font-size:13px;color:var(--text-muted);">Tidak ada jadwal pada tanggal ini.</div>';
  } else {
    $('#cal-events').innerHTML = items.map(i =>
      `<div class="schedule-item ${i.done ? 'done' : ''}">
        <span>${i.time || ''}</span>
        <span style="font-weight:600;">${i.name}</span>
        <span class="badge badge-pending">${i.cat || ''}</span>
      </div>`
    ).join('');
  }
}

// ---- Navigasi bulan ----
$('#cal-prev').addEventListener('click', () => {
  calMonth--;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar();
});
$('#cal-next').addEventListener('click', () => {
  calMonth++;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar();
});
