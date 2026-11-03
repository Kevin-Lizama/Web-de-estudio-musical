// T14: clicking auto-scroll button starts scrolling, changes button text to "Pausar"
// and establishes continuous animation loop.
// Verifica que con partitura cargada:
// 1. toggleAutoScroll cambia el botón a "Pausar" y activa isScrolling.
// 2. Se programa el primer frame mediante requestAnimationFrame.
// 3. Al ejecutarse el callback del frame, se programa automáticamente el siguiente frame (bucle continuo).

const assert = require('assert');

let rafCalls = 0;
let lastCallback = null;

global.requestAnimationFrame = (cb) => {
  rafCalls++;
  lastCallback = cb;
  return 100 + rafCalls;
};
global.cancelAnimationFrame = () => {};

const btn = { textContent: 'Auto-scroll' };
const speedInput = { value: '5' };

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

const viewer = createMockViewer();

const { toggleAutoScroll, getAutoScrollState } = require('../app.js');

assert.strictEqual(typeof toggleAutoScroll, 'function', 'toggleAutoScroll debe ser una función');

// Iniciar auto-scroll
toggleAutoScroll(btn, speedInput, viewer);

assert.strictEqual(btn.textContent, 'Pausar', 'El texto del botón debe cambiar a "Pausar"');
assert.strictEqual(rafCalls, 1, 'Debe haber programado el primer frame con requestAnimationFrame');
assert.strictEqual(typeof lastCallback, 'function', 'requestAnimationFrame debe recibir una función de frame');
assert.strictEqual(getAutoScrollState().isScrolling, true, 'El estado isScrolling debe ser true');

// Ejecución del frame 1: debe programar el frame 2 para mantener la continuidad
const frame1Callback = lastCallback;
frame1Callback(1000);

assert.strictEqual(rafCalls, 2, 'El ciclo de animación debe solicitar recursivamente el siguiente frame');
assert.strictEqual(typeof lastCallback, 'function', 'El segundo frame debe tener un callback válido');

console.log('✅ T14 passed: auto-scroll starts, changes button text and establishes continuous loop');
