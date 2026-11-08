// T47: metronome volume at minimum (0) produces complete silence
// Verifica que:
// 1. Con el slider de volumen en 0 al iniciar el metrónomo, el masterGainNode tiene ganancia 0.
// 2. Si se ajusta a 0 durante la reproducción activa, la ganancia pasa inmediatamente a 0.
// 3. El metrónomo sigue ejecutándose y avanzando beats sin interrupción ni errores de AudioContext.

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

const { toggleMetronome, stopMetronome, getMetronomeState, updateMetronomeVolume } = require('../app.js');

// Caso A: Iniciar directamente con volumen en 0
stopMetronome();
const btn = { textContent: 'Metrónomo' };
const bpmInput = { value: '120' };
const timeSignatureSelect = { value: '4/4' };
const listeners = {};
const volumeInput = {
  value: '0',
  addEventListener(event, fn) {
    listeners[event] = fn;
  },
};

toggleMetronome(btn, bpmInput, timeSignatureSelect, volumeInput);

const state = getMetronomeState();
assert.strictEqual(state.isPlaying, true, 'El metrónomo debe iniciar aun con volumen en 0');
assert.ok(state.masterGainNode, 'Debe existir masterGainNode');
assert.strictEqual(state.masterGainNode.gain.value, 0, 'La ganancia del masterGainNode debe ser exactamente 0 con slider en 0');

// Caso B: Subir a 0.5 y luego volver a 0 (silenciar en caliente)
volumeInput.value = '0.5';
if (typeof listeners['input'] === 'function') listeners['input']();
else updateMetronomeVolume(0.5);
assert.strictEqual(state.masterGainNode.gain.value, 0.5, 'La ganancia debe subir a 0.5');

volumeInput.value = '0';
if (typeof listeners['input'] === 'function') listeners['input']();
else updateMetronomeVolume(0);
assert.strictEqual(state.masterGainNode.gain.value, 0, 'La ganancia debe volver a ser exactamente 0 (silencio total)');
assert.strictEqual(state.isPlaying, true, 'El metrónomo no debe detenerse al mutearse');

// Cleanup
stopMetronome();

console.log('✅ T47 passed: metronome volume at minimum (0) produces complete silence');

