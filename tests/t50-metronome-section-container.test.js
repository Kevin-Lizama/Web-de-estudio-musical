// T50: metronome controls are inside a dedicated container (.section-metronome)
// Verifica que dentro de <header>, los controles de metrónomo
// (#metronome-btn, #bpm-input, #time-signature-select, #volume-input)
// estén agrupados dentro de un contenedor con clase "section-metronome".

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

const headerMatch = html.match(/<header[\s\S]*?<\/header>/);
assert.ok(headerMatch, 'Debe existir un elemento <header>');
const headerHtml = headerMatch[0];

const sectionMatch = headerHtml.match(/<([a-z0-9]+)[^>]*class="[^"]*\bsection-metronome\b[^"]*"[\s\S]*?<\/\1>/i);
assert.ok(
  sectionMatch,
  'Debe existir un contenedor con la clase "section-metronome" dentro del <header>'
);

const sectionContent = sectionMatch[0];
assert.ok(
  sectionContent.includes('id="metronome-btn"'),
  'El contenedor .section-metronome debe contener #metronome-btn'
);
assert.ok(
  sectionContent.includes('id="bpm-input"'),
  'El contenedor .section-metronome debe contener #bpm-input'
);
assert.ok(
  sectionContent.includes('id="time-signature-select"'),
  'El contenedor .section-metronome debe contener #time-signature-select'
);
assert.ok(
  sectionContent.includes('for="time-signature-select"'),
  'El contenedor .section-metronome debe contener el label para #time-signature-select'
);
assert.ok(
  sectionContent.includes('id="volume-input"'),
  'El contenedor .section-metronome debe contener #volume-input'
);

console.log('✅ T50 passed: metronome controls are grouped in .section-metronome');

