/**
 * effect-playground.js — Interactive code playground for effect pages
 *
 * Renders a unified card: demo output on top, editable textarea in the
 * middle, Run/Reset/Copy buttons at the bottom. Code is executed via a
 * dynamically constructed Function with all BTE exports injected.
 *
 * NOTE: The dynamic Function usage is intentional — this is a client-side-only
 * documentation playground where users run their own code in their own browser
 * tab. There is no server, no persistence, no other users. This is the same
 * execution model used by CodePen, JSFiddle, and similar tools.
 *
 * Usage:
 *   import { createPlayground } from './js/effect-playground.js';
 *
 *   const pg = createPlayground(containerEl, {
 *     text: 'Hello World',
 *     effect: 'beams',
 *     usage: '...',
 *     autoplay: true,
 *   });
 *
 *   pg.destroy();
 */

import * as BTE from '../lib/bte.js';

/**
 * @param {HTMLElement} container
 * @param {object} options
 * @param {string} options.text     - Default text for the effect
 * @param {string} options.effect   - Effect key (e.g. 'beams')
 * @param {string} options.usage    - Initial code string
 * @param {boolean} [options.autoplay=true]
 * @returns {{ destroy: () => void }}
 */
export function createPlayground(container, { text, effect, usage, autoplay = true }) {
  const originalCode = usage;
  let activeHandles = [];

  // --- DOM ---
  const wrapper = document.createElement('div');
  wrapper.className = 'playground';

  // Output area
  const output = document.createElement('div');
  output.className = 'playground__output';

  const textEl = document.createElement('div');
  textEl.className = 'playground__text';
  output.appendChild(textEl);
  wrapper.appendChild(output);

  // Error display
  const errorEl = document.createElement('div');
  errorEl.className = 'playground__error';
  wrapper.appendChild(errorEl);

  // Editor (overlay technique: transparent textarea over highlighted pre/code)
  const editorWrap = document.createElement('div');
  editorWrap.className = 'playground__editor-wrap';

  const pre = document.createElement('pre');
  pre.className = 'playground__highlight';
  const codeEl = document.createElement('code');
  codeEl.className = 'language-javascript';
  pre.appendChild(codeEl);
  editorWrap.appendChild(pre);

  const editor = document.createElement('textarea');
  editor.className = 'playground__editor';
  editor.spellcheck = false;
  editor.autocomplete = 'off';
  editor.autocapitalize = 'off';
  editor.value = usage;
  editorWrap.appendChild(editor);

  wrapper.appendChild(editorWrap);

  // Sync highlighted code with textarea content
  function syncHighlight() {
    codeEl.textContent = editor.value + '\n';
    if (typeof Prism !== 'undefined') {
      Prism.highlightElement(codeEl);
    }
    // Match pre height to content so textarea overlay stays aligned
    editor.style.height = pre.scrollHeight + 'px';
  }

  // Sync scroll positions
  editor.addEventListener('scroll', () => {
    pre.scrollTop = editor.scrollTop;
    pre.scrollLeft = editor.scrollLeft;
  });

  function updateResetVisibility() {
    resetBtn.hidden = editor.value === originalCode;
  }

  editor.addEventListener('input', () => {
    syncHighlight();
    updateResetVisibility();
  });

  // Tab key: insert 2 spaces
  editor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      editor.value = editor.value.substring(0, start) + '  ' + editor.value.substring(end);
      editor.selectionStart = editor.selectionEnd = start + 2;
      syncHighlight();
      updateResetVisibility();
    }
  });

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'playground__toolbar';

  const runBtn = document.createElement('button');
  runBtn.className = 'btn primary';
  runBtn.type = 'button';
  runBtn.textContent = 'Run';

  const resetBtn = document.createElement('button');
  resetBtn.className = 'btn';
  resetBtn.type = 'button';
  resetBtn.textContent = 'Reset';
  resetBtn.hidden = true;

  const copyBtn = document.createElement('button');
  copyBtn.className = 'btn';
  copyBtn.type = 'button';
  copyBtn.textContent = 'Copy';

  toolbar.append(runBtn, resetBtn, copyBtn);
  wrapper.appendChild(toolbar);
  container.appendChild(wrapper);

  // Initial highlight (must be after DOM insertion so pre.scrollHeight is valid)
  syncHighlight();

  // --- Execution ---
  function stopAll() {
    for (const h of activeHandles) {
      try { h.stop(); } catch {}
    }
    activeHandles = [];
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.add('visible');
  }

  function hideError() {
    errorEl.textContent = '';
    errorEl.classList.remove('visible');
  }

  // Client-side code execution for the interactive playground.
  // Uses Function constructor intentionally — same pattern as CodePen/JSFiddle.
  // Users only execute their own code in their own browser tab.
  function executeCode(code) {
    stopAll();
    textEl.replaceChildren();
    hideError();

    // Strip import lines
    let transformed = code.replace(/^\s*import\s+.*?['"];?\s*$/gm, '');

    // Replace document.getElementById(...) with __el__
    transformed = transformed.replace(/document\.getElementById\([^)]*\)/g, '__el__');

    // Build wrapped createEffect/createEffectOnScroll that track handles
    const wrappedCreateEffect = (...args) => {
      const handle = BTE.createEffect(...args);
      activeHandles.push(handle);
      return handle;
    };
    const wrappedCreateEffectOnScroll = (...args) => {
      const handle = BTE.createEffectOnScroll(...args);
      activeHandles.push(handle);
      return handle;
    };

    // Collect all BTE exports, overriding create functions with wrapped versions
    const injected = {
      ...BTE,
      createEffect: wrappedCreateEffect,
      createEffectOnScroll: wrappedCreateEffectOnScroll,
    };

    const paramNames = Object.keys(injected);
    const paramValues = paramNames.map(k => injected[k]);
    paramNames.push('__el__');
    paramValues.push(textEl);

    try {
      // eslint-disable-next-line no-new-func -- intentional, see module header
      const fn = new Function(...paramNames, transformed);
      try {
        fn(...paramValues);
      } catch (runtimeErr) {
        showError(`Runtime error: ${runtimeErr.message}`);
      }
    } catch (syntaxErr) {
      showError(`Syntax error: ${syntaxErr.message}`);
    }
  }

  // --- Button handlers ---
  runBtn.addEventListener('click', () => executeCode(editor.value));

  resetBtn.addEventListener('click', () => {
    editor.value = originalCode;
    syncHighlight();
    updateResetVisibility();
    executeCode(originalCode);
  });

  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(editor.value).then(() => {
      copyBtn.textContent = 'Copied!';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = 'Copy';
        copyBtn.classList.remove('copied');
      }, 2000);
    });
  });

  // --- Autoplay via IntersectionObserver ---
  let observer = null;
  if (autoplay) {
    let played = false;
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !played) {
          played = true;
          executeCode(editor.value);
          observer.disconnect();
        }
      }
    }, { threshold: 0.1 });
    observer.observe(wrapper);
  }

  return {
    destroy() {
      stopAll();
      if (observer) observer.disconnect();
      wrapper.remove();
    },
  };
}
