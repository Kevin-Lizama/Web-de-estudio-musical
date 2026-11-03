// T8: opening a file clears previous pages (canvas or img)
// Verifica que al abrir un nuevo archivo (imagen o PDF), se eliminen del visor
// las páginas renderizadas previamente (tanto elementos <canvas> como <img>).
// Usa un mock de contenedor realista basado en un array de hijos para evitar falsos positivos.

const assert = require('assert');

// Helper para crear un contenedor con comportamiento DOM real
function createMockViewer() {
  const children = [];

  return {
    children,
    appendChild(element) {
      children.push(element);
    },
    querySelectorAll(selector) {
      // Soporta selectores separados por coma como 'canvas, img'
      const requestedTags = selector
        .split(',')
        .map((s) => s.trim().toUpperCase());

      return children.filter((child) => requestedTags.includes(child.tagName));
    },
  };
}

function createMockElement(tagName, isPrevious = false) {
  return {
    tagName: tagName.toUpperCase(),
    isPrevious,
    src: '',
    getContext: () => ({}),
    remove() {
      // Simula el remove() del DOM real: se quita a sí mismo de su contenedor
      const index = this.parentContainer?.children.indexOf(this) ?? -1;
      if (index !== -1) {
        this.parentContainer.children.splice(index, 1);
      }
    },
  };
}

global.document = {
  createElement: (tag) => createMockElement(tag),
};

global.URL = {
  createObjectURL: () => 'blob:mock-score-url',
};

global.FileReader = class MockFileReader {
  readAsArrayBuffer() {
    if (this.onload) {
      this.onload({ target: { result: new ArrayBuffer(8) } });
    }
  }
};

global.pdfjsLib = {
  getDocument: () => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: () => Promise.resolve({
        getViewport: () => ({ width: 100, height: 100 }),
        render: () => ({ promise: Promise.resolve() }),
      }),
    }),
  }),
};

const { handleFileOpen } = require('../app.js');

async function testClearOnOpenImage() {
  const viewer = createMockViewer();

  // Insertamos elementos previos en el visor (un canvas de PDF y una imagen previa)
  const prevCanvas = createMockElement('CANVAS', true);
  prevCanvas.parentContainer = viewer;
  viewer.appendChild(prevCanvas);

  const prevImg = createMockElement('IMG', true);
  prevImg.parentContainer = viewer;
  viewer.appendChild(prevImg);

  assert.strictEqual(viewer.children.length, 2, 'El visor debe tener 2 elementos previos antes de abrir');

  const emptyState = { hidden: false };
  const newImageFile = { type: 'image/png', name: 'nueva-partitura.png' };

  await handleFileOpen(newImageFile, viewer, emptyState);

  // 1. Los elementos previos ya no deben estar en el contenedor
  const hasPreviousCanvas = viewer.children.some((el) => el.isPrevious && el.tagName === 'CANVAS');
  const hasPreviousImg = viewer.children.some((el) => el.isPrevious && el.tagName === 'IMG');

  assert.strictEqual(hasPreviousCanvas, false, 'El canvas previo debió eliminarse del visor');
  assert.strictEqual(hasPreviousImg, false, 'La imagen previa debió eliminarse del visor');

  // 2. Solo debe quedar la nueva imagen cargada
  assert.strictEqual(viewer.children.length, 1, 'Solo debe quedar el nuevo elemento cargado');
  assert.strictEqual(viewer.children[0].tagName, 'IMG', 'El elemento restante debe ser el nuevo <img>');
  assert.strictEqual(viewer.children[0].isPrevious, false, 'El elemento restante no debe ser el previo');
}

async function testClearOnOpenPDF() {
  const viewer = createMockViewer();

  // Insertamos una imagen previa antes de abrir un PDF
  const prevImg = createMockElement('IMG', true);
  prevImg.parentContainer = viewer;
  viewer.appendChild(prevImg);

  assert.strictEqual(viewer.children.length, 1, 'El visor debe tener 1 imagen previa antes de abrir el PDF');

  const emptyState = { hidden: false };
  const pdfFile = { type: 'application/pdf', name: 'partitura.pdf' };

  await handleFileOpen(pdfFile, viewer, emptyState);

  // La imagen previa debió eliminarse al abrir el PDF
  const hasPreviousImg = viewer.children.some((el) => el.isPrevious && el.tagName === 'IMG');
  assert.strictEqual(hasPreviousImg, false, 'La imagen previa debió eliminarse al abrir un PDF');
}

async function run() {
  await testClearOnOpenImage();
  await testClearOnOpenPDF();
  console.log('✅ T8 passed: opening a file (image or PDF) clears previous pages (canvas and img) with full DOM fidelity');
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
