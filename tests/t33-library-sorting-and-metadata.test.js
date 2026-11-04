// T33: library sorting by updatedAt descending and lightweight metadata projection
// Verifica que:
// 1. listScores devuelva únicamente metadatos ({ id, name, type, updatedAt }) sin duplicar los buffers pesados de data en memoria.
// 2. Las partituras se listen ordenadas con la más recientemente actualizada primero.

const assert = require('assert');
const storage = require('../storage.js');
const { openLibrary } = require('../app.js');

function createMockElement(tag) {
  const children = [];
  return {
    tagName: tag.toUpperCase(),
    type: '',
    className: '',
    textContent: '',
    dataset: {},
    get children() {
      return children;
    },
    set innerHTML(val) {
      if (val === '') children.length = 0;
    },
    appendChild(child) {
      children.push(child);
    },
  };
}

global.document = {
  createElement: (tag) => createMockElement(tag),
};

async function testLibrarySortingAndMetadata() {
  await storage.clear();

  // Guardamos 3 partituras con marcas de tiempo espaciadas
  await storage.saveScore({
    id: 'score-1.pdf',
    name: 'Antigua.pdf',
    type: 'pdf',
    data: new Uint8Array([1, 2, 3]).buffer,
    updatedAt: 1000,
  });

  await storage.saveScore({
    id: 'score-2.pdf',
    name: 'MasReciente.pdf',
    type: 'pdf',
    data: new Uint8Array([4, 5, 6]).buffer,
    updatedAt: 3000,
  });

  await storage.saveScore({
    id: 'score-3.png',
    name: 'Intermedia.png',
    type: 'images',
    data: [{ name: 'p1.png', type: 'image/png', buffer: new Uint8Array([7, 8]).buffer }],
    updatedAt: 2000,
  });

  const scores = await storage.listScores();

  // 1. Verificación de proyección liviana: no expone el campo pesado 'data'
  scores.forEach((s) => {
    assert.strictEqual(s.data, undefined, 'listScores no debe cargar los buffers binarios pesados en memoria');
    assert.ok(s.id && s.name && s.type && s.updatedAt, 'Debe incluir los metadatos esenciales');
  });

  // 2. Verificación de orden: más reciente primero (3000 -> 2000 -> 1000)
  assert.strictEqual(scores[0].name, 'MasReciente.pdf');
  assert.strictEqual(scores[1].name, 'Intermedia.png');
  assert.strictEqual(scores[2].name, 'Antigua.pdf');

  // 3. Verificación en renderizado de UI mediante openLibrary
  const dialog = { open: false, showModal() { this.open = true; } };
  const listEl = createMockElement('ul');
  const emptyEl = { hidden: true };

  await openLibrary(dialog, listEl, emptyEl, storage);
  assert.strictEqual(listEl.children.length, 3);
  assert.strictEqual(listEl.children[0].children[0].textContent, 'MasReciente.pdf');
  assert.strictEqual(listEl.children[1].children[0].textContent, 'Intermedia.png');
  assert.strictEqual(listEl.children[2].children[0].textContent, 'Antigua.pdf');

  console.log('✅ T33 passed: library lists lightweight metadata sorted by updatedAt descending');
}

testLibrarySortingAndMetadata().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

