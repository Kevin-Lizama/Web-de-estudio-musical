// T20: starting metronome initializes AudioContext, sets playing state, updates button label to "Detener" and schedules first pulse
// Verifica que al invocar toggleMetronome:
// 1. Se inicializa el AudioContext.
// 2. El estado del metrónomo cambia a isPlaying: true.
// 3. El texto del botón cambia a "Detener".
// 4. Se sintetiza y programa el primer pulso de audio con oscilador y control de ganancia conectados al destino.

const assert = require('assert');

// Mock desacoplado de la Web Audio API
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
    this.type = 'sine';
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

const { toggleMetronome, getMetronomeState, stopMetronome } = require('../app.js');

assert.strictEqual(typeof toggleMetronome, 'function', 'toggleMetronome debe ser una función exportada');
assert.strictEqual(typeof getMetronomeState, 'function', 'getMetronomeState debe ser una función exportada');

const btn = { textContent: 'Metrónomo' };
const bpmInput = { value: '120' };
const timeSignatureSelect = { value: '4/4' };

// Estado inicial: no reproduciendo
assert.strictEqual(getMetronomeState().isPlaying, false, 'El metrónomo debe iniciar inactivo');

// Acción: presionar botón para iniciar
toggleMetronome(btn, bpmInput, timeSignatureSelect);

// Verificación de contrato y comportamiento público
assert.strictEqual(btn.textContent, 'Detener', 'El texto del botón debe cambiar a "Detener"');
assert.strictEqual(getMetronomeState().isPlaying, true, 'isPlaying debe ser true');
assert.strictEqual(MockAudioContext.instances.length, 1, 'Debe haberse instanciado un AudioContext');

const audioCtx = MockAudioContext.instances[0];
assert.ok(audioCtx.createdOscillators.length >= 1, 'Debe haberse programado al menos un pulso (oscilador)');
assert.ok(audioCtx.createdGainNodes.length >= 1, 'Debe haberse creado al menos un nodo de ganancia para modelar la envolvente');

const firstOsc = audioCtx.createdOscillators[0];
const firstGain = audioCtx.createdGainNodes[0];

assert.strictEqual(firstOsc.destination, firstGain, 'El oscilador debe conectarse al nodo de ganancia');
assert.strictEqual(firstGain.destination, audioCtx.destination, 'La ganancia debe conectarse a destination');
assert.strictEqual(typeof firstOsc.startedAt, 'number', 'El oscilador debe tener un tiempo de inicio programado');
assert.ok(firstOsc.startedAt >= audioCtx.currentTime, 'El inicio del pulso debe ser >= currentTime');
assert.ok(firstOsc.stoppedAt > firstOsc.startedAt, 'El fin del pulso debe ser posterior a su inicio');

// Cleanup
if (typeof stopMetronome === 'function') {
  stopMetronome();
}

console.log('✅ T20 passed: starting metronome initializes AudioContext, updates UI and schedules first pulse');

