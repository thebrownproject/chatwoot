# WhatsApp channel

WhatsApp uses a three-provider abstraction (`whatsapp_cloud`, `default` = 360dialog, plus a shared base) mirroring `app/services/whatsapp/providers/`. The adapter dispatches to the correct provider based on the channel's `provider` column. Webhook signature verification (`X-Hub-Signature-256` for Cloud) must remain byte-compatible with Rails to avoid retry storms during cutover.
