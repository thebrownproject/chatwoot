# OpenAI Integration

Chat completion + embeddings used across reply-suggestions, summaries, etc.

## Rails source

- `lib/integrations/openai/`

## Notes

`openai` SDK is listed as a dependency but not yet imported. Wire it inside
`chatCompletion`/`embed` when porting.
