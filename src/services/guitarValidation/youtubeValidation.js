/**
 * Extract YouTube video id from common URL shapes.
 */
export function extractYoutubeVideoId(url) {
  const s = String(url || '').trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').split('/')[0];
      return id || null;
    }
    if (host.includes('youtube.com')) {
      if (u.pathname.startsWith('/watch')) return u.searchParams.get('v');
      if (u.pathname.startsWith('/embed/')) return u.pathname.split('/')[2] || null;
      if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/')[2] || null;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Fetch video snippet via YouTube Data API v3 and ensure title/description relate to guitar.
 */
export async function validateYoutubeGuitarContent(videoUrl) {
  const trimmed = String(videoUrl || '').trim();
  if (!trimmed) return { ok: true, skipped: true };

  const videoId = extractYoutubeVideoId(trimmed);
  if (!videoId) {
    return { ok: false, code: 'YOUTUBE_URL', message: 'Không trích được ID video YouTube từ URL.' };
  }

  const apiKey = process.env.YOUTUBE_DATA_API_KEY || process.env.GOOGLE_YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn('[youtubeValidation] YOUTUBE_DATA_API_KEY missing — skipping automatic video check');
    return { ok: true, skipped: true };
  }

  const url = new URL('https://www.googleapis.com/youtube/v3/videos');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('id', videoId);
  url.searchParams.set('key', apiKey);

  const res = await fetch(url.href);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.warn('[youtubeValidation] API error', res.status, data?.error?.message || '');
    return { ok: true, skipped: true };
  }

  const item = data?.items?.[0];
  if (!item) {
    return { ok: false, code: 'YOUTUBE_NOT_FOUND', message: 'Không tìm thấy video YouTube (private hoặc đã xóa).' };
  }

  const title = String(item.snippet?.title || '');
  const description = String(item.snippet?.description || '');
  const blob = `${title} ${description}`.toLowerCase();

  const guitarOk = blob.includes('guitar') || blob.includes('guitarra');
  if (!guitarOk) {
    return {
      ok: false,
      code: 'YOUTUBE_NOT_GUITAR',
      message:
        'Video YouTube cần có tiêu đề hoặc mô tả thể hiện liên quan đến guitar (ví dụ chứa từ "guitar").',
    };
  }

  return { ok: true };
}
