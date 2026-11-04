# Story #9 — Renombrar y eliminar partituras de la biblioteca

## Story
As a musician, I want to rename and delete scores from my library, so that I can keep my collection organized.

## Acceptance criteria
- [x] Given una partitura guardada en la biblioteca, when modifico su nombre y confirmo el cambio, then la biblioteca refleja el nuevo nombre y este persiste en posteriores aperturas.
- [x] Given una partitura guardada en la biblioteca, when solicito su eliminación y confirmo la acción, then la partitura se elimina permanentemente de la biblioteca y ya no aparece en la lista.
- [x] Given la partitura abierta actualmente en el visor, when la elimino desde la biblioteca, then el visor se limpia mostrando el estado inicial vacío y deja de ser la partitura activa.

## Plan
- Incorporar controles de edición de nombre y de eliminación en cada elemento de la biblioteca.
- Implementar la actualización del nombre de la partitura en el almacenamiento persistente preservando su contenido.
- Implementar la eliminación de la partitura en el almacenamiento persistente previa confirmación del usuario.
- Actualizar dinámicamente la lista de la biblioteca tras renombrar o eliminar, mostrando el mensaje de vacío si no quedan elementos.
- Limpiar el visor y reiniciar la partitura activa si la partitura eliminada es la que se encontraba desplegada.

## Out of scope
- Papelera de reciclaje o recuperación de partituras eliminadas.
- Edición del contenido de la partitura (agregar, quitar o reordenar páginas/imágenes).
- Búsqueda, filtrado o categorización por etiquetas/carpetas.
- Reordenamiento manual en la lista.

## Suggestions (your call)
- **Confirmación explícita para eliminar:** Solicitar confirmación nativa antes de eliminar una partitura para evitar borrados accidentales de forma simple y sin dependencias.
- **Flujo directo para renombrar:** Emplear una interacción simple (como un diálogo prompt nativo o campo de texto en línea) para validar y aplicar el nuevo nombre sin recargar la interfaz.
