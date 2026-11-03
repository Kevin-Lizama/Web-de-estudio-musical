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
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      emptyState.hidden = true;
      // Limpia páginas anteriores si se abre otro PDF
      viewer.querySelectorAll('canvas').forEach((c) => c.remove());
      renderPDF(ev.target.result, viewer, window.innerWidth);
    };
    reader.readAsArrayBuffer(file);
  });
}

// Export para tests en Node
if (typeof module !== 'undefined') {
  module.exports = { renderPDF };
}

