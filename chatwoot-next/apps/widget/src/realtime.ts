import { createRealtimeClient } from '@chatwoot-next/realtime-client';

export function createWidgetRealtime(baseUrl: string, websiteToken: string) {
  return createRealtimeClient({
    url: `${baseUrl.replace(/^http/, 'ws')}/cable`,
    token: websiteToken,
  });
}
