// Composition root: wires real browser globals into the app.
import { createApp } from './ui/app.js';

const app = createApp({
  document,
  storage: localStorage,
  clipboard: navigator.clipboard,
  setTimeout: (fn, ms) => window.setTimeout(fn, ms),
  now: () => new Date(),
});

// index.html still calls handlers through onclick attributes.
Object.assign(window, app.handlers);
app.start();
