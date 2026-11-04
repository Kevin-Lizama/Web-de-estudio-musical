# Story #7 — Guardar partituras en biblioteca persistente

## Story
As a musician, I want my uploaded scores saved in a persistent library, so that I don't have to re-upload them every session.

## Acceptance criteria
- [x] Given una partitura abierta (archivo PDF o conjunto de imágenes), when se carga en el visor, then se guarda automáticamente en el almacenamiento local persistente con su nombre y contenido binario.
- [x] Given una partitura previamente guardada en el almacenamiento local, when recargo la página o inicio una nueva sesión, then la última partitura utilizada se recupera y renderiza automáticamente en el visor.
- [x] Given una partitura que ya existe en la biblioteca, when vuelvo a abrirla, then se actualiza su marca de uso sin generar registros duplicados ni inconsistencias en el almacenamiento.

## Plan
- Inicializar una base de datos local en el navegador con un almacén para partituras y metadatos de sesión.
- Guardar automáticamente en el almacenamiento local el contenido y metadatos de cada partitura (PDF o imágenes) al cargarse con éxito en el visor.
- Mantener un puntero o clave de la última partitura activa para identificar qué documento restaurar.
- Al cargar la página, consultar el almacenamiento y renderizar automáticamente la última partitura activa si existe.
- Evitar entradas duplicadas actualizando el registro existente si se abre un archivo con la misma identidad o nombre.

## Out of scope
- Interfaz gráfica para explorar o navegar la lista de partituras guardadas (definida en historia #8).
- Abrir partituras específicas desde una lista de biblioteca (definida en historia #8).
- Renombrar o eliminar partituras del almacenamiento (definida en historia #9).
- Recordar posición exacta de desplazamiento o página específica donde se interrumpió la lectura (definida en historia #10, aplazada).
- Tap tempo para metrónomo (definida en historia #6, aplazada).
- Sincronización en la nube o almacenamiento externo.

## Suggestions (your call)
- **Almacenamiento directo de Blobs/ArrayBuffer:** IndexedDB permite almacenar `Blob` o `ArrayBuffer` de forma nativa sin codificar a base64, lo cual reduce el consumo de memoria con PDFs o imágenes de alta resolución.
- **Módulo de persistencia independiente:** Separar las funciones de acceso a la base de datos de la lógica del visor facilitará probar la persistencia de forma aislada y reutilizarla en la historia #8 al listar la biblioteca.
