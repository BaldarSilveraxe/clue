/* jshint esversion: 11 */

// Create a new paragraph element
const newParagraph = document.createElement('p');

// Set the text content of the new paragraph
newParagraph.textContent = 'This text was added by JavaScript.';

// Append the new paragraph to the end of the body
document.body.appendChild(newParagraph);

const btn = document.getElementById('themeToggle');
const render = () => {
    const t = document.documentElement.dataset.theme;
    btn.textContent = t === 'dark' ? 'Light mode' : 'Dark mode';
    btn.setAttribute('aria-pressed', t === 'dark');
};
btn?.addEventListener('click', () => {
    window.theme.toggle();
    render();
});
render();
