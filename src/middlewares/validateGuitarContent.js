import { validateForumThreadPayload } from '../services/guitarValidation/index.js';

/**
 * Validates forum thread body after body-parser:
 * text keywords, YouTube Data API, Vision on image URLs, audio rules, OpenAI YES/NO.
 *
 * Set env toggles for local dev without external APIs:
 * - GUITAR_SKIP_YOUTUBE=true
 * - GUITAR_SKIP_VISION=true
 * - GUITAR_SKIP_OPENAI=true
 */
export async function validateGuitarContent(req, res, next) {
  try {
    const result = await validateForumThreadPayload(req.body || {});
    if (!result.ok) {
      return res.status(400).json({
        message: result.message,
        code: result.code || 'GUITAR_VALIDATION',
        details: result.details,
      });
    }
    req.forumThreadMeta = {
      needsReview: Boolean(result.needsReview),
    };
    next();
  } catch (e) {
    next(e);
  }
}
