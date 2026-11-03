// T1: shows empty state when no PDF is loaded
// Verifica que index.html contenga un elemento #empty-state visible por defecto
// y que invite al usuario a abrir un archivo.

const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');

assert.ok(
  html.includes('id="empty-state"'),
  'Debe existir un elemento con id="empty-state"'
);

// El empty-state no debe estar oculto por defecto (sin display:none ni hidden)
assert.ok(
  !html.match(/id="empty-state"[^>]*hidden/),
  'El empty-state no debe tener el atributo hidden por defecto'
);

// Debe invitar a abrir un archivo (texto orientativo)
assert.ok(
  html.match(/abrir|open|selecciona|select/i),
  'El empty-state debe invitar al usuario a abrir un archivo'
);

console.log('✅ T1 passed: empty state visible y con mensaje orientativo');

