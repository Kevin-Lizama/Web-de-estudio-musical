// T2: open button triggers file input for .pdf files
// Verifica que el botón #open-btn exista y que haya un file input que acepte solo .pdf

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

assert.ok(
  html.includes('id="open-btn"'),
  'Debe existir un botón con id="open-btn"'
);

assert.ok(
  html.includes('type="file"'),
  'Debe existir un input de tipo file'
);

// Extrae el atributo accept del file-input
const match = html.match(/id="file-input"[^>]*accept="([^"]*)"/);
assert.ok(match, 'Debe existir un input#file-input con atributo accept');
assert.ok(
  match[1].includes('.pdf'),
  'El input de tipo file debe aceptar .pdf'
);

console.log('✅ T2 passed: botón open y file input con soporte de .pdf presentes');

