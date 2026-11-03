// T13: auto-scroll button and speed slider are present in header
// Verifica que existan #autoscroll-btn (con texto inicial "Auto-scroll")
// e input#speed-input (de tipo range) dentro de <header>.

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

assert.ok(
  html.includes('id="autoscroll-btn"'),
  'Debe existir un botón con id="autoscroll-btn"'
);

assert.ok(
  /id="autoscroll-btn"[^>]*>[\s\S]*?Auto-scroll[\s\S]*?<\/button>/.test(html) ||
  /<button[^>]*id="autoscroll-btn"[^>]*>[\s\S]*?Auto-scroll[\s\S]*?<\/button>/.test(html),
  'El botón #autoscroll-btn debe tener el texto inicial "Auto-scroll"'
);

assert.ok(
  html.includes('id="speed-input"'),
  'Debe existir un control con id="speed-input"'
);

const matchRange = html.match(/<input[^>]*id="speed-input"[^>]*>/);
assert.ok(matchRange, 'Debe existir un <input> con id="speed-input"');
assert.ok(
  matchRange[0].includes('type="range"'),
  'El control #speed-input debe ser de tipo "range"'
);

console.log('✅ T13 passed: auto-scroll UI elements are present in header');

