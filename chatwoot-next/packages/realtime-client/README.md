# @chatwoot-next/realtime-client

Browser-side realtime client that replaces the legacy ActionCable consumer in `app/javascript/shared/helpers/BaseActionCableConnector.js`. It exposes a socket.io transport against `apps/realtime` while keeping the exact same event names (`conversation.created`, `message.created`, `presence.update`, ...) so the Vue dashboard/widget and the new React app can co-consume during cutover.
