import DOMPurify from 'isomorphic-dompurify';

// ---------------------------------------------------------------------------
// DOMPurify-based HTML sanitizer for inbound email content.
//
// Replaces the former regex-based implementation which could not handle
// nested tags, entity encoding edge cases, or context-dependent HTML.
// ---------------------------------------------------------------------------

const ALLOWED_TAGS = [
  'p', 'br', 'a', 'b', 'i', 'em', 'strong',
  'ul', 'ol', 'li',
  'blockquote', 'code', 'pre',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'span', 'div',
  'table', 'thead', 'tbody', 'tr', 'td', 'th',
  'img',
];

const ALLOWED_ATTR = [
  'href',   // a only (protocol-checked by DOMPurify)
  'src',    // img only (protocol-checked by DOMPurify)
  'class',
  'style',  // sanitized via hook below to strip url()/expression()
  'alt',
  'title',
  'colspan',
  'rowspan',
];

const purifyConfig: DOMPurify.Config = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  ALLOW_DATA_ATTR: false,
  // Block dangerous tags explicitly (stripped even if someone adds them to ALLOWED_TAGS)
  FORBID_TAGS: [
    'script', 'iframe', 'object', 'embed', 'form',
    'svg', 'math', 'style', 'meta', 'base', 'link', 'applet',
  ],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
};

// Sanitize CSS in style attributes: strip url(), expression(), and javascript:
// which can be used for CSS-based script injection.
DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
  if (data.attrName === 'style') {
    data.attrValue = data.attrValue
      .replace(/[^;]*(?:url|expression)\s*\([^)]*\)[^;]*/gi, '')
      .replace(/[^;]*javascript\s*:[^;]*/gi, '')
      .replace(/;{2,}/g, ';')
      .replace(/^;|;$/g, '')
      .trim();
  }
});

/**
 * Sanitize inbound email HTML using DOMPurify.
 *
 * Strips dangerous tags (script, iframe, svg, math, etc.), dangerous
 * attributes (on* event handlers), and dangerous protocols
 * (javascript:, vbscript:, data:) from href/src attributes.
 * Also strips CSS injection vectors (url(), expression()) from style attributes.
 */
export function sanitizeInboundHtml(html: string): string {
  return DOMPurify.sanitize(html, purifyConfig);
}

// ---------------------------------------------------------------------------
// Regex-based fallback (legacy implementation).
// Kept as a named export in case DOMPurify cannot be loaded in an environment.
// ---------------------------------------------------------------------------

export function sanitizeInboundHtmlRegex(html: string): string {
  // Strip null bytes that can bypass regex matching
  let sanitized = html.replace(/\0/g, '');

  // Remove dangerous tags and their content (includes svg/math which can contain scripts)
  const dangerousTags = 'script|iframe|object|embed|form|base|svg|math|link|meta|style|applet';
  sanitized = sanitized.replace(
    new RegExp(`<\\s*(${dangerousTags})\\b[^>]*>[\\s\\S]*?<\\s*\\/\\s*\\1\\s*>`, 'gi'),
    '',
  );
  // Remove self-closing / unclosed dangerous tags
  sanitized = sanitized.replace(
    new RegExp(`<\\s*(${dangerousTags})\\b[^>]*\\/?>`, 'gi'),
    '',
  );

  // Remove on* event handler attributes (onclick, onerror, onload, etc.)
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // Decode HTML entities in attribute values to catch encoded protocol bypasses,
  // then strip dangerous protocols from ALL url-bearing attributes
  const urlAttrs = 'href|src|action|formaction|xlink:href|data|poster|srcset|background';
  const dangerousProtocols = /^\s*(?:javascript|vbscript|data)\s*:/i;

  sanitized = sanitized.replace(
    new RegExp(`(${urlAttrs})\\s*=\\s*("[^"]*"|'[^']*')`, 'gi'),
    (match, attr: string, quotedVal: string) => {
      const quote = quotedVal[0];
      const rawVal = quotedVal.slice(1, -1);
      const decoded = rawVal
        .replace(/&#x([0-9a-f]+);?/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/&#(\d+);?/g, (_, dec: string) => String.fromCharCode(parseInt(dec, 10)))
        .replace(/&tab;|&newline;/gi, '');
      if (dangerousProtocols.test(decoded)) {
        return `${attr}=${quote}${quote}`;
      }
      return match;
    },
  );

  sanitized = sanitized.replace(
    new RegExp(`(${urlAttrs})\\s*=\\s*([^\\s>"'][^\\s>]*)`, 'gi'),
    (match, attr: string, val: string) => {
      const decoded = val
        .replace(/&#x([0-9a-f]+);?/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/&#(\d+);?/g, (_, dec: string) => String.fromCharCode(parseInt(dec, 10)));
      if (dangerousProtocols.test(decoded)) {
        return `${attr}=""`;
      }
      return match;
    },
  );

  return sanitized;
}
