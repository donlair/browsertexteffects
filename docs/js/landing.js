/**
 * landing.js — Landing page controller (index.html)
 *
 * Handles:
 *  - Hero animation: beams effect on the logo text
 *  - Install snippet copy button
 *  - Quick usage demo via effect-demo.js
 *  - Gallery grid: all 37 effect cards with scroll-triggered animations
 */

import { createEffect } from '../lib/bte.js';
import { createDemo } from './effect-demo.js';

const EFFECTS = [
  { key: 'beams',           label: 'Beams' },
  { key: 'binarypath',      label: 'Binary Path' },
  { key: 'blackhole',       label: 'Blackhole' },
  { key: 'bouncyballs',     label: 'Bouncy Balls' },
  { key: 'bubbles',         label: 'Bubbles' },
  { key: 'burn',            label: 'Burn' },
  { key: 'colorshift',      label: 'Color Shift' },
  { key: 'crumble',         label: 'Crumble' },
  { key: 'decrypt',         label: 'Decrypt' },
  { key: 'errorcorrect',    label: 'Error Correct' },
  { key: 'expand',          label: 'Expand' },
  { key: 'fireworks',       label: 'Fireworks' },
  { key: 'highlight',       label: 'Highlight' },
  { key: 'laseretch',       label: 'Laser Etch' },
  { key: 'matrix',          label: 'Matrix' },
  { key: 'middleout',       label: 'Middle Out' },
  { key: 'orbittingvolley', label: 'Orbitting Volley' },
  { key: 'overflow',        label: 'Overflow' },
  { key: 'pour',            label: 'Pour' },
  { key: 'print',           label: 'Print' },
  { key: 'rain',            label: 'Rain' },
  { key: 'randomsequence',  label: 'Random Sequence' },
  { key: 'rings',           label: 'Rings' },
  { key: 'scattered',       label: 'Scattered' },
  { key: 'slide',           label: 'Slide' },
  { key: 'slice',           label: 'Slice' },
  { key: 'smoke',           label: 'Smoke' },
  { key: 'spotlights',      label: 'Spotlights' },
  { key: 'spray',           label: 'Spray' },
  { key: 'swarm',           label: 'Swarm' },
  { key: 'sweep',           label: 'Sweep' },
  { key: 'synthgrid',       label: 'Synth Grid' },
  { key: 'thunderstorm',    label: 'Thunderstorm' },
  { key: 'unstable',        label: 'Unstable' },
  { key: 'vhstape',         label: 'VHS Tape' },
  { key: 'waves',           label: 'Waves' },
  { key: 'wipe',            label: 'Wipe' },
];

function initHero() {
  const el = document.getElementById('hero-logo');
  if (!el) return;
  const handle = createEffect(el, 'BrowserTextEffects', 'beams');
  handle.start();
}

function initCopyButton() {
  const btn = document.getElementById('copy-install');
  if (!btn) return;
  btn.addEventListener('click', () => {
    navigator.clipboard.writeText('npm install browsertexteffects').then(() => {
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
    }).catch(() => {
      // Fallback: select the text so the user can copy manually
      const cmd = document.querySelector('.hero-install-cmd');
      if (cmd) {
        const range = document.createRange();
        range.selectNode(cmd);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
      }
    });
  });
}

function initUsageDemo() {
  const el = document.getElementById('usage-demo');
  if (!el) return;
  createDemo(el, { text: 'Hello, World!', effect: 'beams', autoplay: true });
}

function initGallery() {
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;

  for (const { key, label } of EFFECTS) {
    // Card is an anchor so the whole card is clickable
    const card = document.createElement('a');
    card.href = `./effect.html?name=${encodeURIComponent(key)}`;
    card.className = 'gallery-card';
    card.setAttribute('aria-label', `${label} effect — view docs`);

    // Preview area (where animation plays)
    const preview = document.createElement('div');
    preview.className = 'gallery-card__preview';

    const textEl = document.createElement('div');
    textEl.className = 'gallery-card__text';
    textEl.textContent = label;
    preview.appendChild(textEl);
    card.appendChild(preview);

    // Footer: display name and key slug
    const footer = document.createElement('div');
    footer.className = 'gallery-card__footer';

    const nameEl = document.createElement('span');
    nameEl.className = 'gallery-card__name';
    nameEl.textContent = label;
    footer.appendChild(nameEl);

    const keyEl = document.createElement('span');
    keyEl.className = 'gallery-card__key';
    keyEl.textContent = key;
    footer.appendChild(keyEl);

    card.appendChild(footer);
    grid.appendChild(card);

    // Animate once when the card scrolls into view
    let played = false;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !played) {
          played = true;
          observer.disconnect();
          textEl.replaceChildren();
          const handle = createEffect(textEl, label, key, { fillContainer: true, extraRows: 3 });
          handle.start();
        }
      }
    }, { threshold: 0.3 });
    observer.observe(card);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initHero();
  initCopyButton();
  initUsageDemo();
  initGallery();
});
