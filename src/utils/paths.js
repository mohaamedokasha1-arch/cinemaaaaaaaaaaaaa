// Loose path helpers. The admin panel accepts ANY poster / media link or path,
// so these helpers only prepare a value for the browser: they never reject input
// and never block saving. Nothing here is used as a validation gate.
//
// Accepted shapes: https / http links, protocol-relative links (//host/x.jpg),
// local paths (/images/x.jpg, images/x.jpg, ./x.jpg), Windows paths, data images
// and bare file names (looked up in the images / media folder).

// Schemes that can execute script or navigate away when used in an <img>/<video> src.
const UNSAFE_PROTOCOL = /^\s*(?:javascript|vbscript|data:text\/html|blob:)/i;
// Any explicit URL scheme.
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;
// Bare host names such as image.tmdb.org/path/poster.jpg (typed without https://).
const BARE_HOST = /^(?:[\w-]+\.)+[a-z]{2,}(?::\d+)?\//i;
// Letters, digits and the characters commonly found in URLs and file paths.
const SAFE_PATTERN = /^[\p{L}\p{N}\s\-_.,~!$&'()*+=:@%#/?[\]\\]+$/u;

/**
 * Returns the value as a browser-safe string, or '' when it must not be rendered.
 * Never returns null, so it is safe to call on every stored record.
 */
export function safeText(value) {
  if (value === null || value === undefined) return '';
  const candidate = String(value).trim();
  if (!candidate) return '';
  // Inline images are allowed (handy for pasted base64 posters).
  if (/^data:image\//i.test(candidate)) return /[<>"'\s]/.test(candidate) ? '' : candidate;
  if (UNSAFE_PROTOCOL.test(candidate)) return '';
  if (!SAFE_PATTERN.test(candidate)) return '';
  return candidate;
}

/** Poster link or path, ready for an <img src>. */
export function toPosterSrc(value) {
  return resolveSrc(value, '/images/', /^data:image\//i);
}

/** Video / subtitle link or path, ready for a <video> or <track> src. */
export function toMediaSrc(value) {
  return resolveSrc(value, '/media/', /^data:(?:video|audio)\//i);
}

function resolveSrc(value, barePrefix, dataPattern) {
  const candidate = safeText(value);
  if (!candidate) return '';
  if (dataPattern.test(candidate)) return candidate;
  // Windows style separators work too.
  const normalized = candidate.replace(/\\/g, '/');
  if (/^https?:\/\//i.test(normalized)) return normalized;
  if (normalized.startsWith('//')) return `https:${normalized}`;
  // Windows path (C:/...) — kept as typed, only the separators are normalised.
  if (/^[a-z]:\//i.test(normalized)) return normalized;
  // Any other scheme (ftp:, mailto:, ...) cannot be rendered by the browser.
  if (SCHEME.test(normalized)) return '';
  // "host.tld/path" typed without a scheme.
  if (BARE_HOST.test(normalized)) return `https://${normalized}`;
  const rooted = normalized.startsWith('/') || normalized.startsWith('./');
  const path = normalized.replace(/^(?:\.\/)+/, '').replace(/^\/+/, '');
  if (!path) return '';
  // A bare file name is looked up in the images / media folder as a convenience.
  return rooted || path.includes('/') ? `/${path}` : `${barePrefix}${path}`;
}
