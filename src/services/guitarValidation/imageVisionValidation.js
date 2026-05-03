import { VISION_ACCEPT_LABEL_SUBSTRINGS } from './constants.js';

/** User-facing copy when Vision confidently rejects an image */
export const MSG_IMAGE_NOT_GUITAR =
  'Ảnh có vẻ không liên quan đến guitar. Vui lòng chọn ảnh về guitar hoặc đính kèm mô tả rõ ràng hơn.';

export const MSG_IMAGE_PENDING =
  'Ảnh của bạn đang chờ kiểm duyệt. Hãy đảm bảo nội dung liên quan đến guitar.';

/**
 * Outcomes:
 * - guitar: Vision ran and labels match guitar/instrument
 * - not_guitar: Vision ran and labels do not match (reject upload/thread)
 * - indeterminate: no API key, network error, API error, timeout — do not block; queue review
 */
export async function classifyImageBuffer(imageBuffer) {
  const apiKey = process.env.GOOGLE_VISION_API_KEY || process.env.GCLOUD_VISION_API_KEY;
  if (!apiKey) {
    return { outcome: 'indeterminate', reason: 'no_api_key' };
  }

  try {
    const b64 = Buffer.from(imageBuffer).toString('base64');
    const body = {
      requests: [
        {
          image: { content: b64 },
          features: [{ type: 'LABEL_DETECTION', maxResults: 20 }],
        },
      ],
    };

    const url = `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`;
    const ac = new AbortController();
    const tid = setTimeout(() => ac.abort(), 15000);
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ac.signal,
      });
    } finally {
      clearTimeout(tid);
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn('[Vision] API error', res.status, data?.error?.message || '');
      return { outcome: 'indeterminate', reason: 'api_error' };
    }

    const labels =
      data?.responses?.[0]?.labelAnnotations?.map((l) => String(l.description || '').toLowerCase()) ||
      [];

    const accepted = VISION_ACCEPT_LABEL_SUBSTRINGS.some((needle) =>
      labels.some((label) => label.includes(needle)),
    );

    if (accepted) {
      return { outcome: 'guitar', labels };
    }
    return { outcome: 'not_guitar', labels };
  } catch (e) {
    console.warn('[Vision] classify failed', e?.message || e);
    return { outcome: 'indeterminate', reason: 'exception' };
  }
}

async function fetchWithTimeout(url, ms = 20000) {
  const ac = new AbortController();
  const id = setTimeout(() => ac.abort(), ms);
  try {
    return await fetch(url, { signal: ac.signal });
  } finally {
    clearTimeout(id);
  }
}

/**
 * Download image then classify (used when validating thread payload URLs).
 */
export async function classifyImageUrl(imageUrl) {
  try {
    const res = await fetchWithTimeout(imageUrl, 20000);
    if (!res.ok) {
      console.warn('[Vision] image fetch failed', imageUrl);
      return { outcome: 'indeterminate', reason: 'fetch_failed' };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return classifyImageBuffer(buf);
  } catch (e) {
    console.warn('[Vision] classifyImageUrl', e?.message || e);
    return { outcome: 'indeterminate', reason: 'fetch_error' };
  }
}

/** @deprecated use classifyImageBuffer — kept for imports expecting validateImageGuitarLabels shape internally */
export async function validateImageGuitarLabels(imageBuffer) {
  const c = await classifyImageBuffer(imageBuffer);
  if (c.outcome === 'not_guitar') {
    return { ok: false, code: 'VISION_NOT_GUITAR', message: MSG_IMAGE_NOT_GUITAR, details: { labels: c.labels } };
  }
  return { ok: true, details: c.labels ? { labels: c.labels } : {} };
}

export async function validateImageUrlGuitarLabels(imageUrl) {
  const c = await classifyImageUrl(imageUrl);
  if (c.outcome === 'not_guitar') {
    return { ok: false, code: 'VISION_NOT_GUITAR', message: MSG_IMAGE_NOT_GUITAR };
  }
  return { ok: true };
}
