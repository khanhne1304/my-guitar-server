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