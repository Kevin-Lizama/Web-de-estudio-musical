// T38: library delete active score
// Acceptance Criterion 3:
// Given la partitura abierta actualmente en el visor,
// when la elimino desde la biblioteca,
// then el visor se limpia mostrando el estado inicial vacío y deja de ser la partitura activa.

const assert = require('assert');

global.requestAnimationFrame = () => 1;
global.cancelAnimationFrame = () => {};

const storage = require('../storage.js');
const {
  openScoreById,
  handleDeleteScore,
  getActiveScoreId,
  toggleAutoScroll,
  getAutoScrollState,
} = require('../app.js');

const revokedUrls = [];
global.URL = {
  createObjectURL: () => 'blob:mock-' + Math.random().toString(36).substring(2),
  revokeObjectURL: (url) => {
    revokedUrls.push(url);
  },
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
  const children = [];
  return {
    tagName: tagName.toUpperCase(),
    type: '',
    className: '',
    textContent: '',
    dataset: {},
    children,
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
  getDocument: () => ({
    promise: Promise.resolve({
      numPages: 2,
      getPage: () => Promise.resolve({
        getViewport: () => ({ width: 100, height: 100 }),
        render: () => ({ promise: Promise.resolve() }),
      }),
    }),
  }),
};

async function testDeleteActiveScoreClearsViewerAndResetsState() {
  await storage.clear();

  await storage.saveScore({
    id: 'chopin-etude.pdf',
    name: 'chopin-etude.pdf',
    type: 'pdf',
    data: new Uint8Array([1, 2, 3]).buffer,
  });

  const viewer = createMockViewer();
  const emptyState = { hidden: false };

  // Abrir la partitura en el visor
  await openScoreById('chopin-etude.pdf', viewer, emptyState, null, 1024, storage);

  assert.strictEqual(emptyState.hidden, true, 'Precondición: emptyState oculto con partitura abierta');
  assert.strictEqual(viewer.children.length, 2, 'Precondición: 2 páginas renderizadas');
  assert.strictEqual(typeof getActiveScoreId, 'function', 'getActiveScoreId debe ser una función');
  assert.strictEqual(getActiveScoreId(), 'chopin-etude.pdf', 'chopin-etude.pdf debe ser la partitura activa');

  // Iniciar auto-scroll
  const fakeBtn = { textContent: 'Auto-scroll' };
  const fakeSpeedInput = { value: '3' };
  toggleAutoScroll(fakeBtn, fakeSpeedInput, viewer);
  assert.strictEqual(getAutoScrollState().isScrolling, true, 'Precondición: auto-scroll activo');

  // Mock de la lista de biblioteca
  const libraryList = {
    children: [
      {
        dataset: { id: 'chopin-etude.pdf' },
        querySelector: () => ({ dataset: { id: 'chopin-etude.pdf' } }),
        remove() { this.removed = true; },
      },
    ],
  };
  const libraryEmpty = { hidden: true };

  // Eliminar la partitura activa
  const deleted = await handleDeleteScore(
    'chopin-etude.pdf',
    libraryList,
    libraryEmpty,
    storage,
    () => true,
    viewer,
    emptyState
  );

  assert.strictEqual(deleted, true);

  // 1. Visor limpio
  assert.strictEqual(viewer.children.length, 0, 'El visor debe quedar limpio sin páginas');

  // 2. Empty-state visible
  assert.strictEqual(emptyState.hidden, false, 'El estado vacío inicial debe mostrarse');

  // 3. Auto-scroll detenido
  assert.strictEqual(getAutoScrollState().isScrolling, false, 'El auto-scroll debe detenerse');

  // 4. Deja de ser la partitura activa
  assert.strictEqual(getActiveScoreId(), null, 'getActiveScoreId debe retornar null');

  // 5. En almacenamiento persistente ya no hay activa
  assert.strictEqual(await storage.getLastActiveScore(), null);
}

async function testDeleteInactiveScoreLeavesViewerIntact() {
  await storage.clear();

  await storage.saveScore({
    id: 'active-score.pdf',
    name: 'Active Score.pdf',
    type: 'pdf',
    data: new Uint8Array([1, 2]).buffer,
  });

  await storage.saveScore({
    id: 'other-score.pdf',
    name: 'Other Score.pdf',
    type: 'pdf',
    data: new Uint8Array([3, 4]).buffer,
  });

  const viewer = createMockViewer();
  const emptyState = { hidden: false };

  // Abrir active-score en el visor
  await openScoreById('active-score.pdf', viewer, emptyState, null, 1024, storage);

  assert.strictEqual(viewer.children.length, 2);
  assert.strictEqual(emptyState.hidden, true);
  assert.strictEqual(getActiveScoreId(), 'active-score.pdf');

  const libraryList = {
    children: [
      {
        dataset: { id: 'active-score.pdf' },
        querySelector: () => ({ dataset: { id: 'active-score.pdf' } }),
      },
      {
        dataset: { id: 'other-score.pdf' },
        querySelector: () => ({ dataset: { id: 'other-score.pdf' } }),
      },
    ],
  };
  const libraryEmpty = { hidden: true };

  // Eliminar la partitura inactiva ('other-score.pdf')
  const deleted = await handleDeleteScore(
    'other-score.pdf',
    libraryList,
    libraryEmpty,
    storage,
    () => true,
    viewer,
    emptyState
  );

  assert.strictEqual(deleted, true);

  // El visor y la activa deben permanecer completamente intactos
  assert.strictEqual(viewer.children.length, 2, 'El visor debe conservar las páginas de la partitura activa');
  assert.strictEqual(emptyState.hidden, true, 'emptyState debe seguir oculto');
  assert.strictEqual(getActiveScoreId(), 'active-score.pdf', 'active-score.pdf debe seguir siendo la activa');

  // En storage la activa sigue siendo active-score.pdf y other-score.pdf fue borrada
  const lastActive = await storage.getLastActiveScore();
  assert.strictEqual(lastActive.id, 'active-score.pdf');
  assert.strictEqual(await storage.getScore('other-score.pdf'), null);
}

async function testDeleteActiveScoreCancelledLeavesViewerAndActiveIntact() {
  await storage.clear();

  await storage.saveScore({
    id: 'active-cancel.pdf',
    name: 'Active Cancel.pdf',
    type: 'pdf',
    data: new Uint8Array([9, 10]).buffer,
  });

  const viewer = createMockViewer();
  const emptyState = { hidden: false };

  await openScoreById('active-cancel.pdf', viewer, emptyState, null, 1024, storage);

  const fakeBtn = { textContent: 'Auto-scroll' };
  const fakeSpeedInput = { value: '3' };
  toggleAutoScroll(fakeBtn, fakeSpeedInput, viewer);
  assert.strictEqual(getAutoScrollState().isScrolling, true);

  const libraryList = {
    children: [
      {
        dataset: { id: 'active-cancel.pdf' },
        querySelector: () => ({ dataset: { id: 'active-cancel.pdf' } }),
      },
    ],
  };
  const libraryEmpty = { hidden: true };

  // Cancelar la eliminación de la partitura activa
  const deleted = await handleDeleteScore(
    'active-cancel.pdf',
    libraryList,
    libraryEmpty,
    storage,
    () => false,
    viewer,
    emptyState
  );

  assert.strictEqual(deleted, false, 'Al cancelar debe retornar false');
  assert.strictEqual(viewer.children.length, 2, 'El visor no debe limpiarse si se cancela la eliminación');
  assert.strictEqual(emptyState.hidden, true, 'El estado vacío debe continuar oculto');
  assert.strictEqual(getAutoScrollState().isScrolling, true, 'El auto-scroll debe seguir en ejecución si se canceló');
  assert.strictEqual(getActiveScoreId(), 'active-cancel.pdf', 'Debe continuar siendo la partitura activa');
  assert.strictEqual((await storage.getLastActiveScore()).id, 'active-cancel.pdf');
}

async function run() {
  await testDeleteActiveScoreClearsViewerAndResetsState();
  await testDeleteInactiveScoreLeavesViewerIntact();
  await testDeleteActiveScoreCancelledLeavesViewerAndActiveIntact();
  console.log('✅ T38 passed: deleting scores properly synchronizes viewer, empty state, and active pointers');
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

