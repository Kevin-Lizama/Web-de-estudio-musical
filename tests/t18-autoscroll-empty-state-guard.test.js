// T18: auto-scroll empty state guard and auto-stop when score is cleared
// Verifica con contenedor DOM dinámico:
// 1. Con 0 páginas (viewer vacío): toggleAutoScroll no inicia, no altera el botón ni programa RAF.
// 2. Al agregar una página: toggleAutoScroll inicia correctamente.
// 3. Si las páginas se eliminan durante el scroll, el loop de animación se detiene automáticamente
//    y restaura el botón a "Auto-scroll".

const assert = require('assert');

let activeCallback = null;
let currentRafId = 500;
let cancelledId = null;

global.requestAnimationFrame = (cb) => {
  activeCallback = cb;
  return ++currentRafId;
};

global.cancelAnimationFrame = (id) => {
  cancelledId = id;
};

function createMockViewer() {
  const children = [];
  return {
    children,
    appendChild: (el) => children.push(el),
    removeChild: (el) => {
      const idx = children.indexOf(el);
      if (idx !== -1) children.splice(idx, 1);
    },
    querySelectorAll: (selector) => {
      const tags = selector.split(',').map((s) => s.trim().toUpperCase());
      return children.filter((c) => tags.includes(c.tagName));
    },
  };
}

const { toggleAutoScroll, getAutoScrollState } = require('../app.js');

const viewer = createMockViewer();
const btn = { textContent: 'Auto-scroll' };
const speedInput = { value: '5' };

// 1. Caso visor vacío
assert.strictEqual(viewer.children.length, 0, 'El visor inicia sin páginas');
toggleAutoScroll(btn, speedInput, viewer);

assert.strictEqual(btn.textContent, 'Auto-scroll', 'El botón no debe cambiar a "Pausar" sin partitura');
assert.strictEqual(getAutoScrollState().isScrolling, false, 'isScrolling debe seguir false');
assert.strictEqual(activeCallback, null, 'No se debe haber programado ningún frame de animación');

// 2. Caso con partitura cargada: agregamos una página real al visor
const pageCanvas = { tagName: 'CANVAS' };
viewer.appendChild(pageCanvas);
assert.strictEqual(viewer.children.length, 1);

toggleAutoScroll(btn, speedInput, viewer);
assert.strictEqual(btn.textContent, 'Pausar', 'Con páginas presentes, el auto-scroll debe iniciar');
assert.strictEqual(getAutoScrollState().isScrolling, true);
assert.notStrictEqual(activeCallback, null);

// Frame 1: se ejecuta normalmente
activeCallback(1000);
assert.strictEqual(getAutoScrollState().isScrolling, true);

// 3. Se vacía el visor mientras el scroll está activo (ej: usuario cierra o limpia la partitura)
viewer.removeChild(pageCanvas);
assert.strictEqual(viewer.children.length, 0, 'Se eliminaron las páginas del visor');

// El siguiente frame detecta que no hay páginas y debe detener el scroll y restaurar el botón
activeCallback(1050);
assert.strictEqual(getAutoScrollState().isScrolling, false, 'Auto-scroll debe detenerse al detectar el visor vacío');
assert.strictEqual(btn.textContent, 'Auto-scroll', 'El botón debe volver a decir "Auto-scroll" al auto-detenerse');

console.log('✅ T18 passed: empty state guard prevents starting and auto-stops when score is cleared');
