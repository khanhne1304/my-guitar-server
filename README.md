# my-guitar-server

## AI Practice Evaluation API

The backend now proxies the clip-level AI scoring pipeline so the “Luyện tập với AI” interface can submit feature vectors and receive model feedback as JSON, with optional persistence for user history.

### Environment variables

#### AI Service Configuration
| Key | Default | Description |
| --- | --- | --- |
| `AI_PYTHON_BIN` | `python` | Python executable used to run the inference script. |
| `AI_INFER_SCRIPT` | `../my-guitar-ai-service/infer_clip_quality.py` | Path to the Python entry point. |
| `AI_SERVICE_CONFIG` | `../my-guitar-ai-service/config/training_config.yaml` | YAML config that defines feature columns / targets. |
| `AI_REGRESSOR_PATH` | `../my-guitar-ai-service/artifacts/clip_regressor.joblib` | Multi-output regressor artifacts. |
| `AI_CLASSIFIER_PATH` | `../my-guitar-ai-service/artifacts/level_classifier.joblib` | Level classifier artifact. |
| `AI_WORKDIR` | `../my-guitar-ai-service` | Working directory for the Python process. |

#### Cloudinary Configuration (Required for audio upload)
| Key | Description |
| --- | --- |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name (from dashboard) |
| `CLOUDINARY_API_KEY` | Your Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Your Cloudinary API secret |

> **Note:** Audio files are now uploaded to Cloudinary instead of local storage. Get your credentials from [Cloudinary Dashboard](https://cloudinary.com/console).

> Ensure the `my-guitar-ai-service` project has been trained so that the artifacts exist before hitting the API.

#### Facebook OAuth (Login/Signup)
| Key | Default | Description |
| --- | --- | --- |
| `FACEBOOK_APP_ID` |  | Facebook App ID (Required) |
| `FACEBOOK_APP_SECRET` |  | Facebook App Secret (Required) |
| `FACEBOOK_CALLBACK_URL` | `http://localhost:4000/api/auth/facebook/callback` | OAuth callback URL |
| `FRONTEND_URL` | `http://localhost:3000` | Frontend base URL for redirect after login |

Notes:
- Enable "Facebook Login" product in Facebook Developer Console and add the callback URL to Valid OAuth Redirect URIs.
- Add your frontend origin to `CORS_ORIGIN` if you deploy.

#### Google OAuth (Login/Signup)
| Key | Default | Description |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` |  | Google OAuth2 Client ID (Required) |
| `GOOGLE_CLIENT_SECRET` |  | Google OAuth2 Client Secret (Required) |
| `GOOGLE_CALLBACK_URL` | `http://localhost:4000/api/auth/google/callback` | OAuth callback URL |

Notes:
- Create OAuth 2.0 Client (type Web) at Google Cloud Console, add Authorized redirect URIs accordingly.
- Add your frontend origin to `CORS_ORIGIN` if you deploy.

### REST endpoints

1. `POST /api/ai/practice/score` (requires auth)

```jsonc
{
  "features": { "mean_pitch_error_semitones": 0.45, "...": 0.9 },
  "metadata": { "clipId": "abc" },
  "lessonId": "legato-01",
  "lessonTitle": "Legato Warmup",
  "level": "intermediate",
  "bpm": 90,
  "targetBpm": 100,
  "practiceDuration": 120,
  "saveResult": true
}
```

- Returns AI regression + classification scores and, if `saveResult=true`, persists them to MongoDB (`AiPracticeResult` collection).

2. `POST /api/ai/practice/upload` (requires auth, multipart/form-data)

- Uploads an audio file, extracts features, and returns AI scores.
- File is uploaded to Cloudinary and stored in the `ai-audio` folder.
- Request body should include:
  - `audio`: Audio file (multipart/form-data)
  - `lessonId`, `lessonTitle`, `level`, `bpm`, `targetBpm`, `practiceDuration` (optional)
  - `saveResult`: Boolean to save the result to database
- Returns Cloudinary URL and public ID along with features and scores.

3. `GET /api/ai/practice/history?limit=20&lessonId=legato-01` (requires auth)

- Returns the latest saved sessions plus aggregate stats (session count, average / best `overall_score`).

All endpoints are protected with the existing `protect` middleware so they use the logged-in user ID to enrich metadata and store history.

### HopAmChuan proxy & Chord practice

| Endpoint | Auth | Description |
| --- | --- | --- |
| `GET /api/hopam/search?q=` | No | Tìm bài trên hopamchuan.com |
| `GET /api/hopam/song?url=` | No | Lấy hợp âm + lời bài hát |
| `POST /api/chord-practice/analyze` | Yes | Upload audio + `hopamUrl` → nhận diện hợp âm & so sánh |
| `POST /api/chord-practice/analyze-only` | Yes | Chỉ nhận diện hợp âm |

### Nhận diện hợp âm (ChordMini)

**Hướng dẫn cài đặt đầy đủ (bắt buộc ChordMini):** xem [CHORDMINI_SETUP.md](./CHORDMINI_SETUP.md)

**ChordMini (Docker, khuyến nghị):**

```powershell
cd "d:\New folder\my-guitar-server"
powershell -ExecutionPolicy Bypass -File .\scripts\start-chordmini-docker.ps1
```

Dừng: `.\scripts\stop-chordmini-docker.ps1` — API: `http://localhost:5001`

| Biến | Giá trị | Mô tả |
| --- | --- | --- |
| `CHORDMINI_API_URL` | `http://localhost:5001` | ChordMini Docker local — **không** dùng `https://www.chordmini.me` |
| `CHORDMINI_MODEL` | `chord-cnn-lstm` | Model nhận diện |

Nhận diện hợp âm **chỉ** qua ChordMini. Phân tích `/api/chord-practice/analyze` còn gọi `detect-beats` để so sánh BPM với HopAmChuan.

| Biến | Mô tả |
| --- | --- |
| `CHORDMINI_BEAT_DETECTOR` | `madmom` (mặc định), `librosa`, `beat-transformer` |
| `LLM_API_KEY` | Key **OpenAI-compatible** cho gợi ý luyện tập |
| `LLM_API_BASE_URL` | Ví dụ `https://aiapiv2.pekpik.com/v1` |
| `LLM_PRACTICE_ADVICE_MODEL` | `gpt-3.5-turbo` (mặc định) |
| `PRACTICE_ADVICE_PROVIDER` | `openai` (mặc định) hoặc `gemini` |
| `GEMINI_API_KEY` | Chỉ khi `PRACTICE_ADVICE_PROVIDER=gemini` |

Cloud `chordmini.me` trả lỗi **`Missing App Check token`** (Firebase App Check) — chỉ chạy được ChordMini **trên máy bạn** cổng `5001`.

#### So sánh audio hai bản (compare-two-song)

Cần cài Python dependencies:

```bash
cd compare-two-song
pip install -r requirements.txt
```

Script mặc định: `../compare-two-song/compare_two_song.py` (hoặc `COMPARE_SCRIPT`).