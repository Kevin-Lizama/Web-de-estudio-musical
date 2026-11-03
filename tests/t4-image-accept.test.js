// T4: file input accepts image types in addition to PDF, and allows multi-selection
// Verifica que el atributo `accept` del input de archivo incluya
// image/jpeg, image/png e image/webp, y que tenga el atributo `multiple`.

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

// Extrae el valor del atributo accept del file-input
const match = html.match(/id="file-input"[^>]*accept="([^"]*)"/);
assert.ok(match, 'Debe existir un input#file-input con atributo accept');

const accept = match[1];

assert.ok(accept.includes('image/jpeg'), `accept debe incluir image/jpeg, tiene: "${accept}"`);
assert.ok(accept.includes('image/png'),  `accept debe incluir image/png, tiene: "${accept}"`);
assert.ok(accept.includes('image/webp'), `accept debe incluir image/webp, tiene: "${accept}"`);

// T4b: el input debe tener el atributo `multiple` para permitir multi-selección en el OS picker
const hasMultiple = /id="file-input"[^>]*\bmultiple\b/.test(html);
assert.ok(hasMultiple, 'input#file-input debe tener el atributo multiple');

console.log('✅ T4 passed: file input acepta image/jpeg, image/png e image/webp, y tiene atributo multiple');

