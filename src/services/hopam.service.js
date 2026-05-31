import dns from 'dns';
import { parseHopamTempo } from '../utils/tempoCompare.js';

dns.setDefaultResultOrder('ipv4first');

const HOPAM_DOMAIN = 'https://hopamchuan.com';
const HOPAM_FETCH_TIMEOUT_MS = 25_000;

const HOPAM_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json, text/html, */*',
  'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
  Origin: HOPAM_DOMAIN,
  Referer: `${HOPAM_DOMAIN}/`,
};

async function hopamFetch(url, options = {}) {
  const { timeoutMs = HOPAM_FETCH_TIMEOUT_MS, retries = 2, ...fetchOptions } = options;
  let lastErr;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url, {
        ...fetchOptions,
        headers: { ...HOPAM_HEADERS, ...fetchOptions.headers },
        signal: AbortSignal.timeout(timeoutMs),
      });
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }
  }

  const code = lastErr?.cause?.code || lastErr?.code;
  if (code === 'UND_ERR_CONNECT_TIMEOUT' || /fetch failed/i.test(lastErr?.message || '')) {
    throw new Error(
      'Không kết nối được HopAmChuan (mạng hoặc trang tạm thời không phản hồi). Thử lại sau.',
    );
  }
  throw lastErr;
}

function decodeHtmlEntities(text, { collapseWhitespace = false } = {}) {
  let out = String(text || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
  if (collapseWhitespace) {
    out = out.replace(/\s+/g, ' ').trim();
  }
  return out;
}

function decodeHtml(text) {
  return decodeHtmlEntities(text, { collapseWhitespace: true });
}

function stripTags(html) {
  return decodeHtmlEntities(String(html || '').replace(/<[^>]+>/g, ''), {
    collapseWhitespace: false,
  }).trim();
}

function extractSongIdFromUrl(url) {
  const m = String(url || '').match(/\/song\/(\d+)/);
  return m ? m[1] : null;
}

function buildSongFetchUrl(urlOrId) {
  const id = /^\d+$/.test(String(urlOrId)) ? urlOrId : extractSongIdFromUrl(urlOrId);
  if (!id) throw new Error('URL bài hát HopAmChuan không hợp lệ');
  if (String(urlOrId).includes('hopamchuan.com')) {
    const path = new URL(urlOrId).pathname.replace(/\/$/, '');
    return `${HOPAM_DOMAIN}${path}`;
  }
  return `${HOPAM_DOMAIN}/song/${id}/`;
}

/** @param {string} query */
export async function searchHopamSongs(query) {
  const keyword = String(query || '').trim();
  if (keyword.length < 2) return [];

  const body = new URLSearchParams({ keyword });
  const res = await hopamFetch(`${HOPAM_DOMAIN}/ajax/ajax_song/search_autocomplete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error(`HopAmChuan search failed: ${res.status}`);
  }

  const json = await res.json();
  const items = json?.data || [];

  return items.map((item) => ({
    id: item.id,
    title: decodeHtml(item._title),
    artist: decodeHtml(item._singers),
    url: item._url?.split('?')[0] || `${HOPAM_DOMAIN}/song/${item.id}/`,
    image: null,
    lyricPreview: decodeHtml(item._lyric),
  }));
}

/** Lấy toàn bộ khối lời/hợp âm (kể cả dòng ngoài .song-lyric-note). */
function extractSongLyricRegion(html) {
  const startIdx = html.search(/<div[^>]*\bid="song-lyric"/i);
  if (startIdx < 0) {
    const preMatch = html.match(
      /<div class="pre[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]*\bid="(?:chord-list|song-leftover))/i,
    );
    return preMatch?.[1] || '';
  }

  const endMarkers = [
    'id="chord-list-show',
    'id="chord-list"',
    'id="song-leftover-space',
    'id="song-leftover"',
  ];
  let endIdx = html.length;
  for (const marker of endMarkers) {
    const i = html.indexOf(marker, startIdx);
    if (i !== -1 && i < endIdx) endIdx = i;
  }
  return html.slice(startIdx, endIdx);
}

/** Trích từng thẻ <div class="chord_lyric_line"> đầy đủ (tránh cắt sớm). */
function extractChordLyricLineHtmls(regionHtml) {
  const lines = [];
  const re = /<div class="chord_lyric_line[^"]*">[\s\S]*?<\/div>/gi;
  let match;
  while ((match = re.exec(regionHtml)) !== null) {
    lines.push(match[0]);
  }
  return lines;
}

function parseChordLyricLine(lineHtml) {
  if (/empty_line/.test(lineHtml)) {
    return { kind: 'empty' };
  }

  const textOnly = /text_only/.test(lineHtml);
  const sectionText = textOnly ? stripTags(lineHtml) : '';
  if (textOnly) {
    if (/^(intro|verse|chorus|bridge|outro|pre|hook|giang)/i.test(sectionText)) {
      return { kind: 'section', section: sectionText };
    }
    return { kind: 'info', info: sectionText };
  }

  const segments = [];
  const spanRegex =
    /<span class="hopamchuan_(chord|lyric)[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;
  let match;
  while ((match = spanRegex.exec(lineHtml)) !== null) {
    const type = match[1] === 'chord' ? 'chord' : 'lyric';
    let text = match[2];
    if (type === 'chord') {
      const cm = text.match(/hopamchuan_chord">([^<]+)</);
      text = cm ? cm[1] : stripTags(text).replace(/[\[\]]/g, '');
    } else {
      text = stripTags(text);
    }
    if (text) segments.push({ type, text });
  }

  const lyricLine = segments
    .filter((s) => s.type === 'lyric')
    .map((s) => s.text)
    .join('')
    .trim();

  const chordParts = segments.filter((s) => s.type === 'chord').map((s) => s.text);
  const chordLine = chordParts.join(' ');

  if (!segments.length && textOnly) {
    return { kind: 'section', section: sectionText };
  }

  return {
    kind: 'line',
    segments,
    lyricLine,
    chordLine,
  };
}

function parseSongHtml(html, sourceUrl) {
  const titleMatch = html.match(/<h1 id="song-title">[\s\S]*?<span>([^<]+)<\/span>/i);
  const title = decodeHtml(titleMatch?.[1] || '');

  const keyMatch =
    html.match(/id="display-key"[^>]*data-key="([^"]+)"/i) ||
    html.match(/data-key="([A-G][#b]?[^"]*)"/i);
  const key = keyMatch?.[1]?.trim() || '';

  const rhythmMatch = html.match(/id="display-rhythm"[^>]*data-rhythm="([^"]+)"/i);
  const rhythm = rhythmMatch?.[1] || '';

  const tempoMeta = parseHopamTempo(rhythm);
  const htmlBpmMatch =
    html.match(/data-tempo="(\d{2,3})"/i) ||
    html.match(/data-bpm="(\d{2,3})"/i) ||
    html.match(/nhịp[^0-9]{0,20}(\d{2,3})/i);
  const tempoFromHtml = htmlBpmMatch ? Number(htmlBpmMatch[1]) : null;
  const tempo =
    tempoFromHtml && tempoFromHtml >= 30 && tempoFromHtml <= 300
      ? tempoFromHtml
      : tempoMeta.bpm;

  const capoMatch = html.match(/capo lên (\d+)/i);
  const capo = capoMatch ? Number(capoMatch[1]) : 0;

  const artistMatches = [
    ...html.matchAll(/<a href="[^"]*\/artist\/[^"]*" class="author-item">([^<]+)<\/a>/gi),
  ];
  const artist = [...new Set(artistMatches.map((m) => decodeHtml(m[1])))].join(', ');

  const chordListMatches = [
    ...html.matchAll(/class="draw-chord" data-value="([^"]+)"/g),
  ];
  const chords = [...new Set(chordListMatches.map((m) => m[1]))];

  const lyricRegion = extractSongLyricRegion(html);
  const lineHtmls = extractChordLyricLineHtmls(lyricRegion);
  const lines = lineHtmls.map((lineHtml) => parseChordLyricLine(lineHtml));

  const progression = [];
  for (const line of lines) {
    if (line.kind !== 'line') continue;
    for (const seg of line.segments || []) {
      if (seg.type === 'chord') progression.push(seg.text);
    }
  }

  const songId = extractSongIdFromUrl(sourceUrl);

  return {
    id: songId,
    title,
    artist,
    key,
    capo,
    rhythm,
    tempo,
    timeSignature: tempoMeta.timeSignature,
    chords,
    progression,
    lines,
    url: sourceUrl,
    source: 'hopamchuan',
  };
}

/** @param {string} urlOrId */
export async function fetchHopamSong(urlOrId) {
  const fetchUrl = buildSongFetchUrl(urlOrId);
  const res = await hopamFetch(fetchUrl);

  if (!res.ok) {
    throw new Error(`Không tải được bài hát (${res.status})`);
  }

  const html = await res.text();
  return parseSongHtml(html, fetchUrl.split('?')[0]);
}
