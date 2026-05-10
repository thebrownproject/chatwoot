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
    expect(result).not.toContain('alert');
    expect(result).toContain('src="pic.jpg"');
  });

  it('strips javascript: protocol in href', () => {
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
    expect(result).not.toContain('<script');
    expect(result).not.toContain('<iframe');
    expect(result).not.toContain('<object');
    expect(result).toContain('<p>good</p>');
  });

  // --- Dangerous tag tests ---

  it('strips svg tags (can contain scripts)', () => {
    const html = '<svg><script>alert(1)</script></svg>';
    const result = sanitizeInboundHtml(html);
    expect(result).not.toContain('<svg');
    expect(result).not.toContain('alert');
  });

  it('strips math tags', () => {
    const html = '<math><maction actiontype="statusline">xss</maction></math>';
    const result = sanitizeInboundHtml(html);
    expect(result).not.toContain('<math');
  });

  it('strips style tags (CSS injection)', () => {
    const html = '<style>body{background:url("javascript:alert(1)")}</style><p>safe</p>';
    const result = sanitizeInboundHtml(html);
    expect(result).not.toContain('<style');
    expect(result).toContain('<p>safe</p>');
  });

  it('strips link tags', () => {
    const html = '<link rel="import" href="evil.html"><p>ok</p>';
    const result = sanitizeInboundHtml(html);
    expect(result).not.toContain('<link');
    expect(result).toContain('<p>ok</p>');
  });

  it('strips meta tags', () => {
    const html = '<meta http-equiv="refresh" content="0;url=evil.com"><p>ok</p>';
    const result = sanitizeInboundHtml(html);
    expect(result).not.toContain('<meta');
  });

  it('strips applet tags', () => {
    const html = '<applet code="evil.class"></applet><p>ok</p>';
    const result = sanitizeInboundHtml(html);
    expect(result).not.toContain('<applet');
  });

  // --- Protocol sanitization tests ---

  it('strips null bytes that could bypass matching', () => {
    const html = '<scr\x00ipt>alert(1)</scr\x00ipt>';
    const result = sanitizeInboundHtml(html);
    // DOMPurify handles this via DOM parsing - the broken tag is not executed
    expect(result).not.toContain('<script');
  });

  it('strips entity-encoded javascript: protocol (decimal)', () => {
    const html = '<a href="&#106;avascript:alert(1)">click</a>';
    const result = sanitizeInboundHtml(html);
    expect(result).not.toContain('javascript');
    expect(result).not.toContain('&#106;');
  });

  it('strips entity-encoded javascript: protocol (hex)', () => {
    const html = '<a href="&#x6A;avascript:alert(1)">click</a>';
    const result = sanitizeInboundHtml(html);
    expect(result).not.toContain('javascript');
    expect(result).not.toContain('&#x6A;');
  });

  it('strips vbscript: protocol', () => {
    const html = '<a href="vbscript:MsgBox(1)">click</a>';
    const result = sanitizeInboundHtml(html);
    expect(result).not.toContain('vbscript');
  });

  it('strips data: protocol in href', () => {
    const html = '<a href="data:text/html,<script>alert(1)</script>">click</a>';
    const result = sanitizeInboundHtml(html);
    expect(result).not.toContain('data:');
  });

  it('strips javascript: in action attribute', () => {
    const html = '<div action="javascript:alert(1)">test</div>';
    const result = sanitizeInboundHtml(html);
    // DOMPurify strips the non-allowed action attribute entirely
    expect(result).not.toContain('action');
    expect(result).not.toContain('javascript');
  });

  it('strips javascript: in formaction attribute', () => {
    const html = '<button formaction="javascript:alert(1)">click</button>';
    const result = sanitizeInboundHtml(html);
    // DOMPurify strips <button> (not in allowed tags) and formaction attribute
    expect(result).not.toContain('formaction');
    expect(result).not.toContain('javascript');
  });

  it('handles mixed-case dangerous tags', () => {
    const html = '<SCRIPT>alert(1)</SCRIPT><ScRiPt>alert(2)</ScRiPt>';
    expect(sanitizeInboundHtml(html)).toBe('');
  });

  it('handles whitespace in tag names', () => {
    const html = '<  script >alert(1)</script>';
    const result = sanitizeInboundHtml(html);
    // DOM parser does not treat `<  script >` as a valid script tag.
    // The content is rendered as escaped text, which is safe.
    expect(result).not.toContain('<script');
  });

  it('preserves legitimate mailto: hrefs', () => {
    const html = '<a href="mailto:test@example.com">email</a>';
    expect(sanitizeInboundHtml(html)).toBe(html);
  });

  it('preserves legitimate https: hrefs', () => {
    const html = '<a href="https://example.com/page?q=1">link</a>';
    expect(sanitizeInboundHtml(html)).toBe(html);
  });

  it('strips self-closing dangerous tags', () => {
    const html = '<embed src="evil.swf" /><p>ok</p>';
    const result = sanitizeInboundHtml(html);
    expect(result).not.toContain('<embed');
    expect(result).toContain('<p>ok</p>');
  });

  // --- DOMPurify-specific tests (cases the regex sanitizer missed) ---

  it('strips CSS injection via background:url(javascript:)', () => {
    const html = '<div style="background:url(javascript:alert(1))">tricky</div>';
    const result = sanitizeInboundHtml(html);
    expect(result).not.toContain('javascript');
    expect(result).not.toContain('url(');
    expect(result).toContain('tricky');
  });

  it('strips CSS expression() injection', () => {
    const html = '<div style="width:expression(alert(1))">test</div>';
    const result = sanitizeInboundHtml(html);
    expect(result).not.toContain('expression');
    expect(result).not.toContain('alert');
  });

  it('preserves legitimate style attributes', () => {
    const html = '<div style="color: red; font-size: 14px;">styled</div>';
    const result = sanitizeInboundHtml(html);
    expect(result).toContain('color: red');
    expect(result).toContain('font-size: 14px');
  });

  it('strips nested script inside allowed tags', () => {
    // Regex sanitizer could miss this depending on nesting
    const html = '<div><p>ok<script>alert(1)</script></p></div>';
    const result = sanitizeInboundHtml(html);
    expect(result).not.toContain('<script');
    expect(result).not.toContain('alert');
    expect(result).toContain('<p>ok</p>');
  });

  it('preserves table structure', () => {
    const html = '<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Cell</td></tr></tbody></table>';
    expect(sanitizeInboundHtml(html)).toBe(html);
  });

  it('preserves img with src', () => {
    const html = '<img src="https://example.com/photo.jpg" alt="photo">';
    const result = sanitizeInboundHtml(html);
    expect(result).toContain('src="https://example.com/photo.jpg"');
    expect(result).toContain('alt="photo"');
  });
});
