/**
 * Stub widget runtime configuration.
 *
 * Mirrors the `window.chatwootSettings` / `window.chatwootSDK.run({...})`
 * contract used by `public/widget.js` and `app/javascript/sdk/`.
 *
 * TODO: expand to cover the full SDK options surface (customAttributes,
 * launcherTitle, hideMessageBubble, etc.).
 */

export type WidgetPosition = 'left' | 'right';

export interface WidgetConfig {
  websiteToken: string;
  baseUrl: string;
  locale?: string;
  position?: WidgetPosition;
  type?: 'standard' | 'expanded_bubble';
  darkMode?: 'auto' | 'light' | 'dark';
}
