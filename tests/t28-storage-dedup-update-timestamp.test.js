// T28: storage dedup and update timestamp
// Verifica que al abrir una partitura ya existente en la biblioteca:
// 1. No se duplique el registro en el almacenamiento (listScores mantiene la cantidad de partituras únicas).
// 2. Se actualice la marca temporal updatedAt a la nueva fecha de uso.
// 3. Quede actualizada como la última partitura activa.

const assert = require('assert');

// Mock mínimo para DOM
global.document = {
  createElement: () => ({ getContext: () => ({}) }),
};

global.pdfjsLib = {
  getDocument: () => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: () => Promise.resolve({
        getViewport: () => ({ width: 100, height: 100 }),
        render: () => ({ promise: Promise.resolve() }),
      }),
    }),
  }),
};

const storage = require('../storage.js');
const { handleFileOpen } = require('../app.js');

async function testDedupAndUpdateTimestamp() {
  await storage.clear();

  const viewer = { children: [], appendChild() {}, querySelectorAll: () => [] };
  const emptyState = { hidden: false };

  // 1. Abrimos primera partitura A con File nativo
  const fileA = new File([new Uint8Array([1, 2, 3])], 'chopin-nocturne.pdf', { type: 'application/pdf' });
  await handleFileOpen(fileA, viewer, emptyState);

  const scoreA1 = await storage.getScore('chopin-nocturne.pdf');
  assert.ok(scoreA1, 'Debe existir chopin-nocturne.pdf en el almacén');
  const t1 = scoreA1.updatedAt;

  // Pausa para asegurar avance de reloj de alta resolución
  await new Promise((resolve) => setTimeout(resolve, 20));

  // 2. Abrimos segunda partitura B con File nativo
  const fileB = new File([new Uint8Array([4, 5, 6])], 'bach-prelude.pdf', { type: 'application/pdf' });
  await handleFileOpen(fileB, viewer, emptyState);

  let allScores = await storage.listScores();
  assert.strictEqual(allScores.length, 2, 'Debe haber exactamente 2 partituras en la biblioteca');

  const lastAfterB = await storage.getLastActiveScore();
  assert.strictEqual(lastAfterB.name, 'bach-prelude.pdf', 'La última activa debe ser bach-prelude.pdf');

  await new Promise((resolve) => setTimeout(resolve, 20));

  // 3. Reabrimos partitura A
  await handleFileOpen(fileA, viewer, emptyState);

  allScores = await storage.listScores();
  assert.strictEqual(allScores.length, 2, 'No debe duplicar registros al reabrir chopin-nocturne.pdf');

  const scoreA2 = await storage.getScore('chopin-nocturne.pdf');
  assert.ok(scoreA2.updatedAt > t1, `La marca updatedAt debió avanzar (t1=${t1}, t2=${scoreA2.updatedAt})`);

  const lastAfterReopenA = await storage.getLastActiveScore();
  assert.strictEqual(lastAfterReopenA.name, 'chopin-nocturne.pdf', 'chopin-nocturne.pdf vuelve a ser la última activa');

  console.log('✅ T28 passed: reopening a score updates its timestamp and active pointer without duplicating records');
}

testDedupAndUpdateTimestamp().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
