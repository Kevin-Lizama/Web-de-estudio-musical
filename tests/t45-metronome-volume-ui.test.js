// T45: metronome volume control UI element is present in header
// Verifica la presencia en <header> de:
// 1. <input id="volume-input" type="range"> con min="0", max="1"
// 2. Etiqueta accesible asociada o aria-label
// 3. Valor inicial por defecto sensible entre 0.1 y 1

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

// 1. Debe estar dentro de <header>
const headerMatch = html.match(/<header[\s\S]*?<\/header>/);
assert.ok(headerMatch, 'Debe existir un elemento <header>');
const headerHtml = headerMatch[0];

assert.ok(
  headerHtml.includes('id="volume-input"'),
  'El <header> debe contener un elemento con id="volume-input"'
);

// 2. Debe ser un input range con min=0 y max=1
const inputMatch = headerHtml.match(/<input[^>]*id="volume-input"[^>]*>/);
assert.ok(inputMatch, 'Debe existir la etiqueta <input> con id="volume-input"');
const inputTag = inputMatch[0];

assert.ok(inputTag.includes('type="range"'), 'El control #volume-input debe ser de tipo range');
assert.ok(inputTag.includes('min="0"'), 'El control #volume-input debe tener min="0"');
assert.ok(inputTag.includes('max="1"'), 'El control #volume-input debe tener max="1"');

// 3. Valor por defecto sensible
const valMatch = inputTag.match(/value="([^"]+)"/);
assert.ok(valMatch, 'El control #volume-input debe tener un atributo value inicial');
const defaultVal = parseFloat(valMatch[1]);
assert.ok(
  defaultVal > 0 && defaultVal <= 1,
  `El valor por defecto debe estar entre 0 (exclusivo) y 1 (actual: ${defaultVal})`
);

// 4. Accesibilidad: etiqueta <label for="volume-input"> o aria-label
const hasLabel = headerHtml.includes('for="volume-input"');
const hasAriaLabel = inputTag.includes('aria-label');
assert.ok(
  hasLabel || hasAriaLabel,
  'El control #volume-input debe tener una etiqueta asociada (<label for="volume-input">) o aria-label'
);

console.log('✅ T45 passed: metronome volume control UI element is present in header');

