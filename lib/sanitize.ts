/**
 * Sanitize helpers for React text rendering.
 * Prefer tag-stripping over HTML entities — React already escapes when
 * rendering as children (not dangerouslySetInnerHTML).
 * Avoid isomorphic-dompurify/jsdom in the client bundle (breaks Next.js).
 */

/** Strip HTML / script — safe for React text nodes */
export function sanitizeText(input: string): string {
  return String(input)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\u0000/g, '');
}

/**
 * Minimal rich subset: keep bold/italic markers as text after stripping tags.
 * Callers that need real HTML should use a client-only DOMPurify path.
 */
export function sanitizeRichText(input: string): string {
  return sanitizeText(input);
}
