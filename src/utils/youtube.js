/** Extract YouTube video ID from URL or bare id string. */
export function extractYouTubeVideoId(input) {
  if (!input || typeof input !== 'string') return null;
  const raw = input.trim();
  if (!raw) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;
  try {
    const parsed = new URL(raw);
    if (parsed.hostname === 'youtu.be') {
      const id = parsed.pathname.replace(/^\//, '').split('/')[0];
      return id && id.length <= 20 ? id : null;
    }
    if (parsed.hostname.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      if (v) return v;
      const m = parsed.pathname.match(/\/embed\/([^/?]+)/);
      if (m) return m[1];
      const s = parsed.pathname.match(/\/shorts\/([^/?]+)/);
      if (s) return s[1];
    }
  } catch {
    return null;
  }
  return null;
}

export function youtubeEmbedUrl(videoId) {
  if (!videoId) return '';
  return `https://www.youtube.com/embed/${videoId}`;
}
