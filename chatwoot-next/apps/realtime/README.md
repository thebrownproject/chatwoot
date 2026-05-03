# @chatwoot-next/realtime

Standalone Node + Socket.io service that replaces Rails ActionCable. It subscribes to the `chatwoot:events` Redis pub/sub channel and fans messages out to Socket.io rooms (`account_<id>`, `user_<id>`, `conversation_<id>`, `inbox_<id>`) — both the legacy Rails app and the Next.js core publish to the same channel during cutover, so Vue and React clients receive identical events. Deploy this on Fly.io, Railway, or your own k8s — anywhere that supports long-lived WebSockets. **Do not deploy on Vercel**: serverless functions cannot hold persistent WS connections.
