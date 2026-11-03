// T7: opening an image hides the empty state
// Verifica que al abrir un archivo de imagen, emptyState.hidden sea establecido en true,
// y que llamadas sin archivo no alteren el estado.

const assert = require('assert');

global.document = {
  createElement: () => ({}),
};

global.URL = {
  createObjectURL: () => 'blob:mock-url',
};

const { handleFileOpen } = require('../app.js');

async function run() {
  const container = {
    appendChild: () => {},
    querySelectorAll: () => [],
  };

  // Caso 1: abrir imagen oculta el empty-state
  const emptyState1 = { hidden: false };
  const file1 = { type: 'image/jpeg', name: 'partitura.jpg' };
  await handleFileOpen(file1, container, emptyState1);
  assert.strictEqual(emptyState1.hidden, true, 'emptyState.hidden debe ser true al abrir una imagen');

  // Caso 2: llamada sin archivo no altera empty-state
  const emptyState2 = { hidden: false };
  await handleFileOpen(null, container, emptyState2);
  assert.strictEqual(emptyState2.hidden, false, 'emptyState no debe alterarse si file es null/indefinido');

  console.log('✅ T7 passed: opening an image hides the empty state');
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
