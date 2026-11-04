// T36: library rename score
// Verifica el flujo de renombrar partituras desde la biblioteca:
// 1. Cada elemento incluye un botón de renombrar accesible.
// 2. Al invocar renombrar y proporcionar un nuevo nombre, se actualiza el almacenamiento persistente.
// 3. La interfaz de la biblioteca refleja inmediatamente el nuevo nombre y persiste al reabrir.

const assert = require('assert');
const storage = require('../storage.js');
const { openLibrary, handleRenameScore } = require('../app.js');

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

async function testRenameScoreUpdatesUIAndStorage() {
  await storage.clear();

  await storage.saveScore({
    id: 'score-bach.pdf',
    name: 'bach-original.pdf',
    type: 'pdf',
    data: new Uint8Array([1, 2, 3]).buffer,
  });

  const dialog = {
    open: false,
    showModal() { this.open = true; },
    close() { this.open = false; },
  };

  const emptyEl = { hidden: false };
  const listEl = createMockElement('ul');

  await openLibrary(dialog, listEl, emptyEl, storage);

  assert.strictEqual(listEl.children.length, 1);
  const item = listEl.children[0];

  // Debe contener botón de abrir y botón de renombrar
  const openBtn = item.querySelector('.library-item-btn');
  const renameBtn = item.querySelector('.library-rename-btn');

  assert.ok(openBtn, 'Debe existir .library-item-btn');
  assert.ok(renameBtn, 'Debe existir .library-rename-btn');
  assert.strictEqual(renameBtn.tagName, 'BUTTON');
  assert.strictEqual(renameBtn.type, 'button');
  assert.strictEqual(renameBtn.dataset.id, 'score-bach.pdf');
  assert.strictEqual(openBtn.textContent, 'bach-original.pdf');

  // Ejecutar handleRenameScore con mock prompt que confirma nuevo nombre
  assert.strictEqual(typeof handleRenameScore, 'function', 'handleRenameScore debe estar definida en app.js');

  const promptMock = (msg, defaultVal) => {
    assert.strictEqual(defaultVal, 'bach-original.pdf', 'El prompt debe sugerir el nombre actual');
    return 'Bach - Invención No. 1';
  };

  const result = await handleRenameScore('score-bach.pdf', listEl, emptyEl, storage, promptMock);
  assert.ok(result, 'handleRenameScore debe retornar la partitura actualizada');
  assert.strictEqual(result.name, 'Bach - Invención No. 1');

  // 1. La UI actual refleja el nuevo nombre
  const updatedOpenBtn = item.querySelector('.library-item-btn');
  assert.strictEqual(updatedOpenBtn.textContent, 'Bach - Invención No. 1', 'El botón de la biblioteca debe mostrar el nuevo nombre');

  // 2. Persiste en almacenamiento
  const inStorage = await storage.getScore('score-bach.pdf');
  assert.strictEqual(inStorage.name, 'Bach - Invención No. 1', 'El nuevo nombre debe persistir en storage');

  // 3. Persiste en posteriores aperturas de la biblioteca
  const freshListEl = createMockElement('ul');
  await openLibrary(dialog, freshListEl, emptyEl, storage);
  const reopenedItem = freshListEl.children[0];
  const reopenedOpenBtn = reopenedItem.querySelector('.library-item-btn');
  assert.strictEqual(reopenedOpenBtn.textContent, 'Bach - Invención No. 1', 'Al reabrir la biblioteca debe mostrar el nombre persistido');
}

async function testRenameScoreCancelOrEmptyDoesNotAlterScore() {
  await storage.clear();

  await storage.saveScore({
    id: 'score-mozart.pdf',
    name: 'mozart-concerto.pdf',
    type: 'pdf',
    data: new Uint8Array([7, 8, 9]).buffer,
  });

  const dialog = { open: false, showModal() { this.open = true; }, close() { this.open = false; } };
  const emptyEl = { hidden: false };
  const listEl = createMockElement('ul');

  await openLibrary(dialog, listEl, emptyEl, storage);
  const item = listEl.children[0];
  const openBtn = item.querySelector('.library-item-btn');

  // 1. Cancelar prompt (retorna null)
  const resCancel = await handleRenameScore('score-mozart.pdf', listEl, emptyEl, storage, () => null);
  assert.strictEqual(resCancel, null, 'Al cancelar debe retornar null');
  assert.strictEqual(openBtn.textContent, 'mozart-concerto.pdf', 'El nombre en la lista no debe cambiar al cancelar');

  let inStorage = await storage.getScore('score-mozart.pdf');
  assert.strictEqual(inStorage.name, 'mozart-concerto.pdf', 'El nombre en storage no debe cambiar al cancelar');

  // 2. Nombre vacío o de puros espacios en blanco
  const resWhitespace = await handleRenameScore('score-mozart.pdf', listEl, emptyEl, storage, () => '    ');
  assert.strictEqual(resWhitespace, null, 'Un nombre en blanco debe retornar null');
  assert.strictEqual(openBtn.textContent, 'mozart-concerto.pdf', 'El nombre en la lista no debe cambiar ante nombre vacío');

  inStorage = await storage.getScore('score-mozart.pdf');
  assert.strictEqual(inStorage.name, 'mozart-concerto.pdf', 'El nombre en storage no debe cambiar');

  // 3. Nombre idéntico sin cambios
  const resSame = await handleRenameScore('score-mozart.pdf', listEl, emptyEl, storage, () => 'mozart-concerto.pdf');
  assert.strictEqual(resSame, null, 'Sin cambios de nombre debe retornar null');
  assert.strictEqual(openBtn.textContent, 'mozart-concerto.pdf');
}

async function run() {
  await testRenameScoreUpdatesUIAndStorage();
  await testRenameScoreCancelOrEmptyDoesNotAlterScore();
  console.log('✅ T36 passed: library rename flow handles updates, cancellation and empty input cleanly');
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
