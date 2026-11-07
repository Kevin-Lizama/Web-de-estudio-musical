# Story #11 — Mover "Abrir partitura" al panel de biblioteca

## Story
As a musician, I want the "open score" action inside the library panel instead of the navbar, so that the top bar stays uncluttered.

## Acceptance criteria
- [x] Given el panel de biblioteca abierto, when lo inspecciono visualmente, then veo un botón "Abrir partitura" dentro del panel que permite seleccionar archivos (PDF o imágenes) para cargar.
- [x] Given el panel de biblioteca abierto, when pulso el botón "Abrir partitura" y selecciono un archivo, then la partitura se carga en el visor, se guarda en la biblioteca y el diálogo se cierra, exactamente igual que la funcionalidad actual del botón en la navbar.
- [x] Given la barra de navegación superior, when la inspecciono, then ya no contiene el botón "Abrir partitura" ni el input de archivo oculto asociado.

## Plan
- Eliminar el botón `#open-btn` y el `<input #file-input>` del `<header>` en el HTML y moverlos dentro del `<dialog>` de biblioteca (por ejemplo, debajo del título o encima de la lista).
- Ajustar el wiring del browser en `app.js` para que el listener de click y el handler de `change` del input apunten a los elementos reubicados dentro del diálogo, y cerrar el diálogo tras una carga exitosa.
- Limpiar las reglas CSS que apliquen exclusivamente al botón `#open-btn` en la navbar y, si es necesario, agregar estilos para su nueva posición dentro del modal.
- Actualizar los tests existentes que dependan de la presencia de `#open-btn` en el `<header>` para que reflejen su nueva ubicación dentro del diálogo de biblioteca.
- Verificar que la carga desde la biblioteca (seleccionar archivo → guardar → renderizar → cerrar diálogo) funcione correctamente de extremo a extremo.

## Out of scope
- Drag-and-drop de archivos sobre el panel de biblioteca o sobre el visor.
- Reorganizar otros controles de la barra de navegación (auto-scroll, metrónomo).
- Cambiar el diseño visual general del modal de biblioteca más allá de acomodar el botón.
- Agregar un botón secundario de "abrir" en el estado vacío del visor principal.

## Suggestions (your call)
- **Botón de "Abrir" también en el empty state:** Si la única forma de cargar una partitura requiere abrir primero la biblioteca, podría resultar un paso extra para el primer uso. Una alternativa sería mantener un CTA en el `#empty-state` que abra directamente el diálogo de selección de archivos o que abra la biblioteca. Solo tiene sentido si notas fricción en el flujo de primera carga.
