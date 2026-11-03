// T10: opening a new set of images clears all previous pages
// Verifica que al abrir un segundo conjunto de imágenes:
// 1. Todos los elementos del conjunto anterior se eliminan del visor (por referencia)
// 2. Solo quedan los elementos del nuevo conjunto
// 3. El orden del nuevo conjunto es el correcto
//
// El viewer mock auto-asigna parentContainer en appendChild (como hace el DOM real),
// por lo que remove() funciona sin inyección manual.

const assert = require('assert');

global.FileReader = class { readAsArrayBuffer() {} };

function createMockViewer() {
  const children = [];
  return {
    children,
    appendChild(el) {
      el.parentContainer = this;
      children.push(el);
    },
    querySelectorAll(selector) {
      const tags = selector.split(',').map((s) => s.trim().toUpperCase());
      return children.filter((c) => tags.includes(c.tagName));
    },
  };
}

function createMockElement(tagName) {
  return {
    tagName: tagName.toUpperCase(),
    src: '',
    remove() {
      const idx = this.parentContainer?.children.indexOf(this) ?? -1;
      if (idx !== -1) this.parentContainer.children.splice(idx, 1);
    },
  };
}

global.document = {
  createElement: (tag) => createMockElement(tag),
};

global.URL = {
  createObjectURL: (file) => `blob:mock-${file.name}`,
  revokeObjectURL: () => {},
};

const { handleFileOpen } = require('../app.js');

async function run() {
  const viewer = createMockViewer();
  const emptyState = { hidden: false };

  // Primera apertura: 2 imágenes
  const set1 = [
    { type: 'image/png',  name: 'p1.png' },
    { type: 'image/jpeg', name: 'p2.jpg' },
  ];
  await handleFileOpen(set1, viewer, emptyState);
  const set1Elements = [...viewer.children]; // captura referencias exactas
  assert.strictEqual(viewer.children.length, 2, 'Deben quedar 2 imágenes tras set1');

  // Segunda apertura: 3 imágenes nuevas
  const set2 = [
    { type: 'image/png',  name: 'nueva-1.png'  },
    { type: 'image/jpeg', name: 'nueva-2.jpg'  },
    { type: 'image/webp', name: 'nueva-3.webp' },
  ];
  await handleFileOpen(set2, viewer, emptyState);

  // 1. Ningún elemento del set1 debe seguir en el visor (verificación por referencia)
  for (const el of set1Elements) {
    assert.ok(
      !viewer.children.includes(el),
      `El elemento ${el.src} del set1 debe haber sido eliminado del visor`
    );
  }

  // 2. Solo deben quedar exactamente los 3 del nuevo conjunto
  assert.strictEqual(viewer.children.length, 3, `Deben quedar 3 imágenes del set2, hay ${viewer.children.length}`);

  // 3. Los src deben seguir el orden del set2
  for (let i = 0; i < set2.length; i++) {
    const expectedSrc = `blob:mock-${set2[i].name}`;
    assert.strictEqual(
      viewer.children[i].src,
      expectedSrc,
      `img[${i}].src debe ser "${expectedSrc}", es "${viewer.children[i].src}"`
    );
  }

  console.log('✅ T10 passed: opening a new set clears all previous images/canvases');
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
