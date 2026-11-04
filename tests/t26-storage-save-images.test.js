// T26: storage save images
// Verifica que al abrir una o varias imágenes mediante handleFileOpen,
// se guarden automáticamente en el almacenamiento persistente con sus
// contenidos binarios (ArrayBuffer), nombres de archivo y tipos MIME,
// quedando registrada la partitura como la última activa.
// Utiliza instancias File nativas de la Web API sin inventar propiedades artificiales.

const assert = require('assert');

// DOM Mocks mínimos para visor
global.document = {
  createElement: (tag) => ({
    tagName: tag.toUpperCase(),
    src: '',
  }),
};

const storage = require('../storage.js');
const { handleFileOpen } = require('../app.js');

async function testSaveImages() {
  await storage.clear();

  const viewer = {
    children: [],
    appendChild(el) { this.children.push(el); },
    querySelectorAll: () => [],
  };
  const emptyState = { hidden: false };

  const bytes1 = new Uint8Array([10, 20, 30]);
  const bytes2 = new Uint8Array([40, 50, 60]);

  // Usamos la API estándar File
  const file1 = new File([bytes1], 'partitura-pag1.png', { type: 'image/png' });
  const file2 = new File([bytes2], 'partitura-pag2.png', { type: 'image/png' });

  await handleFileOpen([file1, file2], viewer, emptyState);

  const lastScore = await storage.getLastActiveScore();
  assert.ok(lastScore, 'Debe existir una última partitura activa en storage tras abrir imágenes');
  assert.strictEqual(lastScore.type, 'images', 'El tipo guardado debe ser "images"');
  assert.strictEqual(lastScore.name, 'partitura-pag1.png', 'El nombre principal debe coincidir con el primer archivo');
  assert.ok(Array.isArray(lastScore.data), 'El campo data debe ser un array con cada imagen');
  assert.strictEqual(lastScore.data.length, 2, 'Debe contener las 2 imágenes abiertas');

  assert.strictEqual(lastScore.data[0].name, 'partitura-pag1.png');
  assert.strictEqual(lastScore.data[0].type, 'image/png');
  assert.ok(lastScore.data[0].buffer instanceof ArrayBuffer);
  assert.deepStrictEqual(Array.from(new Uint8Array(lastScore.data[0].buffer)), [10, 20, 30]);

  assert.strictEqual(lastScore.data[1].name, 'partitura-pag2.png');
  assert.strictEqual(lastScore.data[1].type, 'image/png');
  assert.ok(lastScore.data[1].buffer instanceof ArrayBuffer);
  assert.deepStrictEqual(Array.from(new Uint8Array(lastScore.data[1].buffer)), [40, 50, 60]);

  console.log('✅ T26 passed: opening images saves them in persistent storage with binary data');
}

testSaveImages().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
