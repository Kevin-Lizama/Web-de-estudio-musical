// T34: autoscroll aria-pressed sync and metronome AudioContext suspend on stop
// Verifica que:
// 1. toggleAutoScroll y stopAutoScroll alternen aria-pressed a 'true' y 'false'.
// 2. stopMetronome invoque AudioContext.suspend() si está disponible para ahorrar batería.

const assert = require('assert');

global.requestAnimationFrame = () => 1;
global.cancelAnimationFrame = () => {};

class MockAudioParam {
  constructor(v = 0) { this.value = v; }
  setValueAtTime() {}
  exponentialRampToValueAtTime() {}
}

class MockAudioContext {
  constructor() {
    this.currentTime = 0;
    this.state = 'running';
    this.destination = {};
    this.suspendCalled = false;
    this.resumeCalled = false;
  }
  createOscillator() {
    return {
      frequency: new MockAudioParam(440),
      connect() {},
      start() {},
      stop() {},
    };
  }
  createGain() {
    return {
      gain: new MockAudioParam(1),
      connect() {},
    };
  }
  suspend() {
    this.suspendCalled = true;
    this.state = 'suspended';
    return Promise.resolve();
  }
  resume() {
    this.resumeCalled = true;
    this.state = 'running';
    return Promise.resolve();
  }
}

global.AudioContext = MockAudioContext;
global.window = global;

const {
  toggleAutoScroll,
  stopAutoScroll,
  toggleMetronome,
  stopMetronome,
  getMetronomeState,
} = require('../app.js');

function testAutoScrollAriaPressed() {
  const attributes = {};
  const btn = {
    textContent: 'Auto-scroll',
    setAttribute: (key, val) => { attributes[key] = String(val); },
  };
  const speedInput = { value: '3' };
  const viewer = {
    querySelectorAll: () => [{ tagName: 'CANVAS' }],
  };

  // Iniciar auto-scroll: aria-pressed -> 'true'
  toggleAutoScroll(btn, speedInput, viewer);
  assert.strictEqual(attributes['aria-pressed'], 'true', 'aria-pressed debe ser true al iniciar auto-scroll');

  // Pausar auto-scroll: aria-pressed -> 'false'
  toggleAutoScroll(btn, speedInput, viewer);
  assert.strictEqual(attributes['aria-pressed'], 'false', 'aria-pressed debe ser false al pausar auto-scroll');

  // Detención explícita con stopAutoScroll
  toggleAutoScroll(btn, speedInput, viewer);
  assert.strictEqual(attributes['aria-pressed'], 'true');
  stopAutoScroll();
  assert.strictEqual(attributes['aria-pressed'], 'false', 'aria-pressed debe ser false tras stopAutoScroll');
}

function testMetronomeAudioContextSuspend() {
  const btn = {
    textContent: 'Metrónomo',
    setAttribute() {},
  };
  const bpmInput = { value: '120' };
  const sigSelect = { value: '4/4' };

  toggleMetronome(btn, bpmInput, sigSelect);
  const state = getMetronomeState();
  assert.strictEqual(state.isPlaying, true);
  const ctx = state.audioContext;
  assert.ok(ctx);

  stopMetronome();
  assert.strictEqual(ctx.suspendCalled, true, 'Debe haber invocado suspend() al detener el metrónomo');
  assert.strictEqual(ctx.state, 'suspended');

  // Reanudar debe invocar resume()
  toggleMetronome(btn, bpmInput, sigSelect);
  assert.strictEqual(ctx.resumeCalled, true, 'Debe haber invocado resume() al reiniciar el metrónomo');

  stopMetronome();
}

try {
  testAutoScrollAriaPressed();
  testMetronomeAudioContextSuspend();
  console.log('✅ T34 passed: autoscroll aria-pressed sync and metronome AudioContext suspend on stop');
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}

