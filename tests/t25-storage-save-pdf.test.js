// T25: storage save PDF
// Verifica que al abrir un archivo PDF mediante handleFileOpen:
// 1. Se procese un objeto File estándar.
// 2. Se guarde en el almacenamiento persistente con su nombre, tipo 'pdf', contenido intacto (ArrayBuffer) y updatedAt.
// 3. Aunque el renderizador de PDF transfiera/desasocie el buffer que recibe (como hace el worker de PDF.js),
//    el buffer persistido en storage permanezca intacto y con sus bytes íntegros.

const assert = require('assert');

// Mock mínimo de DOM para visor
global.document = {
  createElement: () => ({
    getContext: () => ({}),
  }),
};

// Simulamos PDF.js con comportamiento fiel de Web Worker (transfiere y desasocia el buffer que recibe)
global.pdfjsLib = {
  getDocument: ({ data }) => {
    assert.ok(data instanceof ArrayBuffer, 'PDF.js debe recibir un ArrayBuffer');
    assert.strictEqual(data.byteLength, 4, 'PDF.js debe recibir el buffer con sus 4 bytes');

    // Desasociamos el buffer recibido (como hace el worker real via postMessage)
    if (typeof data.transfer === 'function') {
      data.transfer();
    }

    return {
      promise: Promise.resolve({
        numPages: 1,
        getPage: () => Promise.resolve({
          getViewport: () => ({ width: 100, height: 100 }),
          render: () => ({ promise: Promise.resolve() }),
        }),
      }),
    };
  },
};

const storage = require('../storage.js');
const { handleFileOpen } = require('../app.js');

async function testSavePdf() {
  await storage.clear();

  const viewer = {
    children: [],
    appendChild(el) { this.children.push(el); },
    querySelectorAll: () => [],
  };
  const emptyState = { hidden: false };

  // Usamos el constructor nativo File de la Web API
  const originalBytes = new Uint8Array([100, 101, 102, 103]);
  const pdfFile = new File([originalBytes], 'sonata-klarinette.pdf', { type: 'application/pdf' });

  await handleFileOpen(pdfFile, viewer, emptyState);

  // Verificamos que se haya guardado en el almacén
  const lastScore = await storage.getLastActiveScore();
  assert.ok(lastScore, 'Debe existir una última partitura activa en storage');
  assert.strictEqual(lastScore.name, 'sonata-klarinette.pdf', 'El nombre guardado debe coincidir');
  assert.strictEqual(lastScore.type, 'pdf', 'El tipo guardado debe ser "pdf"');
  assert.ok(lastScore.data instanceof ArrayBuffer, 'El contenido debe guardarse como ArrayBuffer');
  assert.strictEqual(lastScore.data.byteLength, 4, 'El buffer persistido debe conservar sus 4 bytes intactos');

  const savedBytes = new Uint8Array(lastScore.data);
  assert.deepStrictEqual(Array.from(savedBytes), [100, 101, 102, 103], 'Los bytes persistidos deben ser idénticos al original');
  assert.ok(typeof lastScore.updatedAt === 'number', 'Debe tener una marca de tiempo updatedAt');

  console.log('✅ T25 passed: opening a PDF saves it in persistent storage as last active with intact buffer');
}

testSavePdf().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
