// T16: auto-scroll displacement is proportional to speed and elapsed time delta
// Con scrollTo sub-pixel, cada frame recibe la posición acumulada exacta.
// Verifica que el delta de posición entre frames sea proporcional a deltaMs.
// Usamos deltas de 100ms y 200ms a speed=5 → 5px y 10px respectivamente.

const assert = require('assert');

const scrollToCalls = [];
let currentCallback = null;

global.requestAnimationFrame = (cb) => {
  currentCallback = cb;
  return 123;
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
const speedInput = { value: '5' };
const viewer = createMockViewer();

const { toggleAutoScroll } = require('../app.js');

// speed=5, SPEED_FACTOR=10 → 50 px/s
toggleAutoScroll(btn, speedInput, viewer);
assert.ok(currentCallback, 'requestAnimationFrame debe registrar un callback');

// Frame 1: inicializa timestamp (no hay scroll todavía)
currentCallback(0);
assert.strictEqual(scrollToCalls.length, 0, 'El primer frame inicializa timestamp sin desplazar');

// Frame 2: +100ms → deltaY = 5*10*100/1000 = 5 px → scrollTo(0, 5)
currentCallback(100);
assert.strictEqual(scrollToCalls.length, 1, 'Debe llamar a scrollTo en el segundo frame');
const pos1 = scrollToCalls[0].y;
assert.ok(pos1 > 0, 'La posición debe ser mayor a 0');

// Frame 3: +200ms → deltaY = 5*10*200/1000 = 10 px → scrollTo(0, 15)
currentCallback(300);
assert.strictEqual(scrollToCalls.length, 2, 'Debe llamar a scrollTo en el tercer frame');
const pos2 = scrollToCalls[1].y;

// El delta de posición del frame 3 debe ser el doble que el del frame 2
const delta1 = pos1 - 0;         // 5 px
const delta2 = pos2 - pos1;      // 10 px

assert.strictEqual(
  Math.round(delta2 * 100) / 100,
  Math.round(delta1 * 2 * 100) / 100,
  `El desplazamiento debe ser proporcional al tiempo: ${delta1 * 2} esperado, recibido ${delta2}`
);

console.log('✅ T16 passed: displacement is proportional to speed and elapsed time delta');
