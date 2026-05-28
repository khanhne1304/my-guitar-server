/** Làm sạch text hiển thị — không để lộ JSON/markdown thô trên UI. */

export function looksLikeRawJson(text) {
  const s = String(text || '').trim();
  if (!s) return false;
  if (/^```\s*json/i.test(s)) return true;
  if (/^\{\s*"/.test(s)) return true;
  if (/^"summary"\s*:/.test(s)) return true;
  return false;
}

export function extractJsonBlock(text) {
  let t = String(text || '').trim();
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) t = fenced[1].trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start >= 0 && end > start) return t.slice(start, end + 1);
  return t;
}

export function sanitizeDisplayText(text) {
  let s = String(text || '').trim();
  if (!s) return '';

  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/gi, '').trim();

  if (s.startsWith('{') || s.includes('"summary"')) {
    try {
      const o = JSON.parse(extractJsonBlock(s));
      const inner = o.overview || o.summary || o.tom_tat || '';
      if (inner) return sanitizeDisplayText(inner);
    } catch {
      /* fall through */
    }
  }

  const quoted = s.match(/^"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
  if (quoted) {
    return quoted[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim();
  }

  return s
    .replace(/^"summary"\s*:\s*/i, '')
    .replace(/^["']|["']$/g, '')
    .trim();
}

export function sanitizeStringList(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((item) => sanitizeDisplayText(item))
    .filter((item) => item && !looksLikeRawJson(item));
}
