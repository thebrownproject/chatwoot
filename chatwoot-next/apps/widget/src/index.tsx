import { render } from 'preact';
import { App } from './App';
import './styles.css';

export interface WidgetConfig {
  websiteToken: string;
  baseUrl: string;
}

export function mount(host: HTMLElement, config: WidgetConfig): void {
  render(<App config={config} />, host);
}

// Expose on the IIFE global so the SDK loader can invoke it.
declare global {
  interface Window {
    ChatwootWidget?: { mount: typeof mount };
  }
}

if (typeof window !== 'undefined') {
  window.ChatwootWidget = { mount };
}
