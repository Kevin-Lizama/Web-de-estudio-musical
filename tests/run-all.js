// tests/run-all.js — Suite test runner
// Ejecuta cada archivo *.test.js en su propio proceso para aislamiento de estado y mocks.

const fs = require('fs');
const path = require('path');
const { fork } = require('child_process');

const testsDir = __dirname;
const testFiles = fs.readdirSync(testsDir)
  .filter((f) => f.endsWith('.test.js'))
  .sort();

console.log(`\n🎼 Ejecutando suite de pruebas (${testFiles.length} archivos)...\n`);

let passed = 0;
let failed = 0;

function runTest(index) {
  if (index >= testFiles.length) {
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`Resumen: ${passed} pasadas, ${failed} fallidas de ${testFiles.length} pruebas.`);
    console.log(`${'─'.repeat(50)}\n`);
    process.exit(failed > 0 ? 1 : 0);
  }

  const file = testFiles[index];
  const filePath = path.join(testsDir, file);
  const child = fork(filePath, [], { stdio: 'inherit' });

  child.on('exit', (code) => {
    if (code === 0) {
      passed++;
    } else {
      failed++;
      console.error(`❌ Falló archivo: ${file}`);
    }
    runTest(index + 1);
  });
}

runTest(0);

