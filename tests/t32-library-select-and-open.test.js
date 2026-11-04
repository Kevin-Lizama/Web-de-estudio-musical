// T32: selecting a score from library opens and renders it, updates last active, and closes dialog
// Verifica que al seleccionar y abrir una partitura por su ID:
// 1. Detiene auto-scroll si estaba en ejecución.
// 2. Limpia el visor (eliminando elementos previos con .remove() y revocando URLs de objeto blob).
// 3. Renderiza fielmente la partitura (tanto PDF con <canvas> como imágenes con <img>).
// 4. Oculta el empty-state.
// 5. Actualiza la partitura activa y su marca temporal en el almacenamiento persistente.
// 6. Cierra el diálogo modal invocando close().
// 7. Retorna null y no altera el visor si el ID solicitado no existe.

const assert = require('assert');

global.requestAnimationFrame = (cb) => 1;
global.cancelAnimationFrame = () => {};

const storage = require('../storage.js');
const { openScoreById, toggleAutoScroll, getAutoScrollState } = require('../app.js');

const revokedUrls = [];
global.URL = {
  createObjectURL: (blob) => 'blob:mock-' + Math.random().toString(36).substring(2),
  revokeObjectURL: (url) => {
    revokedUrls.push(url);
  },
};

global.Blob = class MockBlob {
  constructor(parts, options = {}) {
    this.parts = parts;
    this.type = options.type || '';
  }
};

function createMockViewer() {
  const children = [];
  return {
    children,
    appendChild(element) {
      children.push(element);
      element.parentContainer = this;
    },
    querySelectorAll(selector) {
      const requestedTags = selector
        .split(',')
        .map((s) => s.trim().toUpperCase());
      return children.filter((child) => requestedTags.includes(child.tagName));
    },
  };
}

function createMockElement(tagName) {
  return {
    tagName: tagName.toUpperCase(),
    src: '',
    width: 0,
    height: 0,
    parentContainer: null,
    getContext: () => ({}),
    remove() {
      if (this.parentContainer) {
        const index = this.parentContainer.children.indexOf(this);
        if (index !== -1) {
          this.parentContainer.children.splice(index, 1);
        }
      }
    },
  };
}

global.document = {
  createElement: (tag) => createMockElement(tag),
};

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

async function testSelectAndOpenPdfScore() {
  await storage.clear();
  revokedUrls.length = 0;

  await storage.saveScore({
    id: 'sonata.pdf',
    name: 'sonata.pdf',
    type: 'pdf',
    data: new Uint8Array([1, 2, 3]).buffer,
  });

  await storage.saveScore({
    id: 'vals.png',
    name: 'vals.png',
    type: 'images',
    data: [
      { name: 'vals-p1.png', type: 'image/png', buffer: new Uint8Array([10, 20]).buffer },
    ],
  });

  // vals.png es inicialmente la última activa
  let lastActive = await storage.getLastActiveScore();
  assert.strictEqual(lastActive.id, 'vals.png');

  // Preparamos visor con una imagen previa con blob URL
  const viewer = createMockViewer();
  const prevImg = createMockElement('IMG');
  prevImg.src = 'blob:score-previa';
  viewer.appendChild(prevImg);

  assert.strictEqual(viewer.children.length, 1);

  // Activamos auto-scroll para comprobar que openScoreById lo detiene
  const fakeBtn = { textContent: 'Auto-scroll' };
  const fakeSpeedInput = { value: '3' };
  toggleAutoScroll(fakeBtn, fakeSpeedInput, viewer);
  assert.strictEqual(getAutoScrollState().isScrolling, true, 'Precondición: auto-scroll debe estar activo');

  let dialogClosed = false;
  const dialog = {
    open: true,
    close() {
      dialogClosed = true;
      this.open = false;
    },
  };

  const emptyState = { hidden: false };

  const opened = await openScoreById('sonata.pdf', viewer, emptyState, dialog, 1024, storage);

  // 1. Auto-scroll detenido
  assert.strictEqual(getAutoScrollState().isScrolling, false, 'Auto-scroll debe detenerse al abrir una partitura');

  // 2. Elemento previo eliminado con .remove() y blob revocado
  assert.strictEqual(revokedUrls.includes('blob:score-previa'), true, 'Debe haber revocado la URL de objeto previa');

  // 3. Resultado retornado y estado de visor
  assert.ok(opened, 'Debe retornar la partitura abierta');
  assert.strictEqual(opened.id, 'sonata.pdf');
  assert.strictEqual(emptyState.hidden, true, 'empty-state debe quedar oculto');
  assert.strictEqual(viewer.children.length, 2, 'Debe haber renderizado las 2 páginas del PDF');
  assert.strictEqual(viewer.children[0].tagName, 'CANVAS');

  // 4. Diálogo cerrado
  assert.strictEqual(dialogClosed, true, 'El diálogo debe haberse cerrado');
  assert.strictEqual(dialog.open, false, 'dialog.open debe ser false');

  // 5. Actualización en almacenamiento
  lastActive = await storage.getLastActiveScore();
  assert.strictEqual(lastActive.id, 'sonata.pdf', 'La última activa en almacenamiento debe ser sonata.pdf');
}

async function testSelectAndOpenImagesScore() {
  await storage.clear();

  await storage.saveScore({
    id: 'estudio-op25.png',
    name: 'estudio-op25.png',
    type: 'images',
    data: [
      { name: 'op25-p1.png', type: 'image/png', buffer: new Uint8Array([1, 2]).buffer },
      { name: 'op25-p2.png', type: 'image/png', buffer: new Uint8Array([3, 4]).buffer },
    ],
  });

  const viewer = createMockViewer();
  const emptyState = { hidden: false };
  const dialog = {
    open: true,
    close() { this.open = false; },
  };

  const opened = await openScoreById('estudio-op25.png', viewer, emptyState, dialog, 800, storage);
  assert.ok(opened);
  assert.strictEqual(opened.type, 'images');
  assert.strictEqual(viewer.children.length, 2);
  assert.strictEqual(viewer.children[0].tagName, 'IMG');
  assert.strictEqual(viewer.children[1].tagName, 'IMG');
  assert.ok(viewer.children[0].src.startsWith('blob:'));
  assert.strictEqual(dialog.open, false);
}

async function testSelectNonExistentScore() {
  await storage.clear();
  const viewer = createMockViewer();
  const emptyState = { hidden: false };
  const dialog = {
    open: true,
    close() { this.open = false; },
  };

  const opened = await openScoreById('no-existe.pdf', viewer, emptyState, dialog, 800, storage);
  assert.strictEqual(opened, null, 'Debe retornar null ante un ID que no existe');
  assert.strictEqual(dialog.open, true, 'El diálogo no debe cerrarse si la partitura no existe');
  assert.strictEqual(viewer.children.length, 0, 'No debe alterar el visor si la partitura no existe');
}

async function run() {
  await testSelectAndOpenPdfScore();
  await testSelectAndOpenImagesScore();
  await testSelectNonExistentScore();
  console.log('✅ T32 passed: selecting a score cleans viewer, revokes URLs, stops autoscroll, renders PDF/images, and handles non-existent IDs');
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
