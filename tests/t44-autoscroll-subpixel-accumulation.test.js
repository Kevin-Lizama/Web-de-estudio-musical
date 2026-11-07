// T44: sub-pixel smooth scrolling calls scrollTo every frame with exact float positions
// Con la implementación de scrollTo+float, cada frame produce una llamada a scrollTo
// con la posición exacta acumulada, incluyendo fracciones de píxel.
// Esto garantiza movimiento visualmente fluido a velocidades lentas.

const assert = require('assert');

let currentCallback = null;
const scrollToCalls = [];

global.requestAnimationFrame = (cb) => {
  currentCallback = cb;
  return 55;
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

// Simular 50 frames de 16ms (≈ 800ms a 60fps)
// deltaY por frame = 0.2 * 10 * 16 / 1000 = 0.032 px (sub-pixel)
// Con scrollTo cada frame, deben producirse 50 llamadas a scrollTo (una por frame)
let t = 0;
for (let i = 0; i < 50; i++) {
  t += 16;
  currentCallback(t);
}

// scrollTo debe llamarse en CADA frame (movimiento fluido)
assert.strictEqual(
  scrollToCalls.length,
  50,
  `scrollTo debe llamarse cada frame: esperado 50 llamadas, recibidas ${scrollToCalls.length}`
);

// Las posiciones deben ser estrictamente crecientes (cada frame avanza la posición)
for (let i = 1; i < scrollToCalls.length; i++) {
  assert.ok(
    scrollToCalls[i].y > scrollToCalls[i - 1].y,
    `Frame ${i + 1}: posición ${scrollToCalls[i].y} debe ser mayor que frame anterior ${scrollToCalls[i - 1].y}`
  );
}

// La posición final debe ser aproximadamente 50 * 0.032 = 1.6 px
const finalPosition = scrollToCalls[scrollToCalls.length - 1].y;
assert.ok(
  Math.abs(finalPosition - 1.6) < 0.01,
  `Posición final debe ser ≈ 1.6 px, fue ${finalPosition}`
);

stopAutoScroll();

console.log('✅ T44 passed: sub-pixel smooth scrolling calls scrollTo every frame with exact float positions');
