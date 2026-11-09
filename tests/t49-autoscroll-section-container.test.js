// T49: auto-scroll button and speed slider are inside a dedicated container (.section-autoscroll)
// Verifica que dentro de <header>, los controles de auto-scroll (#autoscroll-btn y #speed-input)
// estén agrupados dentro de un contenedor con clase o identificador de sección.

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

const headerMatch = html.match(/<header[\s\S]*?<\/header>/);
assert.ok(headerMatch, 'Debe existir un elemento <header>');
const headerHtml = headerMatch[0];

// Buscamos un contenedor de sección para auto-scroll
const sectionMatch = headerHtml.match(/<([a-z0-9]+)[^>]*class="[^"]*\bsection-autoscroll\b[^"]*"[\s\S]*?<\/\1>/i);
assert.ok(
  sectionMatch,
  'Debe existir un contenedor con la clase "section-autoscroll" dentro del <header>'
);

const sectionContent = sectionMatch[0];
assert.ok(
  sectionContent.includes('id="autoscroll-btn"'),
  'El contenedor .section-autoscroll debe contener #autoscroll-btn'
);
assert.ok(
  sectionContent.includes('id="speed-input"'),
  'El contenedor .section-autoscroll debe contener #speed-input'
);

console.log('✅ T49 passed: auto-scroll controls are grouped in .section-autoscroll');

