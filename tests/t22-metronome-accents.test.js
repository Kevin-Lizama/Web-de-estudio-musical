// T22: accent pattern emits high-frequency click on beat 1 and regular click on subsequent beats according to time signature (2/4, 3/4, 4/4, 6/8)
// Verifica que para cada compás soportado:
// 1. A lo largo de múltiples compases completos (al menos 2 ciclos), el pulso 1 de cada compás tiene frecuencia de acento (agudo).
// 2. Todos los pulsos restantes del compás tienen frecuencia estándar (regular).
// 3. La frecuencia del acento es superior a la regular (distintiva perceptual).
// 4. El espaciado temporal entre pulsos consecutivos se mantiene constante a 60 / BPM segundos.

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

// Mock de temporizadores
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

const signaturesToTest = [
  { signature: '2/4', beatsPerBar: 2 },
  { signature: '3/4', beatsPerBar: 3 },
  { signature: '4/4', beatsPerBar: 4 },
  { signature: '6/8', beatsPerBar: 6 },
];

const BPM = 120;
const expectedPulseInterval = 60 / BPM; // 0.5 segundos

signaturesToTest.forEach(({ signature, beatsPerBar }) => {
  stopMetronome();

  const btn = { textContent: 'Metrónomo' };
  const bpmInput = { value: String(BPM) };
  const timeSignatureSelect = { value: signature };

  toggleMetronome(btn, bpmInput, timeSignatureSelect);

  const audioCtx = getMetronomeState().audioContext;
  assert.ok(audioCtx, 'AudioContext debe estar inicializado y disponible en el estado');

  const initialOscCount = audioCtx.createdOscillators.length;
  const schedulerEntry = scheduledIntervals[scheduledIntervals.length - 1];
  assert.ok(schedulerEntry, `Debe registrarse el temporizador del scheduler para ${signature}`);

  // Simular el avance del tiempo para cubrir 3 compases completos
  const totalBarsToSimulate = 3;
  const totalBeatsExpected = beatsPerBar * totalBarsToSimulate;
  const targetTime = audioCtx.currentTime + (totalBeatsExpected * expectedPulseInterval);

  // Avanzar el reloj virtual en pequeños incrementos y disparar el scheduler
  const step = 0.05;
  while (audioCtx.currentTime < targetTime) {
    audioCtx.currentTime += step;
    schedulerEntry.fn();
  }

  // Extraer los pulsos registrados para esta corrida ordenados cronológicamente
  const pulses = audioCtx.createdOscillators
    .slice(initialOscCount - 1) // Incluye el pulso inicial programado al arrancar
    .map((osc) => {
      const freqChange = osc.frequency.scheduledChanges.find((c) => c.type === 'set');
      return {
        startTime: osc.startedAt,
        frequency: freqChange ? freqChange.val : osc.frequency.value,
      };
    })
    .sort((a, b) => a.startTime - b.startTime);

  assert.ok(
    pulses.length >= totalBeatsExpected,
    `Para ${signature} se esperaban al menos ${totalBeatsExpected} pulsos, pero se obtuvieron ${pulses.length}`
  );

  // Analizar los primeros totalBeatsExpected pulsos
  const sample = pulses.slice(0, totalBeatsExpected);

  const accentFreqs = [];
  const regularFreqs = [];

  sample.forEach((pulse, idx) => {
    const isFirstBeatOfBar = (idx % beatsPerBar === 0);

    if (isFirstBeatOfBar) {
      accentFreqs.push(pulse.frequency);
    } else {
      regularFreqs.push(pulse.frequency);
    }

    // Verificar regularidad del tempo entre pulsos consecutivos
    if (idx > 0) {
      const prevPulse = sample[idx - 1];
      const delta = pulse.startTime - prevPulse.startTime;
      assert.ok(
        Math.abs(delta - expectedPulseInterval) < 0.001,
        `Para ${signature}, el pulso ${idx} debe estar separado por ${expectedPulseInterval}s, pero fue ${delta}s`
      );
    }
  });

  // Todas las frecuencias de acento deben ser idénticas entre sí
  assert.ok(accentFreqs.length === totalBarsToSimulate, `Debe haber ${totalBarsToSimulate} acentos`);
  assert.ok(accentFreqs.every((f) => f === accentFreqs[0]), `Todos los acentos de ${signature} deben compartir la misma frecuencia`);

  // Todas las frecuencias regulares deben ser idénticas entre sí
  assert.ok(regularFreqs.every((f) => f === regularFreqs[0]), `Todos los pulsos regulares de ${signature} deben compartir la misma frecuencia`);

  // El acento debe ser acústicamente más agudo que el pulso regular
  assert.ok(
    accentFreqs[0] > regularFreqs[0],
    `Para ${signature}, la frecuencia de acento (${accentFreqs[0]} Hz) debe ser mayor que la regular (${regularFreqs[0]} Hz)`
  );

  stopMetronome();
});

console.log('✅ T22 passed: accent pattern emits high-frequency click on beat 1 and regular click on subsequent beats for all time signatures');
