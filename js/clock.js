/* ============================================================
   clock.js — Jam Indonesia (WIB / WITA / WIT)
   ============================================================ */

let clockInterval;

function startClock() {
  clearInterval(clockInterval);
  updateClock();
  clockInterval = setInterval(updateClock, 1000);
}

function updateClock() {
  const now       = new Date();
  const dayNames  = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const monthNames= ['Januari','Februari','Maret','April','Mei','Juni','Juli',
                     'Agustus','September','Oktober','November','Desember'];
  const zones = [
    { id: 'wib',  offset: 7 },
    { id: 'wita', offset: 8 },
    { id: 'wit',  offset: 9 }
  ];

  zones.forEach(({ id, offset }) => {
    const utc  = now.getTime() + now.getTimezoneOffset() * 60000;
    const tz   = new Date(utc + 3600000 * offset);
    const hh   = String(tz.getHours()).padStart(2, '0');
    const mm   = String(tz.getMinutes()).padStart(2, '0');
    const ss   = String(tz.getSeconds()).padStart(2, '0');
    const day  = dayNames[tz.getDay()];
    const date = tz.getDate();
    const month= monthNames[tz.getMonth()];
    const year = tz.getFullYear();

    const clockEl = document.getElementById(`clock-${id}`);
    const dateEl  = document.getElementById(`date-${id}`);
    if (clockEl) clockEl.textContent = `${hh}:${mm}:${ss}`;
    if (dateEl)  dateEl.textContent  = `${day}, ${date} ${month} ${year}`;
  });
}

// Mulai jam saat halaman load
startClock();
