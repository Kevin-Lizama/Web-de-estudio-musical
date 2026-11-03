// T11: empty state remains when zero files are opened (cancel or empty selection)
// Verifica que el empty-state NO se oculta si:
// 1. Se llama con un array vacío (usuario cancela antes de seleccionar)
// 2. Se llama con null/undefined (FileList vacío, cancel del OS picker)
// Y que tampoco se eliminan elementos del visor en esos casos.

const assert = require('assert');

global.FileReader = class { readAsArrayBuffer() {} };
global.document = { createElement: () => ({}) };
global.URL = { createObjectURL: () => 'blob:mock', revokeObjectURL: () => {} };

const { handleFileOpen } = require('../app.js');

async function run() {
  // Caso 1: array vacío — simula que el usuario abre el picker y no selecciona nada
  let appendCount1 = 0;
  const viewer1 = {
    appendChild: () => { appendCount1++; },
    querySelectorAll: () => [],
  };
  const emptyState1 = { hidden: false };

  await handleFileOpen([], viewer1, emptyState1);

  assert.strictEqual(
    emptyState1.hidden,
    false,
    'emptyState NO debe ocultarse cuando se abre con array vacío'
  );
  assert.strictEqual(
    appendCount1,
    0,
    'No debe llamarse appendChild cuando el array está vacío'
  );

  // Caso 2: null — simula cancel del picker (e.target.files puede ser null)
  let appendCount2 = 0;
  const viewer2 = {
    appendChild: () => { appendCount2++; },
    querySelectorAll: () => [],
  };
  const emptyState2 = { hidden: false };

  await handleFileOpen(null, viewer2, emptyState2);

  assert.strictEqual(
    emptyState2.hidden,
    false,
    'emptyState NO debe ocultarse cuando se llama con null'
  );
  assert.strictEqual(
    appendCount2,
    0,
    'No debe llamarse appendChild cuando files es null'
  );

  console.log('✅ T11 passed: empty state remains when zero files are opened');
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

