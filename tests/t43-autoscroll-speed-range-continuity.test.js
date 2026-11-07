// T43: speed slider adjustment across full range produces continuous, strictly increasing displacement
// Con scrollTo sub-pixel, compara el delta de posición en 500ms por velocidad.
// Reinicia el scroll entre mediciones para aislar cada velocidad.

const assert = require('assert');

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

// Mide el delta de posición en exactamente 500ms a una velocidad dada.
function measureDisplacementAt(speedValue) {
  const positions = [];
  let currentCallback = null;

  global.requestAnimationFrame = (cb) => {
    currentCallback = cb;
    return 1;
  };
  global.cancelAnimationFrame = () => {};
  global.window = {
    scrollY: 0,
    scrollTo: (x, y) => { positions.push(y); },
  };

  const { toggleAutoScroll, stopAutoScroll } = require('../app.js');
  const btn = { textContent: 'Auto-scroll' };
  const speedInput = { value: String(speedValue) };
  const viewer = createMockViewer();

  toggleAutoScroll(btn, speedInput, viewer);
  currentCallback(0);     // Frame 1: inicializa timestamp (pos = 0)
  currentCallback(500);   // Frame 2: 500ms → deltaY = speedValue * 10 * 500 / 1000 = speedValue * 5 px
  stopAutoScroll();

  // El delta es la última posición registrada (partimos de scrollY=0)
  return positions.length > 0 ? positions[positions.length - 1] : 0;
}

// Velocidades representativas a través del rango [0.2, 10], con 500ms de ventana:
// - 0.2 → 1 px
// - 0.4 → 2 px
// - 1.0 → 5 px
// - 2.0 → 10 px
// - 5.0 → 25 px
// - 10.0 → 50 px
const testValues = [0.2, 0.4, 1.0, 2.0, 5.0, 10.0];
let lastTotal = -1;

for (const speed of testValues) {
  const total = measureDisplacementAt(speed);

  assert.ok(
    total > 0,
    `El desplazamiento para velocidad ${speed} debe ser estrictamente positivo (fue ${total})`
  );
  assert.ok(
    total > lastTotal,
    `El desplazamiento para velocidad ${speed} (${total} px) debe ser mayor que el anterior (${lastTotal} px)`
  );

  lastTotal = total;
}

console.log('✅ T43 passed: speed slider range is continuous and strictly increasing without dead zones');
