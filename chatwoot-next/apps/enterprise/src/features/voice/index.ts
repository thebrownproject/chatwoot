/**
 * Voice calls — enterprise-only.
 *
 * Rails source:
 *   `enterprise/app/models/call.rb`
 */

export interface CallParams {
  accountId: number;
  inboxId: number;
  contactId: number;
  fromNumber: string;
  toNumber: string;
}

export function initiateCall(_params: CallParams): void {
  // TODO: dispatch to @chatwoot-next/channels voice provider (Twilio, etc).
}

export function recordCall(_callSid: string, _recordingUrl: string): void {
  // TODO: persist Call record + attach recording.
}
