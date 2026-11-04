// T29: library UI elements are present in DOM
// Verifica la presencia e integridad semántica en index.html de:
// - button#library-btn dentro de <header> con texto "Biblioteca"
// - dialog#library-dialog como elemento semántico HTML5 <dialog>
// - button#close-library-btn con accesibilidad (aria-label o texto) dentro del diálogo
// - ul#library-list para la lista accesible de partituras
// - div#library-empty con atributo hidden y texto explicativo inicial

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

// 1. Botón en la cabecera
assert.ok(
  /<header[\s\S]*?<button[^>]*id="library-btn"[^>]*>[\s\S]*?Biblioteca[\s\S]*?<\/button>[\s\S]*?<\/header>/.test(html),
  'El botón #library-btn debe ser un <button> dentro de <header> con el texto "Biblioteca"'
);

// 2. Diálogo semántico <dialog>
assert.ok(
  /<dialog[^>]*id="library-dialog"[^>]*>/.test(html),
  'Debe existir un elemento semántico <dialog> con id="library-dialog"'
);

// 3. Botón de cierre accesible
assert.ok(
  /<button[^>]*id="close-library-btn"[^>]*aria-label="[^"]+"[^>]*>/.test(html),
  'El botón #close-library-btn debe tener atributo aria-label para accesibilidad'
);

// 4. Lista semántica <ul>
assert.ok(
  /<ul[^>]*id="library-list"[^>]*>/.test(html),
  'Debe existir una lista semántica <ul> con id="library-list"'
);

// 5. Estado vacío con texto informativo y atributo hidden
assert.ok(
  /<div[^>]*id="library-empty"[^>]*hidden[^>]*>[\s\S]*?<\/div>/.test(html),
  'El contenedor #library-empty debe tener el atributo hidden por defecto'
);

const emptyMatch = html.match(/id="library-empty"[^>]*>([\s\S]*?)<\/div>/);
assert.ok(
  emptyMatch && /no tienes partituras/i.test(emptyMatch[1]),
  'El contenedor #library-empty debe contener un texto explicativo indicando que no hay partituras'
);

console.log('✅ T29 passed: library UI elements are present in DOM with accessible semantics');
