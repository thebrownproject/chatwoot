// Public SDK global. Mirrors the surface of the legacy
// `app/javascript/sdk/sdk.js` `window.chatwootSDK.run({...})` entry point
// so existing customer install snippets keep working through cutover.
//
// Stub: only the smallest viable shape — `run({ websiteToken, baseUrl })`
// kicks off iframe injection. Identity, locale, custom attributes,
// `setUser`, `toggle`, etc. land in follow-up iterations.

import { injectWidgetIframe } from './iframe';
import { loadVisitorState } from './storage';

export interface ChatwootRunOptions {
  websiteToken: string;
  baseUrl: string;
}

export interface ChatwootSDK {
  run(options: ChatwootRunOptions): void;
}

const sdk: ChatwootSDK = {
  run({ websiteToken, baseUrl }) {
    if (!websiteToken || !baseUrl) return;
    const visitor = loadVisitorState(websiteToken);
    injectWidgetIframe({ websiteToken, baseUrl, visitor });
  },
};

declare global {
  interface Window {
    chatwootSDK?: ChatwootSDK;
  }
}

if (typeof window !== 'undefined') {
  window.chatwootSDK = sdk;
}

export default sdk;
