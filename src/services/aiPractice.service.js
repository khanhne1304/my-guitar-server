import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getCloudinaryUrl } from '../utils/cloudinary.js';
import AiPracticeResult from '../models/AiPracticeResult.js';

export const REQUIRED_FEATURE_KEYS = [
  'mean_pitch_error_semitones',
  'std_pitch_error_semitones',
  'mean_timing_offset_ms',
  'std_timing_offset_ms',
  'onset_density',
  'tempo_variation_pct',
  'buzz_ratio',
  'missing_strings_ratio',
  'extra_noise_level',
  'mean_snr_db',
  'attack_smoothness',
  'sustain_consistency',
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, '..', '..');
const defaultAiRoot = path.resolve(serverRoot, '..', 'my-guitar-ai-service');

function resolvePath(envKey, defaultPath) {
  return process.env[envKey] ? path.resolve(process.env[envKey]) : defaultPath;
}

const aiConfig = {
  pythonBin: process.env.AI_PYTHON_BIN || 'python',
  scriptPath: resolvePath(
    'AI_INFER_SCRIPT',
    path.join(defaultAiRoot, 'infer_clip_quality.py'),
  ),
  configPath: resolvePath(
    'AI_SERVICE_CONFIG',
    path.join(defaultAiRoot, 'config', 'training_config.yaml'),
  ),
  regressorPath: resolvePath(
    'AI_REGRESSOR_PATH',
    path.join(defaultAiRoot, 'artifacts', 'clip_regressor.joblib'),
  ),
  classifierPath: resolvePath(
    'AI_CLASSIFIER_PATH',
    path.join(defaultAiRoot, 'artifacts', 'level_classifier.joblib'),
  ),
  featureScriptPath: resolvePath(
    'AI_FEATURE_SCRIPT',
    path.join(defaultAiRoot, 'extract_features.py'),
  ),
  featureSampleRate: Number(process.env.AI_FEATURE_SR) || 22050,
  workingDir: process.env.AI_WORKDIR
    ? path.resolve(process.env.AI_WORKDIR)
    : defaultAiRoot,
};

function ensureArtifacts() {
  const requiredFiles = [
    { label: 'infer script', path: aiConfig.scriptPath },
    { label: 'config', path: aiConfig.configPath },
    { label: 'regressor', path: aiConfig.regressorPath },
    { label: 'classifier', path: aiConfig.classifierPath },
    { label: 'feature extractor', path: aiConfig.featureScriptPath },
  ];
  for (const entry of requiredFiles) {
    if (!fs.existsSync(entry.path)) {
      throw new Error(`Không tìm thấy ${entry.label}: ${entry.path}`);
    }
  }
}

ensureArtifacts();

function runPythonInference(payload) {
  return new Promise((resolve, reject) => {
    const args = [
      aiConfig.scriptPath,
      '--config',
      aiConfig.configPath,
      '--regressor',
      aiConfig.regressorPath,
      '--classifier',
      aiConfig.classifierPath,
    ];

    const child = spawn(aiConfig.pythonBin, args, {
      cwd: aiConfig.workingDir,
    });

    const stdoutChunks = [];
    const stderrChunks = [];

    child.stdout.on('data', (chunk) => stdoutChunks.push(chunk));
    child.stderr.on('data', (chunk) => stderrChunks.push(chunk));
    child.on('error', (err) => reject(err));

    child.on('close', (code) => {
      const stdout = Buffer.concat(stdoutChunks).toString('utf-8').trim();
      const stderr = Buffer.concat(stderrChunks).toString('utf-8').trim();

      if (code !== 0) {
        const message = stderr || stdout || `Python process exited with ${code}`;
        return reject(new Error(message));
      }

      if (!stdout) {
        return reject(new Error('Python inference không trả về dữ liệu.'));
      }

      try {
        const parsed = JSON.parse(stdout);
        return resolve(parsed);
      } catch (err) {
        return reject(
          new Error(
            `Không thể parse kết quả từ Python: ${(err && err.message) || err}`,
          ),
        );
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

function runFeatureExtractor(audioPath) {
  return new Promise((resolve, reject) => {
    const args = [
      aiConfig.featureScriptPath,
      '--config',
      aiConfig.configPath,
      '--audio',
      audioPath,
      '--sr',
      String(aiConfig.featureSampleRate),
    ];

    const child = spawn(aiConfig.pythonBin, args, {
      cwd: aiConfig.workingDir,
    });

    const stdoutChunks = [];
    const stderrChunks = [];

    child.stdout.on('data', (chunk) => stdoutChunks.push(chunk));
    child.stderr.on('data', (chunk) => stderrChunks.push(chunk));
    child.on('error', (err) => reject(err));

    child.on('close', (code) => {
      const stdout = Buffer.concat(stdoutChunks).toString('utf-8').trim();
      const stderr = Buffer.concat(stderrChunks).toString('utf-8').trim();

      if (code !== 0) {
        const message = stderr || stdout || `Python process exited with ${code}`;
        return reject(new Error(message));
      }

      if (!stdout) {
        return reject(new Error('Feature extractor không trả về dữ liệu.'));
      }

      try {
        const parsed = JSON.parse(stdout);
        return resolve(parsed);
      } catch (err) {
        return reject(
          new Error(
            `Không thể parse kết quả extractor: ${(err && err.message) || err}`,
          ),
        );
      }
    });
  });
}

export function sanitizeFeaturePayload(features = {}) {
  const normalized = {};
  const missingOrInvalid = [];

  for (const key of REQUIRED_FEATURE_KEYS) {
    const raw = features[key];
    const num = Number(raw);
    if (!Number.isFinite(num)) {
      missingOrInvalid.push(key);
      continue;
    }
    normalized[key] = num;
  }

  return { normalized, missingOrInvalid };
}

export async function scorePracticeWithAI(features, metadata = {}) {
  const payload = {
    features,
    metadata,
  };

  const response = await runPythonInference(payload);
  if (!response?.success) {
    throw new Error(response?.error || 'AI inference thất bại.');
  }

  return response.scores;
}

export async function extractFeaturesFromAudio(audioPath) {
  if (!audioPath) {
    throw new Error('Thiếu đường dẫn file audio để trích đặc trưng.');
  }
  const response = await runFeatureExtractor(audioPath);
  if (!response?.success) {
    throw new Error(response?.error || 'Trích xuất đặc trưng thất bại.');
  }
  const { normalized } = sanitizeFeaturePayload(response.features);
  return normalized;
}

export async function saveAiPracticeResult(userId, payload = {}) {
  if (!userId) throw new Error('Thiếu user để lưu kết quả AI.');

  const doc = await AiPracticeResult.create({
    user: userId,
    lessonId: payload.lessonId,
    lessonTitle: payload.lessonTitle,
    level: payload.level || 'beginner',
    bpm: payload.bpm,
    targetBpm: payload.targetBpm,
    practiceDuration: payload.practiceDuration,
    metadata: payload.metadata,
    features: payload.features,
    scores: payload.scores,
  });

  return doc.toObject();
}

export async function fetchAiPracticeHistory(userId, { limit = 20, lessonId } = {}) {
  if (!userId) throw new Error('Thiếu user để lấy lịch sử AI.');

  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const query = { user: userId };
  if (lessonId) query.lessonId = lessonId;

  const history = await AiPracticeResult.find(query).sort({ createdAt: -1 }).limit(safeLimit).lean();

  const aggregate = history.reduce(
    (acc, entry) => {
      acc.sessions += 1;
      const overall = entry?.scores?.regression?.overall_score ?? 0;
      acc.totalOverall += overall;
      acc.bestOverall = Math.max(acc.bestOverall, overall);
      return acc;
    },
    { sessions: 0, totalOverall: 0, bestOverall: 0 },
  );

  const averageOverall =
    aggregate.sessions > 0 ? Number((aggregate.totalOverall / aggregate.sessions).toFixed(2)) : 0;

  return {
    history,
    stats: {
      sessions: aggregate.sessions,
      averageOverall,
      bestOverall: Number(aggregate.bestOverall.toFixed(2)),
    },
  };
}

/**
 * Lấy danh sách audio files đã upload của user
 * @param {string} userId - ID của user
 * @param {Object} options - Tùy chọn: limit, lessonId, includeMetadata
 * @returns {Promise<Array>} Danh sách audio files với metadata
 */
export async function fetchUserAudioFiles(userId, { limit = 50, lessonId, includeMetadata = true } = {}) {
  if (!userId) throw new Error('Thiếu user để lấy danh sách audio.');

  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const query = { user: userId };
  if (lessonId) query.lessonId = lessonId;

  const results = await AiPracticeResult.find(query)
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .select('metadata createdAt lessonId lessonTitle level scores')
    .lean();

  // Lọc và map các results có metadata audio (có cloudinaryUrl hoặc audioFile)
  const audioFiles = results
    .filter((result) => {
      // Lấy cả records có cloudinaryUrl hoặc audioFile (cho tương thích ngược)
      return (
        result.metadata?.cloudinaryUrl ||
        result.metadata?.cloudinaryPublicId ||
        result.metadata?.audioFile
      );
    })
    .map((result) => {
      const metadata = result.metadata || {};
      
      // Lấy cloudinaryUrl từ metadata hoặc từ audioFile nếu có
      let cloudinaryUrl = metadata.cloudinaryUrl;
      let cloudinaryPublicId = metadata.cloudinaryPublicId || metadata.audioFile;
      
      // Nếu có publicId nhưng chưa có URL, tạo URL từ publicId
      if (!cloudinaryUrl && cloudinaryPublicId) {
        try {
          cloudinaryUrl = getCloudinaryUrl(cloudinaryPublicId);
        } catch (err) {
          console.warn(`Không thể tạo URL từ publicId ${cloudinaryPublicId}:`, err.message);
        }
      }

      const audio = {
        id: result._id.toString(),
        cloudinaryUrl: cloudinaryUrl,
        cloudinaryPublicId: cloudinaryPublicId,
        originalFilename: metadata.originalFilename || metadata.originalname || 'Không có tên',
        uploadedAt: result.createdAt,
        lessonId: result.lessonId,
        lessonTitle: result.lessonTitle,
        level: result.level,
        overallScore: result.scores?.regression?.overall_score || 0,
        levelClass: result.scores?.classification?.level_class || 0,
      };

      if (includeMetadata) {
        audio.metadata = {
          mimetype: metadata.mimetype,
          size: metadata.size,
          requestedAt: metadata.requestedAt,
        };
      }

      return audio;
    });

  return audioFiles;
}

