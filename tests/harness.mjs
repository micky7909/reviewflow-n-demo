// Builds the app with a minimal DOM stub so handlers can be tested without a browser.
// Initial input values are read from index.html itself.
import { readFileSync } from 'node:fs';
import { createApp } from '../src/ui/app.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function initialValues() {
  const values = {};
  const idOf = attrs => attrs.match(/\bid="([^"]+)"/)?.[1];
  for (const [, attrs] of html.matchAll(/<input\b([^>]*)>/g)) {
    if (idOf(attrs)) values[idOf(attrs)] = attrs.match(/\bvalue="([^"]*)"/)?.[1] ?? '';
  }
  for (const [, attrs, inner] of html.matchAll(/<textarea\b([^>]*)>([\s\S]*?)<\/textarea>/g)) {
    if (idOf(attrs)) values[idOf(attrs)] = inner;
  }
  for (const [, attrs, inner] of html.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/g)) {
    if (idOf(attrs)) values[idOf(attrs)] = inner.match(/<option>([^<]*)<\/option>/)?.[1] ?? '';
  }
  return values;
}

function makeElement(id, value = '') {
  const classes = new Set();
  return {
    id, value, textContent: '', innerHTML: '', style: {}, dataset: {},
    classList: {
      add: c => classes.add(c), remove: c => classes.delete(c),
      toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)),
      contains: c => classes.has(c),
    },
    addEventListener() {},
    scrollIntoView() {},
  };
}

export function loadApp() {
  const values = initialValues();
  const elements = new Map();
  const storage = new Map();
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, makeElement(id, values[id] ?? ''));
      return elements.get(id);
    },
    querySelectorAll: () => [],
  };
  const app = createApp({
    document,
    storage: { setItem: (k, v) => storage.set(k, String(v)) },
    clipboard: { writeText: async () => {} },
    setTimeout: () => 0,
    now: () => new Date('2026-10-04T09:00:00+09:00'),
  });
  app.start();

  return {
    $: id => document.getElementById(id),
    call: (name, ...args) => app.handlers[name](...args),
    state: app.state,
    storage,
  };
}
