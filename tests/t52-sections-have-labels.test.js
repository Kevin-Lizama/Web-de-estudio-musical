// T52: sections have an identifying title/label/legend
// Verifica que cada sección de controles (.section-autoscroll y .section-metronome)
// cuente con un elemento de título, etiqueta o aria-label identificativo ("Auto-scroll" / "Metrónomo").

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

const headerMatch = html.match(/<header[\s\S]*?<\/header>/);
assert.ok(headerMatch, 'Debe existir un elemento <header>');
const headerHtml = headerMatch[0];

const autoScrollMatch = headerHtml.match(/<([a-z0-9]+)[^>]*class="[^"]*\bsection-autoscroll\b[^"]*"[\s\S]*?<\/\1>/i);
assert.ok(autoScrollMatch, 'Debe existir .section-autoscroll');
const autoScrollHtml = autoScrollMatch[0];

const metronomeMatch = headerHtml.match(/<([a-z0-9]+)[^>]*class="[^"]*\bsection-metronome\b[^"]*"[\s\S]*?<\/\1>/i);
assert.ok(metronomeMatch, 'Debe existir .section-metronome');
const metronomeHtml = metronomeMatch[0];

// Comprobar que en auto-scroll hay un identificador de grupo (por ejemplo legend, .section-title o aria-label)
const hasAutoScrollTitle = (
  /<(legend|span)[^>]*class="[^"]*\bsection-title\b[^"]*"[^>]*>[\s\S]*?Auto-scroll[\s\S]*?<\/\1>/i.test(autoScrollHtml) ||
  /aria-label="[^"]*Auto-scroll[^"]*"/i.test(autoScrollHtml)
);
assert.ok(hasAutoScrollTitle, '.section-autoscroll debe tener un título visible o accesible que identifique el grupo "Auto-scroll"');

// Comprobar que en metrónomo hay un identificador de grupo
const hasMetronomeTitle = (
  /<(legend|span)[^>]*class="[^"]*\bsection-title\b[^"]*"[^>]*>[\s\S]*?Metrónomo[\s\S]*?<\/\1>/i.test(metronomeHtml) ||
  /aria-label="[^"]*Metrónomo[^"]*"/i.test(metronomeHtml)
);
assert.ok(hasMetronomeTitle, '.section-metronome debe tener un título visible o accesible que identifique el grupo "Metrónomo"');

console.log('✅ T52 passed: sections have identifying title/label');

