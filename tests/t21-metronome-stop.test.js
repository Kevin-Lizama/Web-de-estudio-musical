// T21: stopping metronome halts scheduling, resets beat counter and restores button label to "Metrónomo"
// Verifica que al detener el metrónomo (segundo clic o invocación a stopMetronome):
// 1. isPlaying cambia a false.
// 2. El texto del botón se restablece a "Metrónomo".
// 3. El contador de pulsos/compás se reinicia a 0.
// 4. Se cancela el temporizador de lookahead (no se programan nuevos osciladores).
// 5. Al reanudar posteriormente, el ciclo recomienza desde el pulso 1 (acento).

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

let clearedIntervalId = null;
const nativeClearInterval = global.clearInterval;
global.clearInterval = (id) => {
  clearedIntervalId = id;
  return nativeClearInterval(id);
};

const { toggleMetronome, getMetronomeState, stopMetronome } = require('../app.js');

const btn = { textContent: 'Metrónomo' };
const bpmInput = { value: '120' };
const timeSignatureSelect = { value: '4/4' };

// 1. Iniciar metrónomo
toggleMetronome(btn, bpmInput, timeSignatureSelect);
assert.strictEqual(getMetronomeState().isPlaying, true, 'El metrónomo debe estar activo');
assert.strictEqual(btn.textContent, 'Detener', 'El botón debe mostrar "Detener"');

const audioCtx = MockAudioContext.instances[0];
const oscCountWhenRunning = audioCtx.createdOscillators.length;
assert.ok(oscCountWhenRunning >= 1, 'Debe haber programado pulsos iniciales');

// Registrar las frecuencias usadas en ejecución para verificar acento vs pulso regular
const firstRunPulses = audioCtx.createdOscillators.map((osc) => {
  const change = osc.frequency.scheduledChanges.find((c) => c.type === 'set');
  return change ? change.val : osc.frequency.value;
});
assert.ok(firstRunPulses.length >= 1, 'Debe haber al menos 1 pulso registrado en la primera ejecución');
const accentFrequency = firstRunPulses[0];

// 2. Detener metrónomo mediante toggle (segundo clic)
toggleMetronome(btn, bpmInput, timeSignatureSelect);

assert.strictEqual(getMetronomeState().isPlaying, false, 'isPlaying debe ser false al detener');
assert.strictEqual(btn.textContent, 'Metrónomo', 'El botón debe volver a decir "Metrónomo"');
assert.strictEqual(getMetronomeState().currentBeat, 0, 'El contador de beat debe reiniciarse a 0');
assert.notStrictEqual(clearedIntervalId, null, 'El temporizador de scheduling debe haberse limpiado');

// 3. Simular avance de tiempo mientras está detenido: ningún nuevo pulso debe programarse
audioCtx.currentTime += 5.0;
assert.strictEqual(
  audioCtx.createdOscillators.length,
  oscCountWhenRunning,
  'No deben crearse nuevos osciladores mientras el metrónomo está detenido'
);

// 4. Reanudar metrónomo: debe comenzar desde el pulso 1 (acento)
toggleMetronome(btn, bpmInput, timeSignatureSelect);
assert.strictEqual(getMetronomeState().isPlaying, true, 'Debe volver a estar activo al presionar');

const newlyCreatedOsc = audioCtx.createdOscillators[oscCountWhenRunning];
assert.ok(newlyCreatedOsc, 'Debe crear un nuevo oscilador para el primer pulso tras reanudar');

// Verificar que el pulso tras reanudar es acentuado (coincide con la frecuencia de acento registrada al inicio)
const freqChange = newlyCreatedOsc.frequency.scheduledChanges.find((c) => c.type === 'set');
assert.ok(freqChange, 'Debe programar la frecuencia del oscilador');
assert.strictEqual(
  freqChange.val,
  accentFrequency,
  'El primer pulso tras reanudar debe ser el acento del compás (frecuencia idéntica al pulso 1 inicial)'
);

// Cleanup
stopMetronome();
global.clearInterval = nativeClearInterval;

console.log('✅ T21 passed: stopping metronome halts scheduling, resets beat counter and restores UI');

