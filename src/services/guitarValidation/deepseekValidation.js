/**
 * Cổng AI bằng DeepSeek: phân loại xem nội dung bài viết (kèm hình ảnh/video/tệp)
 * có liên quan đến ÂM NHẠC hay không. Model chỉ trả về YES hoặc NO.
 *
 * Lưu ý: DeepSeek API hiện là text-only, không "nhìn" được pixel của ảnh/video.
 * Vì vậy ảnh/video được phân loại dựa trên ngữ cảnh văn bản đi kèm (tiêu đề,
 * mô tả, link video, loại tệp đính kèm). Việc nhận dạng nội dung ảnh thực tế
 * vẫn do lớp Vision riêng (imageVisionValidation) đảm nhiệm nếu được cấu hình.
 *
 * Thiếu key hoặc lỗi API → không chặn đăng bài (graceful degradation).
 */
export async function validateDeepSeekMusicRelated(combinedText) {
  const apiKey = String(process.env.DEEPSEEK_API_KEY || '').trim();
  if (!apiKey) {
    console.warn('[deepseekValidation] DEEPSEEK_API_KEY missing — bỏ qua cổng AI');
    return { ok: true, skipped: true };
  }

  const baseUrl = String(process.env.DEEPSEEK_API_BASE_URL || 'https://api.deepseek.com/v1')
    .trim()
    .replace(/\/$/, '');
  const model = String(
    process.env.DEEPSEEK_VALIDATION_MODEL || process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  ).trim();
  const text = String(combinedText || '').slice(0, 12000);

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 8,
        messages: [
          {
            role: 'system',
            content:
              'Bạn là bộ phân loại nội dung. Chỉ trả lời đúng một từ: YES hoặc NO. Không dấu câu, không giải thích.',
          },
          {
            role: 'user',
            content:
              'Nội dung dưới đây (gồm tiêu đề, mô tả bài viết, link video và loại tệp đính kèm) ' +
              'có liên quan đến ÂM NHẠC không (guitar, nhạc cụ, hợp âm, tab, học nhạc, luyện tập, ' +
              'biểu diễn, sáng tác, sản xuất âm nhạc...)?\n\n---\n' +
              text +
              '\n---\nChỉ trả lời YES hoặc NO.',
          },
        ],
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn('[deepseekValidation] API error', res.status, data?.error?.message || '');
      return { ok: true, skipped: true };
    }

    const raw = data?.choices?.[0]?.message?.content?.trim() || '';
    const yes = raw.toUpperCase().startsWith('YES');

    if (!raw || !yes) {
      return {
        ok: false,
        code: 'MEDIA_NOT_MUSIC',
        message:
          'Nội dung (bài viết/hình ảnh/video) không liên quan đến âm nhạc nên không thể đăng. ' +
          'Vui lòng đăng nội dung về guitar, nhạc cụ, hợp âm, tab hoặc học nhạc.',
        details: { modelReply: raw },
      };
    }

    return { ok: true };
  } catch (e) {
    console.warn('[deepseekValidation]', e?.message || e);
    return { ok: true, skipped: true };
  }
}
