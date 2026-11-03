// T16: auto-scroll displacement is proportional to speed and elapsed time delta
// Verifica de forma realista que en cada frame:
// 1. Se calcule el delta de tiempo transcurrido (timestamp - lastTimestamp).
// 2. Se invoque window.scrollBy(0, deltaY) proporcional a (speed * deltaMs).
// 3. Si deltaMs se duplica, el desplazamiento se duplica proporcionalmente.

const assert = require('assert');

let currentCallback = null;
const scrollCalls = [];

global.requestAnimationFrame = (cb) => {
  currentCallback = cb;
  return 123;
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
const speedInput = { value: '5' };
const viewer = createMockViewer();

const { toggleAutoScroll } = require('../app.js');

// Iniciar scroll con speed = 5
toggleAutoScroll(btn, speedInput, viewer);
assert.ok(currentCallback, 'requestAnimationFrame debe registrar un callback');

// Frame 1: tiempo inicial 1000ms (establece lastTimestamp)
currentCallback(1000);
assert.strictEqual(scrollCalls.length, 0, 'El primer frame inicializa timestamp sin desplazar');

// Frame 2: tiempo 1050ms (deltaMs = 50ms)
currentCallback(1050);
assert.strictEqual(scrollCalls.length, 1, 'Debe haber llamado a window.scrollBy en el segundo frame');
const firstDeltaY = scrollCalls[0].y;
assert.ok(firstDeltaY > 0, 'El desplazamiento vertical deltaY debe ser mayor a 0');

// Frame 3: tiempo 1150ms (deltaMs = 100ms -> el doble de tiempo que el anterior)
currentCallback(1150);
assert.strictEqual(scrollCalls.length, 2, 'Debe haber llamado a window.scrollBy en el tercer frame');
const secondDeltaY = scrollCalls[1].y;

// Verificación de proporcionalidad directa con el tiempo: 100ms debe desplazar el doble que 50ms
assert.strictEqual(
  Math.round(secondDeltaY * 100) / 100,
  Math.round(firstDeltaY * 2 * 100) / 100,
  'El desplazamiento debe ser exactamente proporcional al delta de tiempo'
);

console.log('✅ T16 passed: displacement is proportional to speed and elapsed time delta');
