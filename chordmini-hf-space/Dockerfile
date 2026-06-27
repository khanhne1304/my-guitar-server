# ChordMini backend cho Hugging Face Spaces
# Dùng image dựng sẵn trên Docker Hub (4.2GB) — KHÔNG build từ source.
# Image đã có sẵn madmom, spleeter, chord-cnn-lstm, beat-transformer và chạy gunicorn ở cổng 8080.
FROM ptnghia/chordminiapp-backend:latest

# Cấu hình chạy production
ENV FLASK_ENV=production
ENV FLASK_DEBUG=False
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Model mặc định (khớp với my-guitar-server)
ENV DEFAULT_CHORD_MODEL=chord-cnn-lstm
ENV DEFAULT_BEAT_MODEL=beat-transformer

# Giới hạn upload (100MB) và timeout xử lý (10 phút)
ENV MAX_CONTENT_LENGTH=104857600
ENV UPLOAD_TIMEOUT=600

# HF Spaces sẽ route traffic vào cổng này (khai báo app_port: 8080 trong README.md)
EXPOSE 8080

# Image gốc đã có CMD gunicorn bind 0.0.0.0:8080 — không cần override.
