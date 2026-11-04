// T30: library empty state
// Verifica que al abrir la biblioteca con el almacenamiento vacío:
// 1. Invoca showModal() en el diálogo.
// 2. Muestra el estado vacío (emptyEl.hidden === false).
// 3. Limpia cualquier contenido preexistente en la lista (listEl no conserva elementos hijos).

const assert = require('assert');
const storage = require('../storage.js');
const { openLibrary } = require('../app.js');

function createMockList() {
  let children = [];
  return {
    get children() {
      return children;
    },
    set innerHTML(val) {
      if (val === '') children = [];
    },
    appendChild(child) {
      children.push(child);
    },
  };
}

async function testEmptyLibrary() {
  await storage.clear();

  let showModalCalled = false;
  const dialog = {
    open: false,
    showModal() {
      showModalCalled = true;
      this.open = true;
    },
    close() {
      this.open = false;
    },
  };

  const emptyEl = { hidden: true };
  const listEl = createMockList();

  // Simulamos contenido previo que pudiera haber quedado en el DOM
  listEl.appendChild({ tagName: 'LI', textContent: 'elemento-antiguo' });
  assert.strictEqual(listEl.children.length, 1, 'Precondición: lista tiene 1 hijo previo');

  await openLibrary(dialog, listEl, emptyEl, storage);

  assert.strictEqual(showModalCalled, true, 'Debe invocar showModal() en el diálogo modal');
  assert.strictEqual(dialog.open, true, 'El diálogo debe quedar en estado abierto');
  assert.strictEqual(emptyEl.hidden, false, 'El mensaje de biblioteca vacía debe ser visible (hidden === false)');
  assert.strictEqual(listEl.children.length, 0, 'La lista debe haber eliminado los elementos previos');
}

testEmptyLibrary()
  .then(() => {
    console.log('✅ T30 passed: library empty state shows message and clears any previous items');
  })
  .catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
