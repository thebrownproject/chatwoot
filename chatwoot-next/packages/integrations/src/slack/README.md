# Slack Integration

Bidirectional Slack sync + link unfurl.

## Rails source

- `lib/integrations/slack/` (23 service files)
  - `SendOnSlackService`
  - `UpdateSlackMessageService`
  - `SlackMessageHelper`
  - `ChannelBuilder`
  - `UnfurlService`
  - plus the remaining ~18 service/helper files

## Risk

Highest-risk integration. Plan 1 month of mirror traffic before cutover.
