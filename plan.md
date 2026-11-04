# Story #8 — Explorar y abrir partituras desde la biblioteca

## Story
As a musician, I want to browse my saved library and open a score from it, so that I can quickly access any piece I've previously loaded.

## Acceptance criteria
- [x] Given una o más partituras guardadas previamente, when abro la biblioteca, then visualizo la lista con los nombres de todas las partituras disponibles.
- [x] Given la lista de partituras de la biblioteca visible, when elijo una partitura, then se cierra la biblioteca y la partitura seleccionada se despliega en el visor reemplazando cualquier contenido previo.
- [x] Given una biblioteca sin partituras guardadas, when abro la biblioteca, then veo un mensaje informando que no hay partituras guardadas.

## Plan
- Agregar un control en la barra superior para abrir y cerrar la vista o panel de biblioteca.
- Presentar un modal o panel con la lista interactiva de partituras o un mensaje si está vacía.
- Obtener todas las partituras guardadas del almacenamiento persistente al abrir la biblioteca.
- Cargar y renderizar la partitura seleccionada en el visor principal y cerrar la biblioteca.
- Actualizar la partitura seleccionada como la última activa en la sesión persistente.

## Out of scope
- Renombrar partituras guardadas (definida en historia #9).
- Eliminar partituras de la biblioteca (definida en historia #9).
- Búsqueda o filtrado de partituras por texto.
- Carpetas, etiquetas u ordenamiento personalizado.
- Recordar posición o desplazamiento donde se interrumpió la lectura (definida en historia #10).

## Suggestions (your call)
- **Uso de `<dialog>` nativo para el panel de biblioteca:** Proporciona accesibilidad integrada, soporte nativo de backdrop modal y cierre estándar con la tecla Escape sin dependencias externas.
- **Navegación de lista accesible por teclado:** Renderizar las entradas como botones interactivos en una lista semántica para facilitar el uso tanto con ratón como con teclado o pedaleras de control.
