// T40: library dialog contains open-btn and file-input with full format support
// Verifica que el diálogo de biblioteca contenga el botón "Abrir partitura" (con type="button")
// y el input de archivo con soporte para PDF, imágenes y selección múltiple.

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

const dialogMatch = html.match(/<dialog[^>]*id="library-dialog"[\s\S]*?<\/dialog>/);
assert.ok(dialogMatch, 'Debe existir un elemento <dialog> con id="library-dialog"');

const dialogHtml = dialogMatch[0];

// 1. Botón "Abrir partitura" dentro del diálogo con type="button"
assert.ok(
  /<button[^>]*id="open-btn"[^>]*type="button"[^>]*>[\s\S]*?Abrir partitura[\s\S]*?<\/button>/.test(dialogHtml) ||
  /<button[^>]*type="button"[^>]*id="open-btn"[^>]*>[\s\S]*?Abrir partitura[\s\S]*?<\/button>/.test(dialogHtml),
  'El diálogo de biblioteca debe contener un <button id="open-btn" type="button"> con el texto "Abrir partitura"'
);

// 2. Input de archivo dentro del diálogo con todos sus atributos requeridos
const inputMatch = dialogHtml.match(/<input[^>]*id="file-input"[^>]*>/);
assert.ok(inputMatch, 'El diálogo de biblioteca debe contener un <input id="file-input">');

const inputHtml = inputMatch[0];
assert.ok(inputHtml.includes('type="file"'), 'file-input debe ser de tipo file');
assert.ok(inputHtml.includes('hidden'), 'file-input debe estar oculto (hidden)');
assert.ok(/\bmultiple\b/.test(inputHtml), 'file-input debe admitir selección múltiple (multiple)');

const acceptMatch = inputHtml.match(/accept="([^"]*)"/);
assert.ok(acceptMatch, 'file-input debe tener el atributo accept');
const acceptVal = acceptMatch[1];
assert.ok(acceptVal.includes('.pdf'), 'accept debe incluir .pdf');
assert.ok(acceptVal.includes('image/jpeg'), 'accept debe incluir image/jpeg');
assert.ok(acceptVal.includes('image/png'), 'accept debe incluir image/png');
assert.ok(acceptVal.includes('image/webp'), 'accept debe incluir image/webp');

console.log('✅ T40 passed: library dialog contains open-btn and file-input with full format support');

