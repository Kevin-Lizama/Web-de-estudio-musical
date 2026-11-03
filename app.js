// app.js — lógica principal del visor de partituras

/**
 * Renderiza todas las páginas de un PDF como <canvas> dentro de `container`.
 * @param {ArrayBuffer} arrayBuffer  Contenido del PDF
 * @param {HTMLElement} container    Elemento donde se insertan los canvas
 * @param {number}      viewportWidth  Ancho disponible en px (window.innerWidth en el browser)
 */
async function renderPDF(arrayBuffer, container, viewportWidth) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

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
 * Maneja la apertura de un archivo (PDF o imagen).
 * @param {File}        file        Archivo seleccionado por el usuario
 * @param {HTMLElement} viewer      Contenedor principal
 * @param {HTMLElement} emptyState  Elemento de estado vacío
 */
function handleFileOpen(file, viewer, emptyState, viewportWidth = (typeof window !== 'undefined' ? window.innerWidth : 1024)) {
  if (!file) return;

  if (file.type && file.type.startsWith('image/')) {
    emptyState.hidden = true;
    viewer.querySelectorAll('canvas, img').forEach((el) => el.remove());
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    viewer.appendChild(img);
  } else {
    const reader = new FileReader();
    reader.onload = (ev) => {
      emptyState.hidden = true;
      viewer.querySelectorAll('canvas, img').forEach((el) => el.remove());
      renderPDF(ev.target.result, viewer, viewportWidth);
    };
    reader.readAsArrayBuffer(file);
  }
}

// Wiring del browser (no corre en Node)
if (typeof module === 'undefined') {
  // Worker requerido por PDF.js para parsear en background
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
  const openBtn   = document.getElementById('open-btn');
  const fileInput = document.getElementById('file-input');
  const viewer    = document.getElementById('viewer');
  const emptyState = document.getElementById('empty-state');

  openBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    handleFileOpen(file, viewer, emptyState);
  });
}

// Export para tests en Node
if (typeof module !== 'undefined') {
  module.exports = { renderPDF, handleFileOpen };
}

