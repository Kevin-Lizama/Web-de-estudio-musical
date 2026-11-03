# Story #1 — Abrir PDF y visualizar páginas

## Story
As a musician, I want to open a PDF file and see all its pages stacked vertically, so that I can read my sheet music on screen.

## Acceptance criteria
- [ ] Given I'm on the app, when I click an "Open" button and select a PDF file from my computer, then all pages of the PDF are rendered vertically one below another in the main area.
- [ ] Given a multi-page PDF is loaded, when I scroll down, then I can see all pages in order without gaps or overlaps, each fitting the width of the viewport.
- [ ] Given no PDF is loaded, when I open the app, then I see an empty state inviting me to open a file (not a blank screen).

## Plan
1. Create the HTML shell with a header (app name + open button), a main content area for the pages, and a minimal empty state.
2. Wire the open button to a file input that accepts `.pdf`, read the selected file as an `ArrayBuffer`.
3. Load PDF.js from a local copy, pass the buffer to it, and iterate all pages rendering each one to a `<canvas>` at the viewport width.
4. Append all canvases vertically into the main content area so native browser scroll works.
5. Style the layout with basic CSS (centered pages, subtle gap between them, dark or neutral background to reduce eye strain).

## Out of scope
- Images (JPG/PNG) — that's story #2
- Auto-scroll — that's story #4
- Saving/library/IndexedDB — that's story #7
- Zoom controls — future enhancement
- Double-page mode — future enhancement

## Suggestions (your call)
- **Background color:** Partituras on a dark grey background (`#2a2a2a`) reduce eye fatigue in long practice sessions, and make the white pages "pop."

