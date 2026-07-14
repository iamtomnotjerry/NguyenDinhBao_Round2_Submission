import DOMPurify from 'isomorphic-dompurify';

/** Escape / sanitize untrusted text before rendering as HTML-like content */
export function sanitizeText(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/** Allow a minimal safe subset for AI markdown render helpers */
export function sanitizeRichText(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'br', 'p', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: [],
  });
}
