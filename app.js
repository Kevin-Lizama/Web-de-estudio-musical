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
 * Elimina todas las páginas (canvas o img) del visor y revoca cualquier ObjectURL activo.
 * @param {HTMLElement} viewer
 */
function clearViewer(viewer) {
  if (!viewer || typeof viewer.querySelectorAll !== 'function') return;
  const elements = viewer.querySelectorAll('canvas, img');
  elements.forEach((el) => {
    if (el.src && el.src.startsWith('blob:') && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(el.src);
    }
    if (typeof el.remove === 'function') {
      el.remove();
    }
  });
}

/**
 * Renderiza el contenido de una partitura (PDF o imágenes) en el visor.
 * @param {Object}      score
 * @param {HTMLElement} viewer
 * @param {number}      viewportWidth
 */
async function renderScore(score, viewer, viewportWidth) {
  if (!score || !viewer) return;
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
 * @param {number}               viewportWidth Ancho de viewport en px
 * @param {Object}               scoreStorage Instancia de almacenamiento
 * @param {HTMLElement}          dialog      Diálogo modal opcional a cerrar
 */
async function handleFileOpen(files, viewer, emptyState, viewportWidth = (typeof window !== 'undefined' ? window.innerWidth : 1024), scoreStorage = storage, dialog = null) {
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
  clearViewer(viewer);

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
        try {
          await renderPDF(rawBuffer, viewer, viewportWidth);
          activeScoreId = file.name;
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
        } catch (err) {
          console.error('Error al renderizar el archivo PDF:', err);
          if (!hasScorePages(viewer) && emptyState) {
            emptyState.hidden = false;
          }
        }
      }
    }
  }

  if (imageEntries.length > 0) {
    activeScoreId = fileArray[0].name;
    if (scoreStorage && typeof scoreStorage.saveScore === 'function') {
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

  if (dialog && typeof dialog.close === 'function') {
    dialog.close();
  }
}

// Seguimiento de partitura activa en el visor
let activeScoreId = null;

function getActiveScoreId() {
  return activeScoreId;
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
    if (metronomeAudioCtx && typeof metronomeAudioCtx.suspend === 'function') {
      metronomeAudioCtx.suspend().catch(() => {});
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
    }
    if (metronomeAudioCtx.state === 'suspended' && typeof metronomeAudioCtx.resume === 'function') {
      metronomeAudioCtx.resume().catch(() => {});
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
    if (activeBtn) {
      activeBtn.textContent = 'Auto-scroll';
      if (typeof activeBtn.setAttribute === 'function') {
        activeBtn.setAttribute('aria-pressed', 'false');
      }
    }
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

      // Auto-pausa si se alcanza el final de la partitura (con margen de tolerancia por zoom/subpixel)
      if (
        typeof document !== 'undefined' &&
        document.documentElement &&
        document.documentElement.scrollHeight > (window.innerHeight || 0) &&
        (window.innerHeight || 0) + Math.ceil(window.scrollY || window.pageYOffset || 0) >= document.documentElement.scrollHeight - 2
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
    if (btn) {
      btn.textContent = 'Pausar';
      if (typeof btn.setAttribute === 'function') {
        btn.setAttribute('aria-pressed', 'true');
      }
    }
    rafId = requestAnimationFrame(autoScrollStep);
  } else {
    stopAutoScroll();
  }
}

// ── Biblioteca ────────────────────────────────────

/**
 * Abre el diálogo de biblioteca y lista las partituras disponibles o muestra el estado vacío.
 * @param {HTMLDialogElement} dialog
 * @param {HTMLElement}       listEl
 * @param {HTMLElement}       emptyEl
 * @param {Object}            scoreStorage
 */
async function openLibrary(dialog, listEl, emptyEl, scoreStorage = storage) {
  if (dialog && !dialog.open && typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else if (dialog && !dialog.open) {
    dialog.open = true;
  }

  let scores = [];
  try {
    if (scoreStorage && typeof scoreStorage.listScores === 'function') {
      scores = await scoreStorage.listScores();
    }
  } catch (err) {
    console.warn('No se pudieron listar las partituras de la biblioteca:', err);
    scores = [];
  }

  if (listEl) {
    listEl.innerHTML = '';
  }

  if (!scores || scores.length === 0) {
    if (emptyEl) emptyEl.hidden = false;
  } else {
    if (emptyEl) emptyEl.hidden = true;
    scores.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    if (listEl && typeof document !== 'undefined') {
      scores.forEach((score) => {
        const li = document.createElement('li');
        li.className = 'library-item';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'library-item-btn';
        btn.textContent = score.name || score.id;
        btn.dataset.id = score.id || score.name;
        li.appendChild(btn);

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'library-item-actions';

        const renameBtn = document.createElement('button');
        renameBtn.type = 'button';
        renameBtn.className = 'library-rename-btn';
        renameBtn.textContent = 'Renombrar';
        renameBtn.dataset.id = score.id || score.name;
        if (typeof renameBtn.setAttribute === 'function') {
          renameBtn.setAttribute('aria-label', `Renombrar ${score.name || score.id}`);
        }
        actionsDiv.appendChild(renameBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'library-delete-btn';
        deleteBtn.textContent = 'Eliminar';
        deleteBtn.dataset.id = score.id || score.name;
        if (typeof deleteBtn.setAttribute === 'function') {
          deleteBtn.setAttribute('aria-label', `Eliminar ${score.name || score.id}`);
        }
        actionsDiv.appendChild(deleteBtn);

        li.appendChild(actionsDiv);
        listEl.appendChild(li);
      });
    }
  }
}

/**
 * Solicita y aplica el nuevo nombre para una partitura guardada.
 * @param {string}      scoreId
 * @param {HTMLElement} listEl
 * @param {HTMLElement} emptyEl
 * @param {Object}      scoreStorage
 * @param {Function}    promptFn
 * @returns {Promise<Object|null>} Partitura actualizada o null si no se modificó
 */
async function handleRenameScore(scoreId, listEl, emptyEl, scoreStorage = storage, promptFn = (typeof window !== 'undefined' ? window.prompt : null)) {
  if (!scoreId || !scoreStorage || typeof scoreStorage.renameScore !== 'function') return null;

  let currentScore = null;
  if (typeof scoreStorage.getScore === 'function') {
    currentScore = await scoreStorage.getScore(scoreId);
  }
  const currentName = currentScore ? currentScore.name : scoreId;

  const promptHandler = typeof promptFn === 'function'
    ? promptFn
    : (typeof window !== 'undefined' && typeof window.prompt === 'function' ? window.prompt.bind(window) : null);

  if (!promptHandler) return null;

  const newName = promptHandler('Introduce el nuevo nombre para la partitura:', currentName);
  if (newName === null) {
    return null;
  }

  const trimmed = newName.trim();
  if (!trimmed || trimmed === currentName) {
    return null;
  }

  const updated = await scoreStorage.renameScore(scoreId, trimmed);
  if (updated && listEl) {
    if (typeof listEl.querySelectorAll === 'function') {
      const items = listEl.querySelectorAll('.library-item');
      for (const item of items) {
        const b = item.querySelector('.library-item-btn');
        if (b && b.dataset && b.dataset.id === scoreId) {
          b.textContent = updated.name;
          const renameBtn = item.querySelector('.library-rename-btn');
          if (renameBtn && typeof renameBtn.setAttribute === 'function') {
            renameBtn.setAttribute('aria-label', `Renombrar ${updated.name}`);
          }
          const deleteBtn = item.querySelector('.library-delete-btn');
          if (deleteBtn && typeof deleteBtn.setAttribute === 'function') {
            deleteBtn.setAttribute('aria-label', `Eliminar ${updated.name}`);
          }
        }
      }
    }
    if (listEl.children) {
      for (const li of listEl.children) {
        const b = typeof li.querySelector === 'function'
          ? li.querySelector('.library-item-btn')
          : (li.children && li.children[0]);
        if (b && b.dataset && b.dataset.id === scoreId) {
          b.textContent = updated.name;
          if (typeof li.querySelector === 'function') {
            const renameBtn = li.querySelector('.library-rename-btn');
            if (renameBtn && typeof renameBtn.setAttribute === 'function') {
              renameBtn.setAttribute('aria-label', `Renombrar ${updated.name}`);
            }
            const deleteBtn = li.querySelector('.library-delete-btn');
            if (deleteBtn && typeof deleteBtn.setAttribute === 'function') {
              deleteBtn.setAttribute('aria-label', `Eliminar ${updated.name}`);
            }
          }
        }
      }
    }
  }

  return updated;
}

/**
 * Solicita confirmación y elimina una partitura del almacenamiento y de la lista de biblioteca.
 * @param {string}      scoreId
 * @param {HTMLElement} listEl
 * @param {HTMLElement} emptyEl
 * @param {Object}      scoreStorage
 * @param {Function}    confirmFn
 * @param {HTMLElement} viewer
 * @param {HTMLElement} emptyState
 * @returns {Promise<boolean>} True si fue eliminada, false en caso contrario
 */
async function handleDeleteScore(
  scoreId,
  listEl,
  emptyEl,
  scoreStorage = storage,
  confirmFn = (typeof window !== 'undefined' ? window.confirm : null),
  viewer = null,
  emptyState = null
) {
  if (!scoreId || !scoreStorage || typeof scoreStorage.deleteScore !== 'function') return false;

  let currentScore = null;
  if (typeof scoreStorage.getScore === 'function') {
    currentScore = await scoreStorage.getScore(scoreId);
  }
  const scoreName = currentScore ? currentScore.name : scoreId;

  const confirmHandler = typeof confirmFn === 'function'
    ? confirmFn
    : (typeof window !== 'undefined' && typeof window.confirm === 'function' ? window.confirm.bind(window) : null);

  if (confirmHandler) {
    const confirmed = confirmHandler(`¿Deseas eliminar permanentemente la partitura "${scoreName}"?`);
    if (!confirmed) {
      return false;
    }
  }

  const deleted = await scoreStorage.deleteScore(scoreId);
  if (deleted) {
    if (activeScoreId === scoreId) {
      stopAutoScroll();
      if (viewer) {
        clearViewer(viewer);
      }
      if (emptyState) {
        emptyState.hidden = false;
      }
      activeScoreId = null;
    }

    if (listEl && listEl.children) {
      for (let i = listEl.children.length - 1; i >= 0; i--) {
        const li = listEl.children[i];
        const btn = typeof li.querySelector === 'function'
          ? li.querySelector('.library-item-btn')
          : (li.children && li.children[0]);
        if (btn && btn.dataset && btn.dataset.id === scoreId) {
          if (typeof li.remove === 'function') {
            li.remove();
          } else if (Array.isArray(listEl.children)) {
            listEl.children.splice(i, 1);
          }
        }
      }
      if (listEl.children.length === 0 && emptyEl) {
        emptyEl.hidden = false;
      }
    }
    return true;
  }

  return false;
}

/**
 * Abre una partitura por su ID desde el almacenamiento, la renderiza y actualiza la sesión activa.
 * @param {string}            scoreId
 * @param {HTMLElement}       viewer
 * @param {HTMLElement}       emptyState
 * @param {HTMLDialogElement} dialog
 * @param {number}            viewportWidth
 * @param {Object}            scoreStorage
 * @returns {Promise<Object|null>}
 */
async function openScoreById(scoreId, viewer, emptyState, dialog = null, viewportWidth = (typeof window !== 'undefined' ? window.innerWidth : 1024), scoreStorage = storage) {
  if (!scoreStorage || typeof scoreStorage.getScore !== 'function') return null;

  let score = null;
  try {
    score = await scoreStorage.getScore(scoreId);
  } catch (err) {
    console.warn('No se pudo recuperar la partitura de la biblioteca:', err);
    return null;
  }

  if (!score) return null;

  stopAutoScroll();
  clearViewer(viewer);
  if (emptyState) emptyState.hidden = true;

  try {
    await renderScore(score, viewer, viewportWidth);
    activeScoreId = score.id || score.name;
  } catch (err) {
    console.error('Error al renderizar la partitura seleccionada:', err);
    if (!hasScorePages(viewer) && emptyState) {
      emptyState.hidden = false;
    }
    return null;
  }

  if (typeof scoreStorage.saveScore === 'function') {
    try {
      await scoreStorage.saveScore({
        ...score,
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.warn('No se pudo actualizar la última partitura activa:', err);
    }
  }

  if (dialog && typeof dialog.close === 'function') {
    dialog.close();
  }

  return score;
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
  const libraryDialog = document.getElementById('library-dialog');

  openBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    handleFileOpen(e.target.files, viewer, emptyState, window.innerWidth, storage, libraryDialog);
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

  const libraryBtn = document.getElementById('library-btn');
  const closeLibraryBtn = document.getElementById('close-library-btn');
  const libraryList = document.getElementById('library-list');
  const libraryEmpty = document.getElementById('library-empty');

  if (libraryBtn && libraryDialog) {
    libraryBtn.addEventListener('click', () => {
      openLibrary(libraryDialog, libraryList, libraryEmpty, storage);
    });
  }

  if (closeLibraryBtn && libraryDialog) {
    closeLibraryBtn.addEventListener('click', () => {
      libraryDialog.close();
    });
  }

  if (libraryDialog) {
    libraryDialog.addEventListener('click', (e) => {
      if (typeof libraryDialog.getBoundingClientRect === 'function') {
        const rect = libraryDialog.getBoundingClientRect();
        const isInside = (
          rect.top <= e.clientY && e.clientY <= rect.bottom &&
          rect.left <= e.clientX && e.clientX <= rect.right
        );
        if (!isInside) {
          libraryDialog.close();
        }
      } else if (e.target === libraryDialog) {
        libraryDialog.close();
      }
    });
  }

  let isOpeningScore = false;
  if (libraryList) {
    libraryList.addEventListener('click', (e) => {
      const deleteBtn = e.target.closest('.library-delete-btn');
      if (deleteBtn && deleteBtn.dataset.id) {
        handleDeleteScore(deleteBtn.dataset.id, libraryList, libraryEmpty, storage, (typeof window !== 'undefined' && typeof window.confirm === 'function' ? window.confirm.bind(window) : null), viewer, emptyState).catch((err) => {
          console.warn('Error al eliminar partitura:', err);
        });
        return;
      }

      const renameBtn = e.target.closest('.library-rename-btn');
      if (renameBtn && renameBtn.dataset.id) {
        handleRenameScore(renameBtn.dataset.id, libraryList, libraryEmpty, storage).catch((err) => {
          console.warn('Error al renombrar partitura:', err);
        });
        return;
      }

      const btn = e.target.closest('.library-item-btn');
      if (btn && btn.dataset.id && !isOpeningScore) {
        isOpeningScore = true;
        openScoreById(btn.dataset.id, viewer, emptyState, libraryDialog, window.innerWidth, storage)
          .catch((err) => {
            console.warn('Error al abrir la partitura seleccionada:', err);
          })
          .finally(() => {
            isOpeningScore = false;
          });
      }
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

  clearViewer(viewer);
  if (emptyState) emptyState.hidden = true;
  await renderScore(score, viewer, viewportWidth);
  activeScoreId = score.id || score.name;

  return score;
}

// Export para tests en Node
if (typeof module !== 'undefined') {
  module.exports = {
    renderPDF,
    clearViewer,
    renderScore,
    handleFileOpen,
    restoreLastScore,
    openLibrary,
    handleRenameScore,
    handleDeleteScore,
    openScoreById,
    getActiveScoreId,
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

