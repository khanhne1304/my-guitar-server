# Hướng dẫn cài ChordMini (bắt buộc) cho My Guitar

Tính năng **Phân tích & so sánh hợp âm** gọi [ChordMini API](https://www.chordmini.me/docs) qua backend Python của [ChordMiniApp](https://github.com/ptnghia-j/ChordMiniApp).

> **Quan trọng:** Không dùng `https://www.chordmini.me` từ server My Guitar — API cloud yêu cầu **Firebase App Check** (`Missing App Check token`). Bạn phải chạy **ChordMini trên máy** tại `http://localhost:5001`.

---

## Kiến trúc

```
Trình duyệt (My Guitar Client)
    → my-guitar-server :4000  (/api/chord-practice/analyze)
        → ChordMini local :5001  (/api/recognize-chords)
    → So sánh với HopAmChuan
```

Cần **3 tiến trình** khi dev:

| # | Dịch vụ | Cổng | Lệnh |
|---|---------|------|------|
| 1 | ChordMini backend | **5001** | `python app.py` (trong `ChordMiniApp/python_backend`) |
| 2 | my-guitar-server | **4000** | `npm run dev` |
| 3 | my-guitar-client | **3000** | `npm start` |

---

## Bước 1 — Cài phần mềm nền

### Bắt buộc

- **Git**: https://git-scm.com/download/win  
- **Python 3.10.x** (khuyến nghị 3.10.16): https://www.python.org/downloads/  
  - Tick **“Add Python to PATH”** khi cài.
- **FFmpeg** (xử lý audio):  
  ```powershell
  winget install Gyan.FFmpeg
  ```
  Hoặc tải từ https://ffmpeg.org và thêm vào PATH.

### Chạy trên Windows (không mở Ubuntu)

Chọn **một** trong các cách — đều dùng **PowerShell**:

| Cách | Build Tools? | Ghi chú |
|------|----------------|---------|
| **B — Docker** | **Không** | Khuyến nghị nếu không muốn cài compiler |
| **A — Python 3.10 native** | **Có** (bắt buộc) | `madmom` phải biên dịch C trên Windows |
| **C — WSL2** | Không trên Windows | Compiler nằm trong Linux (Ubuntu) |
> **Không dùng Visual Studio Build Tools được không?**  
> **Có** — với ChordMini: dùng **Cách B (Docker)** hoặc **Cách C (WSL)**.  
> Cài Python trực tiếp trên Windows (**Cách A**) **không** bỏ qua được Build Tools vì PyPI không có sẵn wheel `madmom` cho Windows.

---

### Không Build Tools — dùng Docker (Cách B, khuyến nghị)

1. Cài [Docker Desktop](https://www.docker.com/products/docker-desktop/) và bật app (icon cá voi).

2. Script tự clone thêm **Beat-Transformer** và **Chord-CNN-LSTM** (submodule — thiếu sẽ lỗi `No module named 'DilatedTransformer'`).

3. Một lệnh (PowerShell) — map `localhost:5001` → container `:8080`:

```powershell
cd "d:\New folder\my-guitar-server"
powershell -ExecutionPolicy Bypass -File .\scripts\start-chordmini-docker.ps1
```

3. Kiểm tra:

```powershell
curl.exe http://localhost:5001/api/model-info
```

4. `.env` giữ nguyên `CHORDMINI_API_URL=http://localhost:5001`.

> Docker Desktop có thể dùng WSL2 **bên trong** — bạn **không** cần mở terminal Ubuntu hay cài Build Tools.

---

## Bước 2 — Clone và chạy ChordMini backend

### Cách A — Windows thuần (PowerShell) — **cần Visual Studio Build Tools**

Thư viện `madmom` trong ChordMini **bắt buộc biên dịch C** trên Windows. Cài trước:  
https://visualstudio.microsoft.com/visual-cpp-build-tools/ → **Desktop development with C++**.

**Tự động:**

```powershell
cd "d:\New folder\my-guitar-server"
powershell -ExecutionPolicy Bypass -File .\scripts\install-chordmini-windows.ps1
```

Script sẽ clone repo vào `%USERPROFILE%\ChordMiniApp`, tạo venv Python 3.10, cài dependencies (~15–30 phút, ~2–4 GB).

**Chạy backend mỗi lần dev:**

```powershell
cd "d:\New folder\my-guitar-server"
powershell -ExecutionPolicy Bypass -File .\scripts\start-chordmini-windows.ps1
```

Hoặc thủ công:

```powershell
cd $env:USERPROFILE\ChordMiniApp\python_backend
.\venv\Scripts\Activate.ps1
python app.py
```

Khi thấy `Starting Flask app on port 5001` và `App is ready to serve requests` là xong.

Kiểm tra:

```powershell
curl.exe http://localhost:5001/api/model-info
```

Phải trả JSON có `"success": true`.

> Biến `CHORDMINI_HOME` trỏ tới thư mục clone nếu bạn không dùng `%USERPROFILE%\ChordMiniApp`.

---

### Cách B — Docker Desktop (PowerShell, không cần Python trên Windows)

1. Cài [Docker Desktop](https://www.docker.com/products/docker-desktop/) — chỉ dùng PowerShell, không cần mở Ubuntu (Docker có thể dùng WSL2 nội bộ nhưng bạn không cần vào terminal Ubuntu).

2. Clone và chạy:

```powershell
cd $env:USERPROFILE
git clone https://github.com/ptnghia-j/ChordMiniApp.git
cd ChordMiniApp\python_backend
cd "d:\New folder\my-guitar-server"
powershell -ExecutionPolicy Bypass -File .\scripts\start-chordmini-docker.ps1
```

Hoặc thủ công (image expose cổng **8080** bên trong container):

```powershell
$env:CHORDMINI_HOME = "$env:USERPROFILE\ChordMiniApp"
cd "d:\New folder\my-guitar-server"
docker compose -f docker-compose.chordmini.yml up --build
```

Map: `localhost:5001` → container `:8080`.

---

### Cách C — WSL2 + Ubuntu (chỉ khi Cách A lỗi madmom)

1. Cài WSL2 + Ubuntu (PowerShell Admin):
   ```powershell
   wsl --install
   ```
   Khởi động lại máy, mở **Ubuntu**.

2. Trong Ubuntu:
   ```bash
   sudo apt update
   sudo apt install -y python3.10 python3.10-venv python3-pip git ffmpeg build-essential libsndfile1

   cd ~
   git clone https://github.com/ptnghia-j/ChordMiniApp.git
   cd ChordMiniApp/python_backend

   python3.10 -m venv venv
   source venv/bin/activate

   pip install --upgrade pip setuptools wheel
   pip install "Cython>=0.29.0" "numpy==1.26.4"
   pip install git+https://github.com/CPJKU/madmom
   pip install -r requirements.txt

   python app.py
   ```

3. Giữ terminal này mở. Khi thấy:
   ```text
   Starting Flask app on port 5001
   App is ready to serve requests
   ```
   là backend đã sẵn sàng.

4. Kiểm tra từ Windows (PowerShell):
   ```powershell
   curl.exe http://localhost:5001/api/model-info
   ```
   Phải trả JSON có `"success": true`.

> Lần đầu chạy có thể tải model ML — chờ vài phút.

---

## Bước 3 — Cấu hình My Guitar Server

Mở file `my-guitar-server/.env` (tạo mới nếu chưa có), thêm hoặc sửa:

```env
CHORDMINI_API_URL=http://localhost:5001
CHORDMINI_MODEL=chord-cnn-lstm

# KHÔNG đặt (gây lỗi App Check):
# CHORDMINI_API_URL=https://www.chordmini.me
```

Khởi động lại server:

```powershell
cd "d:\New folder\my-guitar-server"
npm run dev
```

---

## Bước 4 — Kiểm tra end-to-end

### 4.1 ChordMini nhận diện thử

Thay `duong-dan\ban-guitar.mp3` bằng file thật:

```powershell
curl.exe -X POST "http://localhost:5001/api/recognize-chords" `
  -F "file=@duong-dan\ban-guitar.mp3" `
  -F "model=chord-cnn-lstm"
```

Kết quả mong đợi: JSON có `"success": true` và mảng `"chords"`.

### 4.2 My Guitar client

1. Chạy client: `cd my-guitar-client` → `npm start`
2. **Đăng nhập** (API chord-practice yêu cầu auth)
3. Vào **Luyện tập guitar với AI** hoặc **Tìm hợp âm chuẩn** → chọn bài HopAmChuan
4. Tải / thu audio → **Phân tích & so sánh hợp âm**

Trong response, `processing_info.engine` phải là **`chordmini`**.

---

## Bước 5 — Thứ tự chạy hàng ngày (Windows)

1. **ChordMini** — cổng 5001  
   ```powershell
   powershell -ExecutionPolicy Bypass -File "d:\New folder\my-guitar-server\scripts\start-chordmini-windows.ps1"
   ```
   (hoặc Docker / WSL nếu bạn dùng Cách B/C)
2. **my-guitar-server** — cổng 4000: `npm run dev`
3. **my-guitar-client** — cổng 3000: `npm start`

---

## Xử lý lỗi thường gặp

| Lỗi | Nguyên nhân | Cách xử lý |
|-----|-------------|------------|
| `Missing App Check token` | Đang gọi API **cloud** | Đổi `CHORDMINI_API_URL=http://localhost:5001`, không dùng chordmini.me |
| `Không kết nối được ChordMini` | Backend chưa chạy | Chạy `python app.py` trong `python_backend` |
| `ECONNREFUSED localhost:5001` | Sai cổng / firewall | Kiểm tra `curl http://localhost:5001/api/model-info` |
| `500 Internal Server Error` / `dockerDesktopLinuxEngine` | Docker Engine chưa chạy hoặc treo | Mở Docker Desktop → đợi **Engine running** → **Restart Docker Desktop** → `docker ps` |
| `429` / rate limit | Gọi quá 2 lần/phút (cloud) | Dùng local — không giới hạn như cloud |
| Cài `madmom` lỗi trên Windows | Thiếu compiler | Cài **Visual Studio Build Tools (C++)**, chạy lại `install-chordmini-windows.ps1`, hoặc **Cách C (WSL2)** |
| Phân tích rất lâu | Lần đầu tải model | Chờ 2–5 phút; file ngắn &lt; 3 phút nhanh hơn |

---

## Giới hạn API (tham khảo)

Theo [tài liệu ChordMini](https://www.chordmini.me/docs):

- `/api/recognize-chords`: **2 request/phút** (chỉ áp dụng **cloud**)
- Local: phụ thuộc CPU/GPU máy bạn

---

## Tài liệu tham khảo

- API: https://www.chordmini.me/docs  
- Source: https://github.com/ptnghia-j/ChordMiniApp  
- Endpoint nhận diện: `POST /api/recognize-chords` (multipart: `file`, `model=chord-cnn-lstm`)
