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
 * Maneja la apertura de uno o varios archivos (PDF o imágenes).
 * @param {File|File[]|FileList} files      Archivo o lista de archivos seleccionados
 * @param {HTMLElement}          viewer      Contenedor principal
 * @param {HTMLElement}          emptyState  Elemento de estado vacío
 */
function handleFileOpen(files, viewer, emptyState, viewportWidth = (typeof window !== 'undefined' ? window.innerWidth : 1024)) {
  if (!files) return;

  // Normalizar a array: Array.isArray cubre arrays de tests; instanceof FileList cubre el browser.
  // Un File individual se envuelve en [files]. FileList no existe en Node, de ahí el typeof check.
  const fileArray = Array.isArray(files)
    ? files
    : (typeof FileList !== 'undefined' && files instanceof FileList)
      ? Array.from(files)
      : [files];

  if (fileArray.length === 0) return;

  emptyState.hidden = true;
  viewer.querySelectorAll('canvas, img').forEach((el) => {
    if (el.src && el.src.startsWith('blob:')) {
      URL.revokeObjectURL(el.src);
    }
    el.remove();
  });

  for (const file of fileArray) {
    if (file.type && file.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      viewer.appendChild(img);
    } else {
      // Asume PDF. El atributo `accept` del input ya filtra otros tipos en el browser.
      // Nota: si se mezclan imágenes y PDFs en la misma selección, las imágenes se renderizan
      // síncronamente (en orden) y los PDFs asíncronamente (al final), por lo que el orden
      // del OS no se preserva en ese caso. Mezcla de tipos está fuera de alcance (story #3).
      const reader = new FileReader();
      reader.onload = (ev) => {
        renderPDF(ev.target.result, viewer, viewportWidth);
      };
      reader.readAsArrayBuffer(file);
    }
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
    handleFileOpen(e.target.files, viewer, emptyState);
  });
}

// Export para tests en Node
if (typeof module !== 'undefined') {
  module.exports = { renderPDF, handleFileOpen };
}

