// Loads the inline <script> from index.html into a VM with a minimal DOM stub,
// so the current global functions can be tested without a browser or dependencies.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const SCRIPT = html.match(/<script>([\s\S]*?)<\/script>/)[1];

// Initial values of every input/textarea/select, read from the markup itself.
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
      contains: c => classes.has(c),
    },
    scrollIntoView() {},
  };
}

export function loadApp({ timeout = 1000 } = {}) {
  const values = initialValues();
  const elements = new Map();
  const storage = new Map();
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, makeElement(id, values[id] ?? ''));
      return elements.get(id);
    },
    querySelectorAll: () => [],
    querySelector: () => makeElement('stub'),
  };
  const context = vm.createContext({
    document,
    localStorage: {
      setItem: (k, v) => storage.set(k, String(v)),
      getItem: k => (storage.has(k) ? storage.get(k) : null),
    },
    navigator: { clipboard: { writeText: async () => {} } },
    setTimeout: () => 0,
    console,
  });
  // `let` bindings are script-scoped, so expose the reel state through accessors.
  const source = `${SCRIPT}
    globalThis.__state = { get variants() { return variants }, get selected() { return selected } };`;
  vm.runInContext(source, context, { timeout });

  return {
    $: id => document.getElementById(id),
    call(name, ...args) {
      context.__args = args;
      return vm.runInContext(`${name}(...__args)`, context, { timeout });
    },
    get state() { return context.__state; },
    storage,
  };
}
