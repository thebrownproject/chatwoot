// Source: app/jobs/webhook_job.rb
// Delivers a webhook payload (account/inbox/agent_bot variants) via HTTP POST,
// optionally signed with the webhook secret. Stub.
export async function dispatchWebhook(
  _webhookId: number,
  _payload: unknown,
): Promise<void> {
  throw new Error('not implemented');
}
