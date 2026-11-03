// T2: open button triggers file input for .pdf files
// Verifica que el botón #open-btn exista y que haya un file input que acepte solo .pdf

const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');

assert.ok(
  html.includes('id="open-btn"'),
  'Debe existir un botón con id="open-btn"'
);

assert.ok(
  html.includes('type="file"'),
  'Debe existir un input de tipo file'
);

assert.ok(
  html.includes('accept=".pdf"'),
  'El input de tipo file debe aceptar solo .pdf'
);

console.log('✅ T2 passed: botón open y file input con accept=".pdf" presentes');

