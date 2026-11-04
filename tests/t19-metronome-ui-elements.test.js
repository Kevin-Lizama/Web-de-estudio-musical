// T19: metronome UI elements (button, bpm input, time signature select) are present in header
// Verifica la presencia en <header> de:
// 1. #metronome-btn con texto inicial "Metrónomo"
// 2. #bpm-input de tipo number (o con min="40", max="240")
// 3. #time-signature-select con opciones para 2/4, 3/4, 4/4 y 6/8

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

// 1. Botón de metrónomo
assert.ok(
  html.includes('id="metronome-btn"'),
  'Debe existir un elemento con id="metronome-btn"'
);
assert.ok(
  /<button[^>]*id="metronome-btn"[^>]*>[\s\S]*?Metrónomo[\s\S]*?<\/button>/.test(html) ||
  /id="metronome-btn"[^>]*>[\s\S]*?Metrónomo[\s\S]*?<\/button>/.test(html),
  'El botón #metronome-btn debe tener el texto inicial "Metrónomo"'
);

// 2. Control de BPM
assert.ok(
  html.includes('id="bpm-input"'),
  'Debe existir un control con id="bpm-input"'
);
const bpmMatch = html.match(/<input[^>]*id="bpm-input"[^>]*>/);
assert.ok(bpmMatch, 'Debe ser un elemento <input>');
assert.ok(bpmMatch[0].includes('min="40"'), 'El control #bpm-input debe tener min="40"');
assert.ok(bpmMatch[0].includes('max="240"'), 'El control #bpm-input debe tener max="240"');

// 3. Selector de compás
assert.ok(
  html.includes('id="time-signature-select"'),
  'Debe existir un selector con id="time-signature-select"'
);
const selectSection = html.slice(html.indexOf('id="time-signature-select"'));
const selectBlock = selectSection.slice(0, selectSection.indexOf('</select>'));

assert.ok(selectBlock.includes('2/4'), 'El selector debe incluir opción 2/4');
assert.ok(selectBlock.includes('3/4'), 'El selector debe incluir opción 3/4');
assert.ok(selectBlock.includes('4/4'), 'El selector debe incluir opción 4/4');
assert.ok(selectBlock.includes('6/8'), 'El selector debe incluir opción 6/8');

console.log('✅ T19 passed: metronome UI elements are present in header');

