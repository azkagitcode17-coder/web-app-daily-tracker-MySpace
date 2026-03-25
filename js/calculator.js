/* ============================================================
   calculator.js — Kalkulator
   Berisi: logika operasi kalkulator lengkap
   ============================================================ */

let calcState = {
  display: '0',
  expr:    '',
  op:      null,
  prev:    null,
  newNum:  true
};

function updateCalcDisplay() {
  $('#calc-result').textContent = calcState.display;
  $('#calc-expr').textContent   = calcState.expr;
}

$$('.calc-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action;

    if (action === 'num') {
      const n = btn.dataset.num;
      if (calcState.newNum) {
        calcState.display = n;
        calcState.newNum  = false;
      } else {
        calcState.display = calcState.display === '0' ? n : calcState.display + n;
      }

    } else if (action === 'dot') {
      if (!calcState.display.includes('.')) calcState.display += '.';
      calcState.newNum = false;

    } else if (action === 'clear') {
      calcState = { display: '0', expr: '', op: null, prev: null, newNum: true };

    } else if (action === 'sign') {
      calcState.display = String(-parseFloat(calcState.display));

    } else if (action === 'percent') {
      calcState.display = String(parseFloat(calcState.display) / 100);

    } else if (action === 'op') {
      const op = btn.dataset.op;
      calcState.prev   = parseFloat(calcState.display);
      calcState.op     = op;
      const opDisplay  = { '+': '+', '-': '−', '*': '×', '/': '÷' }[op];
      calcState.expr   = `${calcState.prev} ${opDisplay}`;
      calcState.newNum = true;

    } else if (action === 'equals') {
      if (calcState.op && calcState.prev !== null) {
        const curr = parseFloat(calcState.display);
        let res;
        if      (calcState.op === '+') res = calcState.prev + curr;
        else if (calcState.op === '-') res = calcState.prev - curr;
        else if (calcState.op === '*') res = calcState.prev * curr;
        else if (calcState.op === '/') res = curr !== 0 ? calcState.prev / curr : 'Error';
        calcState.expr    = `${calcState.expr} ${curr} =`;
        calcState.display = String(parseFloat(res.toFixed(10)));
        calcState.op      = null;
        calcState.prev    = null;
        calcState.newNum  = true;
      }
    }

    updateCalcDisplay();
  });
});
