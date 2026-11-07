// T17: changing speed slider adjusts scroll delta in real-time without restarting
// Con scrollTo sub-pixel, compara el delta de posición entre frames a distintas velocidades.

const assert = require('assert');

const scrollToCalls = [];
let currentCallback = null;

global.requestAnimationFrame = (cb) => {
  currentCallback = cb;
  return 999;
};
global.cancelAnimationFrame = () => {};

global.window = {
  scrollY: 0,
  scrollTo: (x, y) => { scrollToCalls.push({ x, y }); },
};

function createMockViewer() {
  const children = [{ tagName: 'CANVAS' }];
  return {
    children,
    querySelectorAll: (selector) => {
      const tags = selector.split(',').map((s) => s.trim().toUpperCase());
      return children.filter((c) => tags.includes(c.tagName));
    },
  };
}

const btn = { textContent: 'Auto-scroll' };
const speedInput = { value: '2' };
const viewer = createMockViewer();

const { toggleAutoScroll, getAutoScrollState } = require('../app.js');

// Iniciar auto-scroll con velocidad 2
toggleAutoScroll(btn, speedInput, viewer);

// Frame 1: inicializa timestamp
currentCallback(1000);

// Frame 2: +50ms a velocidad 2 → deltaY = 2*10*50/1000 = 1 px
currentCallback(1050);
assert.strictEqual(scrollToCalls.length, 1, 'Debe llamar scrollTo en frame 2');
const pos1 = scrollToCalls[0].y;
const deltaSpeed2 = pos1 - 0;  // 1 px

// El usuario cambia el slider a velocidad 6 (3x más rápido)
speedInput.value = '6';

// Frame 3: +50ms a velocidad 6 → deltaY = 6*10*50/1000 = 3 px
currentCallback(1100);
assert.strictEqual(scrollToCalls.length, 2, 'Debe llamar scrollTo en frame 3');
const pos2 = scrollToCalls[1].y;
const deltaSpeed6 = pos2 - pos1;  // 3 px

// Verifica que el scroll no se detuvo
assert.strictEqual(getAutoScrollState().isScrolling, true, 'El scroll debe permanecer activo');

// A velocidad 6 el delta debe ser exactamente 3x el de velocidad 2
assert.strictEqual(
  Math.round(deltaSpeed6 * 100) / 100,
  Math.round(deltaSpeed2 * 3 * 100) / 100,
  `La velocidad en frame 3 debe ser 3x: esperado ${deltaSpeed2 * 3}, recibido ${deltaSpeed6}`
);

console.log('✅ T17 passed: speed slider change updates scroll rate in real-time');
