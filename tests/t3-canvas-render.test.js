// T3: PDF pages are rendered as canvas elements after loading
// Mockea PDF.js y verifica que renderPDF cree un <canvas> por cada página del PDF.

const assert = require('assert');

// Mock de PDF.js
const mockPage = {
  getViewport: ({ scale }) => ({ width: 800 * scale, height: 1100 * scale }),
  render: () => ({ promise: Promise.resolve() }),
};
const mockPdf = {
  numPages: 3,
  getPage: () => Promise.resolve(mockPage),
};
global.pdfjsLib = {
  getDocument: () => ({ promise: Promise.resolve(mockPdf) }),
};

// Mock mínimo de document
global.document = {
  createElement: (tag) => ({
    tag,
    width: 0,
    height: 0,
    getContext: () => ({}),
  }),
};

const { renderPDF } = require('../app.js');

async function run() {
  const appended = [];
  const container = { appendChild: (el) => appended.push(el) };

  await renderPDF(new ArrayBuffer(8), container, 1024);

  assert.strictEqual(appended.length, 3, 'Deben crearse 3 canvas (una por página)');
  assert.ok(
    appended.every((el) => el.tag === 'canvas'),
    'Todos los elementos agregados deben ser <canvas>'
  );

  console.log('✅ T3 passed: se crearon canvas elements para todas las páginas del PDF');
}

run().catch((err) => { console.error(err.message); process.exit(1); });

