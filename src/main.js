console.log('Clue app booted');
import './features/navbar.js';
import './features/theme.js';
import { initClueCanvas } from './features/clueboard.js';

console.log('Clue app booted');

window.addEventListener('DOMContentLoaded', () => {
  initClueCanvas();
});
