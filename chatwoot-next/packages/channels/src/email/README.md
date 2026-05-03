# Email channel

Parses RFC 822 messages into `InboundEvent` and sends via SMTP / Mailer. IMAP polling itself lives in `apps/workers` — this package owns the parser and outbound mailer wiring.
