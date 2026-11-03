// T5: each page fits the viewport width
// Verifica que cada canvas tenga width === viewportWidth tras renderPDF.

const assert = require('assert');

const VIEWPORT_WIDTH = 1280;

const mockPage = {
  getViewport: ({ scale }) => ({ width: 800 * scale, height: 1100 * scale }),
  render: () => ({ promise: Promise.resolve() }),
};
const mockPdf = {
  numPages: 2,
  getPage: () => Promise.resolve(mockPage),
};
global.pdfjsLib = {
  getDocument: () => ({ promise: Promise.resolve(mockPdf) }),
};
global.document = {
  createElement: (tag) => ({
    tag,
    width: 0,
    height: 0,
    getContext: () => ({}),
  }),
};

// Limpiar caché para obtener módulo fresco con los globals actuales
delete require.cache[require.resolve('../app.js')];
const { renderPDF } = require('../app.js');

async function run() {
  const appended = [];
  const container = { appendChild: (el) => appended.push(el) };

  await renderPDF(new ArrayBuffer(8), container, VIEWPORT_WIDTH);

  assert.ok(appended.length > 0, 'Debe haber al menos un canvas');
  appended.forEach((canvas, i) => {
    assert.strictEqual(
      canvas.width,
      VIEWPORT_WIDTH,
      `La página ${i + 1} debe tener width === ${VIEWPORT_WIDTH}, tiene ${canvas.width}`
    );
  });

  console.log(`✅ T5 passed: todas las páginas tienen width === ${VIEWPORT_WIDTH}px (viewport width)`);
}

run().catch((err) => { console.error(err.message); process.exit(1); });

