# 🌿 PlantBot — Hệ Thống IoT Chăm Sóc Cây Tự Động

> Giám sát nhiệt độ, độ ẩm, độ ẩm đất real-time.  
> Điều khiển máy bơm nước & phun sương thủ công qua Dashboard.  
> Camera theo dõi cây trực tiếp.

---

## 📑 Mục lục

1. [Tổng quan hệ thống](#-tổng-quan-hệ-thống)
2. [Yêu cầu phần cứng](#-yêu-cầu-phần-cứng)
3. [Sơ đồ kết nối phần cứng](#-sơ-đồ-kết-nối-phần-cứng)
4. [Cài đặt phần mềm từ đầu (Windows 10/11)](#-cài-đặt-phần-mềm-từ-đầu-windows-1011)
5. [Clone & Cài đặt Project](#-clone--cài-đặt-project)
6. [Upload Firmware lên Arduino](#-upload-firmware-lên-arduino)
7. [Chạy hệ thống](#-chạy-hệ-thống)
8. [Truy cập Dashboard](#-truy-cập-dashboard)
9. [Cấu trúc thư mục](#-cấu-trúc-thư-mục)
10. [Cấu hình hệ thống](#️-cấu-hình-hệ-thống)
11. [API Endpoints](#-api-endpoints)
12. [Serial Protocol](#-serial-protocol)
13. [Troubleshooting — Xử lý lỗi thường gặp](#-troubleshooting--xử-lý-lỗi-thường-gặp)

---

## 🔭 Tổng quan hệ thống

PlantBot là hệ thống IoT 3 tầng:

```
┌──────────────┐      USB Serial      ┌──────────────────┐      HTTP/WS      ┌──────────────────┐
│   FIRMWARE   │◄────────────────────►│     BACKEND      │◄──────────────────►│    FRONTEND      │
│  Arduino     │   JSON + Commands    │  FastAPI Python   │   REST + WebSocket│  React Vite      │
│              │                      │                  │                    │                  │
│ • DHT22      │                      │ • Serial Service │                    │ • Dashboard      │
│ • Soil Moist │                      │ • CSV Storage    │                    │ • Sensor Cards   │
│ • 2x Relay   │                      │ • Camera Stream  │                    │ • Biểu đồ       │
│              │                      │ • WebSocket      │                    │ • Pump Controls  │
└──────────────┘                      └──────────────────┘                    │ • Camera View    │
                                                                              └──────────────────┘
```

| Tầng | Công nghệ | Vai trò |
|------|-----------|---------|
| **Firmware** | Arduino C++ | Đọc cảm biến, điều khiển relay, giao tiếp Serial |
| **Backend** | Python 3.12 + FastAPI | Xử lý logic, lưu dữ liệu CSV, stream camera, cung cấp API |
| **Frontend** | React 19 + Vite | Dashboard UI real-time, điều khiển thủ công, xem camera |

---

## 🔩 Yêu cầu phần cứng

| Linh kiện | Số lượng | Ghi chú |
|-----------|----------|---------|
| Arduino Nano/Uno (hoặc tương thích) | 1 | Chip CH340 hoặc FTDI |
| Cảm biến DHT22 | 1 | Đo nhiệt độ + độ ẩm không khí |
| Cảm biến Capacitive Soil Moisture v1.2 | 1 | Đo độ ẩm đất (dùng loại capacitive, KHÔNG dùng resistive) |
| Module Relay 5V (1 kênh hoặc 2 kênh) | 2 | Điều khiển máy bơm & phun sương |
| Máy bơm nước mini 3-6V | 1 | Bơm tưới cây |
| Module phun sương (hoặc máy bơm thứ 2) | 1 | Tạo sương tăng độ ẩm |
| Dây jumper đực-cái | ~15 sợi | Kết nối các linh kiện |
| Breadboard | 1 | Tùy chọn — để test |
| Cáp USB Mini-B hoặc Micro-B | 1 | Kết nối Arduino với máy tính |
| Webcam USB hoặc Laptop có camera | 1-2 | Giám sát cây (tùy chọn) |
| Nguồn 5V (adapter hoặc USB) | 1 | Cấp nguồn cho relay + bơm |

---

## 🔌 Sơ đồ kết nối phần cứng

```
                         ┌─────────────────────────────┐
                         │        ARDUINO NANO          │
                         │                             │
    ┌──────────┐         │  D4  ◄── DHT22 (Data)       │
    │  DHT22   │────────►│  5V  ─── DHT22 (VCC)       │
    │          │         │  GND ─── DHT22 (GND)       │
    └──────────┘         │                             │
                         │  A0  ◄── Soil Sensor (AOUT) │
    ┌──────────────┐     │  5V  ─── Soil Sensor (VCC)  │
    │ Soil Moisture│────►│  GND ─── Soil Sensor (GND)  │
    │ Capacitive   │     │                             │
    └──────────────┘     │  D5  ──► Relay 1 (IN)       │
                         │  5V  ─── Relay 1 (VCC)      │
    ┌──────────┐         │  GND ─── Relay 1 (GND)      │
    │ Relay 1  │◄────────│         Relay 1 → Máy bơm   │
    │ (Bơm)    │         │                             │
    └──────────┘         │  D6  ──► Relay 2 (IN)       │
                         │  5V  ─── Relay 2 (VCC)      │
    ┌──────────┐         │  GND ─── Relay 2 (GND)      │
    │ Relay 2  │◄────────│         Relay 2 → Phun sương │
    │ (Sương)  │         │                             │
    └──────────┘         │  USB ──► Máy tính (Serial)  │
                         └─────────────────────────────┘
```

### Bảng chân kết nối chi tiết

| Chân Arduino | Kết nối tới | Ghi chú |
|-------------|-------------|---------|
| `D4` | DHT22 — chân Data | Cần điện trở pull-up 4.7kΩ (một số module DHT22 đã có sẵn) |
| `A0` | Capacitive Soil Moisture — chân AOUT | Tín hiệu analog 0-1023 |
| `D5` | Relay Module 1 — chân IN | Điều khiển máy bơm nước |
| `D6` | Relay Module 2 — chân IN | Điều khiển phun sương |
| `5V` | VCC của tất cả module | Nguồn 5V chung |
| `GND` | GND của tất cả module | Mass chung |
| `USB` | Máy tính (cáp USB) | Giao tiếp Serial 9600 baud |

> ⚠️ **Lưu ý nguồn điện:** Nếu chạy cả 2 bơm cùng lúc, Arduino không đủ nguồn qua USB. Nên dùng nguồn ngoài 5V riêng cho relay + bơm, chỉ nối chung GND với Arduino.

---

## 💻 Cài đặt phần mềm từ đầu (Windows 10/11)

> Hướng dẫn này dành cho máy tính **mới cài Windows**, chưa có bất kỳ phần mềm lập trình nào.

### Bước 1: Cài đặt Git

Git dùng để clone (tải) source code về máy.

1. Truy cập: https://git-scm.com/downloads/win
2. Tải bản **64-bit Git for Windows Setup**
3. Chạy file `.exe` vừa tải
4. Trong quá trình cài đặt:
   - Giữ nguyên tất cả tùy chọn mặc định
   - Nhấn **Next** cho đến khi **Install**
5. Xác nhận cài thành công — mở **PowerShell** (nhấn `Win + X` → chọn **Terminal** hoặc **Windows PowerShell**):
   ```powershell
   git --version
   # Kết quả mong đợi: git version 2.x.x
   ```

---

### Bước 2: Cài đặt Python 3.12+

1. Truy cập: https://www.python.org/downloads/
2. Tải phiên bản **Python 3.12.x** (hoặc mới hơn) — nhấn nút vàng **Download Python 3.12.x**
3. Chạy file `.exe` vừa tải
4. **⚠️ QUAN TRỌNG:** Ở màn hình đầu tiên, **TICK vào ô "Add python.exe to PATH"** (phía dưới cùng)
5. Nhấn **Install Now**
6. Đợi cài xong → nhấn **Close**
7. **Đóng và mở lại PowerShell** (bắt buộc để nhận PATH mới), rồi xác nhận:
   ```powershell
   python --version
   # Kết quả mong đợi: Python 3.12.x

   pip --version
   # Kết quả mong đợi: pip 24.x.x from ...
   ```

> ℹ️ Nếu lệnh `python` không nhận, thử `python3` hoặc mở lại **Settings → Apps → App execution aliases** và tắt "App Installer" cho python.exe / python3.exe.

---

### Bước 3: Cài đặt uv (Python Package Manager)

`uv` là trình quản lý package Python siêu nhanh (thay thế pip + venv). Project này dùng `uv`.

1. Mở PowerShell **với quyền Administrator** (nhấn `Win + X` → **Terminal (Admin)**):
   ```powershell
   powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
   ```
2. **Đóng và mở lại PowerShell**, rồi xác nhận:
   ```powershell
   uv --version
   # Kết quả mong đợi: uv 0.x.x
   ```

---

### Bước 4: Cài đặt Node.js 18+ (cho Frontend)

1. Truy cập: https://nodejs.org/
2. Tải bản **LTS** (Long Term Support) — nút xanh lá bên trái
3. Chạy file `.msi` vừa tải
4. Trong quá trình cài:
   - Giữ nguyên mặc định
   - ✅ Tick **"Automatically install the necessary tools"** nếu xuất hiện
   - Nhấn **Next** → **Install**
5. **Đóng và mở lại PowerShell**, rồi xác nhận:
   ```powershell
   node --version
   # Kết quả mong đợi: v18.x.x hoặc v20.x.x hoặc v22.x.x

   npm --version
   # Kết quả mong đợi: 9.x.x hoặc 10.x.x
   ```

---

### Bước 5: Cài đặt Arduino IDE

1. Truy cập: https://www.arduino.cc/en/software
2. Tải **Arduino IDE 2.x** cho Windows (bản `.exe` hoặc `.msi`)
3. Cài đặt bình thường (Next → Install)
4. Mở Arduino IDE lần đầu — nó sẽ tự tải các components cần thiết

---

### Bước 6: Cài Driver USB cho Arduino (CH340/CH341)

> Arduino Nano clone (và nhiều board clone khác) dùng chip USB-to-Serial **CH340** hoặc **CH341**. Windows 10/11 thường **đã có sẵn driver**, nhưng nếu không nhận board thì cài thủ công.

**Kiểm tra trước:**
1. Cắm Arduino vào máy tính qua USB
2. Mở **Device Manager** (nhấn `Win + X` → **Device Manager**)
3. Tìm mục **Ports (COM & LPT)**:
   - ✅ Nếu thấy **"USB-SERIAL CH340 (COMx)"** → Driver OK, không cần cài thêm
   - ❌ Nếu thấy dấu chấm than vàng ⚠️ hoặc không thấy → Cần cài driver

**Cài driver CH340 (nếu cần):**
1. Truy cập: https://www.wch-ic.com/downloads/CH341SER_EXE.html
2. Tải file **CH341SER.EXE**
3. Chạy file → nhấn **Install**
4. Rút và cắm lại Arduino → kiểm tra Device Manager

**Ghi nhớ COM port** (ví dụ: COM3, COM7, ...) — sẽ cần khi verify.

---

## 📦 Clone & Cài đặt Project

### Bước 1: Clone source code

Mở PowerShell, điều hướng đến thư mục muốn lưu project:

```powershell
# Ví dụ: lưu ở Desktop
cd ~\Desktop

# Clone project
git clone https://github.com/haianh06/PlantBot.git

# Vào thư mục project
cd PlantBot
```

> Hoặc nếu đã có sẵn source code, mở PowerShell và `cd` đến thư mục project.

---

### Bước 2: Cài đặt Backend (Python)

```powershell
# Đảm bảo đang ở thư mục gốc PlantBot/
cd c:\đường\dẫn\tới\PlantBot

# Tạo virtual environment Python
uv venv

# Kích hoạt virtual environment
.\.venv\Scripts\Activate.ps1
```

> ⚠️ Nếu gặp lỗi **"cannot be loaded because running scripts is disabled"**, chạy lệnh sau **1 lần duy nhất** rồi thử lại:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

Tiếp tục cài dependencies:

```powershell
# Cài tất cả packages Python cần thiết
uv pip install fastapi "uvicorn[standard]" pyserial opencv-python pydantic pydantic-settings websockets
```

Xác nhận cài thành công:

```powershell
python -c "import fastapi; import serial; import cv2; print('All packages OK')"
# Kết quả mong đợi: All packages OK
```

---

### Bước 3: Cài đặt Frontend (React)

```powershell
# Từ thư mục gốc PlantBot, vào frontend
cd frontend

# Cài tất cả npm packages
npm install

# Quay lại thư mục gốc
cd ..
```

Xác nhận:

```powershell
cd frontend
npm run build
# Kết quả mong đợi: ✓ built in xxxms (không có error)
cd ..
```

---

## 🔧 Upload Firmware lên Arduino

### Bước 1: Cài thư viện Arduino

1. Mở **Arduino IDE**
2. Vào menu **Sketch → Include Library → Manage Libraries...** (hoặc nhấn `Ctrl + Shift + I`)
3. Tìm và cài 2 thư viện sau:

| Tên thư viện | Tác giả | Phiên bản |
|-------------|---------|-----------|
| **DHT sensor library** | Adafruit | Latest |
| **Adafruit Unified Sensor** | Adafruit | Latest |

> Gõ "DHT" vào ô tìm kiếm → tìm "DHT sensor library" by Adafruit → nhấn **Install**.  
> Khi được hỏi "Install all dependencies?" → chọn **Install all** (sẽ tự cài Adafruit Unified Sensor).

### Bước 2: Cấu hình Board

1. Cắm Arduino vào máy tính qua USB
2. Trong Arduino IDE:
   - **Tools → Board** → chọn board phù hợp:
     - Arduino Nano: `Arduino Nano`
     - Arduino Uno: `Arduino Uno`
   - **Tools → Processor** (chỉ với Nano):
     - Nếu dùng Nano clone CH340: chọn `ATmega328P (Old Bootloader)`
     - Nếu dùng Nano chính hãng: chọn `ATmega328P`
   - **Tools → Port** → chọn COM port đã ghi nhớ (ví dụ: `COM7`)

### Bước 3: Mở và Upload code

1. Trong Arduino IDE, vào **File → Open**
2. Điều hướng đến: `PlantBot/firmware/src/main.ino` → nhấn **Open**

> ⚠️ Arduino IDE sẽ hỏi "main.ino" cần nằm trong folder "main". Nhấn **OK** — IDE sẽ tự tạo folder.  
> **HOẶC** copy thủ công toàn bộ nội dung `firmware/src/` vào một folder duy nhất trước khi mở.

3. **Copy thêm file thư viện** vào cùng folder với `main.ino`:
   - `firmware/src/SoilSensor.h`
   - `firmware/src/SoilSensor.cpp`
   - `firmware/lib/MyIrrigationPump/MyIrrigationPump.h`
   - `firmware/lib/MyIrrigationPump/MyIrrigationPump.cpp`

   Hoặc đơn giản hơn — copy tất cả vào 1 folder:
   ```powershell
   # Tạo folder tạm cho Arduino IDE
   mkdir ~\Documents\Arduino\PlantBot_Firmware -Force
   
   # Copy tất cả firmware files vào 1 nơi
   Copy-Item firmware\src\* ~\Documents\Arduino\PlantBot_Firmware\
   Copy-Item firmware\lib\MyIrrigationPump\* ~\Documents\Arduino\PlantBot_Firmware\
   
   # Đổi tên main.ino thành PlantBot_Firmware.ino (Arduino yêu cầu tên file = tên folder)
   Rename-Item ~\Documents\Arduino\PlantBot_Firmware\main.ino PlantBot_Firmware.ino
   ```
   Sau đó mở `~\Documents\Arduino\PlantBot_Firmware\PlantBot_Firmware.ino` trong Arduino IDE.

4. Nhấn nút **Upload** (mũi tên →) hoặc `Ctrl + U`
5. Đợi: `Done uploading.` → Firmware đã upload thành công

### Bước 4: Kiểm tra Firmware

1. Mở **Serial Monitor** trong Arduino IDE: **Tools → Serial Monitor** (hoặc `Ctrl + Shift + M`)
2. Chọn baudrate **9600** (góc dưới phải)
3. Bạn sẽ thấy dữ liệu JSON mỗi 2 giây:
   ```json
   {"temp":28.5,"humi":65.2,"soil":42,"pump":0,"mist":0}
   ```
4. Thử gửi lệnh (gõ vào ô trên cùng + nhấn Send):
   - Gửi `PUMP_ON` → giá trị `pump` chuyển thành `1`
   - Gửi `PUMP_OFF` → giá trị `pump` chuyển lại `0`

> ✅ Nếu thấy JSON data và lệnh hoạt động → Firmware OK!  
> ❌ Nếu thấy ký tự lạ → Kiểm tra baudrate (phải là 9600).  
> ❌ Nếu `temp:-1, humi:-1` → Kiểm tra kết nối DHT22 (chân D4).

**⚠️ QUAN TRỌNG:** Sau khi test xong, **ĐÓNG Serial Monitor** trước khi chạy Backend. Không thể có 2 chương trình cùng mở 1 COM port.

---

## 🚀 Chạy hệ thống

### Cách 1: One-Click (khuyên dùng) 🌟

Chỉ cần 1 lệnh duy nhất để chạy cả Backend + Frontend:

```powershell
# Đảm bảo đang ở thư mục gốc PlantBot
cd c:\đường\dẫn\tới\PlantBot

# Chạy hệ thống
.\start.ps1
```

Script sẽ tự động:
1. ✅ Kiểm tra môi trường (.venv, node_modules)
2. ✅ Kích hoạt Python virtual environment
3. ✅ Khởi chạy Backend (FastAPI) trên port `8000`
4. ✅ Khởi chạy Frontend (React Vite) trên port `5173`
5. ✅ Hiển thị URL truy cập

Để **dừng hệ thống**: nhấn `Ctrl + C` trong terminal.

---

### Cách 2: Chạy thủ công (2 terminal riêng)

Nếu muốn xem log riêng biệt hoặc debug:

**Terminal 1 — Backend:**
```powershell
cd c:\đường\dẫn\tới\PlantBot
.\.venv\Scripts\Activate.ps1
python main.py
```

Bạn sẽ thấy log khởi động:
```
🌿 PlantBot Backend đang khởi động...
✅ CSV Service sẵn sàng
✅ Arduino kết nối tại COM7
✅ Camera Service sẵn sàng
🌿 PlantBot Backend đã sẵn sàng!
   📡 Serial: Online
   📁 CSV: data/sensor_data.csv
```

**Terminal 2 — Frontend:**
```powershell
cd c:\đường\dẫn\tới\PlantBot\frontend
npm run dev
```

Bạn sẽ thấy:
```
VITE v8.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

---

## 🌐 Truy cập Dashboard

Mở trình duyệt (Chrome/Edge/Firefox) và truy cập:

| URL | Mô tả |
|-----|--------|
| **http://localhost:5173** | 🖥️ Dashboard chính — giao diện điều khiển |
| **http://localhost:8000/docs** | 📚 Swagger UI — tài liệu API tương tác |
| **http://localhost:8000** | 🔧 Backend API — health check |

### Giao diện Dashboard

```
┌────────────────────────────────────────────────────────────────┐
│  🌿 PlantBot  ● Live                            [📥 Export CSV]│
├───────────┬────────────────────────────────────────────────────┤
│           │                                                    │
│ SIDEBAR   │  📷 CAMERA GIÁM SÁT          [🔘 Cam1] [🔘 Cam2] │
│           │  ┌────────────────────────────────────────┐        │
│ 📡 KẾT NỐI│  │           Live Camera Feed             │        │
│ COM7      │  └────────────────────────────────────────┘        │
│ 9600 baud │                                                    │
│ ● Online  │  ┌─────────┐ ┌─────────┐ ┌─────────┐             │
│           │  │ 🌡 28.5°C│ │ 💧 65.2%│ │ 🌱 42%  │             │
│ ──────────│  └─────────┘ └─────────┘ └─────────┘             │
│ ⚙️ CALIB. │                                                    │
│ KHÔ: 520 │  ┌──────────────────────────────────────┐          │
│ ƯỚT: 260 │  │  📊 BIỂU ĐỒ CẢM BIẾN (Real-time)    │          │
│ [Lưu]    │  └──────────────────────────────────────┘          │
│           │                                                    │
│           │  ┌───────────────┐  ┌───────────────┐             │
│           │  │ 💧 MÁY BƠM    │  │ 🌫️ PHUN SƯƠNG  │             │
│           │  │  ● Đang tắt   │  │  ● Đang tắt   │             │
│           │  │  [BẬT BƠM]    │  │  [BẬT SƯƠNG]  │             │
│           │  └───────────────┘  └───────────────┘             │
└───────────┴────────────────────────────────────────────────────┘
```

---

## 📁 Cấu trúc thư mục

```
PlantBot/
│
├── firmware/                              # 🔧 Arduino Firmware (C++)
│   ├── src/
│   │   ├── main.ino                       #    Entry point — setup() + loop()
│   │   ├── SoilSensor.h                   #    Header cảm biến độ ẩm đất
│   │   └── SoilSensor.cpp                 #    Logic đọc ADC → phần trăm
│   └── lib/
│       └── MyIrrigationPump/
│           ├── MyIrrigationPump.h          #    Header relay controller
│           └── MyIrrigationPump.cpp        #    Logic on/off/toggle relay
│
├── backend/                               # 🐍 FastAPI Backend (Python)
│   └── app/
│       ├── __init__.py                    #    Package init
│       ├── main.py                        #    FastAPI app + lifecycle
│       ├── config.py                      #    Cấu hình + settings.json loader
│       ├── models.py                      #    Pydantic request/response schemas
│       ├── api/                           #    API Routes
│       │   ├── __init__.py
│       │   ├── sensor_routes.py           #      GET/WS sensors data
│       │   ├── pump_routes.py             #      POST pump/mist control
│       │   ├── camera_routes.py           #      GET MJPEG stream
│       │   └── system_routes.py           #      GET system info + calibration
│       ├── services/                      #    Business Logic
│       │   ├── __init__.py
│       │   ├── serial_service.py          #      Giao tiếp Serial USB
│       │   ├── csv_service.py             #      Lưu/đọc dữ liệu CSV
│       │   ├── camera_service.py          #      OpenCV multi-camera
│       │   └── automation.py              #      Placeholder (phase sau)
│       └── utils/
│           ├── __init__.py
│           └── time_helper.py             #      Timestamp helpers
│
├── frontend/                              # ⚛️ React Vite Frontend
│   ├── index.html                         #    HTML entry + Google Fonts
│   ├── vite.config.js                     #    Vite config + API proxy
│   ├── package.json                       #    npm dependencies
│   └── src/
│       ├── main.jsx                       #    React entry point
│       ├── App.jsx                        #    Root component + layout
│       ├── App.css                        #    Design system (CSS variables)
│       ├── api/
│       │   └── client.js                  #    API client (fetch + WebSocket)
│       ├── hooks/
│       │   ├── useSensorData.js           #    WebSocket real-time hook
│       │   ├── usePumpControl.js          #    Pump toggle hook
│       │   ├── useCamera.js               #    Multi-camera hook
│       │   └── useSystemInfo.js           #    System info polling hook
│       ├── components/
│       │   ├── Camera/
│       │   │   ├── CameraView.jsx         #    Camera viewer (1-2 cam)
│       │   │   └── CameraView.css
│       │   ├── Dashboard/
│       │   │   ├── Dashboard.jsx          #    Dashboard container
│       │   │   ├── Dashboard.css
│       │   │   ├── SensorCard.jsx         #    Metric card (glassmorphism)
│       │   │   ├── SensorCard.css
│       │   │   ├── SensorChart.jsx        #    Recharts area chart
│       │   │   └── SensorChart.css
│       │   ├── Controls/
│       │   │   ├── PumpControl.jsx        #    Pump/mist toggle buttons
│       │   │   └── PumpControl.css
│       │   ├── Sidebar/
│       │   │   ├── Sidebar.jsx            #    Sidebar container
│       │   │   ├── Sidebar.css
│       │   │   └── ConnectionInfo.jsx     #    Serial connection info
│       │   ├── Settings/
│       │   │   ├── CalibrationPanel.jsx   #    Soil calibration UI
│       │   │   └── CalibrationPanel.css
│       │   └── common/
│       │       ├── StatusBadge.jsx        #    Online/offline badge
│       │       ├── StatusBadge.css
│       │       ├── ToggleSwitch.jsx       #    Toggle switch component
│       │       └── ToggleSwitch.css
│       └── utils/
│           └── formatters.js              #    Format temp, %, time
│
├── data/                                  # 📊 Dữ liệu CSV
│   ├── .gitkeep
│   └── sensor_data.csv                    #    Auto-generated khi chạy
│
├── main.py                                # 🚀 Entry point Backend
├── start.ps1                              # ⚡ One-click startup script
├── settings.json                          # ⚙️ Runtime config (calibration)
├── pyproject.toml                         # 📦 Python project metadata
├── .gitignore                             # 🙈 Git ignore rules
└── README.md                              # 📖 File này
```

---

## ⚙️ Cấu hình hệ thống

### File `settings.json`

Chứa các thông số runtime — được lưu lại giữa các lần chạy:

```json
{
    "serial": {
        "port": "auto",
        "baudrate": 9600
    },
    "sensor_calibration": {
        "soil_moisture_dry": 520,
        "soil_moisture_wet": 260
    },
    "camera": {
        "indices": [0],
        "default_index": 0
    },
    "data": {
        "csv_file_path": "data/sensor_data.csv",
        "sensor_read_interval": 2.0
    }
}
```

| Mục | Trường | Mô tả | Giá trị mặc định |
|-----|--------|--------|-------------------|
| `serial.port` | Cổng COM | `"auto"` = tự detect, hoặc `"COM3"` | `"auto"` |
| `serial.baudrate` | Tốc độ Serial | Phải khớp với firmware | `9600` |
| `sensor_calibration.soil_moisture_dry` | ADC khi đất KHÔ | Calibrate bằng cách đọc raw value khi đất khô | `520` |
| `sensor_calibration.soil_moisture_wet` | ADC khi đất ƯỚT | Calibrate bằng cách đọc raw value khi đất ngập nước | `260` |
| `camera.indices` | Danh sách camera | `[0]` = laptop cam, `[0, 1]` = laptop + USB | `[0]` |
| `data.csv_file_path` | Đường dẫn CSV | Tương đối từ thư mục gốc project | `"data/sensor_data.csv"` |

> 💡 **Calibration cảm biến đất**: Có thể chỉnh trực tiếp từ Dashboard (Sidebar → ⚙️ Calibration → nhập giá trị → Lưu). Không cần sửa file thủ công.

### Cách calibrate cảm biến đất

1. Mở Arduino IDE Serial Monitor (9600 baud)
2. Quan sát giá trị `soil` khi cảm biến trong **không khí** (khô) → ghi lại (ví dụ: 520)
3. Nhúng cảm biến vào **cốc nước** (ướt) → ghi lại (ví dụ: 260)
4. Nhập 2 giá trị vào Dashboard hoặc `settings.json`

---

## 📡 API Endpoints

### Sensors

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| `GET` | `/api/sensors/current` | Dữ liệu cảm biến mới nhất |
| `GET` | `/api/sensors/history?limit=50` | Lịch sử từ CSV (N bản ghi cuối) |
| `GET` | `/api/sensors/export` | Download file CSV |
| `WebSocket` | `/api/sensors/ws` | Stream real-time sensor data |

### Pump Control

| Method | Endpoint | Body | Mô tả |
|--------|----------|------|--------|
| `POST` | `/api/pump/control` | `{"device":"pump","action":"on"}` | Bật/tắt bơm hoặc sương |
| `GET` | `/api/pump/status` | — | Trạng thái relay hiện tại |

### Camera

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| `GET` | `/api/camera/stream/{index}` | MJPEG video stream |
| `POST` | `/api/camera/toggle/{index}` | Bật/tắt camera |
| `GET` | `/api/camera/status` | Trạng thái tất cả camera |
| `GET` | `/api/camera/list` | Danh sách camera khả dụng |

### System

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| `GET` | `/api/system/info` | Thông tin Serial + connection |
| `GET` | `/api/system/ports` | Danh sách COM port |
| `POST` | `/api/system/connect` | Kết nối/reconnect Arduino |
| `POST` | `/api/system/disconnect` | Ngắt kết nối |
| `GET` | `/api/system/calibration` | Lấy thông số calibration |
| `POST` | `/api/system/calibration` | Cập nhật calibration |

> 📚 Xem tài liệu API tương tác (có nút Try it out): **http://localhost:8000/docs**

---

## 📟 Serial Protocol

### Arduino → PC (mỗi 2 giây)

```json
{"temp":28.5,"humi":65.2,"soil":42,"pump":0,"mist":0}
```

| Trường | Kiểu | Đơn vị | Mô tả |
|--------|------|--------|--------|
| `temp` | float | °C | Nhiệt độ không khí (DHT22). `-1` nếu lỗi đọc |
| `humi` | float | % | Độ ẩm không khí (DHT22). `-1` nếu lỗi đọc |
| `soil` | int | % | Độ ẩm đất (0% = khô, 100% = ướt) |
| `pump` | int | — | Trạng thái relay bơm: `0` = tắt, `1` = bật |
| `mist` | int | — | Trạng thái relay sương: `0` = tắt, `1` = bật |

### PC → Arduino (lệnh điều khiển)

| Lệnh | Chức năng |
|-------|-----------|
| `PUMP_ON\n` | Bật relay máy bơm nước (D5) |
| `PUMP_OFF\n` | Tắt relay máy bơm nước (D5) |
| `MIST_ON\n` | Bật relay phun sương (D6) |
| `MIST_OFF\n` | Tắt relay phun sương (D6) |
| `STATUS\n` | Yêu cầu gửi dữ liệu ngay lập tức |

> Mỗi lệnh kết thúc bằng ký tự newline `\n`. Baudrate: **9600**.

---

## 🔍 Troubleshooting — Xử lý lỗi thường gặp

### ❌ "Không tìm thấy Arduino trên bất kỳ COM port nào"

| Nguyên nhân | Giải pháp |
|-------------|-----------|
| Chưa cắm USB | Cắm cáp USB Arduino vào máy tính |
| Thiếu driver CH340 | Cài driver CH340 (xem [Bước 6](#bước-6-cài-driver-usb-cho-arduino-ch340ch341)) |
| Arduino IDE Serial Monitor đang mở | **Đóng Serial Monitor** — chỉ 1 chương trình được dùng COM port tại 1 thời điểm |
| Cáp USB hỏng | Thử cáp USB khác (đảm bảo cáp có dây data, không phải cáp sạc) |

---

### ❌ "running scripts is disabled on this system"

Lỗi khi chạy `.ps1` script hoặc activate venv:

```powershell
# Chạy 1 lần duy nhất với quyền user hiện tại
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# Nhấn Y để xác nhận
```

---

### ❌ "python/node/npm/uv không phải lệnh hợp lệ"

| Nguyên nhân | Giải pháp |
|-------------|-----------|
| Chưa cài phần mềm | Cài theo hướng dẫn [Bước 2-4](#bước-2-cài-đặt-python-312) |
| Chưa restart terminal | **Đóng và mở lại PowerShell** sau khi cài |
| Chưa thêm vào PATH | Python: cài lại, tick "Add to PATH". Node: cài lại bản MSI |

---

### ❌ "temp:-1, humi:-1" trong Serial Monitor

| Nguyên nhân | Giải pháp |
|-------------|-----------|
| DHT22 chưa kết nối | Kiểm tra dây: Data→D4, VCC→5V, GND→GND |
| Thiếu điện trở pull-up | Thêm điện trở 4.7kΩ giữa Data và VCC (một số module đã có sẵn) |
| Cảm biến hỏng | Thử module DHT22 khác |

---

### ❌ Dashboard hiển thị "--" cho tất cả thông số

| Nguyên nhân | Giải pháp |
|-------------|-----------|
| Backend chưa chạy | Chạy `python main.py` ở terminal riêng |
| Arduino chưa cắm | Cắm Arduino → Backend auto-detect |
| Sidebar hiện "Offline" | Nhấn nút "Kết nối lại" trong Sidebar |

---

### ❌ Camera không hiển thị

| Nguyên nhân | Giải pháp |
|-------------|-----------|
| Chưa bật toggle | Bật toggle "Cam 1" trong phần Camera |
| Camera đang bị app khác dùng | Đóng Zoom/Teams/Discord... nếu đang dùng camera |
| Không có camera | Hệ thống vẫn hoạt động bình thường mà không có camera |

---

### ❌ Frontend không kết nối được Backend

| Nguyên nhân | Giải pháp |
|-------------|-----------|
| Backend chưa chạy | Chạy backend trước, đợi log "sẵn sàng", rồi mới mở frontend |
| Port 8000 bị chiếm | Kiểm tra: `netstat -ano | findstr :8000`. Nếu có process → kill hoặc đổi port |
| Proxy chưa hoạt động | Đảm bảo `vite.config.js` có proxy config cho `/api` → `localhost:8000` |

---

### ❌ "Address already in use" khi chạy backend

Port 8000 đang bị chiếm bởi process khác:

```powershell
# Tìm process đang dùng port 8000
netstat -ano | findstr :8000

# Kill process theo PID (số cuối cùng trong kết quả trên)
taskkill /PID <PID> /F

# Chạy lại backend
python main.py
```

---

### ❌ Dữ liệu CSV trống / không export được

| Nguyên nhân | Giải pháp |
|-------------|-----------|
| Chưa có dữ liệu | Đợi Arduino gửi data (mỗi 2 giây) — CSV tự tạo khi có data đầu tiên |
| File bị lock | Đóng file CSV nếu đang mở trong Excel |

---

## 📜 License

MIT License — tự do sử dụng, chỉnh sửa, phân phối.