import {
  validateTextGuitarContent,
  textMatchesGuitarKeywords,
} from './textValidation.js';
import { validateYoutubeGuitarContent } from './youtubeValidation.js';
import { classifyImageUrl } from './imageVisionValidation.js';
import { MSG_IMAGE_NOT_GUITAR } from './imageVisionValidation.js';
import { validateAudioAttachmentRules } from './audioValidation.js';
import { validateOpenAiGuitarRelated } from './openaiValidation.js';

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((t) => String(t).trim())
    .filter(Boolean)
    .slice(0, 20);
}

function normalizeFiles(files) {
  if (!Array.isArray(files)) return [];
  return files
    .map((f) => ({
      url: f?.url ? String(f.url).trim() : '',
      type: f?.type ? String(f.type).trim() : '',
    }))
    .filter((f) => f.url && f.type);
}

/**
 * Full pipeline for POST /forum/threads.
 * Returns { ok, needsReview?, message?, code?, details? }
 *
 * Image rules:
 * - With images: require title, content, and at least one tag.
 * - Vision guitar → OK.
 * - Vision not guitar → reject (friendly message).
 * - Indeterminate (no key / error) → allow if text has guitar keywords; else needsReview true.
 */
export async function validateForumThreadPayload(body) {
  const title = String(body?.title || '').trim();
  const content = String(body?.content || '').trim();
  const tags = normalizeTags(body?.tags);
  const videoUrl = body?.videoUrl ? String(body.videoUrl).trim() : '';
  const files = normalizeFiles(body?.files);

  const textResult = validateTextGuitarContent(title, content);
  if (!textResult.ok) return textResult;

  const imageUrls = files.filter((f) => f.type === 'image').map((f) => f.url);
  const hasImages = imageUrls.length > 0;

  if (hasImages) {
    if (!title || !content || tags.length === 0) {
      return {
        ok: false,
        code: 'IMAGE_REQUIRES_CONTEXT',
        message:
          'Bài có ảnh: vui lòng điền đầy đủ tiêu đề, mô tả (nội dung) và ít nhất một tag liên quan guitar.',
      };
    }
  }

  if (videoUrl) {
    if (process.env.GUITAR_SKIP_YOUTUBE === 'true') {
      console.warn('[guitarValidation] YouTube API check skipped (GUITAR_SKIP_YOUTUBE)');
    } else {
      const yt = await validateYoutubeGuitarContent(videoUrl);
      if (!yt.ok) return yt;
    }
  }

  const hasAudio = files.some((f) => f.type === 'audio');
  if (hasAudio) {
    const au = validateAudioAttachmentRules({ title, content, tags });
    if (!au.ok) return au;
  }

  const keywordTrust = textMatchesGuitarKeywords(title, content, tags);
  let needsReview = false;

  if (hasImages && process.env.GUITAR_SKIP_VISION === 'true') {
    console.warn('[guitarValidation] Vision URL checks skipped (GUITAR_SKIP_VISION)');
    if (!keywordTrust) {
      needsReview = true;
    }
  } else {
    for (const url of imageUrls) {
      const c = await classifyImageUrl(url);
      if (c.outcome === 'not_guitar') {
        return {
          ok: false,
          code: 'IMAGE_NOT_GUITAR',
          message: MSG_IMAGE_NOT_GUITAR,
        };
      }
      if (c.outcome === 'indeterminate' && !keywordTrust) {
        needsReview = true;
      }
    }
  }

  if (keywordTrust) {
    needsReview = false;
  }

  const combinedForAi = [
    `Title: ${title}`,
    `Content: ${content}`,
    tags.length ? `Tags: ${tags.join(', ')}` : '',
    videoUrl ? `Video: ${videoUrl}` : '',
    files.length ? `Attachments: ${files.map((f) => f.type).join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  if (process.env.GUITAR_SKIP_OPENAI === 'true') {
    console.warn('[guitarValidation] OpenAI check skipped (GUITAR_SKIP_OPENAI)');
    return { ok: true, needsReview };
  }

  const ai = await validateOpenAiGuitarRelated(combinedForAi);
  if (!ai.ok) return ai;

  return { ok: true, needsReview };
}

export { textMatchesGuitarKeywords } from './textValidation.js';
export { classifyImageBuffer, classifyImageUrl } from './imageVisionValidation.js';
