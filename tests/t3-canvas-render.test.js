// T3: PDF pages are rendered as canvas elements after loading
// Verifica que renderPDF llame a createElement('canvas') una vez por página
// y que cada elemento resultante sea agregado al container.

const assert = require('assert');

// — Mocks necesarios (Node no tiene DOM ni PDF.js) —
const createdTags = [];  // registra qué tags se pidieron

const mockPage = {
  getViewport: ({ scale }) => ({ width: 595 * scale, height: 842 * scale }), // A4 en pts
  render: () => ({ promise: Promise.resolve() }),
};
const mockPdf = {
  numPages: 3,
  getPage: () => Promise.resolve(mockPage),
};
global.pdfjsLib = {
  getDocument: () => ({ promise: Promise.resolve(mockPdf) }),
};
global.document = {
  createElement: (tag) => {
    createdTags.push(tag);          // registra el tag pedido
    return { width: 0, height: 0, getContext: () => ({}) };
  },
};

const { renderPDF } = require('../app.js');

async function run() {
  const appended = [];
  const container = { appendChild: (el) => appended.push(el) };

  await renderPDF(new ArrayBuffer(8), container, 1024);

  // 1. Se llamó createElement exactamente 3 veces (una por página)
  assert.strictEqual(createdTags.length, 3, 'Debe llamarse createElement una vez por página');

  // 2. Siempre se pidió 'canvas', nunca 'div', 'img' u otro
  assert.ok(
    createdTags.every((tag) => tag === 'canvas'),
    `createElement debe recibir 'canvas' siempre, recibió: ${JSON.stringify(createdTags)}`
  );

  // 3. Los 3 elementos creados se agregaron al container
  assert.strictEqual(appended.length, 3, 'Los 3 canvas deben agregarse al container');

  console.log('✅ T3 passed: se crearon 3 canvas (uno por página) y se agregaron al container');
}

run().catch((err) => { console.error(err.message); process.exit(1); });
