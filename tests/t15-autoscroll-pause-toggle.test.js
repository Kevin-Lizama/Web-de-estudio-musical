// T15: clicking pause stops scrolling, restores button text, cancels animation frame
// and allows clean resumption without time-jump glitches.
// Verifica de forma realista:
// 1. Inicia auto-scroll y ejecuta frames reales de animación (lastTimestamp adquiere valor).
// 2. Al pausar: se cancela cancelAnimationFrame con el rafId activo, isScrolling pasa a false,
//    el texto vuelve a "Auto-scroll" y lastTimestamp se resetea a null.
// 3. Al reanudar después de una pausa prolongada (salto de tiempo), no ocurre un desplazamiento
//    gigante ("teletransporte") porque lastTimestamp se reinicializa correctamente.

const assert = require('assert');

let activeCallback = null;
let currentRafId = 100;
let cancelledId = null;
const scrollCalls = [];

global.requestAnimationFrame = (cb) => {
  activeCallback = cb;
  return ++currentRafId;
};

global.cancelAnimationFrame = (id) => {
  cancelledId = id;
};

global.window = {
  scrollBy: (x, y) => {
    scrollCalls.push({ x, y });
  },
};

const btn = { textContent: 'Auto-scroll' };
const speedInput = { value: '5' };
const viewer = {
  querySelectorAll: () => [{ tagName: 'CANVAS' }],
};

const { toggleAutoScroll, getAutoScrollState } = require('../app.js');

// 1. Iniciar auto-scroll
toggleAutoScroll(btn, speedInput, viewer);
assert.strictEqual(btn.textContent, 'Pausar');
assert.strictEqual(getAutoScrollState().isScrolling, true);
// Frame 1: baseline (programa nuevo frame)
activeCallback(1000); 
// Frame 2: delta 50ms (programa el frame activo actual)
activeCallback(1050); 
assert.strictEqual(scrollCalls.length, 1);
assert.strictEqual(getAutoScrollState().lastTimestamp, 1050, 'lastTimestamp debe tener el valor del último frame ejecutado');

// Guardamos el último id de frame programado que debe cancelarse al pausar
const activeFrameIdBeforePause = currentRafId;

// 2. Pausar
toggleAutoScroll(btn, speedInput, viewer);

assert.strictEqual(btn.textContent, 'Auto-scroll', 'El texto debe volver a "Auto-scroll"');
assert.strictEqual(cancelledId, activeFrameIdBeforePause, 'cancelAnimationFrame debe ser llamado con el último frame programado');
assert.strictEqual(getAutoScrollState().isScrolling, false, 'isScrolling debe ser false al pausar');
assert.strictEqual(getAutoScrollState().rafId, null, 'rafId debe ser null');
assert.strictEqual(getAutoScrollState().lastTimestamp, null, 'lastTimestamp debe ser reseteado a null al pausar');

// Si el callback anterior intentara ejecutarse tras la pausa, no debe desplazar
activeCallback(1100);
assert.strictEqual(scrollCalls.length, 1, 'Un callback ejecutado tras pausar no debe realizar scroll');

// 3. Reanudar después de 10 segundos de pausa (tiempo 11100ms)
toggleAutoScroll(btn, speedInput, viewer);
assert.strictEqual(btn.textContent, 'Pausar');
assert.strictEqual(getAutoScrollState().isScrolling, true);

// Frame 1 tras reanudar: debe tomar 11100 como nuevo baseline sin desplazar de golpe
activeCallback(11100);
assert.strictEqual(scrollCalls.length, 1, 'El primer frame tras reanudar no debe provocar un salto acumulado');

// Frame 2 tras reanudar: delta normal de 50ms (tiempo 11150ms)
activeCallback(11150);
assert.strictEqual(scrollCalls.length, 2, 'El segundo frame tras reanudar debe reanudar el desplazamiento normal');
assert.ok(scrollCalls[1].y > 0 && scrollCalls[1].y < 50, 'El desplazamiento debe corresponder a un delta de 50ms, no a los 10 segundos pausados');

console.log('✅ T15 passed: pause stops auto-scroll cleanly, resets timestamps and prevents time-jump on resume');
