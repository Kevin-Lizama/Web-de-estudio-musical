// T41: selecting file via library open-btn loads score, saves to storage, and closes dialog
// Verifica que al abrir un archivo mediante handleFileOpen con el diálogo provisto:
// 1. Carga la partitura en el visor y oculta el emptyState.
// 2. Guarda la partitura en el almacenamiento persistente.
// 3. Cierra el diálogo modal invocando dialog.close().
// 4. Si la lista de archivos está vacía, no cierra el diálogo.

const assert = require('assert');

global.requestAnimationFrame = (cb) => 1;
global.cancelAnimationFrame = () => {};

const { handleFileOpen } = require('../app.js');

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

global.URL = {
  createObjectURL: () => 'blob:mock-url',
  revokeObjectURL: () => {},
};

global.pdfjsLib = {
  getDocument: () => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: () =>
        Promise.resolve({
          getViewport: () => ({ width: 600, height: 800 }),
          render: () => ({ promise: Promise.resolve() }),
        }),
    }),
  }),
};

async function run() {
  const viewer = createMockViewer();
  const emptyState = { hidden: false };
  let closed = false;
  const mockDialog = {
    close() {
      closed = true;
    },
  };

  const savedScores = [];
  const mockStorage = {
    async saveScore(score) {
      savedScores.push(score);
      return score;
    },
  };

  const sampleBuffer = new Uint8Array([37, 80, 68, 70]).buffer; // %PDF
  const mockFile = {
    name: 'sonata.pdf',
    type: 'application/pdf',
    arrayBuffer: async () => sampleBuffer,
  };

  // 1. Cargar archivo con diálogo
  await handleFileOpen([mockFile], viewer, emptyState, 1024, mockStorage, mockDialog);

  assert.strictEqual(emptyState.hidden, true, 'emptyState debe quedar oculto');
  assert.strictEqual(viewer.children.length, 1, 'Debe haber renderizado una página canvas en el visor');
  assert.strictEqual(savedScores.length, 1, 'Debe haberse guardado la partitura en almacenamiento');
  assert.strictEqual(savedScores[0].name, 'sonata.pdf', 'El nombre de la partitura debe ser sonata.pdf');
  assert.strictEqual(closed, true, 'El diálogo de biblioteca debe cerrarse tras la carga exitosa');

  // 2. Si no hay archivos, el diálogo no debe cerrarse
  let closedOnEmpty = false;
  const mockEmptyDialog = {
    close() {
      closedOnEmpty = true;
    },
  };
  await handleFileOpen([], viewer, emptyState, 1024, mockStorage, mockEmptyDialog);
  assert.strictEqual(closedOnEmpty, false, 'No debe cerrarse el diálogo si no se seleccionó archivo');

  console.log('✅ T41 passed: selecting file via library open-btn loads score, saves to storage, and closes dialog');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

