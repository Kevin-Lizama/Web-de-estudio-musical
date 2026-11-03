// T17: changing speed slider adjusts scroll delta in real-time without restarting
// Verifica con contenedor DOM dinámico que al modificar speedInput.value mientras
// el auto-scroll está activo, el siguiente frame aplica la nueva velocidad de inmediato.

const assert = require('assert');

let currentCallback = null;
const scrollCalls = [];

global.requestAnimationFrame = (cb) => {
  currentCallback = cb;
  return 999;
};
global.cancelAnimationFrame = () => {};

global.window = {
  scrollBy: (x, y) => {
    scrollCalls.push({ x, y });
  },
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

// Frame 2: tiempo 1050ms con velocidad 2 (delta = 50ms)
currentCallback(1050);
assert.strictEqual(scrollCalls.length, 1);
const deltaSpeed2 = scrollCalls[0].y;

// El usuario cambia el slider a velocidad 6 en tiempo real (3x más rápido)
speedInput.value = '6';

// Frame 3: tiempo 1100ms con velocidad 6 (mismo delta = 50ms)
currentCallback(1100);
assert.strictEqual(scrollCalls.length, 2);
const deltaSpeed6 = scrollCalls[1].y;

// Verifica que el scroll no se detuvo
assert.strictEqual(getAutoScrollState().isScrolling, true, 'El scroll debe permanecer activo');

// Verifica que el desplazamiento a velocidad 6 sea exactamente el triple que a velocidad 2 para el mismo deltaMs
assert.strictEqual(
  Math.round(deltaSpeed6 * 100) / 100,
  Math.round(deltaSpeed2 * 3 * 100) / 100,
  'La velocidad en el frame 3 debe reflejar el cambio inmediato a velocidad 6 (3x)'
);

console.log('✅ T17 passed: speed slider change updates scroll rate in real-time');
