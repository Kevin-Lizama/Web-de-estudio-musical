// T48: metronome retains last configured volume across stop and restart cycles
// Verifica que:
// 1. Al iniciar el metrónomo y cambiar el volumen (ej. a 0.35).
// 2. Al detener el metrónomo (stopMetronome o segundo clic en toggle).
// 3. Al reanudar el metrónomo, el master GainNode mantiene y aplica el último volumen configurado (0.35).

const assert = require('assert');

class MockAudioParam {
  constructor(initialValue = 1) {
    this.value = initialValue;
    this.scheduledChanges = [];
  }
  setValueAtTime(val, time) {
    this.scheduledChanges.push({ type: 'set', val, time });
    this.value = val;
  }
  linearRampToValueAtTime(val, time) {
    this.scheduledChanges.push({ type: 'linearRamp', val, time });
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
  createGain() {
    const gain = new MockGainNode();
    this.createdGainNodes.push(gain);
    return gain;
  }
  createOscillator() {
    const osc = new MockOscillator();
    this.createdOscillators.push(osc);
    return osc;
  }
  suspend() {
    this.state = 'suspended';
    return Promise.resolve();
  }
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
}
MockAudioContext.instances = [];

global.AudioContext = MockAudioContext;
global.window = global;

const { toggleMetronome, stopMetronome, getMetronomeState, updateMetronomeVolume } = require('../app.js');

// 1. Iniciar con volumen inicial 0.8
stopMetronome();
const btn = { textContent: 'Metrónomo' };
const bpmInput = { value: '120' };
const timeSignatureSelect = { value: '4/4' };
const listeners = {};
const volumeInput = {
  value: '0.8',
  addEventListener(event, fn) {
    listeners[event] = fn;
  },
};

toggleMetronome(btn, bpmInput, timeSignatureSelect, volumeInput);
assert.strictEqual(getMetronomeState().isPlaying, true);
assert.strictEqual(getMetronomeState().masterGainNode.gain.value, 0.8);

// 2. Modificar volumen a 0.35 durante la sesión
volumeInput.value = '0.35';
if (typeof listeners['input'] === 'function') listeners['input']();
else updateMetronomeVolume(0.35);
assert.strictEqual(getMetronomeState().masterGainNode.gain.value, 0.35);

// 3. Detener el metrónomo
toggleMetronome(btn, bpmInput, timeSignatureSelect, volumeInput);
assert.strictEqual(getMetronomeState().isPlaying, false, 'El metrónomo debe haberse detenido');

// 4. Reanudar el metrónomo (segundo inicio)
toggleMetronome(btn, bpmInput, timeSignatureSelect, volumeInput);
assert.strictEqual(getMetronomeState().isPlaying, true, 'El metrónomo debe haberse reanudado');

// 5. Verificar que el master GainNode aplica el volumen persistido (0.35)
const resumedMasterGain = getMetronomeState().masterGainNode;
assert.ok(resumedMasterGain, 'Debe existir masterGainNode al reanudar');
assert.strictEqual(
  resumedMasterGain.gain.value,
  0.35,
  `El volumen tras reanudar debe ser 0.35 (obtenido: ${resumedMasterGain.gain.value})`
);

// Cleanup
stopMetronome();

console.log('✅ T48 passed: metronome retains last configured volume across stop and restart cycles');

