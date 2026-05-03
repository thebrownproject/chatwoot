# @chatwoot-next/integrations

Third-party integrations registry. Each integration is a self-contained module under `src/<name>/` exposing `setup`, `processEvent`, and `processOutbound` methods (plus integration-specific helpers) and is wired into `integrationRegistry`. Enterprise-flagged integrations (`captain`, `clearbit`) only register when `EDITION=enterprise`.
