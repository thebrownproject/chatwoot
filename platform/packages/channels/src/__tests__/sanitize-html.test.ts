import { describe, it, expect } from 'vitest';
import { sanitizeInboundHtml } from '../adapters/email.js';

describe('sanitizeInboundHtml', () => {
  it('strips script tags and content', () => {
    const html = '<p>Hello</p><script>alert("xss")</script><p>World</p>';
    expect(sanitizeInboundHtml(html)).toBe('<p>Hello</p><p>World</p>');
  });

  it('strips iframe tags', () => {
    const html = '<p>Safe</p><iframe src="evil.com"></iframe>';
    expect(sanitizeInboundHtml(html)).toBe('<p>Safe</p>');
  });

  it('strips on* event handlers', () => {
    const html = '<img src="pic.jpg" onerror="alert(1)" />';
    const result = sanitizeInboundHtml(html);
    expect(result).not.toContain('onerror');
    expect(result).toContain('src="pic.jpg"');
  });

  it('strips javascript: protocol', () => {
    const html = '<a href="javascript:alert(1)">Click</a>';
    const result = sanitizeInboundHtml(html);
    expect(result).not.toContain('javascript:');
  });

  it('preserves safe HTML', () => {
    const html = '<p>Hello <strong>World</strong></p><a href="https://example.com">Link</a>';
    expect(sanitizeInboundHtml(html)).toBe(html);
  });

  it('handles empty string', () => {
    expect(sanitizeInboundHtml('')).toBe('');
  });

  it('strips multiple dangerous elements', () => {
    const html = '<script>bad</script><iframe>bad</iframe><object>bad</object><p>good</p>';
    const result = sanitizeInboundHtml(html);
    expect(result).toBe('<p>good</p>');
  });
});
