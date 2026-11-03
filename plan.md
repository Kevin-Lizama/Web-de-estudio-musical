# Story #4 — Auto-scroll continuo a velocidad ajustable

## Story
As a musician, I want to activate continuous auto-scroll at an adjustable speed and pause or resume it, so that the score advances on its own while I play.

## Acceptance criteria
- [x] Given a score is loaded (PDF o imágenes), when I press "Auto-scroll", then the viewer starts scrolling down continuously and the button label changes to "Pausar".
- [x] Given the auto-scroll is running, when I press "Pausar", then the scroll stops exactly where it is and the button label returns to "Auto-scroll".
- [x] Given the auto-scroll is active or paused, when I move the speed control, then the scroll speed changes in real time (without restarting the scroll).

## Plan
- Add an "Auto-scroll" button and a `<input type="range">` speed control to the `<header>` in the HTML.
- Keep an `isScrolling` flag and a `requestAnimationFrame` id in the module; clicking the button toggles between starting and cancelling the RAF loop.
- In each frame of the loop, advance `window.scrollBy` by a delta proportional to the range value and the elapsed time since the previous frame.
- Read the range value directly in each frame so slider changes apply instantly with no extra logic.
- Auto-disable the scroll (and reset the button) if no pages are loaded in the viewer.

## Out of scope
- Linking scroll speed to the metronome BPM — that's story #5 + future integration.
- Page-by-page auto-advance (jumping between pages) — different from continuous scroll.
- Persisting the chosen speed between sessions — that's story #7+.
- Horizontal scroll control.

## Suggestions (your call)
- **`requestAnimationFrame` with time delta:** compute displacement as `speed * deltaMs / 1000` instead of fixed pixels per frame, so speed is consistent regardless of monitor refresh rate (60 Hz vs 120 Hz). There's a concrete signal: the RAF loop pattern is already used internally by PDF.js in this project, so the approach is familiar.
