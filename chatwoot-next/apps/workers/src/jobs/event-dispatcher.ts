// Source: app/listeners/ (and app/jobs/event_dispatcher_job.rb)
// Bridges Rails-style event names to TypeScript listeners by delegating to
// `listenerRegistry.dispatch` from `@chatwoot-next/core`. Stub.
export async function dispatchEvent(
  _eventName: string,
  _payload: unknown,
): Promise<void> {
  // import { listenerRegistry } from '@chatwoot-next/core';
  // await listenerRegistry.dispatch(_eventName, _payload);
  throw new Error('not implemented');
}
