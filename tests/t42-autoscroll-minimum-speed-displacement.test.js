// T42: auto-scroll at minimum speed scrolls to the correct sub-pixel position
// Con scrollTo sub-pixel, speed=0.2 en un frame de 500ms produce exactamente 1.0 px.
// Verifica que scrollTo reciba el valor correcto sin truncamiento.

const assert = require('assert');

let currentCallback = null;
const scrollToCalls = [];

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
const speedInput = { value: '0.2' };
const viewer = createMockViewer();

const { toggleAutoScroll, stopAutoScroll } = require('../app.js');

toggleAutoScroll(btn, speedInput, viewer);

// Frame 1: inicializa timestamp
currentCallback(0);
assert.strictEqual(scrollToCalls.length, 0, 'Primer frame inicializa timestamp sin desplazar');

// Frame 2: 500ms → deltaY = 0.2 * 10 * 500 / 1000 = 1.0 px
currentCallback(500);
assert.strictEqual(scrollToCalls.length, 1, 'Debe llamar scrollTo en el segundo frame');

const position = scrollToCalls[0].y;
const expectedPosition = 1.0; // (0.2 * 10 * 500) / 1000

assert.strictEqual(
  Math.round(position * 1000) / 1000,
  expectedPosition,
  `scrollTo debe recibir posición ${expectedPosition}, pero recibió ${position} (posible truncamiento)`
);

stopAutoScroll();

console.log('✅ T42 passed: displacement at minimum speed matches slower rate without clamping to 1');
