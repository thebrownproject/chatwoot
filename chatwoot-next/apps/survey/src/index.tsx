import { render } from 'preact';
import { App } from './App';
import './styles.css';

export interface SurveyConfig {
  surveyToken: string;
  baseUrl: string;
}

export function mount(host: HTMLElement, config: SurveyConfig): void {
  render(<App config={config} />, host);
}

declare global {
  interface Window {
    ChatwootSurvey?: { mount: typeof mount };
  }
}

if (typeof window !== 'undefined') {
  window.ChatwootSurvey = { mount };
}
