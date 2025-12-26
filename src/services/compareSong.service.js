import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ReferenceSong from '../models/ReferenceSong.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.join(__dirname, '..', '..');
const defaultCompareRoot = path.join(serverRoot, '..', 'compare-two-song');

function resolvePath(envKey, defaultPath) {
  return process.env[envKey] ? process.env[envKey] : defaultPath;
}

const compareConfig = {
  pythonBin: process.env.AI_PYTHON_BIN || 'python',
  compareScriptPath: resolvePath(
    'COMPARE_SCRIPT',
    path.join(defaultCompareRoot, 'compare_two_song.py'),
  ),
  workingDir: process.env.AI_WORKDIR
    ? process.env.AI_WORKDIR
    : defaultCompareRoot,
  tempDir: path.join(serverRoot, 'tmp', 'compare-audio'),
};

// Đảm bảo thư mục temp tồn tại
if (!fs.existsSync(compareConfig.tempDir)) {
  fs.mkdirSync(compareConfig.tempDir, { recursive: true });
}

/**
 * Chạy script Python để so sánh hai file audio
 * @param {string} refAudioPath - Đường dẫn file audio bản chuẩn
 * @param {string} perfAudioPath - Đường dẫn file audio bản chơi
 * @param {Object} options - Tùy chọn: hop, delta, match_window, sr
 * @returns {Promise<Object>} Kết quả so sánh
 */
export async function compareTwoSongs(refAudioPath, perfAudioPath, options = {}) {
  // Validate input paths
  if (!refAudioPath) {
    throw new Error('Đường dẫn file bản chuẩn không được để trống');
  }
  if (!perfAudioPath) {
    throw new Error('Đường dẫn file bản chơi không được để trống');
  }

  // Kiểm tra file tồn tại
  if (!fs.existsSync(refAudioPath)) {
    throw new Error(`File bản chuẩn không tồn tại: ${refAudioPath}`);
  }
  if (!fs.existsSync(perfAudioPath)) {
    throw new Error(`File bản chơi không tồn tại: ${perfAudioPath}`);
  }

  // Kiểm tra file không rỗng
  const refStats = fs.statSync(refAudioPath);
  const perfStats = fs.statSync(perfAudioPath);
  if (refStats.size === 0) {
    throw new Error(`File bản chuẩn rỗng: ${refAudioPath}`);
  }
  if (perfStats.size === 0) {
    throw new Error(`File bản chơi rỗng: ${perfAudioPath}`);
  }

  // Kiểm tra script có tồn tại không
  if (!fs.existsSync(compareConfig.compareScriptPath)) {
    throw new Error(`Script so sánh không tồn tại: ${compareConfig.compareScriptPath}`);
  }

  console.log(`🔍 Bắt đầu so sánh audio:`);
  console.log(`   - Bản chuẩn: ${refAudioPath} (${refStats.size} bytes)`);
  console.log(`   - Bản chơi: ${perfAudioPath} (${perfStats.size} bytes)`);
  console.log(`   - Script: ${compareConfig.compareScriptPath}`);
  console.log(`   - Python: ${compareConfig.pythonBin}`);

  return new Promise((resolve, reject) => {
    // Sử dụng đường dẫn tương đối hoặc đường dẫn gốc được cung cấp
    const normalizedRefPath = refAudioPath;
    const normalizedPerfPath = perfAudioPath;
    
    // Kiểm tra lại sau khi normalize
    if (!fs.existsSync(normalizedRefPath)) {
      return reject(new Error(`File bản chuẩn không tồn tại: ${normalizedRefPath}`));
    }
    if (!fs.existsSync(normalizedPerfPath)) {
      return reject(new Error(`File bản chơi không tồn tại: ${normalizedPerfPath}`));
    }
    
    const args = [
      compareConfig.compareScriptPath,
      '--ref',
      normalizedRefPath,
      '--perf',
      normalizedPerfPath,
      '--hop',
      String(options.hop || 512),
      '--delta',
      String(options.delta || 0.07),
      '--match_window',
      String(options.match_window || 0.08),
    ];

    if (options.sr && options.sr !== 'none') {
      args.push('--sr', String(options.sr));
    } else {
      args.push('--sr', 'none'); // Tự động căn chỉnh
    }

    console.log(`🚀 Chạy Python script:`);
    console.log(`   - Python: ${compareConfig.pythonBin}`);
    console.log(`   - Script: ${compareConfig.compareScriptPath}`);
    console.log(`   - Args: ${args.slice(1).join(' ')}`);
    console.log(`   - Working dir: ${compareConfig.workingDir}`);

    const child = spawn(compareConfig.pythonBin, args, {
      cwd: compareConfig.workingDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1', // Đảm bảo output không bị buffer
      },
    });

    let stdoutChunks = [];
    let stderrChunks = [];

    child.stdout.on('data', (chunk) => {
      stdoutChunks.push(chunk);
    });

    child.stderr.on('data', (chunk) => {
      stderrChunks.push(chunk);
      // Log stderr để debug
      const errorText = chunk.toString('utf-8');
      if (errorText.trim()) {
        console.log(`[Python stderr] ${errorText.trim()}`);
      }
    });

    child.on('error', (err) => {
      console.error('❌ Lỗi khi spawn Python process:', err);
      reject(new Error(`Lỗi khi chạy script so sánh: ${err.message}`));
    });

    child.on('close', (code) => {
      const stdout = Buffer.concat(stdoutChunks).toString('utf-8');
      const stderr = Buffer.concat(stderrChunks).toString('utf-8');

      // Log để debug
      if (stdout) {
        console.log(`[Python stdout] ${stdout.substring(0, 500)}${stdout.length > 500 ? '...' : ''}`);
      }
      if (stderr) {
        console.log(`[Python stderr] ${stderr.substring(0, 500)}${stderr.length > 500 ? '...' : ''}`);
      }

      // Parse JSON output từ script - tìm trong toàn bộ stdout
      // Python script có thể vẫn in JSON ngay cả khi có lỗi (trong exception handler)
      try {
        // Tìm JSON output giữa ===JSON_OUTPUT=== và ===END_JSON===
        const jsonStartMarker = '===JSON_OUTPUT===';
        const jsonEndMarker = '===END_JSON===';
        const jsonStartIndex = stdout.indexOf(jsonStartMarker);
        const jsonEndIndex = stdout.indexOf(jsonEndMarker);

        if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
          const jsonOutput = stdout.substring(
            jsonStartIndex + jsonStartMarker.length,
            jsonEndIndex
          ).trim();
          
          if (jsonOutput) {
            try {
              const result = JSON.parse(jsonOutput);
              
              // Xử lý trường hợp có lỗi từ Python script
              if (result.success === false) {
                const errorMsg = result.error || 'Lỗi không xác định từ Python script';
                console.error(`❌ Python script báo lỗi: ${errorMsg}`);
                return reject(new Error(errorMsg));
              }
              
              // Normalize kết quả để đảm bảo mapping đúng với frontend
              // Scoring nằm trong result.results.scoring (từ Python script)
              const resultsToNormalize = result.results || result;
              const normalizedResults = normalizeComparisonResults(resultsToNormalize);
              
              // Nếu có kết quả thành công, trả về
              if (result.success && result.results) {
                return resolve(normalizedResults);
              }
              if (result.results) {
                return resolve(normalizedResults);
              }
              // Nếu không có results nhưng success=true, trả về normalized result
              if (result.success) {
                return resolve(normalizedResults);
              }
            } catch (parseError) {
              console.error('❌ Lỗi khi parse JSON:', parseError);
              console.error('JSON string:', jsonOutput.substring(0, 200));
              // Nếu parse JSON lỗi, tiếp tục xử lý như không có JSON
            }
          }
        }

        // Nếu không tìm thấy JSON markers hoặc parse JSON lỗi
        // Kiểm tra exit code
        if (code !== 0) {
          const errorMsg = stderr || stdout || `Script so sánh thoát với mã ${code}`;
          console.error(`❌ Python script exited with code ${code}`);
          return reject(new Error(`Lỗi khi phân tích âm thanh: ${errorMsg.substring(0, 500)}`));
        }

        // Nếu code = 0 nhưng không có JSON, thử parse text report
        console.log('⚠️ Không tìm thấy JSON markers, thử parse text report');
        const report = parseTextReport(stdout);
        return resolve(normalizeComparisonResults(report));
      } catch (err) {
        // Nếu không parse được JSON, trả về lỗi với stdout để debug
        console.error('❌ Lỗi khi xử lý kết quả từ script:', err);
        const errorDetails = stdout.length > 1000 
          ? stdout.substring(0, 500) + '\n...\n' + stdout.substring(stdout.length - 500)
          : stdout;
        reject(
          new Error(
            `Không thể parse kết quả từ script: ${err.message}\nStdout (first 500 chars): ${errorDetails.substring(0, 500)}`,
          ),
        );
      }
    });
  });
}

/**
 * Normalize kết quả so sánh để đảm bảo mapping đúng với frontend
 * @param {Object} results - Kết quả từ Python script
 * @returns {Object} Kết quả đã được normalize
 */
function normalizeComparisonResults(results) {
  if (!results || typeof results !== 'object') {
    return results;
  }
  
  const normalized = { ...results };
  
  // Map missing_notes_count -> missing_notes (nếu chưa có missing_notes)
  if (normalized.missing_notes_count !== undefined && normalized.missing_notes === undefined) {
    normalized.missing_notes = normalized.missing_notes_count;
  }
  
  // Map extra_notes_count -> extra_notes (nếu chưa có extra_notes)
  if (normalized.extra_notes_count !== undefined && normalized.extra_notes === undefined) {
    normalized.extra_notes = normalized.extra_notes_count;
  }
  
  // Đảm bảo scoring được giữ nguyên nếu có
  if (normalized.scoring && typeof normalized.scoring === 'object') {
    normalized.scoring = { ...normalized.scoring };
  }
  
  // Đảm bảo referenceSong được giữ nguyên nếu có
  if (normalized.referenceSong && typeof normalized.referenceSong === 'object') {
    normalized.referenceSong = { ...normalized.referenceSong };
  }
  
  return normalized;
}

/**
 * Parse text report từ stdout thành JSON
 * @param {string} text - Text output từ script
 * @returns {Object} Report object
 */
function parseTextReport(text) {
  // Script in report dạng text, chúng ta sẽ extract thông tin chính
  const report = {
    success: true,
    message: 'So sánh hoàn tất',
    raw_output: text,
  };

  // Extract các thông tin chính từ text report
  const meanOffsetMatch = text.match(/Trung bình:\s*([\d.]+)\s*ms/);
  const stdOffsetMatch = text.match(/Độ lệch chuẩn:\s*([\d.]+)\s*ms/);
  const maxOffsetMatch = text.match(/Lệch tối đa:\s*([\d.]+)\s*ms/);
  const matchedNotesMatch = text.match(/Số nốt khớp:\s*(\d+)/);
  const missingNotesMatch = text.match(/Thiếu nốt[^:]*:\s*(\d+)/);
  const extraNotesMatch = text.match(/Thừa nốt[^:]*:\s*(\d+)/);

  if (meanOffsetMatch) report.mean_offset_ms = parseFloat(meanOffsetMatch[1]);
  if (stdOffsetMatch) report.std_offset_ms = parseFloat(stdOffsetMatch[1]);
  if (maxOffsetMatch) report.max_offset_ms = parseFloat(maxOffsetMatch[1]);
  if (matchedNotesMatch) report.matched_notes = parseInt(matchedNotesMatch[1]);
  if (missingNotesMatch) report.missing_notes = parseInt(missingNotesMatch[1]);
  if (extraNotesMatch) report.extra_notes = parseInt(extraNotesMatch[1]);

  return report;
}

/**
 * Tải file audio từ Cloudinary URL về local
 * @param {string} url - Cloudinary URL
 * @param {string} outputPath - Đường dẫn file output
 * @returns {Promise<string>} Đường dẫn file đã tải
 */
async function downloadAudioFromUrl(url, outputPath) {
  try {
    console.log(`📥 Đang tải file audio từ URL: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0) {
      throw new Error('File tải về rỗng');
    }
    fs.writeFileSync(outputPath, Buffer.from(buffer));
    const stats = fs.statSync(outputPath);
    console.log(`✅ Đã tải file thành công: ${outputPath} (${stats.size} bytes)`);
    return outputPath;
  } catch (error) {
    console.error(`❌ Lỗi khi tải file từ URL ${url}:`, error);
    throw new Error(`Không thể tải file từ URL: ${error.message}`);
  }
}

/**
 * So sánh audio của user với bài hát gốc
 * @param {string} referenceSongId - ID của bài hát gốc trong database
 * @param {string} userAudioPath - Đường dẫn file audio của user (local)
 * @param {Object} options - Tùy chọn so sánh
 * @returns {Promise<Object>} Kết quả so sánh
 */
export async function compareUserAudioWithReference(
  referenceSongId,
  userAudioPath,
  options = {},
) {
  let refAudioPath = null;
  try {
    // Validate input
    if (!referenceSongId) {
      throw new Error('ID bài hát gốc không được để trống');
    }
    if (!userAudioPath) {
      throw new Error('Đường dẫn file audio của user không được để trống');
    }

    // Kiểm tra file user audio tồn tại
    if (!fs.existsSync(userAudioPath)) {
      throw new Error(`File audio của user không tồn tại: ${userAudioPath}`);
    }

    // Lấy thông tin bài hát gốc từ database
    const referenceSong = await ReferenceSong.findById(referenceSongId).lean();
    if (!referenceSong) {
      throw new Error(`Không tìm thấy bài hát gốc với ID: ${referenceSongId}`);
    }

    if (!referenceSong.audioFile || !referenceSong.audioFile.url) {
      throw new Error('Bài hát gốc không có file audio.');
    }

    console.log(`🎵 So sánh với bài hát gốc: "${referenceSong.title}" (ID: ${referenceSongId})`);

    // Tải file audio bản chuẩn từ Cloudinary về local
    const fileExtension = referenceSong.audioFile.format || 'wav';
    refAudioPath = path.join(
      compareConfig.tempDir,
      `ref_${referenceSongId}_${Date.now()}.${fileExtension}`,
    );

    await downloadAudioFromUrl(referenceSong.audioFile.url, refAudioPath);

    // Kiểm tra file đã tải về thành công
    if (!fs.existsSync(refAudioPath)) {
      throw new Error('Không thể tải file bản chuẩn từ Cloudinary');
    }

    // So sánh hai file
    const result = await compareTwoSongs(refAudioPath, userAudioPath, options);

    // Cập nhật usageCount của bài hát gốc
    try {
      await ReferenceSong.findByIdAndUpdate(referenceSongId, {
        $inc: { usageCount: 1 },
      });
    } catch (updateError) {
      console.warn('⚠️ Không thể cập nhật usageCount:', updateError);
      // Không throw error vì so sánh đã thành công
    }

    // Xóa file tạm
    if (refAudioPath && fs.existsSync(refAudioPath)) {
      try {
        fs.unlinkSync(refAudioPath);
        console.log(`🗑️ Đã xóa file tạm: ${refAudioPath}`);
      } catch (e) {
        console.warn(`⚠️ Không thể xóa file tạm ${refAudioPath}:`, e);
      }
    }

    return {
      ...result,
      referenceSong: {
        id: referenceSong._id.toString(),
        title: referenceSong.title,
        artist: referenceSong.artist,
      },
    };
  } catch (error) {
    console.error('❌ Lỗi trong compareUserAudioWithReference:', {
      message: error.message,
      referenceSongId,
      userAudioPath,
      refAudioPath,
    });

    // Xóa file tạm nếu có lỗi
    if (refAudioPath && fs.existsSync(refAudioPath)) {
      try {
        fs.unlinkSync(refAudioPath);
      } catch (e) {
        console.warn(`⚠️ Không thể xóa file tạm sau lỗi:`, e);
      }
    }
    throw error;
  }
}

