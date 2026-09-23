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

export function getSafeMediaSrc(value) {
  if (!value || typeof value !== 'string') return null;
  const candidate = value.trim();
  // Permit local uploads added to the public/media directory by the site owner.
  if (/^\/media\/[\w./%-]+$/.test(candidate) && !candidate.includes('..')) return candidate;
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' ? url.href : null;
  } catch { return null; }
}

export function getSafePosterSrc(value) {
  if (!value || typeof value !== 'string') return null;
  const candidate = value.trim();
  if (/^\/images\/[\w./%-]+$/.test(candidate) && !candidate.includes('..')) return candidate;
  return getSafeMediaSrc(candidate);
}
