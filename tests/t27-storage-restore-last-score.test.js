// T27: restore last score on startup
// Verifica que al llamar a restoreLastScore:
// 1. Si no hay partitura guardada, emptyState permanece visible y no se altera el visor.
// 2. Si hay una partitura PDF guardada como activa, se renderizan sus páginas (canvas) y se oculta emptyState.
// 3. Si hay una partitura de imágenes guardada como activa, se crean y agregan los <img> correspondientes y se oculta emptyState.
// 4. Todo usa Blob y URLs de objeto nativos sin mocks de clases estándar.

const assert = require('assert');

global.document = {
  createElement: (tag) => ({
    tagName: tag.toUpperCase(),
    src: '',
    width: 0,
    height: 0,
    getContext: () => ({}),
  }),
};

// Simulamos renderizado de PDF
global.pdfjsLib = {
  getDocument: ({ data }) => {
    assert.ok(data instanceof ArrayBuffer, 'Debe recibir ArrayBuffer');
    return {
      promise: Promise.resolve({
        numPages: 2,
        getPage: () => Promise.resolve({
          getViewport: () => ({ width: 100, height: 100 }),
          render: () => ({ promise: Promise.resolve() }),
        }),
      }),
    };
  },
};

const storage = require('../storage.js');
const { restoreLastScore } = require('../app.js');

async function testRestoreNoScore() {
  await storage.clear();
  const viewer = { children: [], appendChild(el) { this.children.push(el); } };
  const emptyState = { hidden: false };

  const restored = await restoreLastScore(viewer, emptyState, 1024, storage);
  assert.strictEqual(restored, null, 'No debe restaurar nada si no hay última partitura activa');
  assert.strictEqual(emptyState.hidden, false, 'empty-state debe permanecer visible');
  assert.strictEqual(viewer.children.length, 0, 'El visor debe permanecer vacío');
}

async function testRestorePdf() {
  await storage.clear();
  const fakePdfBuffer = new Uint8Array([1, 2, 3]).buffer;
  await storage.saveScore({
    id: 'concierto.pdf',
    name: 'concierto.pdf',
    type: 'pdf',
    data: fakePdfBuffer,
  });

  const viewer = { children: [], appendChild(el) { this.children.push(el); } };
  const emptyState = { hidden: false };

  const restored = await restoreLastScore(viewer, emptyState, 800, storage);
  assert.ok(restored, 'Debe retornar la partitura restaurada');
  assert.strictEqual(restored.name, 'concierto.pdf');
  assert.strictEqual(emptyState.hidden, true, 'empty-state debe quedar oculto');
  assert.strictEqual(viewer.children.length, 2, 'Debe haber renderizado las 2 páginas de PDF');
  assert.strictEqual(viewer.children[0].tagName, 'CANVAS');
}

async function testRestoreImages() {
  await storage.clear();
  const imgBuf1 = new Uint8Array([11, 22]).buffer;
  const imgBuf2 = new Uint8Array([33, 44]).buffer;

  await storage.saveScore({
    id: 'estudio-op10.png',
    name: 'estudio-op10.png',
    type: 'images',
    data: [
      { name: 'estudio-op10-p1.png', type: 'image/png', buffer: imgBuf1 },
      { name: 'estudio-op10-p2.png', type: 'image/png', buffer: imgBuf2 },
    ],
  });

  const viewer = { children: [], appendChild(el) { this.children.push(el); } };
  const emptyState = { hidden: false };

  const restored = await restoreLastScore(viewer, emptyState, 800, storage);
  assert.ok(restored, 'Debe retornar la partitura restaurada');
  assert.strictEqual(emptyState.hidden, true, 'empty-state debe quedar oculto');
  assert.strictEqual(viewer.children.length, 2, 'Debe haber insertado los 2 elementos img');
  assert.strictEqual(viewer.children[0].tagName, 'IMG');
  assert.strictEqual(viewer.children[1].tagName, 'IMG');
  assert.ok(viewer.children[0].src.startsWith('blob:'), 'Debe crear un blob URL válido');
}

async function run() {
  await testRestoreNoScore();
  await testRestorePdf();
  await testRestoreImages();
  console.log('✅ T27 passed: restoreLastScore retrieves and renders last active score on startup');
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
