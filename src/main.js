// src/main.js

// app modules
import { initClueCanvas } from './features/clueboard.js';
import './features/navbar.js';
import './features/theme.js';

console.log('Clue app booted');

window.addEventListener('DOMContentLoaded', async () => {
  // 1) build the canvas & expose window.__clue
  initClueCanvas();

  // 2) then start realtime so initial state applies to the canvas immediately
  await import('./realtime.js');
});
