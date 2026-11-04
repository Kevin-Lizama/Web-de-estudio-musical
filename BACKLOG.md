# Backlog — Web de Partituras

## Context
App web personal para un músico que necesita visualizar partituras (PDF e imágenes), practicar con metrónomo y avanzar automáticamente por las páginas mientras toca.
Stack: HTML + CSS + Vanilla JS (ES Modules), PDF.js, Web Audio API, IndexedDB. Sin backend, sin framework, sin bundler.
Expensive decisions: none

## Backlog
1. [x] As a musician, I want to open a PDF file and see all its pages stacked vertically, so that I can read my sheet music on screen.
2. [x] As a musician, I want to open image files (JPG, PNG, WEBP) as sheet music, so that I can view scores that come as photos or scans. Requires: #1
3. [x] As a musician, I want to select multiple images at once and group them as a single multi-page score, so that I can read scores split across several image files. Requires: #2
4. [x] As a musician, I want to activate continuous auto-scroll at an adjustable speed and pause or resume it, so that the score advances on its own while I play. Requires: #1
5. [x] As a musician, I want a metronome with adjustable BPM and time signature (2/4, 3/4, 4/4, 6/8), so that I can keep a steady tempo with the right accent pattern while practicing.
6. [ ] As a musician, I want to tap a button rhythmically to set the BPM, so that I can match the tempo I have in mind without guessing a number. Requires: #5
7. [x] As a musician, I want my uploaded scores saved in a persistent library, so that I don't have to re-upload them every session. Requires: #1
8. [x] As a musician, I want to browse my saved library and open a score from it, so that I can quickly access any piece I've previously loaded. Requires: #7
9. [ ] As a musician, I want to rename and delete scores from my library, so that I can keep my collection organized. Requires: #8
10. [ ] As a musician, I want the app to remember where I left off in each score, so that I can resume practicing from the same spot. Requires: #8

