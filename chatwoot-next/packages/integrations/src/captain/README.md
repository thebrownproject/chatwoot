# Captain — Enterprise AI Copilot

RAG-driven assistant that powers Copilot threads, custom tools, and scenarios.
Enterprise-only.

## Rails source

- `enterprise/lib/captain/`
- `enterprise/app/models/captain_assistant`
- `enterprise/app/models/captain_inbox`
- `enterprise/app/models/captain_custom_tool`
- `enterprise/app/models/captain_document`
- `enterprise/app/models/captain_scenario`
- `enterprise/app/models/copilot_thread`
- `enterprise/app/models/copilot_message`

## RAG

`captain_documents` stores pgvector 1536-dim embeddings. Reuse the existing
`ivfflat` indexes during cutover — do not rebuild them.

## Risk

Highest-risk integration alongside Slack.
