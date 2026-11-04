// app.js — lógica principal del visor de partituras

const storage = (typeof module !== 'undefined' && typeof require !== 'undefined')
  ? require('./storage.js')
  : (typeof window !== 'undefined' ? window.ScoreStorage : null);

/**
 * Renderiza todas las páginas de un PDF como <canvas> dentro de `container`.
 * @param {ArrayBuffer} arrayBuffer  Contenido del PDF
 * @param {HTMLElement} container    Elemento donde se insertan los canvas
 * @param {number}      viewportWidth  Ancho disponible en px (window.innerWidth en el browser)
 */
async function renderPDF(arrayBuffer, container, viewportWidth) {
  // Asegura una copia del buffer para evitar que PDF.js worker lo desasocie del llamador
  const data = (arrayBuffer instanceof ArrayBuffer) ? arrayBuffer.slice(0) : arrayBuffer;
  const pdf = await pdfjsLib.getDocument({ data }).promise;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);

    // Escala para que cada página ocupe exactamente el ancho del viewport
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = viewportWidth / baseViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;

    container.appendChild(canvas);
  }
}

/**
 * Lee de forma segura el contenido binario (ArrayBuffer) de un archivo o Blob.
 * Utiliza la API moderna file.arrayBuffer() o FileReader como fallback.
 * @param {Blob|File} file
 * @returns {Promise<ArrayBuffer|null>}
 */
async function readFileBuffer(file) {
  if (!file) return null;
  if (typeof file.arrayBuffer === 'function') {
    return await file.arrayBuffer();
  }
  if (typeof Blob !== 'undefined' && file instanceof Blob && typeof FileReader !== 'undefined') {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target ? e.target.result : null);
      reader.onerror = () => resolve(null);
      try {
        reader.readAsArrayBuffer(file);
      } catch {
        resolve(null);
      }
    });
  }
  return null;
}

/**
 * Maneja la apertura de uno o varios archivos (PDF o imágenes).
 * @param {File|File[]|FileList} files      Archivo o lista de archivos seleccionados
 * @param {HTMLElement}          viewer      Contenedor principal
 * @param {HTMLElement}          emptyState  Elemento de estado vacío
 */
async function handleFileOpen(files, viewer, emptyState, viewportWidth = (typeof window !== 'undefined' ? window.innerWidth : 1024), scoreStorage = storage) {
  if (!files) return;

  // Normalizar a array: Array.isArray cubre arrays de tests; instanceof FileList cubre el browser.
  // Un File individual se envuelve en [files]. FileList no existe en Node, de ahí el typeof check.
  const fileArray = Array.isArray(files)
    ? files
    : (typeof FileList !== 'undefined' && files instanceof FileList)
      ? Array.from(files)
      : [files];

  if (fileArray.length === 0) return;

  stopAutoScroll();
  emptyState.hidden = true;
  viewer.querySelectorAll('canvas, img').forEach((el) => {
    if (el.src && el.src.startsWith('blob:')) {
      URL.revokeObjectURL(el.src);
    }
    el.remove();
  });

  const imageEntries = [];

  for (const file of fileArray) {
    if (file.type && file.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      viewer.appendChild(img);

      const buf = await readFileBuffer(file);
      if (buf) {
        imageEntries.push({ name: file.name, type: file.type, buffer: buf });
      }
    } else {
      // PDF: leemos el contenido binario y renderizamos (renderPDF ya clona el buffer internamente)
      const rawBuffer = await readFileBuffer(file);
      if (rawBuffer) {
        await renderPDF(rawBuffer, viewer, viewportWidth);
        if (scoreStorage && typeof scoreStorage.saveScore === 'function') {
          try {
            await scoreStorage.saveScore({
              name: file.name,
              type: 'pdf',
              data: rawBuffer,
            });
          } catch (err) {
            console.warn('No se pudo guardar la partitura en la biblioteca local:', err);
          }
        }
      }
    }
  }

  if (imageEntries.length > 0 && scoreStorage && typeof scoreStorage.saveScore === 'function') {
    try {
      await scoreStorage.saveScore({
        name: fileArray[0].name,
        type: 'images',
        data: imageEntries,
      });
    } catch (err) {
      console.warn('No se pudo guardar la partitura en la biblioteca local:', err);
    }
  }
}

// Estado de auto-scroll
let isScrolling = false;
let rafId = null;
let lastTimestamp = null;
let activeSpeedInput = null;
let activeBtn = null;
let activeViewer = null;
const SPEED_FACTOR = 10; // px/segundo por unidad del control de velocidad

// ── Metrónomo ─────────────────────────────────────
const TIME_SIGNATURES = {
  '2/4': { beats: 2 },
  '3/4': { beats: 3 },
  '4/4': { beats: 4 },
  '6/8': { beats: 6 },
};

let isMetronomePlaying = false;
let metronomeAudioCtx = null;
let nextPulseTime = 0;
let currentBeatInBar = 0;
let metronomeTimerId = null;
let activeMetronomeBtn = null;
let activeBpmInput = null;
let activeTimeSignatureSelect = null;
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_SEC = 0.1;

function getBpm() {
  if (!activeBpmInput) return 120;
  const val = Number(activeBpmInput.value);
  if (!Number.isFinite(val)) return 120;
  return Math.min(240, Math.max(40, val));
}

function getTimeSignatureConfig() {
  const sig = activeTimeSignatureSelect ? activeTimeSignatureSelect.value : '4/4';
  return TIME_SIGNATURES[sig] || TIME_SIGNATURES['4/4'];
}

function schedulePulse(time, isAccent) {
  if (!metronomeAudioCtx) return;
  const osc = metronomeAudioCtx.createOscillator();
  const gain = metronomeAudioCtx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(isAccent ? 1200 : 800, time);

  // Envolvente percusiva con micro-ataque suave para evitar transitorios de fase
  if (typeof gain.gain.linearRampToValueAtTime === 'function') {
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(1, time + 0.002);
  } else {
    gain.gain.setValueAtTime(1, time);
  }
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);

  osc.connect(gain);
  gain.connect(metronomeAudioCtx.destination);

  // Liberación explícita de nodos al finalizar el pulso
  osc.onended = () => {
    if (typeof osc.disconnect === 'function') osc.disconnect();
    if (typeof gain.disconnect === 'function') gain.disconnect();
  };

  osc.start(time);
  osc.stop(time + 0.04);
}

function metronomeScheduler() {
  if (!isMetronomePlaying || !metronomeAudioCtx) return;

  // Guarda de resincronización ante suspensión o cambio de pestaña
  if (nextPulseTime < metronomeAudioCtx.currentTime) {
    nextPulseTime = metronomeAudioCtx.currentTime;
  }

  while (nextPulseTime < metronomeAudioCtx.currentTime + SCHEDULE_AHEAD_SEC) {
    const config = getTimeSignatureConfig();
    const isAccent = (currentBeatInBar === 0);
    schedulePulse(nextPulseTime, isAccent);

    const secondsPerPulse = 60 / getBpm();
    nextPulseTime += secondsPerPulse;
    currentBeatInBar = (currentBeatInBar + 1) % config.beats;
  }
}

function getMetronomeState() {
  return {
    isPlaying: isMetronomePlaying,
    currentBeat: currentBeatInBar,
    nextPulseTime,
    audioContext: metronomeAudioCtx,
  };
}

function stopMetronome() {
  if (isMetronomePlaying) {
    isMetronomePlaying = false;
    if (metronomeTimerId !== null) {
      clearInterval(metronomeTimerId);
      metronomeTimerId = null;
    }
    if (activeMetronomeBtn) {
      activeMetronomeBtn.textContent = 'Metrónomo';
      if (typeof activeMetronomeBtn.setAttribute === 'function') {
        activeMetronomeBtn.setAttribute('aria-pressed', 'false');
      }
    }
    currentBeatInBar = 0;
    activeMetronomeBtn = null;
    activeBpmInput = null;
    activeTimeSignatureSelect = null;
  }
}

function toggleMetronome(btn, bpmInput, timeSignatureSelect) {
  if (!isMetronomePlaying) {
    const AudioContextClass = typeof window !== 'undefined'
      ? (window.AudioContext || window.webkitAudioContext)
      : (typeof AudioContext !== 'undefined' ? AudioContext : null);

    if (!AudioContextClass) return;

    if (!metronomeAudioCtx) {
      metronomeAudioCtx = new AudioContextClass();
    } else if (metronomeAudioCtx.state === 'suspended') {
      metronomeAudioCtx.resume();
    }

    isMetronomePlaying = true;
    activeMetronomeBtn = btn;
    activeBpmInput = bpmInput;
    activeTimeSignatureSelect = timeSignatureSelect;
    if (btn) {
      btn.textContent = 'Detener';
      if (typeof btn.setAttribute === 'function') {
        btn.setAttribute('aria-pressed', 'true');
      }
    }

    currentBeatInBar = 0;
    nextPulseTime = metronomeAudioCtx.currentTime + 0.01;

    metronomeScheduler();
    metronomeTimerId = setInterval(metronomeScheduler, LOOKAHEAD_MS);
  } else {
    stopMetronome();
  }
}

function getAutoScrollState() {
  return { isScrolling, rafId, lastTimestamp };
}

function hasScorePages(container) {
  if (!container) return false;
  if (typeof container.querySelector === 'function') {
    return container.querySelector('canvas, img') !== null;
  }
  if (typeof container.querySelectorAll === 'function') {
    return container.querySelectorAll('canvas, img').length > 0;
  }
  return false;
}

function stopAutoScroll() {
  if (isScrolling) {
    isScrolling = false;
    lastTimestamp = null;
    activeSpeedInput = null;
    if (activeBtn) activeBtn.textContent = 'Auto-scroll';
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    activeBtn = null;
    activeViewer = null;
  }
}

function autoScrollStep(timestamp) {
  if (!isScrolling) return;

  if (!hasScorePages(activeViewer)) {
    stopAutoScroll();
    return;
  }

  if (lastTimestamp === null) {
    lastTimestamp = timestamp;
  } else {
    // Evita saltos desmedidos si la pestaña estuvo en segundo plano o suspendida
    const deltaMs = Math.min(timestamp - lastTimestamp, 500);
    lastTimestamp = timestamp;

    const speed = activeSpeedInput ? Math.max(1, Number(activeSpeedInput.value) || 1) : 1;
    const deltaY = (speed * SPEED_FACTOR * deltaMs) / 1000;

    if (typeof window !== 'undefined' && typeof window.scrollBy === 'function') {
      window.scrollBy(0, deltaY);

      // Auto-pausa si se alcanza el final de la partitura
      if (
        typeof document !== 'undefined' &&
        document.documentElement &&
        document.documentElement.scrollHeight > (window.innerHeight || 0) &&
        (window.innerHeight || 0) + Math.ceil(window.scrollY || window.pageYOffset || 0) >= document.documentElement.scrollHeight
      ) {
        stopAutoScroll();
        return;
      }
    }
  }

  rafId = requestAnimationFrame(autoScrollStep);
}

function toggleAutoScroll(btn, speedInput, viewer) {
  if (!isScrolling) {
    if (!hasScorePages(viewer)) return;

    isScrolling = true;
    lastTimestamp = null;
    activeSpeedInput = speedInput;
    activeBtn = btn;
    activeViewer = viewer;
    if (btn) btn.textContent = 'Pausar';
    rafId = requestAnimationFrame(autoScrollStep);
  } else {
    stopAutoScroll();
  }
}

// Wiring del browser (no corre en Node)
if (typeof module === 'undefined') {
  // Worker requerido por PDF.js para parsear en background
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
  const openBtn       = document.getElementById('open-btn');
  const fileInput     = document.getElementById('file-input');
  const viewer        = document.getElementById('viewer');
  const emptyState    = document.getElementById('empty-state');
  const autoscrollBtn = document.getElementById('autoscroll-btn');
  const speedInput    = document.getElementById('speed-input');

  openBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    handleFileOpen(e.target.files, viewer, emptyState);
  });

  if (autoscrollBtn) {
    autoscrollBtn.addEventListener('click', () => {
      toggleAutoScroll(autoscrollBtn, speedInput, viewer);
    });
  }

  const metronomeBtn = document.getElementById('metronome-btn');
  const bpmInput = document.getElementById('bpm-input');
  const timeSignatureSelect = document.getElementById('time-signature-select');

  if (metronomeBtn) {
    metronomeBtn.addEventListener('click', () => {
      toggleMetronome(metronomeBtn, bpmInput, timeSignatureSelect);
    });
  }

  // Restaurar automáticamente la última partitura activa al cargar la página
  restoreLastScore(viewer, emptyState).catch((err) => {
    console.warn('Error al restaurar última partitura activa:', err);
  });
}

/**
 * Restaura la última partitura activa desde el almacenamiento persistente si existe.
 * @param {HTMLElement} viewer
 * @param {HTMLElement} emptyState
 * @param {number}      viewportWidth
 * @param {Object}      scoreStorage
 * @returns {Promise<Object|null>} Partitura restaurada o null si no hay ninguna
 */
async function restoreLastScore(viewer, emptyState, viewportWidth = (typeof window !== 'undefined' ? window.innerWidth : 1024), scoreStorage = storage) {
  if (!scoreStorage || typeof scoreStorage.getLastActiveScore !== 'function') return null;

  let score = null;
  try {
    score = await scoreStorage.getLastActiveScore();
  } catch (err) {
    console.warn('No se pudo recuperar la última partitura activa:', err);
    return null;
  }

  if (!score) return null;

  if (viewer && typeof viewer.querySelectorAll === 'function') {
    viewer.querySelectorAll('canvas, img').forEach((el) => {
      if (el.src && el.src.startsWith('blob:')) {
        URL.revokeObjectURL(el.src);
      }
      el.remove();
    });
  }

  if (emptyState) emptyState.hidden = true;

  if (score.type === 'pdf') {
    const buf = (score.data instanceof ArrayBuffer) ? score.data.slice(0) : score.data;
    await renderPDF(buf, viewer, viewportWidth);
  } else if (score.type === 'images' && Array.isArray(score.data)) {
    for (const item of score.data) {
      const blob = new Blob([item.buffer], { type: item.type || 'image/png' });
      const img = document.createElement('img');
      img.src = URL.createObjectURL(blob);
      viewer.appendChild(img);
    }
  }

  return score;
}

// Export para tests en Node
if (typeof module !== 'undefined') {
  module.exports = {
    renderPDF,
    handleFileOpen,
    restoreLastScore,
    toggleAutoScroll,
    stopAutoScroll,
    getAutoScrollState,
    toggleMetronome,
    stopMetronome,
    getMetronomeState,
    TIME_SIGNATURES,
    schedulePulse,
  };
}

