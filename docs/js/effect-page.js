/**
 * effect-page.js — Per-effect page controller
 *
 * Reads ?name= from the URL, validates against the registry,
 * dynamically imports the effect content module, and renders
 * the full page: breadcrumb, description, live demo, usage,
 * config table, and prev/next navigation.
 */

import { EFFECTS, getAdjacentEffects } from '../effects/_registry.js';
import { createDemo } from './effect-demo.js';

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const name = params.get('name');
  const mainEl = document.getElementById('effect-main');

  if (!name) {
    showError(mainEl, 'No effect specified.', 'Use ?name=beams in the URL.');
    return;
  }

  const registryEntry = EFFECTS.find(e => e.key === name);
  if (!registryEntry) {
    showError(mainEl, `Unknown effect: "${name}"`, 'Check the API Reference for valid effect names.');
    return;
  }

  let effectData;
  try {
    const mod = await import(`../effects/${name}.js`);
    effectData = mod.default;
  } catch {
    showError(mainEl, `Effect "${name}" is not yet documented.`, '');
    return;
  }

  renderEffect(mainEl, effectData, name);
});

function showError(container, title, detail) {
  container.replaceChildren();

  const div = document.createElement('div');
  div.className = 'effect-error-state';

  const icon = document.createElement('div');
  icon.className = 'effect-error-icon';
  icon.textContent = '⚠';

  const msg = document.createElement('div');
  msg.className = 'effect-error-message';

  const titleEl = document.createElement('strong');
  titleEl.textContent = title;
  msg.appendChild(titleEl);

  if (detail) {
    msg.appendChild(document.createTextNode(' ' + detail));
  }

  const link = document.createElement('a');
  link.href = './api.html#effect-names';
  link.className = 'btn';
  link.textContent = 'Browse all effects';

  div.appendChild(icon);
  div.appendChild(msg);
  div.appendChild(link);
  container.appendChild(div);
}

function renderEffect(container, effect, name) {
  const { prev, next } = getAdjacentEffects(name);

  document.title = `${effect.name} — BrowserTextEffects`;

  container.replaceChildren();

  const layout = document.createElement('div');
  layout.className = 'effect-page-layout';

  // --- Breadcrumb ---
  const crumb = document.createElement('nav');
  crumb.className = 'effect-breadcrumb';
  crumb.setAttribute('aria-label', 'Breadcrumb');

  const homeLink = document.createElement('a');
  homeLink.href = './index.html';
  homeLink.textContent = 'Home';

  const sep1 = document.createElement('span');
  sep1.setAttribute('aria-hidden', 'true');
  sep1.textContent = '›';

  const effectsLink = document.createElement('a');
  effectsLink.href = './api.html#effect-names';
  effectsLink.textContent = 'Effects';

  const sep2 = document.createElement('span');
  sep2.setAttribute('aria-hidden', 'true');
  sep2.textContent = '›';

  const current = document.createElement('span');
  current.textContent = effect.name;

  crumb.append(homeLink, sep1, effectsLink, sep2, current);
  layout.appendChild(crumb);

  // --- Header ---
  const header = document.createElement('header');
  header.className = 'effect-header';

  const h1 = document.createElement('h1');
  h1.className = 'effect-page-title';
  h1.textContent = effect.name;

  const desc = document.createElement('p');
  desc.className = 'effect-page-desc';
  desc.textContent = effect.description;

  const showroomLink = document.createElement('a');
  showroomLink.href = `./showroom.html?effect=${encodeURIComponent(name)}`;
  showroomLink.className = 'btn';
  showroomLink.target = '_blank';
  showroomLink.rel = 'noopener';
  showroomLink.textContent = 'View in Showroom ↗';

  header.append(h1, desc, showroomLink);
  layout.appendChild(header);

  // --- Live Demo ---
  const demoSection = document.createElement('section');
  demoSection.className = 'effect-section';

  const demoTitle = document.createElement('h2');
  demoTitle.className = 'effect-section-title';
  demoTitle.textContent = 'Live Demo';

  const demoContainer = document.createElement('div');
  demoSection.append(demoTitle, demoContainer);
  layout.appendChild(demoSection);

  // --- Usage ---
  const usageSection = document.createElement('section');
  usageSection.className = 'effect-section';

  const usageTitle = document.createElement('h2');
  usageTitle.className = 'effect-section-title';
  usageTitle.textContent = 'Usage';

  const codeBlock = document.createElement('div');
  codeBlock.className = 'code-block';

  const pre = document.createElement('pre');
  const code = document.createElement('code');
  code.textContent = effect.usage;
  pre.appendChild(code);

  const copyBtn = document.createElement('button');
  copyBtn.className = 'copy-btn';
  copyBtn.type = 'button';
  copyBtn.textContent = 'Copy';

  codeBlock.append(pre, copyBtn);
  usageSection.append(usageTitle, codeBlock);
  layout.appendChild(usageSection);

  // --- Config table ---
  if (effect.config && effect.config.length > 0) {
    const configSection = document.createElement('section');
    configSection.className = 'effect-section';

    const configTitle = document.createElement('h2');
    configTitle.className = 'effect-section-title';
    configTitle.textContent = 'Configuration';

    const table = document.createElement('table');
    table.className = 'effect-config-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (const label of ['Parameter', 'Type', 'Default', 'Description']) {
      const th = document.createElement('th');
      th.textContent = label;
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const param of effect.config) {
      const tr = document.createElement('tr');

      const tdName = document.createElement('td');
      tdName.className = 'param-name';
      tdName.textContent = param.name;

      const tdType = document.createElement('td');
      tdType.className = 'param-type';
      tdType.textContent = param.type;

      const tdDefault = document.createElement('td');
      tdDefault.className = 'param-default';
      tdDefault.textContent = param.default;

      const tdDesc = document.createElement('td');
      tdDesc.className = 'param-desc';
      tdDesc.textContent = param.description;

      tr.append(tdName, tdType, tdDefault, tdDesc);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    configSection.append(configTitle, table);
    layout.appendChild(configSection);
  }

  // --- Prev/Next navigation ---
  const paginationNav = document.createElement('nav');
  paginationNav.className = 'docs-pagination';
  paginationNav.setAttribute('aria-label', 'Effect navigation');

  if (prev) {
    const prevLink = document.createElement('a');
    prevLink.href = `./effect.html?name=${encodeURIComponent(prev.key)}`;
    prevLink.className = 'prev-link';

    const prevLabel = document.createElement('span');
    prevLabel.className = 'pag-label';
    prevLabel.textContent = '← Previous';

    const prevTitle = document.createElement('span');
    prevTitle.className = 'pag-title';
    prevTitle.textContent = prev.name;

    prevLink.append(prevLabel, prevTitle);
    paginationNav.appendChild(prevLink);
  }

  if (next) {
    const nextLink = document.createElement('a');
    nextLink.href = `./effect.html?name=${encodeURIComponent(next.key)}`;
    nextLink.className = 'next-link';

    const nextLabel = document.createElement('span');
    nextLabel.className = 'pag-label';
    nextLabel.textContent = 'Next →';

    const nextTitle = document.createElement('span');
    nextTitle.className = 'pag-title';
    nextTitle.textContent = next.name;

    nextLink.append(nextLabel, nextTitle);
    paginationNav.appendChild(nextLink);
  }

  layout.appendChild(paginationNav);
  container.appendChild(layout);

  // Mount demo after layout is in DOM (IntersectionObserver needs it visible)
  createDemo(demoContainer, {
    text: 'BrowserTextEffects',
    effect: name,
    autoplay: true,
  });

  // Copy button handler
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(effect.usage).then(() => {
      copyBtn.textContent = 'Copied!';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = 'Copy';
        copyBtn.classList.remove('copied');
      }, 2000);
    });
  });
}
