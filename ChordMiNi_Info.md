# ChordMiNi_Info — Quy trình đầy đủ My Guitar + ChordMini + Docker

Tài liệu này ghi lại **toàn bộ quy trình** từ cài đặt ChordMini, chạy bằng Docker, cấu hình backend My Guitar, đến cách dùng trên giao diện. Dùng làm sổ tay tham chiếu cho dự án **My Guitar** (`my-guitar-server` + `my-guitar-client`).

> Tài liệu ngắn gọn hơn (chỉ cài đặt): [CHORDMINI_SETUP.md](./CHORDMINI_SETUP.md)

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Vì sao phải chạy ChordMini local (Docker)](#2-vì-sao-phải-chạy-chordmini-local-docker)
3. [Kiến trúc hệ thống](#3-kiến-trúc-hệ-thống)
4. [Phần mềm cần cài (Windows)](#4-phần-mềm-cần-cài-windows)
5. [Cài ChordMini bằng Docker (khuyến nghị)](#5-cài-chordmini-bằng-docker-khuyến-nghị)
6. [Các cách chạy ChordMini khác (không Docker)](#6-các-cách-chạy-chordmini-khác-không-docker)
7. [Cấu hình My Guitar Server](#7-cấu-hình-my-guitar-server)
8. [Khởi động hàng ngày — thứ tự 3 dịch vụ](#8-khởi-động-hàng-ngày--thứ-tự-3-dịch-vụ)
9. [Kiểm tra từng bước](#9-kiểm-tra-từng-bước)
10. [Luồng kỹ thuật: từ nút bấm đến kết quả](#10-luồng-kỹ-thuật-từ-nút-bấm-đến-kết-quả)
11. [Quy trình người dùng trên giao diện](#11-quy-trình-người-dùng-trên-giao-diện)
12. [Cách hiểu kết quả so sánh hợp âm](#12-cách-hiểu-kết-quả-so-sánh-hợp-âm)
13. [API & file trong repo](#13-api--file-trong-repo)
14. [Tính năng khác: so sánh audio hai bản](#14-tính-năng-khác-so-sánh-audio-hai-bản)
15. [Xử lý lỗi thường gặp](#15-xử-lý-lỗi-thường-gặp)
16. [Tài liệu & link tham khảo](#16-tài-liệu--link-tham-khảo)

---

## 1. Tổng quan

**ChordMini** là engine nhận diện **hợp âm** và **nhịp (BPM)** từ file audio. Trong My Guitar:

| Thành phần | Vai trò |
|-----------|---------|
| **ChordMini** (Python / Docker) | `POST /api/recognize-chords`, `POST /api/detect-beats` |
| **my-guitar-server** | Gọi ChordMini, lấy bài **HopAmChuan**, so sánh hợp âm & tempo |
| **my-guitar-client** | Upload/thu audio, hiển thị % khớp, gợi ý luyện tập |

Nhận diện hợp âm hiện tại **100% qua ChordMini** (không còn Python `my-guitar-chord-service` / librosa fallback).

---

## 2. Vì sao phải chạy ChordMini local (Docker)

**Không** đặt trong `.env`:

```env
CHORDMINI_API_URL=https://www.chordmini.me
```

API cloud của [chordmini.me](https://www.chordmini.me/docs) yêu cầu **Firebase App Check**. Server Node.js của My Guitar **không** có token App Check → lỗi:

```text
Missing App Check token
```

**Giải pháp:** chạy bản **ChordMiniApp** trên máy, map cổng **`http://localhost:5001`**.

| | Cloud | Local (Docker) |
|---|--------|----------------|
| URL | `https://www.chordmini.me` | `http://localhost:5001` |
| App Check | Bắt buộc | Không |
| Rate limit nhận diện | ~2 req/phút | Phụ thuộc CPU máy |
| Cài đặt | Không cần | Docker Desktop hoặc Python |

---

## 3. Kiến trúc hệ thống

```text
┌─────────────────────────────────────────────────────────────────┐
│  Trình duyệt — http://localhost:3000                             │
│  • /song-search          (Tìm hợp âm chuẩn + luyện tập)          │
│  • /tools/ai-guitar-practice (Luyện tập AI)                      │
└────────────────────────────┬────────────────────────────────────┘
                             │ JWT (đăng nhập)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  my-guitar-server — http://localhost:4000/api                    │
│  • GET  /hopam/search, /hopam/song                               │
│  • POST /chord-practice/analyze   (audio + hopamUrl)             │
│  • POST /chord-practice/analyze-only                             │
│  • POST /compare/audio, /compare/two-songs  (tính năng khác)     │
└────────────┬───────────────────────────────┬────────────────────┘
             │                               │
             │ fetch HopAmChuan               │ fetch ChordMini
             ▼                               ▼
┌──────────────────────┐    ┌──────────────────────────────────────┐
│  hopamchuan.com      │    │  ChordMini (Docker hoặc Python)       │
│  (proxy qua server)  │    │  http://localhost:5001                │
│                      │    │  • POST /api/recognize-chords          │
│                      │    │  • POST /api/detect-beats               │
│                      │    │  • GET  /api/model-info               │
└──────────────────────┘    └──────────────────────────────────────┘
                                      ▲
                                      │ docker compose
                                      │ 5001:8080
                            ┌─────────┴─────────┐
                            │  container         │
                            │  chordmini-local   │
                            │  (Flask :8080)     │
                            └───────────────────┘
```

**Ba tiến trình khi dev:**

| # | Dịch vụ | Cổng | Lệnh (PowerShell) |
|---|---------|------|-------------------|
| 1 | ChordMini | **5001** | `scripts\start-chordmini-docker.ps1` |
| 2 | my-guitar-server | **4000** | `npm run dev` |
| 3 | my-guitar-client | **3000** | `npm start` |

---

## 4. Phần mềm cần cài (Windows)

### Bắt buộc (mọi cách)

| Phần mềm | Mục đích |
|----------|----------|
| [Git](https://git-scm.com/download/win) | Clone ChordMiniApp & model repos |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | **Cách B — khuyến nghị** |
| Node.js | `my-guitar-server`, `my-guitar-client` |

### Chỉ khi chạy Python native trên Windows (Cách A)

| Phần mềm | Mục đích |
|----------|----------|
| Python **3.10.x** | ChordMini backend |
| [FFmpeg](https://ffmpeg.org) | Xử lý audio (`winget install Gyan.FFmpeg`) |
| **Visual Studio Build Tools (C++)** | Biên dịch `madmom` — **không** cần nếu dùng Docker |

---

## 5. Cài ChordMini bằng Docker (khuyến nghị)

### 5.1. Chuẩn bị Docker Desktop

1. Cài **Docker Desktop** và mở app.
2. Đợi trạng thái **Engine running** (icon cá voi xanh).
3. Kiểm tra:

```powershell
docker ps
```

Nếu lỗi `dockerDesktopLinuxEngine` / HTTP 500 → **Restart Docker Desktop** (Troubleshoot → Restart).

### 5.2. Một lệnh khởi động (PowerShell)

```powershell
cd "d:\New folder\my-guitar-server"
powershell -ExecutionPolicy Bypass -File .\scripts\start-chordmini-docker.ps1
```

Script `start-chordmini-docker.ps1` tự làm:

| Bước | Hành động |
|------|-----------|
| 1 | Kiểm tra `docker` và Docker Engine sẵn sàng |
| 2 | Clone `ChordMiniApp` → `%USERPROFILE%\ChordMiniApp` (nếu chưa có), với `GIT_LFS_SKIP_SMUDGE=1` |
| 3 | Clone **Beat-Transformer** → `python_backend/models/Beat-Transformer` |
| 4 | Clone **Chord-CNN-LSTM** → `python_backend/models/Chord-CNN-LSTM` |
| 5 | `docker compose -f docker-compose.chordmini.yml up --build` |

> **Thiếu submodule** → lỗi runtime: `No module named 'DilatedTransformer'`. Script đã tự clone hai repo model trên.

### 5.3. Docker Compose — cổng & container

File: `my-guitar-server/docker-compose.chordmini.yml`

| Thiết lập | Giá trị |
|-----------|---------|
| Image build | `${CHORDMINI_HOME}/python_backend` (Dockerfile trong ChordMiniApp) |
| Container name | `chordmini-local` |
| Map cổng | **`localhost:5001` → container `8080`** |
| Healthcheck | `GET /api/model-info` mỗi 30s |

Biến môi trường tùy chọn:

```powershell
$env:CHORDMINI_HOME = "D:\duong-dan\ChordMiniApp"
```

Mặc định: `%USERPROFILE%\ChordMiniApp`.

### 5.4. Build lần đầu

- Thời gian: **15–30 phút**
- Dung lượng: khoảng **2–4 GB** (image + model)
- Lần chạy sau: nhanh hơn nếu image đã build

Khi container chạy ổn, từ Windows:

```powershell
curl.exe http://localhost:5001/api/model-info
```

Kết quả mong đợi: JSON có `"success": true`.

### 5.5. Dừng ChordMini Docker

```powershell
cd "d:\New folder\my-guitar-server"
powershell -ExecutionPolicy Bypass -File .\scripts\stop-chordmini-docker.ps1
```

Hoặc thủ công:

```powershell
docker compose -f docker-compose.chordmini.yml down
```

### 5.6. Thử nhận diện hợp âm trực tiếp (không qua My Guitar)

```powershell
curl.exe -X POST "http://localhost:5001/api/recognize-chords" `
  -F "file=@D:\duong-dan\ban-guitar.mp3" `
  -F "model=chord-cnn-lstm"
```

Response: `"success": true` và mảng `"chords"` (hoặc tương đương trong JSON).

### 5.7. Thử detect BPM

```powershell
curl.exe -X POST "http://localhost:5001/api/detect-beats" `
  -F "file=@D:\duong-dan\ban-guitar.mp3" `
  -F "detector=madmom"
```

---

## 6. Các cách chạy ChordMini khác (không Docker)

| Cách | Script / lệnh | Ghi chú |
|------|----------------|---------|
| **A — Windows + Python 3.10** | `install-chordmini-windows.ps1` → `start-chordmini-windows.ps1` | Cần **Build Tools** cho `madmom` |
| **C — WSL2 Ubuntu** | Clone + venv + `python app.py` trong Linux | Không cần compiler trên Windows |

Chi tiết từng bước: [CHORDMINI_SETUP.md](./CHORDMINI_SETUP.md) mục Cách A và C.

Flask native thường lắng nghe cổng **5001** trực tiếp; Docker map **5001 → 8080** trong container — **cùng URL** cho My Guitar: `http://localhost:5001`.

---

## 7. Cấu hình My Guitar Server

File: `my-guitar-server/.env`

```env
# Bắt buộc — ChordMini local
CHORDMINI_API_URL=http://localhost:5001
CHORDMINI_MODEL=chord-cnn-lstm

# Tùy chọn — detector nhịp (mặc định madmom)
# CHORDMINI_BEAT_DETECTOR=madmom
# CHORDMINI_BEAT_DETECTOR=librosa
# CHORDMINI_BEAT_DETECTOR=beat-transformer

# API My Guitar (ví dụ)
# PORT=4000
# MONGODB_URI=...
# JWT_SECRET=...
```

Sau khi sửa `.env`:

```powershell
cd "d:\New folder\my-guitar-server"
npm run dev
```

Client (`.env` hoặc mặc định):

```env
REACT_APP_API_BASE_URL=http://localhost:4000/api
```

---

## 8. Khởi động hàng ngày — thứ tự 3 dịch vụ

```text
Bước 1 → ChordMini (Docker)     cổng 5001   [giữ terminal mở]
Bước 2 → my-guitar-server       cổng 4000
Bước 3 → my-guitar-client       cổng 3000
```

**Terminal 1 — ChordMini:**

```powershell
cd "d:\New folder\my-guitar-server"
powershell -ExecutionPolicy Bypass -File .\scripts\start-chordmini-docker.ps1
```

**Terminal 2 — Server:**

```powershell
cd "d:\New folder\my-guitar-server"
npm run dev
```

**Terminal 3 — Client:**

```powershell
cd "d:\New folder\my-guitar-client"
npm start
```

---

## 9. Kiểm tra từng bước

### 9.1. ChordMini sống

```powershell
curl.exe http://localhost:5001/api/model-info
```

### 9.2. My Guitar server

```powershell
curl.exe http://localhost:4000/api/health
```

(Tùy route health của project; hoặc mở swagger/README endpoint list.)

### 9.3. End-to-end có auth

1. Đăng nhập trên client (`http://localhost:3000/login`).
2. Vào **Tìm hợp âm chuẩn** (`/song-search`) hoặc **Luyện tập guitar với AI** (`/tools/ai-guitar-practice`).
3. Chọn bài HopAmChuan, upload/thu MP3.
4. Bấm **Phân tích & so sánh hợp âm**.

Trong response (Network tab), kiểm tra:

```json
"processing_info": {
  "engine": "chordmini",
  "api_url": "http://localhost:5001",
  "model": "chord-cnn-lstm"
}
```

Nếu `engine` là `chordmini` và không lỗi → chuỗi Docker → server → ChordMini **đúng**.

---

## 10. Luồng kỹ thuật: từ nút bấm đến kết quả

### 10.1. Frontend

| File | Vai trò |
|------|---------|
| `my-guitar-client/src/services/chordPracticeService.js` | `FormData`: `audio`, `hopamUrl`, `referenceBpm`, `referenceTranspose` |
| `my-guitar-client/src/views/components/songSearch/SongAudioComparePanel.jsx` | UI upload, nút phân tích, hiển thị kết quả |
| `SongSearchPage.jsx` | Transpose lời/hợp âm + truyền `transpose` xuống panel |
| `CompareTwoSongsPage.jsx` | Trang luyện tập AI |

Gọi API:

```http
POST /api/chord-practice/analyze
Authorization: Bearer <token>
Content-Type: multipart/form-data

audio: <file>
hopamUrl: <url bài HopAmChuan>
referenceBpm: (optional)
referenceTranspose: (optional, số cung ±)
```

### 10.2. Backend controller

File: `src/controllers/chordPractice.controller.js`

```text
1. Lưu file upload → tmp/chord-audio/
2. Song song:
   a) analyzeChordsFromFile()  → ChordMini recognize-chords
   b) fetchHopamSong(hopamUrl) → proxy HopAmChuan
   c) detectBeatsFromFile()    → ChordMini detect-beats
3. Trích chuỗi hợp âm:
   - predictedSeq từ ChordMini
   - referenceSeqBase từ bài HopAmChuan
   - referenceSeqForCompare = transpose theo referenceTranspose (UI)
4. alignPredictedToHopam():
   - Điều chỉnh capo (nếu bài có capo)
   - Tự tìm dịch chuyển −11…+11 cung cho khớp tốt nhất
5. compareChordSequences() — LCS, accuracy = matched / referenceLen
6. buildTempoComparison() — so BPM gốc vs BPM detect
7. Trả JSON + xóa file tạm
```

### 10.3. ChordMini service (Node)

File: `src/services/chordMini.service.js`

| Hàm | Endpoint ChordMini |
|-----|-------------------|
| `recognizeChordsFromFile()` | `POST {CHORDMINI_API_URL}/api/recognize-chords` |
| `detectBeatsFromFile()` | `POST {CHORDMINI_API_URL}/api/detect-beats` |
| `checkChordMiniHealth()` | `GET .../api/model-info` |

Chuẩn hóa nhãn ChordMini → HopAmChuan:

| ChordMini | My Guitar |
|-----------|-----------|
| `C:maj` | `C` |
| `A:min` | `Am` |
| `N` / no chord | bỏ qua |

### 10.4. So sánh hợp âm

File: `src/utils/chordCompare.js`

- **LCS** (longest common subsequence) trên chuỗi đã chuẩn hóa.
- **Loose match:** `Em` ≈ `Em7`, v.v.
- **`transposeSemitones`:** offset tự động (−11…+11) — UI ghi *«Đã dịch ±N cung so với bản gốc»*.
- **`referenceTranspose`:** transpose bài chuẩn theo nút ± trên trang bài hát.

---

## 11. Quy trình người dùng trên giao diện

### 11.1. Trang Tìm hợp âm chuẩn (`/song-search`)

1. Tìm và chọn bài trên HopAmChuan.
2. (Tùy chọn) Dùng **Transpose** ± trên lời/hợp âm phía trên.
3. Kéo-thả hoặc **thu micro** bản guitar của bạn.
4. Bấm **Phân tích & so sánh hợp âm** (cần **đăng nhập**).
5. Xem:
   - % khớp chuỗi hợp âm, khớp/tổng
   - Cột **Hợp âm chuẩn** (theo transpose đã chọn)
   - Cột **Nhận diện từ audio** (chuỗi gốc + ghi chú đã dịch bao nhiêu cung)
   - **Gợi ý cải thiện** (tempo, link luyện nhịp)
   - **Timeline** từng đoạn hợp âm + confidence

### 11.2. Trang Luyện tập AI (`/tools/ai-guitar-practice`)

1. Chọn bài so sánh từ dropdown HopAmChuan (hoặc thêm từ tìm kiếm).
2. Upload/thu audio trong **Luyện tập guitar trực tiếp**.
3. Bấm **Phân tích & so sánh hợp âm** (cùng API như trên).
4. (Tùy chọn) Phần so sánh **âm thanh hai bản** dùng API khác — xem [mục 14](#14-tính-năng-khác-so-sánh-audio-hai-bản).

### 11.3. Điều kiện bắt buộc

| Điều kiện | Lý do |
|-----------|--------|
| Đăng nhập | Route `/chord-practice/*` có middleware `protect` |
| ChordMini chạy :5001 | Server gọi `fetch` tới local |
| Có `hopamUrl` | So sánh với bài chuẩn |
| File audio hợp lệ | MP3, WAV, … tối đa 200MB (theo `audioUpload`) |

---

## 12. Cách hiểu kết quả so sánh hợp âm

### 12.1. Vì sao % khớp có thể khác với hai dòng chữ nhìn cạnh nhau?

- Cột **Nhận diện** thường hiển thị chuỗi **gốc** từ ChordMini.
- **% khớp** tính trên chuỗi **đã căn tone** (dịch ±N cung, capo) rồi so LCS với **toàn bộ** hợp âm bài HopAmChuan.
- **Tổng (51)** = số hợp âm trong cả bài chuẩn; audio ngắn chỉ có vài đoạn nhận diện → % thường thấp dù vài đoạn đã khớp sau khi dịch tone.

### 12.2. Các chỉ số chính

| Chỉ số | Ý nghĩa |
|--------|---------|
| Độ khớp chuỗi hợp âm | `accuracyPercent` = LCS / độ dài chuỗi chuẩn |
| Khớp / tổng | `matched` / `referenceLen` |
| Đoạn nhận diện | Số segment từ ChordMini |
| Độ tin cậy TB | Trung bình `confidence` các đoạn |
| Tempo gốc / của bạn | HopAmChuan BPM vs `detect-beats` |

### 12.3. Transpose trên trang bài hát

- UI gửi `referenceTranspose` khi phân tích → bài chuẩn dùng để so sánh khớp tone bạn chọn trên lời.
- Đổi transpose **sau** khi đã phân tích: cột chuẩn cập nhật theo client; **% khớp** cần bấm phân tích lại để chính xác.

---

## 13. API & file trong repo

### 13.1. API My Guitar (ChordMini)

| Method | Path | Auth | Body chính |
|--------|------|------|------------|
| POST | `/api/chord-practice/analyze` | Có | `audio`, `hopamUrl`, `referenceBpm?`, `referenceTranspose?` |
| POST | `/api/chord-practice/analyze-only` | Có | `audio` |
| GET | `/api/hopam/search?q=` | Không | — |
| GET | `/api/hopam/song?url=` | Không | — |

### 13.2. API ChordMini local (gọi trực tiếp hoặc qua server)

| Method | Path | Body |
|--------|------|------|
| GET | `/api/model-info` | — |
| POST | `/api/recognize-chords` | `file`, `model=chord-cnn-lstm` |
| POST | `/api/detect-beats` | `file`, `detector=madmom` |

### 13.3. File quan trọng trong `my-guitar-server`

```text
ChordMiNi_Info.md              ← tài liệu này
CHORDMINI_SETUP.md             ← hướng dẫn cài ngắn
docker-compose.chordmini.yml   ← Docker map 5001:8080
scripts/
  start-chordmini-docker.ps1   ← clone + submodule + compose up
  stop-chordmini-docker.ps1
  install-chordmini-windows.ps1
  start-chordmini-windows.ps1
src/
  services/chordMini.service.js
  services/chordAnalysis.service.js
  services/hopam.service.js
  controllers/chordPractice.controller.js
  utils/chordCompare.js
  utils/tempoCompare.js
  routes/chordPractice.routes.js
```

### 13.4. File quan trọng trong `my-guitar-client`

```text
src/services/chordPracticeService.js
src/services/hopamApi.js
src/views/components/songSearch/SongAudioComparePanel.jsx
src/views/pages/SongSearchPage/SongSearchPage.jsx
src/views/pages/ToolsPage/CompareTwoSongsPage/
UI_CHORD_INTEGRATION.md
```

### 13.5. Thư mục ngoài repo (do script tạo)

```text
%USERPROFILE%\ChordMiniApp\          ← clone ChordMiniApp
  python_backend\
    Dockerfile
    app.py
    models\
      Beat-Transformer\              ← bắt buộc
      Chord-CNN-LSTM\                ← bắt buộc
```

---

## 14. Tính năng khác: so sánh audio hai bản

**Không** dùng ChordMini. Dùng Python **`compare-two-song/`** (script `compare_two_song.py`):

| API My Guitar | Mục đích |
|---------------|----------|
| `POST /api/compare/audio` | So user vs bài gốc hệ thống |
| `POST /api/compare/two-songs` | So hai file upload |

Service: `src/services/compareSong.service.js`  
Client: `compareSongService.js`, `SongAudioComparePanel` (chế độ không `chordPracticeMode`).

Cần cài dependency Python trong `compare-two-song` riêng — xem [README.md](./README.md).

---

## 15. Xử lý lỗi thường gặp

| Triệu chứng | Nguyên nhân | Cách xử lý |
|-------------|-------------|------------|
| `Missing App Check token` | Gọi cloud `chordmini.me` | `CHORDMINI_API_URL=http://localhost:5001` |
| `Không kết nối được ChordMini` | Container/Python chưa chạy | Chạy `start-chordmini-docker.ps1` |
| `ECONNREFUSED localhost:5001` | Sai cổng / firewall | `curl http://localhost:5001/api/model-info` |
| `dockerDesktopLinuxEngine` / 500 | Docker Engine chưa sẵn sàng | Mở Docker Desktop → Restart |
| `No module named 'DilatedTransformer'` | Thiếu Beat-Transformer | Chạy lại script Docker (tự clone) hoặc clone thủ công vào `models/` |
| `referenceSeq is not defined` | Bug server (đã sửa) | Dùng `referenceSeqBase.length` trong controller |
| Build Docker EOF / timeout | Docker treo | Restart Docker, build lại |
| Phân tích rất lâu | Lần đầu tải model | Chờ 2–5 phút; file ngắn nhanh hơn |
| `429` rate limit | Gọi cloud | Chuyển sang local |
| `madmom` lỗi trên Windows native | Thiếu compiler | Dùng **Docker** hoặc WSL |
| % khớp thấp, nhìn không trùng | UI hiện raw; so sánh đã căn tone | Đọc [mục 12](#12-cách-hiểu-kết-quả-so-sánh-hợp-âm) |
| 401 trên phân tích | Chưa đăng nhập | Login trước |

---

## 16. Tài liệu & link tham khảo

| Nội dung | Link |
|----------|------|
| API ChordMini (cloud docs, endpoint giống local) | https://www.chordmini.me/docs |
| Source ChordMiniApp | https://github.com/ptnghia-j/ChordMiniApp |
| Beat-Transformer model | https://github.com/ptnghia-j/beat-transformer-model |
| Chord-CNN-LSTM model | https://github.com/ptnghia-j/chord-cnn-lstm-model |
| HopAmChuan (nguồn bài chuẩn) | https://hopamchuan.com |

---

## Phụ lục — Checklist nhanh (copy khi dev)

```text
[ ] Docker Desktop — Engine running
[ ] curl http://localhost:5001/api/model-info → success
[ ] .env: CHORDMINI_API_URL=http://localhost:5001
[ ] my-guitar-server npm run dev (:4000)
[ ] my-guitar-client npm start (:3000)
[ ] Đăng nhập
[ ] Chọn bài HopAmChuan + upload audio
[ ] Phân tích → processing_info.engine === "chordmini"
```

---

*Tài liệu tạo cho dự án My Guitar — cập nhật theo kiến trúc ChordMini 100% + Docker cổng 5001.*
