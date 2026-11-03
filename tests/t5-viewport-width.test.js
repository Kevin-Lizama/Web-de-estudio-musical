// T5: each page fits the viewport width
// Verifica que canvas.width === viewportWidth independientemente del ancho original del PDF.
// Se prueba con dos anchos de página distintos para que el test no dependa de un valor fijo.

const assert = require('assert');

function makePageMock(pageWidthPts) {
  return {
    getViewport: ({ scale }) => ({ width: pageWidthPts * scale, height: pageWidthPts * 1.41 * scale }),
    render: () => ({ promise: Promise.resolve() }),
  };
}

function makeSetup(pageWidthPts) {
  global.document = {
    createElement: () => ({ width: 0, height: 0, getContext: () => ({}) }),
  };
  global.pdfjsLib = {
    getDocument: () => ({
      promise: Promise.resolve({
        numPages: 1,
        getPage: () => Promise.resolve(makePageMock(pageWidthPts)),
      }),
    }),
  };
  delete require.cache[require.resolve('../app.js')];
  return require('../app.js').renderPDF;
}

async function checkViewportWidth(pageWidthPts, viewportWidth) {
  const renderPDF = makeSetup(pageWidthPts);
  const appended = [];
  await renderPDF(new ArrayBuffer(8), { appendChild: (el) => appended.push(el) }, viewportWidth);

  const canvas = appended[0];
  assert.strictEqual(
    canvas.width,
    viewportWidth,
    `PDF de ${pageWidthPts}pt renderizado a ${canvas.width}px, debería ser ${viewportWidth}px`
  );
}

async function run() {
  // Caso 1: página A4 (595pt) → viewport 1280px
  await checkViewportWidth(595, 1280);

  // Caso 2: página carta americana (612pt) → viewport 768px (tablet)
  await checkViewportWidth(612, 768);

  console.log('✅ T5 passed: canvas.width === viewportWidth para distintos anchos de página y viewport');
}

run().catch((err) => { console.error(err.message); process.exit(1); });
