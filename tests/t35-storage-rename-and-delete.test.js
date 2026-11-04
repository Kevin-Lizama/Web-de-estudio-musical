// T35: storage rename and delete scores
// Verifica las operaciones de almacenamiento persistente para renombrar y eliminar partituras.

const assert = require('assert');
const storage = require('../storage.js');

async function testRenameScore() {
  await storage.clear();

  const originalBuffer = new Uint8Array([10, 20, 30, 40]).buffer;
  const initialTime = Date.now() - 5000;

  await storage.saveScore({
    id: 'score-1',
    name: 'Sonata No. 1.pdf',
    type: 'pdf',
    data: originalBuffer,
    updatedAt: initialTime,
  });

  assert.strictEqual(typeof storage.renameScore, 'function', 'storage.renameScore debe estar definido');

  const updated = await storage.renameScore('score-1', 'Sonata No. 1 (Revisada).pdf');
  assert.ok(updated, 'renameScore debe retornar el registro actualizado');
  assert.strictEqual(updated.id, 'score-1', 'El ID debe permanecer intacto');
  assert.strictEqual(updated.name, 'Sonata No. 1 (Revisada).pdf', 'El nombre debe ser actualizado');
  assert.ok(updated.updatedAt > initialTime, 'updatedAt debe haberse actualizado');

  // Verificar persistencia via getScore
  const retrieved = await storage.getScore('score-1');
  assert.ok(retrieved, 'La partitura debe existir en storage');
  assert.strictEqual(retrieved.id, 'score-1');
  assert.strictEqual(retrieved.name, 'Sonata No. 1 (Revisada).pdf');
  assert.strictEqual(retrieved.type, 'pdf');
  assert.ok(retrieved.data instanceof ArrayBuffer, 'Los datos binarios deben preservarse');
  assert.deepStrictEqual(Array.from(new Uint8Array(retrieved.data)), [10, 20, 30, 40]);

  // Verificar en listScores
  const list = await storage.listScores();
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].name, 'Sonata No. 1 (Revisada).pdf');

  // Si no existe el ID, debe retornar null
  const nonExistent = await storage.renameScore('non-existent-id', 'Otro nombre');
  assert.strictEqual(nonExistent, null, 'Renombrar un ID inexistente debe retornar null');
}

async function testDeleteScore() {
  await storage.clear();

  await storage.saveScore({
    id: 'score-a',
    name: 'Prelude A.pdf',
    type: 'pdf',
    data: new Uint8Array([1, 2]).buffer,
  });

  await storage.saveScore({
    id: 'score-b',
    name: 'Fugue B.pdf',
    type: 'pdf',
    data: new Uint8Array([3, 4]).buffer,
  });

  assert.strictEqual(typeof storage.deleteScore, 'function', 'storage.deleteScore debe estar definido');

  // Inicialmente score-b es la última activa
  let lastActive = await storage.getLastActiveScore();
  assert.strictEqual(lastActive.id, 'score-b');

  // Eliminar score-a (no activa)
  const deletedA = await storage.deleteScore('score-a');
  assert.strictEqual(deletedA, true, 'deleteScore debe retornar true al eliminar');
  assert.strictEqual(await storage.getScore('score-a'), null, 'score-a no debe existir tras ser eliminada');

  let list = await storage.listScores();
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].id, 'score-b');

  // lastActive sigue siendo score-b
  lastActive = await storage.getLastActiveScore();
  assert.strictEqual(lastActive.id, 'score-b');

  // Ahora eliminamos score-b (que es la activa)
  const deletedB = await storage.deleteScore('score-b');
  assert.strictEqual(deletedB, true);
  assert.strictEqual(await storage.getScore('score-b'), null);

  list = await storage.listScores();
  assert.strictEqual(list.length, 0, 'La biblioteca debe quedar vacía');

  // Al haber eliminado la activa, getLastActiveScore debe retornar null
  lastActive = await storage.getLastActiveScore();
  assert.strictEqual(lastActive, null, 'getLastActiveScore debe retornar null si la última activa fue eliminada');

  // Caso: eliminar la activa cuando aún quedan otras partituras en la biblioteca
  await storage.saveScore({
    id: 'score-remaining',
    name: 'Remaining.pdf',
    type: 'pdf',
    data: new Uint8Array([5, 6]).buffer,
  });
  await storage.saveScore({
    id: 'score-to-delete',
    name: 'To Delete.pdf',
    type: 'pdf',
    data: new Uint8Array([7, 8]).buffer,
  });

  lastActive = await storage.getLastActiveScore();
  assert.strictEqual(lastActive.id, 'score-to-delete', 'Precondición: score-to-delete es la activa');

  await storage.deleteScore('score-to-delete');
  assert.strictEqual(await storage.getScore('score-to-delete'), null);

  // La activa debe ser null (no debe apuntar a la partitura borrada)
  lastActive = await storage.getLastActiveScore();
  assert.strictEqual(lastActive, null, 'Al eliminar la partitura activa, no debe quedar ninguna partitura activa por defecto');

  // Pero la partitura restante sigue disponible e íntegra en la biblioteca
  list = await storage.listScores();
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].id, 'score-remaining');
  const remainingRecord = await storage.getScore('score-remaining');
  assert.ok(remainingRecord);
  assert.deepStrictEqual(Array.from(new Uint8Array(remainingRecord.data)), [5, 6]);

  // Eliminar ID inexistente retorna false
  const deletedNonExistent = await storage.deleteScore('non-existent');
  assert.strictEqual(deletedNonExistent, false);
}

async function run() {
  await testRenameScore();
  await testDeleteScore();
  console.log('✅ T35 passed: storage rename and delete operations work with full persistence and active pointer cleanup');
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

