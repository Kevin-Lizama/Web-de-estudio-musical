// T46: changing volume slider during playback updates master gain immediately without restarting metronome
// Verifica que:
// 1. Al iniciar el metrónomo, se crea y conecta un master GainNode a audioContext.destination.
// 2. La ganancia inicial refleja el valor del slider de volumen.
// 3. Los osciladores/envolventes de pulso se conectan al master GainNode.
// 4. Cambiar el volumen en vivo actualiza la ganancia del master GainNode de inmediato.
// 5. El metrónomo permanece en estado de reproducción (isPlaying: true) sin reiniciar el contador ni detener el scheduler.

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

// Preparar elementos simulados
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

// 1. Iniciar metrónomo
toggleMetronome(btn, bpmInput, timeSignatureSelect, volumeInput);

const state = getMetronomeState();
assert.strictEqual(state.isPlaying, true, 'El metrónomo debe estar activo');

const masterGain = state.masterGainNode;
assert.ok(masterGain, 'El estado del metrónomo debe exponer un masterGainNode compartido');
assert.strictEqual(masterGain.destination, state.audioContext.destination, 'El masterGainNode debe conectarse a destination');
assert.strictEqual(masterGain.gain.value, 0.8, 'El masterGain inicial debe reflejar el valor del volumeInput (0.8)');

// 2. Verificar que los pulsos conectan al masterGainNode
const audioCtx = state.audioContext;
assert.ok(audioCtx.createdOscillators.length >= 1, 'Debe haberse programado al menos un oscilador');
// Los pulsos usan un nodo de ganancia para su envolvente que debe conectarse a masterGain
const pulseGainNodes = audioCtx.createdGainNodes.filter((g) => g !== masterGain);
assert.ok(pulseGainNodes.length >= 1, 'Debe existir nodo de ganancia para la envolvente del pulso');
assert.strictEqual(pulseGainNodes[0].destination, masterGain, 'El nodo de envolvente debe conectarse al masterGainNode');

// 3. Cambiar el volumen en caliente a 0.3
volumeInput.value = '0.3';
if (typeof listeners['input'] === 'function') {
  listeners['input']();
} else if (typeof updateMetronomeVolume === 'function') {
  updateMetronomeVolume(0.3);
}

assert.strictEqual(masterGain.gain.value, 0.3, 'La ganancia del masterGainNode debe actualizarse inmediatamente a 0.3');
assert.strictEqual(getMetronomeState().isPlaying, true, 'El metrónomo debe seguir en reproducción tras mover el slider');

// Cleanup
stopMetronome();

console.log('✅ T46 passed: changing volume slider during playback updates master gain immediately without restarting metronome');

