import { safeText, toMediaSrc, toPosterSrc } from './paths';

// Render only known video providers. User-supplied HTML is never injected into the page.
export function getTrustedEmbedSrc(value) {
  if (!value || typeof value !== 'string') return null;
  let candidate = value.trim();

  // Accept a pasted iframe for convenience, but extract ONLY its src.
  if (candidate.includes('<')) {
    const documentFragment = new DOMParser().parseFromString(candidate, 'text/html');
    candidate = documentFragment.querySelector('iframe')?.getAttribute('src') || '';
  }
  if (candidate.startsWith('//')) candidate = `https:${candidate}`;

  let url;
  try { url = new URL(candidate); } catch { return null; }
  if (url.protocol !== 'https:') return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, '');

  if (host === 'youtu.be' || host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    const id = host === 'youtu.be'
      ? url.pathname.split('/')[1]
      : url.pathname === '/watch'
        ? url.searchParams.get('v')
        : url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)/)?.[1];
    if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id)) return null;
    return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = url.pathname.match(/\/(\d{5,15})(?:\/|$)/)?.[1];
    return id ? `https://player.vimeo.com/video/${id}` : null;
  }
  return null;
}

/**
 * Any link or path the admin typed for a video / subtitle file.
 * The old strict pattern (https:// only, or /media/...) is gone: local paths,
 * CDN links with query strings and plain file names are all accepted now.
 */
export function getSafeMediaSrc(value) {
  return toMediaSrc(value) || null;
}

/**
 * Any link or path the admin typed for a poster.
 * https, http, protocol-relative, /images/..., images/x.jpg, poster.jpg and
 * bare names (looked up in /images/) all pass through untouched.
 */
export function getSafePosterSrc(value) {
  return toPosterSrc(value) || null;
}

export { safeText };
