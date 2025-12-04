# my-guitar-server

## AI Practice Evaluation API

The backend now proxies the clip-level AI scoring pipeline so the “Luyện tập với AI” interface can submit feature vectors and receive model feedback as JSON, with optional persistence for user history.

### Environment variables

| Key | Default | Description |
| --- | --- | --- |
| `AI_PYTHON_BIN` | `python` | Python executable used to run the inference script. |
| `AI_INFER_SCRIPT` | `../my-guitar-ai-service/infer_clip_quality.py` | Path to the Python entry point. |
| `AI_SERVICE_CONFIG` | `../my-guitar-ai-service/config/training_config.yaml` | YAML config that defines feature columns / targets. |
| `AI_REGRESSOR_PATH` | `../my-guitar-ai-service/artifacts/clip_regressor.joblib` | Multi-output regressor artifacts. |
| `AI_CLASSIFIER_PATH` | `../my-guitar-ai-service/artifacts/level_classifier.joblib` | Level classifier artifact. |
| `AI_WORKDIR` | `../my-guitar-ai-service` | Working directory for the Python process. |

> Ensure the `my-guitar-ai-service` project has been trained so that the artifacts exist before hitting the API.

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

2. `GET /api/ai/practice/history?limit=20&lessonId=legato-01` (requires auth)

- Returns the latest saved sessions plus aggregate stats (session count, average / best `overall_score`).

Both endpoints are protected with the existing `protect` middleware so they use the logged-in user ID to enrich metadata and store history.