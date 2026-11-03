# Story #3 — Seleccionar múltiples imágenes como partitura de varias páginas

## Story
As a musician, I want to select multiple images at once and group them as a single multi-page score, so that I can read scores split across several image files.

## Acceptance criteria
- [ ] Given I'm on the app, when I open the file picker and select 2 or more image files (JPG, PNG, or WEBP), then all images are displayed stacked vertically in the viewer, in the same order the OS reported them.
- [ ] Given multiple images are loaded, when a new set of files is opened, then the previous images are cleared before the new ones are shown (no leftover pages from the previous score).
- [ ] Given no file is loaded, when I open the app, then the empty state is still visible (opening zero files or cancelling the picker doesn't break the empty state).

## Plan
- Add the `multiple` attribute to the `<input type="file">` so the OS picker allows multi-selection.
- In `handleFileOpen`, change the signature to accept an array/FileList of files instead of a single file.
- Clear the viewer (canvases and images) and hide the empty state once, before iterating.
- Loop over each file: for image types create an `<img>` with a blob URL and append it; for PDFs keep the existing `renderPDF` call (mixed mode is out of scope but the loop handles it gracefully).
- Update the `change` listener to pass `e.target.files` (the full FileList) instead of `e.target.files[0]`.

## Out of scope
- Re-ordering pages after selection — future enhancement
- Mixing PDFs and images in the same selection — story #3 only covers images
- Saving the multi-image score to the library — that's story #7
- Naming or labelling the grouped score — future enhancement

## Suggestions (your call)
- **Blob URL cleanup:** revoke previous blob URLs when the viewer is cleared to avoid accumulating memory across sessions where many large scans are opened.
