// Iframe injection helper. Mirrors `app/javascript/sdk/IFrameHelper.js`
// minus the legacy CSS-in-JS bubble — the new widget app
// (`apps/widget`) owns its own chrome, so this file's job is just:
//
//   1. create the iframe pointing at the widget origin,
//   2. pass the website token + visitor identity via the URL,
//   3. wire a postMessage bridge so the widget can request resize /
//      open / close / authentication refresh.
//
// CORS: the widget origin must `Access-Control-Allow-Origin` the
// host page; the postMessage bridge enforces a strict targetOrigin
// (matches `baseUrl`) so untrusted frames can't talk to the SDK.

import type { VisitorState } from './storage';

export interface InjectOptions {
  websiteToken: string;
  baseUrl: string;
  visitor: VisitorState;
}

export function injectWidgetIframe(_options: InjectOptions): HTMLIFrameElement | null {
  // TODO: build src URL (`<baseUrl>/widget?website_token=...&cw_conversation=...`),
  // create iframe with sandbox attrs, attach to document.body,
  // wire `window.addEventListener('message', ...)` with origin check.
  return null;
}
