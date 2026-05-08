# @chatwoot-next/core

Domain layer for the Node port. Houses the conversation, message, contact, inbox, and automation services together with the central event publisher, listener registry, and job dispatcher. The listener registry replaces the implicit ActiveRecord callbacks and `app/listeners/` plumbing in Rails — when porting, capture the *observable behavior* triggered by a callback (event published, job enqueued, side-effect run) and register that as a listener instead of literally translating the callback. Enterprise extras hook the same registries.
