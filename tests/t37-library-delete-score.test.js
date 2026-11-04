// T37: library delete score
// Verifica el flujo de eliminación de partituras desde la biblioteca:
// 1. Cada elemento incluye un botón accesible de eliminar (.library-delete-btn).
// 2. Al confirmar la eliminación, la partitura se borra de storage y se quita de la lista.
// 3. Si era la última partitura, se muestra el estado vacío (emptyEl.hidden = false).

const assert = require('assert');
const storage = require('../storage.js');
const { openLibrary, handleDeleteScore } = require('../app.js');

function createMockElement(tag) {
  const children = [];
  const attributes = {};
  return {
    tagName: tag.toUpperCase(),
    type: '',
    className: '',
    textContent: '',
    dataset: {},
    setAttribute(name, value) {
      attributes[name] = String(value);
    },
    getAttribute(name) {
      return attributes[name] || null;
    },
    get children() {
      return children;
    },
    set innerHTML(val) {
      if (val === '') children.length = 0;
    },
    appendChild(child) {
      children.push(child);
      child.parentElement = this;
    },
    remove() {
      if (this.parentElement && this.parentElement.children) {
        const idx = this.parentElement.children.indexOf(this);
        if (idx !== -1) {
          this.parentElement.children.splice(idx, 1);
        }
      }
    },
    querySelector(sel) {
      const cls = sel.startsWith('.') ? sel.slice(1) : sel;
      const search = (node) => {
        if (node.className && node.className.split(' ').includes(cls)) return node;
        for (const child of (node.children || [])) {
          const match = search(child);
          if (match) return match;
        }
        return null;
      };
      for (const child of children) {
        const match = search(child);
        if (match) return match;
      }
      return null;
    },
  };
}

global.document = {
  createElement: (tag) => createMockElement(tag),
};

async function testDeleteScoreRemovesFromStorageAndUI() {
  await storage.clear();

  await storage.saveScore({
    id: 'score-1.pdf',
    name: 'Score 1.pdf',
    type: 'pdf',
    data: new Uint8Array([1, 2]).buffer,
  });

  await storage.saveScore({
    id: 'score-2.pdf',
    name: 'Score 2.pdf',
    type: 'pdf',
    data: new Uint8Array([3, 4]).buffer,
  });

  const dialog = { open: false, showModal() { this.open = true; }, close() { this.open = false; } };
  const emptyEl = { hidden: false };
  const listEl = createMockElement('ul');

  await openLibrary(dialog, listEl, emptyEl, storage);

  assert.strictEqual(listEl.children.length, 2);
  assert.strictEqual(emptyEl.hidden, true);

  // Verificar existencia de botón de eliminar en cada ítem
  const firstItem = listEl.children[0];
  const deleteBtn = firstItem.querySelector('.library-delete-btn');
  assert.ok(deleteBtn, 'Debe existir .library-delete-btn en cada partitura');
  assert.strictEqual(deleteBtn.tagName, 'BUTTON');
  assert.strictEqual(deleteBtn.type, 'button');
  assert.ok(deleteBtn.dataset.id);

  // Eliminar score-1 confirmando la acción
  assert.strictEqual(typeof handleDeleteScore, 'function', 'handleDeleteScore debe estar definida en app.js');

  let confirmCalled = false;
  const confirmMock = (msg) => {
    confirmCalled = true;
    assert.ok(msg && msg.length > 0, 'Debe mostrar un mensaje de confirmación');
    return true;
  };

  const deleted = await handleDeleteScore('score-1.pdf', listEl, emptyEl, storage, confirmMock);
  assert.strictEqual(deleted, true);
  assert.strictEqual(confirmCalled, true);

  // Ya no debe existir en almacenamiento
  assert.strictEqual(await storage.getScore('score-1.pdf'), null);

  // En la lista debe quedar solo score-2
  assert.strictEqual(listEl.children.length, 1);
  const remainingOpenBtn = listEl.children[0].querySelector('.library-item-btn');
  assert.strictEqual(remainingOpenBtn.dataset.id, 'score-2.pdf');
  assert.strictEqual(emptyEl.hidden, true, 'No debe mostrar emptyEl si aún queda una partitura');

  // Ahora eliminamos la última partitura (score-2)
  const deletedLast = await handleDeleteScore('score-2.pdf', listEl, emptyEl, storage, () => true);
  assert.strictEqual(deletedLast, true);
  assert.strictEqual(await storage.getScore('score-2.pdf'), null);

  // La lista queda vacía y se muestra emptyEl
  assert.strictEqual(listEl.children.length, 0);
  assert.strictEqual(emptyEl.hidden, false, 'Debe mostrar emptyEl al quedar sin partituras');
}

async function testDeleteScoreCancelDoesNotDelete() {
  await storage.clear();

  await storage.saveScore({
    id: 'ravel-bolero.pdf',
    name: 'ravel-bolero.pdf',
    type: 'pdf',
    data: new Uint8Array([5, 6, 7]).buffer,
  });

  const dialog = { open: false, showModal() { this.open = true; }, close() { this.open = false; } };
  const emptyEl = { hidden: true };
  const listEl = createMockElement('ul');

  await openLibrary(dialog, listEl, emptyEl, storage);
  assert.strictEqual(listEl.children.length, 1);

  // Usuario cancela (confirm retorna false)
  const deleted = await handleDeleteScore('ravel-bolero.pdf', listEl, emptyEl, storage, () => false);
  assert.strictEqual(deleted, false, 'Debe retornar false si el usuario cancela');

  // Elemento permanece en la lista
  assert.strictEqual(listEl.children.length, 1, 'La lista debe conservar el elemento intacto');
  assert.strictEqual(emptyEl.hidden, true, 'emptyEl debe permanecer oculto');

  // Registro permanece en el almacenamiento
  const inStorage = await storage.getScore('ravel-bolero.pdf');
  assert.ok(inStorage, 'La partitura debe seguir existiendo en storage');
  assert.strictEqual(inStorage.name, 'ravel-bolero.pdf');
}

async function run() {
  await testDeleteScoreRemovesFromStorageAndUI();
  await testDeleteScoreCancelDoesNotDelete();
  console.log('✅ T37 passed: library delete flow properly handles deletion and cancellation');
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
