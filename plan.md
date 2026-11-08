# Story #13 — Volumen del metrónomo

## Story
As a musician, I want to adjust the metronome volume, so that I can balance it against my instrument or mute it entirely at minimum volume. Requires: #5

## Acceptance criteria
- [x] Given the metronome playing, when I move the volume slider, then the loudness of the clicks changes immediately without restarting the metronome.
- [x] Given the volume slider set to minimum (0), when the metronome plays, then no sound is produced (completely silent).
- [x] Given I change the volume and later stop and restart the metronome, when it plays again, then it uses the last volume I set.

## Plan
- Add a volume range input (0 to 1) in the navbar with a sensible default and an accessible label.
- Route metronome oscillator clicks through a shared GainNode before reaching AudioContext destination.
- Update the shared GainNode value immediately on slider input so sound level changes live (including 0 gain at minimum).
- Read the current slider value when starting the metronome so subsequent sessions respect the configured volume.
- Add unit and integration tests verifying the volume control element and GainNode level reflection.

## Out of scope
- Persisting the volume preference across sessions (localStorage/IndexedDB).
- Separate mute toggle button.
- Per-beat volume differentiation (accent vs. normal beat volume).
- Visual volume meter or animated decibel feedback.

## Suggestions (your call)
- **Escala cuadrática para el slider:** La percepción auditiva del volumen es logarítmica. Si al probar una escala lineal notas que el sonido baja muy rápido en los primeros valores, podemos mapear `gain = sliderValue²` para mayor suavidad.
