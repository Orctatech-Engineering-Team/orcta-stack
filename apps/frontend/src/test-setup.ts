// Installs a jsdom environment on globalThis so @testing-library/react can
// render components under `deno test`. Import this first in any test file
// that needs a DOM — Deno's test runner has no Vitest-style global setupFiles.

import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
	url: "http://localhost/",
	pretendToBeVisual: true,
});

// biome-ignore lint/suspicious/noExplicitAny: assigning jsdom globals onto globalThis
const g = globalThis as any;

g.window = dom.window;
g.document = dom.window.document;
g.navigator = dom.window.navigator;
g.HTMLElement = dom.window.HTMLElement;
g.Element = dom.window.Element;
g.Node = dom.window.Node;
g.customElements = dom.window.customElements;
g.getComputedStyle = dom.window.getComputedStyle;
g.requestAnimationFrame = (cb: FrameRequestCallback) =>
	setTimeout(() => cb(Date.now()), 0);
g.cancelAnimationFrame = (id: number) => clearTimeout(id);
g.IS_REACT_ACT_ENVIRONMENT = true;
