// T9: opening multiple images displays each as <img> in the viewer, in OS order
// Verifica que al abrir un array de 2+ archivos de imagen:
// 1. Se crea un <img> por cada archivo
// 2. Cada <img> tiene el blob URL correcto (del archivo correspondiente)
// 3. Los <img> se insertan en el visor en el mismo orden que el array

const assert = require('assert');

// Mock mínimo de FileReader (no se usa en esta ruta, pero app.js lo referencia)
global.FileReader = class { readAsArrayBuffer() {} };

const { handleFileOpen } = require('../app.js');

async function run() {
  const files = [
    { type: 'image/png',  name: 'pagina-1.png'  },
    { type: 'image/jpeg', name: 'pagina-2.jpg'  },
    { type: 'image/webp', name: 'pagina-3.webp' },
  ];

  const blobUrls = files.map((f) => `blob:mock-${f.name}`);
  const appended = [];

  global.URL = {
    createObjectURL: (file) => `blob:mock-${file.name}`,
    revokeObjectURL: () => {},
  };

  global.document = {
    createElement: (tag) => ({ tagName: tag.toUpperCase(), src: '' }),
  };

  // querySelectorAll retorna array vacío: T9 es un test de render enfocado.
  // La limpieza de elementos previos está cubierta en T10 y T12.
  const viewer = {
    appendChild: (el) => appended.push(el),
    querySelectorAll: () => [],
  };
  const emptyState = { hidden: false };

  await handleFileOpen(files, viewer, emptyState);

  // 1. Deben haberse agregado exactamente 3 elementos
  assert.strictEqual(appended.length, 3, `Deben agregarse 3 <img>, se agregaron ${appended.length}`);

  // 2. Todos deben ser <img>
  for (const el of appended) {
    assert.strictEqual(el.tagName, 'IMG', `Cada elemento debe ser <img>, se encontró <${el.tagName}>`);
  }

  // 3. Los src deben corresponder al orden del array original
  for (let i = 0; i < files.length; i++) {
    assert.strictEqual(
      appended[i].src,
      blobUrls[i],
      `img[${i}].src debe ser "${blobUrls[i]}", es "${appended[i].src}"`
    );
  }

  console.log('✅ T9 passed: multiple images are displayed stacked in viewer in OS order');
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
