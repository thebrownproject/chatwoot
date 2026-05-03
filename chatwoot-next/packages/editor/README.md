# @chatwoot-next/editor

Tiptap-based React port of `@chatwoot/prosemirror-schema`, providing the rich-text editor surface used across Chatwoot Next (canned responses, variables, mentions, audio recording, copilot suggestions). Serialization stays compatible with the HTML/markdown that Rails reads from and writes to `messages.content`, so any change to the serializer must be verified against fixture round-trips before shipping.
