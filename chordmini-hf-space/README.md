---
title: ChordMini Backend
emoji: 🎸
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 8080
pinned: false
---

# ChordMini Backend (My Guitar)

Dịch vụ nhận diện hợp âm & beat cho ứng dụng **My Guitar**, chạy bằng image
[`ptnghia/chordminiapp-backend`](https://hub.docker.com/r/ptnghia/chordminiapp-backend)
(nguồn: [ptnghia-j/ChordMiniApp](https://github.com/ptnghia-j/ChordMiniApp)).

## Endpoints chính

- `GET  /api/model-info` — kiểm tra trạng thái (health check)
- `POST /api/recognize-chords` — nhận diện hợp âm (multipart: `file`, `model=chord-cnn-lstm`)
- `POST /api/detect-beats` — phát hiện beat/BPM (multipart: `file`, `detector=madmom`)

## Cách dùng từ my-guitar-server

Đặt biến môi trường trên Render:

```
CHORDMINI_API_URL=https://<user>-<space-name>.hf.space
CHORDMINI_MODEL=chord-cnn-lstm
```

> Space miễn phí sẽ "ngủ" sau 48h không truy cập; lần gọi đầu sau khi ngủ sẽ chậm
> (~1-2 phút khởi động lại model). Phù hợp cho demo/đồ án.
