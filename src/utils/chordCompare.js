/**
 * So sánh chuỗi hợp âm nhận diện từ audio với hợp âm từ HopAmChuan.
 */

const ROOT_MAP = {
  Db: 'C#',
  Eb: 'D#',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
};

const CHROMA = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function toSharpRoot(root) {
  if (!root) return '';
  const r = root.charAt(0).toUpperCase() + root.slice(1);
  if (r.length === 2 && r[1] === 'b') {
    const flat = r;
    return ROOT_MAP[flat] || r.replace('b', '#');
  }
  return ROOT_MAP[r] || r;
}

function chordRootIndex(chord) {
  const n = normalizeChordLabel(chord, { loose: true });
  const m = n.match(/^([A-G][#]?)/);
  if (!m) return -1;
  return CHROMA.indexOf(toSharpRoot(m[1]));
}

/** Dịch hợp âm theo cung (âm thực → shape guitar khi capo). */
export function transposeChordLabel(chord, semitones) {
  const n = normalizeChordLabel(chord, { loose: true });
  const m = n.match(/^([A-G][#]?)(.*)$/);
  if (!m) return chord;
  const idx = chordRootIndex(chord);
  if (idx < 0) return chord;
  const next = (idx + semitones + 120) % 12;
  return `${CHROMA[next]}${m[2] || ''}`;
}

export function transposeChordSequence(chords, semitones) {
  if (!semitones) return [...chords];
  return chords.map((c) => transposeChordLabel(c, semitones));
}

/** Giữ nguyên ký hiệu hợp âm gốc (Dm7, C#) khi dịch — dùng cho UI transpose. */
export function transposeChordName(chord, semitones) {
  const c = String(chord || '').trim();
  if (!c || !semitones) return c;
  const m = c.match(/^([A-G][#b]?)(.*)$/i);
  if (!m) return c;
  let root = m[1].charAt(0).toUpperCase() + m[1].slice(1);
  if (root.length === 2 && root[1] === 'b') {
    root = ROOT_MAP[root.charAt(0) + 'b'] || root.replace('b', '#');
  }
  root = ROOT_MAP[root] || root;
  const idx = CHROMA.indexOf(root);
  if (idx < 0) return c;
  const next = CHROMA[(idx + semitones + 120) % 12];
  return `${next}${m[2] || ''}`;
}

/** Tìm dịch chuyển (−11…+11) cho khớp HopAmChuan tốt nhất. */
export function findBestTransposeOffset(predictedRaw, referenceRaw, options = {}) {
  let best = { offset: 0, accuracy: -1, comparison: null };
  for (let off = -11; off <= 11; off += 1) {
    const shifted = transposeChordSequence(predictedRaw, off);
    const cmp = compareChordSequences(shifted, referenceRaw, options);
    if (cmp.accuracy > best.accuracy) {
      best = { offset: off, accuracy: cmp.accuracy, comparison: cmp };
    }
  }
  return best;
}

/**
 * Chuẩn bị chuỗi nhận diện để so với HopAmChuan (shape + capo).
 * Capo N: âm phát = shape + N cung → shape = nhận diện − N.
 */
export function alignPredictedToHopam(predictedRaw, referenceRaw, { capo = 0, options = {} } = {}) {
  const capoOffset = capo > 0 ? -Number(capo) : 0;
  let transposeSemitones = capoOffset;
  let predictedAligned =
    capoOffset !== 0 ? transposeChordSequence(predictedRaw, capoOffset) : [...predictedRaw];

  let comparison = compareChordSequences(predictedAligned, referenceRaw, options);

  const auto = findBestTransposeOffset(predictedRaw, referenceRaw, options);
  if (auto.comparison && auto.accuracy > comparison.accuracy + 0.02) {
    transposeSemitones = auto.offset;
    predictedAligned = transposeChordSequence(predictedRaw, auto.offset);
    comparison = auto.comparison;
  }

  return {
    comparison,
    transposeSemitones,
    predictedAligned,
    predictedRaw,
    usedCapo: capo > 0 ? Number(capo) : 0,
  };
}

/** Chuẩn hóa tên hợp âm để so khớp (Em7 → Em, D/F# → D). */
export function normalizeChordLabel(chord, { loose = true } = {}) {
  let c = String(chord || '').trim();
  if (!c) return '';

  const slash = c.indexOf('/');
  if (slash > 0) c = c.slice(0, slash);
  c = c.replace(/:maj$/i, '').replace(/:min$/i, 'm').replace(/:minor$/i, 'm');

  const m = c.match(/^([A-G][#b]?)(.*)$/i);
  if (!m) return c;

  let root = m[1].charAt(0).toUpperCase() + m[1].slice(1);
  if (root.includes('b')) {
    const flat = root.charAt(0) + 'b' + (root[2] || '');
    root = ROOT_MAP[flat] || root.replace('b', '#');
  }
  root = ROOT_MAP[root] || root;

  let quality = (m[2] || '').toLowerCase();
  if (loose) {
    if (quality.includes('m') && !quality.startsWith('maj')) quality = 'm';
    else if (quality.includes('7') || quality.includes('dim') || quality.includes('sus')) {
      quality = quality.includes('m') ? 'm7' : '7';
    } else quality = '';
  }

  return `${root}${quality}`;
}

export function chordsMatch(a, b, options) {
  const na = normalizeChordLabel(a, options);
  const nb = normalizeChordLabel(b, options);
  if (!na || !nb) return false;
  if (na === nb) return true;

  // Em ~ Em7 khi loose
  if (options?.loose !== false) {
    const strip7 = (x) => x.replace(/7$/, '').replace(/maj$/, '');
    return strip7(na) === strip7(nb);
  }
  return false;
}

/** Trích chuỗi hợp âm theo thứ tự xuất hiện trong bài HopAmChuan. */
export function extractChordSequenceFromSong(song) {
  const seq = [];
  for (const line of song?.lines || []) {
    if (line.kind !== 'line') continue;
    for (const seg of line.segments || []) {
      if (seg.type === 'chord' && seg.text) seq.push(seg.text);
    }
  }
  return seq;
}

export function collapseConsecutive(chords) {
  const out = [];
  for (const ch of chords) {
    if (!out.length || out[out.length - 1] !== ch) out.push(ch);
  }
  return out;
}

/** Trích chuỗi từ kết quả nhận diện audio. */
export function extractChordSequenceFromRecognition(chordRecognition) {
  const segments = chordRecognition?.predicted_chords || [];
  return segments.map((s) => s.predicted_chord).filter(Boolean);
}

/**
 * Longest Common Subsequence với so khớp hợp âm mềm.
 * @returns {{ accuracy, matched, referenceLen, predictedLen, lcs, alignments }}
 */
export function compareChordSequences(predictedRaw, referenceRaw, options = {}) {
  const predicted = collapseConsecutive(
    predictedRaw.map((c) => normalizeChordLabel(c, options)),
  ).filter(Boolean);
  const reference = collapseConsecutive(
    referenceRaw.map((c) => normalizeChordLabel(c, options)),
  ).filter(Boolean);

  const n = predicted.length;
  const m = reference.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      if (chordsMatch(predicted[i - 1], reference[j - 1], options)) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const lcs = dp[n][m];
  const refLen = Math.max(reference.length, 1);
  const accuracy = Math.round((lcs / refLen) * 1000) / 1000;

  // Backtrack alignments (tối đa 80 cặp hiển thị)
  const alignments = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0 && alignments.length < 80) {
    if (chordsMatch(predicted[i - 1], reference[j - 1], options)) {
      alignments.unshift({
        index: alignments.length,
        predicted: predictedRaw[Math.min(i - 1, predictedRaw.length - 1)] ?? predicted[i - 1],
        reference: referenceRaw[Math.min(j - 1, referenceRaw.length - 1)] ?? reference[j - 1],
        match: true,
      });
      i -= 1;
      j -= 1;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      alignments.unshift({
        predicted: predictedRaw[i - 1] ?? predicted[i - 1],
        reference: null,
        match: false,
        type: 'extra',
      });
      i -= 1;
    } else {
      alignments.unshift({
        predicted: null,
        reference: referenceRaw[j - 1] ?? reference[j - 1],
        match: false,
        type: 'missing',
      });
      j -= 1;
    }
  }

  return {
    accuracy,
    matched: lcs,
    referenceLen: reference.length,
    predictedLen: predicted.length,
    lcs,
    alignments: alignments.slice(0, 80),
    predictedNormalized: predicted,
    referenceNormalized: reference,
  };
}
