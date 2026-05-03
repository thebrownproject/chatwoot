# @chatwoot-next/sdk

UMD wrapper served from the CDN as `sdk-v2.js` and loaded via `<script src="https://cdn/sdk.js">` on third-party sites; it exposes `window.chatwootSDK.run({ websiteToken, baseUrl })`, injects an iframe pointing at the new widget app, and persists visitor identity in localStorage. Hard 40KB minified budget — every byte ships on every customer page. Versioned (`sdk-v2.js`) so existing customer scripts on `sdk-v1.js` keep working through cutover. Replaces `app/javascript/sdk/sdk.js`.
