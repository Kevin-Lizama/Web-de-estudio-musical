// T51: sections are styled to be visually distinct (borders, backgrounds, padding/margins)
// Verifica que existan reglas de estilo en style.css para .section-autoscroll y .section-metronome
// con borde o fondo (o ambos) que les den un límite visual independiente.

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const css = fs.readFileSync(path.resolve(__dirname, '../style.css'), 'utf8');

// Debe haber reglas para las secciones
const hasAutoScrollRule = /\.section-autoscroll\b/.test(css);
assert.ok(hasAutoScrollRule, 'style.css debe definir estilos para .section-autoscroll');

const hasMetronomeRule = /\.section-metronome\b/.test(css);
assert.ok(hasMetronomeRule, 'style.css debe definir estilos para .section-metronome');

// Comprobamos que tengan propiedades de delimitación visual como border o background
const hasVisualBorder = /border(-[a-z]+)?\s*:/i.test(css);
const hasVisualBackground = /background(-color)?\s*:/i.test(css);
assert.ok(hasVisualBorder || hasVisualBackground, 'Debe haber delimitación visual con border o background');

// Extraer bloques de reglas de secciones y verificar que definan border o background
function getRuleBlock(selector) {
  const regex = new RegExp(`${selector}[^{]*\\{([^}]+)\\}`, 'g');
  let match;
  let block = '';
  while ((match = regex.exec(css)) !== null) {
    block += match[1] + ';';
  }
  return block;
}

const autoScrollStyles = getRuleBlock('\\.section-autoscroll');
const metronomeStyles = getRuleBlock('\\.section-metronome');

const hasDistinctAutoScroll = /border|background/i.test(autoScrollStyles);
assert.ok(hasDistinctAutoScroll, '.section-autoscroll debe tener propiedades visuales como border o background');

const hasDistinctMetronome = /border|background/i.test(metronomeStyles);
assert.ok(hasDistinctMetronome, '.section-metronome debe tener propiedades visuales como border o background');

console.log('✅ T51 passed: sections are styled to be visually distinct');

