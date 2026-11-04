# Story #5 — Metrónomo con BPM ajustable y compases (2/4, 3/4, 4/4, 6/8)

## Story
As a musician, I want a metronome with adjustable BPM and time signature (2/4, 3/4, 4/4, 6/8), so that I can keep a steady tempo with the right accent pattern while practicing.

## Acceptance criteria
- [x] Given el metrónomo está detenido, when presiono el botón para iniciarlo, then comienza a emitir pulsos sonoros constantes al tempo (BPM) seleccionado y el control permite detenerlo.
- [x] Given un compás seleccionado (2/4, 3/4, 4/4 o 6/8), when el metrónomo está reproduciendo, then el primer pulso de cada compás emite un tono acentuado distintivo y los pulsos restantes emiten el tono regular.
- [x] Given el metrónomo está en reproducción, when modifico el BPM o selecciono otro compás, then el tempo y el ciclo de acentos se ajustan inmediatamente sin reiniciar la reproducción.

## Plan
- Agregar en la barra superior los controles de usuario: botón de alternancia inicio/parada, selector de compás (2/4, 3/4, 4/4, 6/8) y control de tempo (BPM) con rango práctico (ej. 40 a 240).
- Inicializar el contexto de audio del navegador al interactuar con el botón para sintetizar clics con dos tonos perceptualmente distintos (agudo/fuerte para el acento, estándar para los demás).
- Implementar un programador de eventos de audio con temporizador para calcular los intervalos entre pulsos y llevar la cuenta del compás actual.
- Aplicar en tiempo real los cambios de BPM y compás sobre el temporizador y el contador sin requerir detener el metrónomo.
- Detener la emisión sonora, limpiar los eventos programados pendientes y reiniciar el contador de compás al pausar o detener.

## Out of scope
- Tap tempo para calcular BPM rítmicamente (definido en historia #6).
- Indicador visual animado (péndulo o destello del compás en pantalla).
- Carga de archivos de sonido externos (WAV/MP3) o personalización de timbres.
- Subdivisiones rítmicas complejas (corcheas, semicorcheas, tresillos).
- Persistencia de tempo y compás entre sesiones (historias #7+).
- Vinculación del tempo del metrónomo con la velocidad del auto-scroll.

## Suggestions (your call)
- **Programador lookahead con Web Audio API:** Usar únicamente `setInterval` provoca desfases audibles si el hilo principal de la interfaz se ocupa o se cambia de pestaña. La práctica estándar con Web Audio es usar un ciclo de anticipación (lookahead) que programa los tonos con precisión en el reloj del hardware de audio (`currentTime`).
- **Pulsos sintetizados mediante osciladores:** Generar clics breves (30–50 ms con caída exponencial de ganancia) con osciladores nativos evita depender de archivos de audio externos, previene problemas de carga asíncrona y encaja con la arquitectura sin dependencias del proyecto.
