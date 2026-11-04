// T31: library list scores
// Verifica que al abrir la biblioteca con partituras guardadas:
// 1. El estado vacío queda oculto (#library-empty hidden === true).
// 2. Se crea un botón interactivo dentro de un <li> por cada partitura con su nombre y dataset.id.
// 3. El botón tiene type="button" para evitar submits involuntarios.
// 4. Al abrir nuevamente tras agregar otra partitura, la lista se refresca sin acumular duplicados.

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

async function testListScores() {
  await storage.clear();

  await storage.saveScore({
    id: 'chopin-nocturne.pdf',
    name: 'chopin-nocturne.pdf',
    type: 'pdf',
    data: new Uint8Array([1, 2, 3]).buffer,
  });

  await storage.saveScore({
    id: 'bach-prelude.png',
    name: 'bach-prelude.png',
    type: 'images',
    data: [{ name: 'bach-prelude.png', type: 'image/png', buffer: new Uint8Array([4, 5]).buffer }],
  });

  const dialog = {
    open: false,
    showModal() { this.open = true; },
    close() { this.open = false; },
  };

  const emptyEl = { hidden: false };
  const listEl = createMockElement('ul');

  // Primera apertura
  await openLibrary(dialog, listEl, emptyEl, storage);

  assert.strictEqual(emptyEl.hidden, true, 'El mensaje de vacío debe estar oculto cuando hay partituras');
  assert.strictEqual(listEl.children.length, 2, 'Deben existir exactamente 2 elementos en la lista');

  // Verificar estructura accesible de cada ítem
  listEl.children.forEach((li) => {
    assert.strictEqual(li.tagName, 'LI');
    assert.ok(li.children.length >= 1, 'El elemento debe contener al menos el botón de abrir');
    const btn = li.children[0];
    assert.strictEqual(btn.tagName, 'BUTTON');
    assert.strictEqual(btn.type, 'button', 'El botón debe tener type="button" explícito');
    assert.ok(btn.className.includes('library-item-btn'));
    assert.ok(btn.dataset.id, 'El botón debe tener dataset.id');
    assert.ok(btn.textContent.length > 0, 'El botón debe tener texto visible');
  });

  const renderedNames = listEl.children.map((li) => li.children[0].textContent);
  assert.ok(renderedNames.includes('chopin-nocturne.pdf'), 'Debe incluir chopin-nocturne.pdf');
  assert.ok(renderedNames.includes('bach-prelude.png'), 'Debe incluir bach-prelude.png');

  // Segunda apertura tras guardar una 3ra partitura: no debe duplicar las 2 anteriores
  await storage.saveScore({
    id: 'debussy-claire.pdf',
    name: 'debussy-claire.pdf',
    type: 'pdf',
    data: new Uint8Array([7, 8]).buffer,
  });

  await openLibrary(dialog, listEl, emptyEl, storage);
  assert.strictEqual(listEl.children.length, 3, 'Al reabrir debe refrescar y contener exactamente 3 partituras, sin duplicar');
}

testListScores()
  .then(() => {
    console.log('✅ T31 passed: library renders list of saved scores with accessible buttons and no duplicates');
  })
  .catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
