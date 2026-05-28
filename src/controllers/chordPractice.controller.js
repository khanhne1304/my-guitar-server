import { fetchHopamSong } from '../services/hopam.service.js';
import {
  analyzeChordsFromFile,
  saveTempAudio,
  removeTempFile,
} from '../services/chordAnalysis.service.js';
import { detectBeatsFromFile } from '../services/chordMini.service.js';
import {
  buildTempoComparison,
  resolveReferenceBpm,
} from '../utils/tempoCompare.js';
import {
  alignPredictedToHopam,
  extractChordSequenceFromSong,
  extractChordSequenceFromRecognition,
  collapseConsecutive,
  transposeChordSequence,
} from '../utils/chordCompare.js';
import { generatePracticeAdvice } from '../services/practiceAdvice.service.js';

function formatTransposeNote(semitones) {
  const n = Number(semitones);
  if (!Number.isFinite(n) || n === 0) return '0 cung';
  return `${n > 0 ? '+' : ''}${n} cung`;
}

/**
 * POST /api/chord-practice/analyze
 * multipart: audio
 * body: hopamUrl (bắt buộc để so sánh)
 */
export async function analyzeAndCompare(req, res, next) {
  let tempPath = null;
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng tải lên hoặc thu file audio',
      });
    }

    const hopamUrl = String(req.body.hopamUrl || '').trim();
    if (!hopamUrl) {
      return res.status(400).json({
        success: false,
        message: 'Chọn bài hát từ Hợp âm chuẩn để so sánh',
      });
    }

    tempPath = saveTempAudio(req.file);

    const referenceBpmBody = req.body.referenceBpm;

    const [chordRecognition, referenceSong, beatAnalysis] = await Promise.all([
      analyzeChordsFromFile(tempPath, {
        segmentSec: Number(req.body.segmentSec) || 2,
      }),
      fetchHopamSong(hopamUrl),
      detectBeatsFromFile(tempPath).catch((err) => ({
        error: err.message,
        bpm: null,
      })),
    ]);

    const refBpmInfo = resolveReferenceBpm({
      referenceBpm: referenceBpmBody,
      referenceSong,
    });
    const tempoComparison = buildTempoComparison({
      referenceBpm: refBpmInfo.bpm,
      detectedBpm: beatAnalysis?.bpm,
      detector: beatAnalysis?.model_used || 'chordmini',
    });
    if (refBpmInfo.bpm) {
      tempoComparison.referenceSource = refBpmInfo.source;
    }
    if (refBpmInfo.timeSignature) {
      tempoComparison.timeSignature = refBpmInfo.timeSignature;
    }
    if (beatAnalysis?.error) {
      tempoComparison.beatDetectionError = beatAnalysis.error;
    }

    const predictedSeq = extractChordSequenceFromRecognition(chordRecognition);
    const referenceSeqBase = extractChordSequenceFromSong(referenceSong);
    const uiTranspose = Math.round(Number(req.body.referenceTranspose) || 0);
    const referenceSeqForCompare =
      uiTranspose !== 0
        ? transposeChordSequence(referenceSeqBase, uiTranspose)
        : referenceSeqBase;
    const compareOptions = { loose: req.body.strictMatch !== 'true' };
    const aligned = alignPredictedToHopam(predictedSeq, referenceSeqForCompare, {
      capo: referenceSong.capo || 0,
      options: compareOptions,
    });
    const { comparison, transposeSemitones, predictedAligned, usedCapo } = aligned;

    return res.json({
      success: true,
      data: {
        file: {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
        },
        referenceSong: {
          title: referenceSong.title,
          artist: referenceSong.artist,
          key: referenceSong.key,
          capo: referenceSong.capo || 0,
          rhythm: referenceSong.rhythm,
          tempo: referenceSong.tempo ?? refBpmInfo.bpm ?? null,
          timeSignature: referenceSong.timeSignature || refBpmInfo.timeSignature || null,
          url: referenceSong.url,
          chordCount: referenceSeqBase.length,
        },
        chordRecognition,
        tempoComparison,
        beatAnalysis: beatAnalysis?.error
          ? { success: false, error: beatAnalysis.error }
          : {
              success: true,
              bpm: beatAnalysis.bpm,
              beatCount: beatAnalysis.beats?.length ?? 0,
              model: beatAnalysis.model_used,
            },
        comparison: {
          ...comparison,
          accuracyPercent: Math.round(comparison.accuracy * 100),
          predictedSequence: collapseConsecutive(predictedAligned),
          predictedSequenceRaw: collapseConsecutive(predictedSeq),
          referenceSequence: collapseConsecutive(referenceSeqForCompare),
          referenceSequenceOriginal: collapseConsecutive(referenceSeqBase),
          analyzedTranspose: uiTranspose,
          transposeSemitones,
          hopamCapo: usedCapo,
          compareNote:
            transposeSemitones !== 0
              ? usedCapo > 0
                ? `Đã dịch ${formatTransposeNote(transposeSemitones)} so với bản gốc (capo ${usedCapo})`
                : `Đã dịch ${formatTransposeNote(transposeSemitones)} so với bản gốc`
              : null,
        },
      },
    });
  } catch (err) {
    return next(err);
  } finally {
    removeTempFile(tempPath);
  }
}

/**
 * POST /api/chord-practice/advice
 * Body JSON: payload phân tích (referenceSong, comparison, tempoComparison, chordRecognition)
 */
export async function getPracticeAdvice(req, res, next) {
  try {
    const payload = req.body?.data ?? req.body ?? {};
    const advice = await generatePracticeAdvice(payload);
    return res.json({ success: true, data: advice });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/chord-practice/analyze-only — chỉ nhận diện, không cần hopam
 */
export async function analyzeOnly(req, res, next) {
  let tempPath = null;
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng tải lên file audio',
      });
    }

    tempPath = saveTempAudio(req.file);
    const chordRecognition = await analyzeChordsFromFile(tempPath, {
      segmentSec: Number(req.body.segmentSec) || 2,
    });

    return res.json({
      success: true,
      data: {
        file: {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
        },
        chordRecognition,
        predictedSequence: collapseConsecutive(
          extractChordSequenceFromRecognition(chordRecognition),
        ),
      },
    });
  } catch (err) {
    return next(err);
  } finally {
    removeTempFile(tempPath);
  }
}
