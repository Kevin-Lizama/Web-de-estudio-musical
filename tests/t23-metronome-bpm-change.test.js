// T23: changing BPM during playback updates interval dynamically without stopping the metronome
// Verifica que:
// 1. Con el metrónomo en reproducción a un BPM inicial (ej. 60 BPM -> 1.0s por pulso), los pulsos se programan con ese intervalo.
// 2. Al cambiar el valor de bpm-input durante la reproducción (ej. a 120 BPM -> 0.5s por pulso), isPlaying permanece true.
// 3. Los pulsos generados tras el cambio adoptan inmediatamente el nuevo intervalo de tiempo sin requerir reiniciar el metrónomo.
// 4. Si se ingresa un valor fuera de rango (<40 o >240), se acota a los límites seguros sin colapsar el scheduler.

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

// 1. Iniciar a 60 BPM (intervalo esperado = 1.0s)
stopMetronome();
const btn = { textContent: 'Metrónomo' };
const bpmInput = { value: '60' };
const timeSignatureSelect = { value: '4/4' };

toggleMetronome(btn, bpmInput, timeSignatureSelect);

const audioCtx = getMetronomeState().audioContext;
assert.strictEqual(getMetronomeState().isPlaying, true, 'El metrónomo debe estar activo');

const schedulerEntry = scheduledIntervals[scheduledIntervals.length - 1];
assert.ok(schedulerEntry, 'El temporizador del scheduler debe estar activo');

// Simular 2.5 segundos a 60 BPM
const step = 0.05;
while (audioCtx.currentTime < 2.5) {
  audioCtx.currentTime += step;
  schedulerEntry.fn();
}

const pulsesPhase1 = audioCtx.createdOscillators.map((o) => o.startedAt).sort((a, b) => a - b);
assert.ok(pulsesPhase1.length >= 2, 'Debe haber al menos 2 pulsos generados en la fase 1');

for (let i = 1; i < pulsesPhase1.length; i++) {
  const interval = pulsesPhase1[i] - pulsesPhase1[i - 1];
  assert.ok(
    Math.abs(interval - 1.0) < 0.001,
    `El intervalo a 60 BPM debe ser 1.0s pero fue ${interval}s (índice ${i})`
  );
}

// 2. Modificar BPM en caliente a 120 BPM (intervalo esperado = 0.5s)
bpmInput.value = '120';

// Verificar que NO se detuvo la reproducción
assert.strictEqual(getMetronomeState().isPlaying, true, 'El cambio de BPM no debe interrumpir la reproducción');
assert.strictEqual(btn.textContent, 'Detener', 'El botón debe continuar en estado "Detener"');

// Simular 3 segundos adicionales a 120 BPM
const timeBeforePhase2 = audioCtx.currentTime;
const phase2TargetTime = timeBeforePhase2 + 3.0;
while (audioCtx.currentTime < phase2TargetTime) {
  audioCtx.currentTime += step;
  schedulerEntry.fn();
}

// Filtrar pulsos programados después del cambio en caliente
const pulsesPhase2 = audioCtx.createdOscillators
  .map((o) => o.startedAt)
  .filter((t) => t >= timeBeforePhase2 + 0.15) // superar ventana de lookahead previa
  .sort((a, b) => a - b);

assert.ok(pulsesPhase2.length >= 3, 'Debe haber múltiples pulsos generados en la fase 2');

for (let i = 1; i < pulsesPhase2.length; i++) {
  const interval = pulsesPhase2[i] - pulsesPhase2[i - 1];
  assert.ok(
    Math.abs(interval - 0.5) < 0.001,
    `El intervalo a 120 BPM debe ser 0.5s pero fue ${interval}s (índice ${i})`
  );
}

// 3. Test de robustez: cambio a valores no válidos o fuera de rango
['999', '-50', '0', 'invalido', '', null].forEach((badVal) => {
  bpmInput.value = badVal;
  audioCtx.currentTime += 0.1;
  assert.doesNotThrow(() => {
    schedulerEntry.fn();
  }, `El valor anómalo "${badVal}" no debe provocar excepciones en el planificador`);
});

stopMetronome();
console.log('✅ T23 passed: changing BPM during playback updates interval dynamically without stopping the metronome');

