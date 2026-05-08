import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cloudProvider } from './cloud.js';
import type { WhatsappChannelConfig } from './base.js';

const baseConfig: WhatsappChannelConfig = {
  provider: 'whatsapp_cloud',
  phoneNumber: '+15551234567',
  phoneNumberId: '1234567890',
  businessAccountId: '9876543210',
  webhookVerifyToken: 'verify-me',
  appSecret: 'super-secret-app-secret',
  apiKey: 'EAAB-test-token',
};

function sign(rawBody: string, appSecret: string): string {
  return createHmac('sha256', appSecret).update(rawBody).digest('hex');
}

describe('cloudProvider.verifyWebhookSignature', () => {
  const rawBody = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });

  it('returns true for a valid X-Hub-Signature-256 header', () => {
    const digest = sign(rawBody, baseConfig.appSecret);
    const headers = new Headers({ 'X-Hub-Signature-256': `sha256=${digest}` });
    expect(cloudProvider.verifyWebhookSignature(rawBody, headers, baseConfig)).toBe(true);
  });

  it('accepts the lowercase header variant', () => {
    const digest = sign(rawBody, baseConfig.appSecret);
    const headers = new Headers({ 'x-hub-signature-256': `sha256=${digest}` });
    expect(cloudProvider.verifyWebhookSignature(rawBody, headers, baseConfig)).toBe(true);
  });

  it('returns false when the body is tampered with', () => {
    const digest = sign(rawBody, baseConfig.appSecret);
    const headers = new Headers({ 'X-Hub-Signature-256': `sha256=${digest}` });
    const tampered = `${rawBody} `;
    expect(cloudProvider.verifyWebhookSignature(tampered, headers, baseConfig)).toBe(
      false,
    );
  });

  it('returns false when the signature length does not match the digest length', () => {
    const headers = new Headers({ 'X-Hub-Signature-256': 'sha256=deadbeef' });
    expect(cloudProvider.verifyWebhookSignature(rawBody, headers, baseConfig)).toBe(
      false,
    );
  });

  it('returns false when the header is missing', () => {
    expect(cloudProvider.verifyWebhookSignature(rawBody, new Headers(), baseConfig)).toBe(
      false,
    );
  });
});

describe('cloudProvider.parseInbound', () => {
  it('parses a message + status webhook into normalized events', () => {
    const payload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WABA_ID',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '15551234567',
                  phone_number_id: '1234567890',
                },
                contacts: [{ profile: { name: 'Jane Doe' }, wa_id: '15557654321' }],
                messages: [
                  {
                    id: 'wamid.MSG_1',
                    from: '15557654321',
                    timestamp: '1700000000',
                    type: 'text',
                    text: { body: 'hello there' },
                  },
                ],
              },
            },
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '15551234567',
                  phone_number_id: '1234567890',
                },
                statuses: [
                  {
                    id: 'wamid.MSG_1',
                    recipient_id: '15557654321',
                    status: 'delivered',
                    timestamp: '1700000005',
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const events = cloudProvider.parseInbound(payload, baseConfig);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      kind: 'message',
      messageId: 'wamid.MSG_1',
      from: '15557654321',
      timestamp: 1700000000,
      type: 'text',
    });
    expect(events[1]).toMatchObject({
      kind: 'status',
      messageId: 'wamid.MSG_1',
      recipient: '15557654321',
      status: 'delivered',
      timestamp: 1700000005,
    });
  });

  it('returns an unknown event for non-conforming payloads', () => {
    const events = cloudProvider.parseInbound({ foo: 'bar' }, baseConfig);
    expect(events).toEqual([{ kind: 'unknown', raw: { foo: 'bar' } }]);
  });
});

describe('cloudProvider.verifySubscription', () => {
  it('echoes the challenge when verify_token matches and mode is subscribe', () => {
    const params = new URLSearchParams({
      'hub.mode': 'subscribe',
      'hub.verify_token': baseConfig.webhookVerifyToken,
      'hub.challenge': '1234567890',
    });
    expect(cloudProvider.verifySubscription(params, baseConfig)).toEqual({
      ok: true,
      challenge: '1234567890',
    });
  });

  it('rejects a wrong verify_token', () => {
    const params = new URLSearchParams({
      'hub.mode': 'subscribe',
      'hub.verify_token': 'nope',
      'hub.challenge': '1234567890',
    });
    expect(cloudProvider.verifySubscription(params, baseConfig)).toEqual({ ok: false });
  });

  it('rejects when mode is not subscribe', () => {
    const params = new URLSearchParams({
      'hub.mode': 'unsubscribe',
      'hub.verify_token': baseConfig.webhookVerifyToken,
      'hub.challenge': '1234567890',
    });
    expect(cloudProvider.verifySubscription(params, baseConfig)).toEqual({ ok: false });
  });
});

describe('cloudProvider.sendOutbound', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('POSTs a text message to the phone number id endpoint and returns the external id', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ messages: [{ id: 'wamid.OUT_1' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await cloudProvider.sendOutbound(
      { to: '15557654321', type: 'text', text: { body: 'hi' } },
      baseConfig,
    );

    expect(result).toEqual({ externalId: 'wamid.OUT_1' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchSpy.mock.calls[0]!;
    expect(calledUrl).toBe(
      `https://graph.facebook.com/v21.0/${baseConfig.phoneNumberId}/messages`,
    );
    const init = calledInit as RequestInit;
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${baseConfig.apiKey}`);
    expect(headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '15557654321',
      type: 'text',
      text: { body: 'hi' },
    });
  });

  it('honors apiBaseUrl override for testing', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ messages: [{ id: 'wamid.OUT_2' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await cloudProvider.sendOutbound(
      { to: '15557654321', type: 'text', text: { body: 'hi' } },
      { ...baseConfig, apiBaseUrl: 'https://example.test' },
    );
    const [calledUrl] = fetchSpy.mock.calls[0]!;
    expect(calledUrl).toBe(
      `https://example.test/v21.0/${baseConfig.phoneNumberId}/messages`,
    );
  });

  it('throws on non-2xx responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'Invalid token' } }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(
      cloudProvider.sendOutbound(
        { to: '15557654321', type: 'text', text: { body: 'hi' } },
        baseConfig,
      ),
    ).rejects.toThrow(/401/);
  });
});
