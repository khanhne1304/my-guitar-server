/**
 * Final gate: ask OpenAI if the combined post is guitar-related. Answer must start with YES.
 * Missing key or API failures do not block posting (graceful degradation).
 */
export async function validateOpenAiGuitarRelated(combinedText) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('[openaiValidation] OPENAI_API_KEY missing — skipping AI gate');
    return { ok: true, skipped: true };
  }

  const text = String(combinedText || '').slice(0, 12000);
  const model = process.env.OPENAI_VALIDATION_MODEL || 'gpt-4o-mini';

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
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
              'You only reply with exactly YES or NO. No punctuation or explanation.',
          },
          {
            role: 'user',
            content: `Is this content related to guitar (playing, learning, chords, tabs, guitar gear, acoustic/electric guitar music)?\n\n---\n${text}\n---\nAnswer YES or NO only.`,
          },
        ],
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn('[openaiValidation] API error', res.status, data?.error?.message || '');
      return { ok: true, skipped: true };
    }

    const raw = data?.choices?.[0]?.message?.content?.trim() || '';
    const upper = raw.toUpperCase();
    const yes = upper.startsWith('YES');

    if (!raw || !yes) {
      return {
        ok: false,
        code: 'OPENAI_NOT_GUITAR',
        message:
          'Nội dung chưa đủ thể hiện chủ đề guitar. Hãy bổ sung chi tiết về guitar, hợp âm, tab hoặc kỹ thuật.',
        details: { modelReply: raw },
      };
    }

    return { ok: true };
  } catch (e) {
    console.warn('[openaiValidation]', e?.message || e);
    return { ok: true, skipped: true };
  }
}
