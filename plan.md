# Story #2 — Abrir imágenes como partitura

## Story
As a musician, I want to open image files (JPG, PNG, WEBP) as sheet music, so that I can view scores that come as photos or scans.

## Acceptance criteria
- [x] Given I'm on the app, when I click the open button and select a JPG, PNG, or WEBP file, then the image is displayed in the main viewer area, fitting the full width of the viewport.
- [x] Given an image is loaded, when I look at the open button, then it still reads the same as before (the button label doesn't change between PDF and image mode).
- [x] Given no file is loaded, when I open the app, then the empty state is still visible as in story #1.

## Plan
1. Extend the file input's `accept` attribute to also include `image/jpeg`, `image/png`, and `image/webp`.
2. In the `change` handler, branch on `file.type`: if it starts with `image/`, handle it as an image; otherwise keep the existing PDF flow.
3. For the image branch: create an `<img>` element, set its `src` to a blob URL (`URL.createObjectURL(file)`), apply the same full-width CSS already used for canvases, and append it to `#viewer`.
4. Hide the empty state and clear previous pages (canvases or images) the same way already done for PDFs.
5. No new functions needed; the branch lives inside the existing `change` listener.

## Out of scope
- Selecting multiple images as a single score — that's story #3
- Auto-scroll — that's story #4
- Saving images to the library — that's story #7
- Zoom or rotation controls — future enhancement

## Suggestions (your call)
- **Blob URL cleanup:** call `URL.revokeObjectURL()` when a new file is opened to avoid memory leaks, especially relevant if the user opens many large scans in one session.
