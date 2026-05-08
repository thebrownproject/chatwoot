// Source: app/jobs/inboxes/fetch_imap_email_inboxes_job.rb
// Periodic job that finds email channels with IMAP enabled and polls for new
// messages via `imapflow`. Stub: real implementation should query the DB for
// `Channel::Email` rows with `imap_enabled = true` and dispatch a fetch per
// channel (mirroring `Inboxes::FetchImapEmailsJob`).
export async function fetchImapInboxes(): Promise<void> {
  throw new Error('not implemented');
}
