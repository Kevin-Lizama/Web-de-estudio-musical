// T39: navbar does not contain open-btn or file-input
// Verifica que la barra de navegación (<header>) no contenga el botón "Abrir partitura" ni el input de archivo asociado.

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

const headerMatch = html.match(/<header[\s\S]*?<\/header>/);
assert.ok(headerMatch, 'Debe existir un elemento <header>');

const headerHtml = headerMatch[0];

assert.ok(
  !headerHtml.includes('id="open-btn"'),
  '<header> ya no debe contener el botón con id="open-btn"'
);

assert.ok(
  !headerHtml.includes('id="file-input"'),
  '<header> ya no debe contener el input con id="file-input"'
);

console.log('✅ T39 passed: navbar does not contain open-btn or file-input');

