# Story #14 — Secciones visuales diferenciadas para auto-scroll y metrónomo

## Story
As a musician, I want the auto-scroll controls and the metronome controls to be visually distinct sections, so that I can tell at a glance which settings belong to which feature. Requires: #4, #5

## Acceptance criteria
- [ ] Given the header is visible, when I look at the controls, then the auto-scroll button and its speed slider are grouped inside a visually distinct section separated from the metronome controls.
- [ ] Given the header is visible, when I look at the controls, then the metronome button, BPM input, time-signature selector and volume slider are grouped inside their own visually distinct section, separate from auto-scroll.
- [ ] Given a narrow viewport (≤ 768 px), when I view the header, then each section remains visually distinguishable without controls overlapping or losing their group boundary.

## Plan
- Wrap the auto-scroll button + speed slider in a container element and wrap the metronome button + BPM + time-signature + volume in another container element, inside the existing `<header>`.
- Style each container with a subtle border or background tint so the two groups are visually distinguishable at a glance.
- Add a small label or icon to each group so the section identity is obvious even when controls are collapsed or wrapped.
- Adjust the responsive media query so the two sections stack cleanly on narrow viewports while keeping their visual boundary.
- Update existing tests that query header children if their selectors break due to the new wrapper elements.

## Out of scope
- Reorganizing the library button or app name into sections.
- Collapsible/accordion behavior for the groups.
- Drag-and-drop reordering of controls.
- Changing the color scheme or button styles beyond the group container.

## Suggestions (your call)
- **Etiqueta semántica `<fieldset>` + `<legend>`:** Usar `<fieldset>` en vez de `<div>` para cada grupo le da accesibilidad nativa (los lectores de pantalla anuncian el nombre del grupo). El `<legend>` reemplaza la necesidad de un label extra. Solo vale la pena si quieres mantener la semántica limpia; si no, un `<div>` con `role="group"` y `aria-label` logra lo mismo.
