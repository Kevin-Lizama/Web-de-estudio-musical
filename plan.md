# Story #12 — Velocidades de auto-scroll más lentas

## Story
As a musician, I want slower auto-scroll speed options than the current minimum, so that I can follow pieces with very slow tempos. Requires: #4

## Acceptance criteria
- [x] Given auto-scroll activo con el slider en su valor mínimo, when observo la partitura, then avanza a una velocidad notablemente menor que el mínimo anterior (≈ la mitad o menos de los 10 px/s actuales).
- [x] Given auto-scroll activo, when muevo el slider por todo su rango, then la velocidad cambia de forma gradual y continua desde el nuevo mínimo lento hasta el máximo existente, sin saltos ni zonas muertas.

## Plan
- Extender el rango inferior del slider de velocidad para admitir valores por debajo del mínimo actual, de modo que el scroll pueda avanzar a una fracción de la velocidad piso anterior.
- Ajustar la guarda/clamp que impone un piso de velocidad para que respete el nuevo límite inferior.
- Asegurar que el valor por defecto siga ofreciendo una velocidad de inicio razonable dentro del nuevo rango.
- Actualizar los tests de desplazamiento y cambio de velocidad en vivo para que reflejen el nuevo rango y sigan pasando.
- Verificar de extremo a extremo que el auto-scroll arranque, pause y cambie de velocidad correctamente con valores en la zona lenta.

## Out of scope
- Cambiar la velocidad máxima o agregar un segundo control de velocidad.
- Botones de velocidad preestablecida o etiquetas con nombre (e.g., "Lento", "Moderato").
- Vincular la velocidad de scroll al BPM del metrónomo.
- Cambiar la UX del auto-scroll más allá del rango del slider (e.g., control por gestos).

## Suggestions (your call)
- **Escala no lineal (logarítmica o cuadrática):** Si al extender el rango hacia abajo el slider se siente como que los primeros niveles "son todos iguales" y el salto a velocidad alta es brusco, una curva no lineal le daría más resolución a la zona lenta sin sacrificar el extremo rápido. Solo tiene sentido si al probar el rango lineal extendido la graduación se siente desbalanceada.
