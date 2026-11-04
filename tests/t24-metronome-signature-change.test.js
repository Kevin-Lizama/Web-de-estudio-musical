// T24: changing time signature during playback adjusts accent cycle length dynamically without stopping
// Verifica que al modificar el selector de compás durante la reproducción (ej. de 4/4 a 3/4, o a 6/8 y 2/4):
// 1. isPlaying permanece true (no se detiene la sesión de práctica).
// 2. El ciclo de acentos se ajusta a la nueva métrica (ej. acentos cada 3 pulsos en 3/4, cada 2 en 2/4).
// 3. Los pulsos subsiguientes mantienen la periodicidad y la distinción de frecuencia acento/regular.

const assert = require('assert');

class MockAudioParam {
  constructor(initialValue = 0) {
    this.value = initialValue;
    this.scheduledChanges = [];
  }
  setValueAtTime(val, time) {
    this.scheduledChanges.push({ type: 'set', val, time });
    this.value = val;
  }
  exponentialRampToValueAtTime(val, time) {
    this.scheduledChanges.push({ type: 'exponentialRamp', val, time });
  }
}

class MockGainNode {
  constructor() {
    this.gain = new MockAudioParam(1);
    this.destination = null;
  }
  connect(dest) {
    this.destination = dest;
  }
}

class MockOscillator {
  constructor() {
    this.frequency = new MockAudioParam(440);
    this.destination = null;
    this.startedAt = null;
    this.stoppedAt = null;
  }
  connect(dest) {
    this.destination = dest;
  }
  start(time) {
    this.startedAt = time;
  }
  stop(time) {
    this.stoppedAt = time;
  }
}

class MockAudioContext {
  constructor() {
    this.currentTime = 0;
    this.state = 'running';
    this.destination = { type: 'AudioDestination' };
    this.createdOscillators = [];
    this.createdGainNodes = [];
    MockAudioContext.instances.push(this);
  }
  createOscillator() {
    const osc = new MockOscillator();
    this.createdOscillators.push(osc);
    return osc;
  }
  createGain() {
    const gain = new MockGainNode();
    this.createdGainNodes.push(gain);
    return gain;
  }
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
}
MockAudioContext.instances = [];

global.AudioContext = MockAudioContext;
global.window = global;

const scheduledIntervals = [];
global.setInterval = (fn, ms) => {
  const id = scheduledIntervals.length + 1;
  scheduledIntervals.push({ id, fn, ms });
  return id;
};
global.clearInterval = (id) => {
  const idx = scheduledIntervals.findIndex((entry) => entry.id === id);
  if (idx !== -1) scheduledIntervals.splice(idx, 1);
};

const { toggleMetronome, stopMetronome, getMetronomeState } = require('../app.js');

// Configuración inicial: 4/4 a 120 BPM
stopMetronome();
const btn = { textContent: 'Metrónomo' };
const bpmInput = { value: '120' };
const timeSignatureSelect = { value: '4/4' };

toggleMetronome(btn, bpmInput, timeSignatureSelect);

const audioCtx = getMetronomeState().audioContext;
assert.strictEqual(getMetronomeState().isPlaying, true, 'El metrónomo debe estar activo');

const schedulerEntry = scheduledIntervals[scheduledIntervals.length - 1];
assert.ok(schedulerEntry, 'El temporizador de scheduling debe estar activo');

const step = 0.05;

// Función auxiliar para avanzar el reloj y ejecutar el scheduler
function advanceTime(seconds) {
  const target = audioCtx.currentTime + seconds;
  while (audioCtx.currentTime < target) {
    audioCtx.currentTime += step;
    schedulerEntry.fn();
  }
}

// Función auxiliar para obtener pulsos programados a partir de un tiempo base
function getPulsesSince(sinceTime) {
  return audioCtx.createdOscillators
    .filter((osc) => osc.startedAt >= sinceTime)
    .map((osc) => {
      const setCall = osc.frequency.scheduledChanges.find((c) => c.type === 'set');
      return {
        time: osc.startedAt,
        freq: setCall ? setCall.val : osc.frequency.value,
      };
    })
    .sort((a, b) => a.time - b.time);
}

// 1. Simular al menos 1 compás completo en 4/4 (4 pulsos de 0.5s = 2.0s)
advanceTime(2.2);

const pulses44 = getPulsesSince(0);
assert.ok(pulses44.length >= 4, 'Deben haberse emitido al menos 4 pulsos en 4/4');

// Extraer dinámicamente las frecuencias observadas para acento y pulso regular
const accentFreq = pulses44[0].freq;
const regularFreq = pulses44[1].freq;

// Comprobar criterio de distinción acústica sin atarse a números mágicos fijos
assert.ok(
  accentFreq > regularFreq,
  `El tono acentuado (${accentFreq} Hz) debe ser acústicamente más agudo que el regular (${regularFreq} Hz)`
);
assert.strictEqual(pulses44[2].freq, regularFreq, 'El pulso 3 de 4/4 debe ser regular');
assert.strictEqual(pulses44[3].freq, regularFreq, 'El pulso 4 de 4/4 debe ser regular');

// 2. Modificar compás en caliente a 3/4
timeSignatureSelect.value = '3/4';

// Comprobar que no se detuvo la reproducción
assert.strictEqual(getMetronomeState().isPlaying, true, 'isPlaying debe continuar en true al cambiar compás');
assert.strictEqual(btn.textContent, 'Detener', 'El botón debe continuar en "Detener"');

// Simular 3 compases en 3/4 (3 * 3 pulsos = 9 pulsos, 9 * 0.5s = 4.5s)
const switchTime34 = audioCtx.currentTime;
advanceTime(4.8);

// Analizar pulsos generados tras superar la ventana de lookahead del cambio
const pulses34 = getPulsesSince(switchTime34 + 0.15);
assert.ok(pulses34.length >= 6, 'Deben haberse generado suficientes pulsos en 3/4');

// Encontrar el primer acento en la fase 3/4 y verificar ciclo estricto de 3 pulsos
const firstAccentIndex34 = pulses34.findIndex((p) => p.freq === accentFreq);
assert.ok(firstAccentIndex34 !== -1, 'Debe encontrarse un acento tras el cambio a 3/4');

// Verificar los siguientes dos compases completos desde ese acento
for (let bar = 0; bar < 2; bar++) {
  const barStart = firstAccentIndex34 + (bar * 3);
  if (barStart + 2 < pulses34.length) {
    assert.strictEqual(pulses34[barStart].freq, accentFreq, `Pulso 1 del compás ${bar + 1} en 3/4 debe ser acento`);
    assert.strictEqual(pulses34[barStart + 1].freq, regularFreq, `Pulso 2 del compás ${bar + 1} en 3/4 debe ser regular`);
    assert.strictEqual(pulses34[barStart + 2].freq, regularFreq, `Pulso 3 del compás ${bar + 1} en 3/4 debe ser regular`);
  }
}

// 3. Modificar compás en caliente de 3/4 a 2/4
timeSignatureSelect.value = '2/4';
assert.strictEqual(getMetronomeState().isPlaying, true, 'Debe permanecer reproduciendo al cambiar a 2/4');

const switchTime24 = audioCtx.currentTime;
advanceTime(3.2);

const pulses24 = getPulsesSince(switchTime24 + 0.15);
assert.ok(pulses24.length >= 4, 'Deben haberse generado pulsos en 2/4');

const firstAccentIndex24 = pulses24.findIndex((p) => p.freq === accentFreq);
assert.ok(firstAccentIndex24 !== -1, 'Debe encontrarse un acento en 2/4');

for (let bar = 0; bar < 2; bar++) {
  const barStart = firstAccentIndex24 + (bar * 2);
  if (barStart + 1 < pulses24.length) {
    assert.strictEqual(pulses24[barStart].freq, accentFreq, `Pulso 1 del compás ${bar + 1} en 2/4 debe ser acento`);
    assert.strictEqual(pulses24[barStart + 1].freq, regularFreq, `Pulso 2 del compás ${bar + 1} en 2/4 debe ser regular`);
  }
}

stopMetronome();
console.log('✅ T24 passed: changing time signature during playback adjusts accent cycle dynamically without stopping');

