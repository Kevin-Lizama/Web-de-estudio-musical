// T12: blob URLs are revoked when the viewer is cleared
// Verifica que URL.revokeObjectURL se invoca con cada blob URL de las imágenes
// anteriores cuando se abre un nuevo conjunto, evitando memory leaks.

const assert = require('assert');

global.FileReader = class { readAsArrayBuffer() {} };

const revokedUrls = [];
const OLD_BLOB_1 = 'blob:mock-old-pagina1.png';
const OLD_BLOB_2 = 'blob:mock-old-pagina2.jpg';

global.URL = {
  createObjectURL: (file) => `blob:mock-new-${file.name}`,
  revokeObjectURL: (url) => revokedUrls.push(url),
};

global.document = {
  createElement: (tag) => ({ tagName: tag.toUpperCase(), src: '' }),
};

// Viewer pre-poblado con dos imágenes antiguas que tienen blob URLs
const oldImg1 = { tagName: 'IMG', src: OLD_BLOB_1, remove() {} };
const oldImg2 = { tagName: 'IMG', src: OLD_BLOB_2, remove() {} };
const newChildren = [];

const viewer = {
  children: [oldImg1, oldImg2],
  appendChild: (el) => newChildren.push(el),
  querySelectorAll(selector) {
    const tags = selector.split(',').map((s) => s.trim().toUpperCase());
    return this.children.filter((c) => tags.includes(c.tagName));
  },
};
const emptyState = { hidden: false };

const { handleFileOpen } = require('../app.js');

async function run() {
  const newFiles = [{ type: 'image/png', name: 'nueva-1.png' }];

  await handleFileOpen(newFiles, viewer, emptyState);

  // Las dos blob URLs antiguas deben haber sido revocadas
  assert.ok(
    revokedUrls.includes(OLD_BLOB_1),
    `Debe revocar la blob URL de la primera imagen antigua (${OLD_BLOB_1})`
  );
  assert.ok(
    revokedUrls.includes(OLD_BLOB_2),
    `Debe revocar la blob URL de la segunda imagen antigua (${OLD_BLOB_2})`
  );

  // La URL nueva NO debe revocarse
  const newBlobUrl = `blob:mock-new-nueva-1.png`;
  assert.ok(
    !revokedUrls.includes(newBlobUrl),
    'No debe revocar la blob URL de la imagen recién cargada'
  );

  console.log('✅ T12 passed: blob URLs are revoked when the viewer is cleared');
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

