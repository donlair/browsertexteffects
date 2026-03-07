/**
 * nav.js — Shared site navigation component
 *
 * Auto-injects <nav class="site-nav"> as the first child of <body>.
 * Marks the active link based on the current page.
 * Handles the Effects dropdown and mobile toggle.
 *
 * Usage: <script type="module" src="./js/nav.js"></script>
 */

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

function buildNav() {
  const prefix = './';
  const path = window.location.pathname;
  const page = path.split('/').pop() || 'index.html';

  function isActive(filename) {
    if (filename === 'index.html' && (page === '' || page === 'index.html')) return true;
    return page === filename;
  }

  const nav = document.createElement('nav');
  nav.className = 'site-nav';

  // Logo
  const logo = document.createElement('a');
  logo.href = `${prefix}index.html`;
  logo.className = 'nav-logo';
  logo.textContent = '▓ BTE';
  nav.appendChild(logo);

  // Nav links container
  const links = document.createElement('div');
  links.className = 'nav-links';

  // Main links
  const mainLinks = [
    { filename: 'index.html',           label: 'Home' },
    { filename: 'getting-started.html', label: 'Getting Started' },
    { filename: 'api.html',             label: 'API Reference' },
  ];

  for (const { filename, label } of mainLinks) {
    const a = document.createElement('a');
    a.href = `${prefix}${filename}`;
    a.className = 'nav-link';
    if (isActive(filename)) a.classList.add('active');
    a.textContent = label;
    links.appendChild(a);
  }

  // Effects dropdown
  const dropdown = document.createElement('div');
  dropdown.className = 'nav-dropdown';

  const dropBtn = document.createElement('button');
  dropBtn.className = 'nav-dropdown-btn';
  dropBtn.type = 'button';
  dropBtn.textContent = 'Effects ';
  const arrow = document.createElement('span');
  arrow.className = 'nav-dropdown-arrow';
  arrow.textContent = '▾';
  dropBtn.appendChild(arrow);
  dropdown.appendChild(dropBtn);

  const dropMenu = document.createElement('div');
  dropMenu.className = 'nav-dropdown-menu';

  for (const { key, label } of EFFECTS) {
    const a = document.createElement('a');
    a.href = `${prefix}effect.html?name=${encodeURIComponent(key)}`;
    a.className = 'nav-dropdown-item';
    a.textContent = label;
    dropMenu.appendChild(a);
  }
  dropdown.appendChild(dropMenu);

  dropBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });

  links.appendChild(dropdown);

  // Showroom link
  const showroomLink = document.createElement('a');
  showroomLink.href = `${prefix}showroom.html`;
  showroomLink.className = 'nav-link';
  if (isActive('showroom.html')) showroomLink.classList.add('active');
  showroomLink.textContent = 'Showroom';
  links.appendChild(showroomLink);

  nav.appendChild(links);

  // Spacer
  const spacer = document.createElement('div');
  spacer.className = 'nav-spacer';
  nav.appendChild(spacer);

  // GitHub link
  const github = document.createElement('a');
  github.href = 'https://github.com/donlair/browsertexteffects';
  github.className = 'nav-github';
  github.target = '_blank';
  github.rel = 'noopener';
  github.textContent = 'GitHub →';
  nav.appendChild(github);

  // Mobile toggle for nav links
  const mobileToggle = document.createElement('button');
  mobileToggle.className = 'nav-mobile-toggle';
  mobileToggle.type = 'button';
  mobileToggle.setAttribute('aria-label', 'Toggle navigation');
  mobileToggle.textContent = '☰';
  nav.appendChild(mobileToggle);

  mobileToggle.addEventListener('click', () => {
    const isOpen = links.classList.toggle('mobile-open');
    mobileToggle.textContent = isOpen ? '✕' : '☰';
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    dropdown.classList.remove('open');
  });

  // Close mobile nav when a link is clicked
  links.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      links.classList.remove('mobile-open');
      mobileToggle.textContent = '☰';
    }
  });

  return nav;
}

// Auto-inject nav as first child of body
document.addEventListener('DOMContentLoaded', () => {
  document.body.prepend(buildNav());
});
