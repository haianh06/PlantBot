# 🌿 PlantBot — Hệ Thống IoT Chăm Sóc Cây Tự Động

> Giám sát nhiệt độ, độ ẩm, độ ẩm đất real-time.  
> Điều khiển máy bơm nước, phun sương, quạt gió & đèn quang hợp qua Dashboard.  
> Xem camera giám sát trực tiếp (Multi-Camera Stream) và truy cập từ xa qua Tailscale/LAN.

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

PlantBot là hệ thống IoT 3 tầng tích hợp:

```
┌──────────────┐      USB Serial      ┌──────────────────┐      HTTP/WS      ┌──────────────────┐
│   FIRMWARE   │◄────────────────────►│     BACKEND      │◄──────────────────►│    FRONTEND      │
│  Arduino     │   JSON + Commands    │  FastAPI Python   │   REST + WebSocket│  React Vite      │
│              │                      │                  │                    │                  │
│ • DHT22      │                      │ • Serial Service │                    │ • Dashboard      │
│ • Soil Moist │                      │ • CSV Storage    │                    │ • Sensor Cards   │
│ • 4x Relay   │                      │ • Camera Stream  │                    │ • Biểu đồ       │
│              │                      │ • WebSocket      │                    │ • 4x Device Cards│
└──────────────┘                      └──────────────────┘                    │ • Camera View    │
                                                                              └──────────────────┘
```

| Tầng | Công nghệ | Vai trò |
|------|-----------|---------|
| **Firmware** | Arduino C++ | Đọc cảm biến DHT22 + độ ẩm đất, điều khiển 4 relay, giao tiếp Serial |
| **Backend** | Python 3.12 + FastAPI | Quản lý kết nối Serial, lưu dữ liệu CSV, stream camera qua OpenCV, cung cấp API |
| **Frontend** | React 19 + Vite | Giao diện điều khiển thời gian thực, hiển thị biểu đồ và camera, hỗ trợ Tailscale/LAN |

---

## 🔩 Yêu cầu phần cứng

| Linh kiện | Số lượng | Ghi chú |
|-----------|----------|---------|
| Arduino Nano/Uno (hoặc tương thích) | 1 | Chip giao tiếp CH340 hoặc FTDI |
| Cảm biến DHT22 | 1 | Đo nhiệt độ + độ ẩm không khí |
| Cảm biến Capacitive Soil Moisture v1.2 | 1 | Đo độ ẩm đất (loại điện dung chống ăn mòn) |
| Module Relay 5V | 4 | Điều khiển 4 thiết bị độc lập |
| Máy bơm nước mini 3-6V | 1 | Bơm tưới cây chính |
| Module phun sương (hoặc máy bơm thứ 2) | 1 | Tạo sương làm ẩm không khí |
| Quạt gió mini 5V | 1 | Lưu thông không khí và hạ nhiệt |
| Đèn LED quang hợp | 1 | Hỗ trợ ánh sáng cho cây |
| Dây jumper đực-cái / đực-đực | ~20 sợi | Kết nối các linh kiện |
| Breadboard | 1 | Sử dụng để phân phối nguồn điện |
| Cáp USB Mini-B hoặc Micro-B | 1 | Kết nối Arduino với máy tính |
| Webcam USB hoặc Laptop có camera | 1-2 | Giám sát cây trực quan |
| Nguồn cấp ngoài 5V (2A trở lên) | 1 | Cấp nguồn riêng cho các relay và động cơ |

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
    └──────────────┘     │  D5  ──► Relay 1 (IN) ─── Bơm tưới
                          │  D6  ──► Relay 2 (IN) ─── Phun sương
    ┌──────────┐         │  D7  ──► Relay 3 (IN) ─── Quạt gió
    │ Relay    │◄────────│  D8  ──► Relay 4 (IN) ─── Đèn LED
    │ Module   │         │  5V  ─── Relays (VCC)      │
    │ (4 Kênh) │         │  GND ─── Relays (GND)      │
    └──────────┘         │                             │
                          │  USB ──► Máy tính (Serial)  │
                          └─────────────────────────────┘
```

### Bảng chân kết nối chi tiết

| Chân Arduino | Kết nối tới | Ghi chú |
|-------------|-------------|---------|
| `D4` | DHT22 — chân Data | Cần điện trở pull-up 4.7kΩ (một số module DHT22 đã tích hợp sẵn) |
| `A0` | Capacitive Soil Moisture — chân AOUT | Tín hiệu analog độ ẩm đất |
| `D5` | Relay 1 — chân IN | Điều khiển máy bơm nước tưới |
| `D6` | Relay 2 — chân IN | Điều khiển động cơ phun sương |
| `D7` | Relay 3 — chân IN | Điều khiển quạt làm mát |
| `D8` | Relay 4 — chân IN | Điều khiển đèn LED quang hợp |
| `5V` | VCC chung | Cung cấp nguồn 5V |
| `GND` | GND chung | Mass chung của hệ thống |

> ⚠️ **Lưu ý nguồn điện:** Động cơ bơm, sương và quạt khi hoạt động đồng thời tiêu thụ dòng điện rất lớn. Không sử dụng nguồn trực tiếp từ chân 5V của Arduino để chạy động cơ. Cần cấp nguồn 5V riêng cho các động cơ và relay, đồng thời **nối chung chân GND của nguồn ngoài với chân GND của Arduino**.

---

## 💻 Cài đặt phần mềm từ đầu (Windows 10/11)

### Bước 1: Cài đặt Git

1. Truy cập: https://git-scm.com/downloads/win
2. Tải bản **64-bit Git for Windows Setup**.
3. Chạy file `.exe` cài đặt, giữ nguyên các tùy chọn mặc định và nhấn **Next** cho đến khi hoàn thành.
4. Mở **PowerShell** và kiểm tra:
   ```powershell
   git --version
   ```

### Bước 2: Cài đặt Python 3.12+

1. Truy cập: https://www.python.org/downloads/
2. Tải phiên bản **Python 3.12.x**.
3. Chạy file `.exe` cài đặt.
4. **⚠️ QUAN TRỌNG:** Ở màn hình đầu tiên, **TICK vào ô "Add python.exe to PATH"** trước khi nhấn cài đặt.
5. Nhấn **Install Now** và đợi hoàn tất.
6. Đóng và mở lại **PowerShell** để cập nhật môi trường, rồi kiểm tra:
   ```powershell
   python --version
   pip --version
   ```

### Bước 3: Cài đặt uv (Trình quản lý Package Python tốc độ cao)

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```
Đóng và mở lại **PowerShell**, rồi xác nhận cài đặt thành công:
```powershell
uv --version
```

### Bước 4: Cài đặt Node.js 18+ (cho Frontend)

1. Truy cập: https://nodejs.org/ và tải bản **LTS** (khuyên dùng).
2. Chạy file `.msi` cài đặt và nhấn **Next** đến khi kết thúc.
3. Đóng và mở lại **PowerShell** để xác nhận:
   ```powershell
   node --version
   npm --version
   ```

### Bước 5: Cài đặt Arduino IDE & Driver USB

1. Truy cập: https://www.arduino.cc/en/software và cài đặt **Arduino IDE 2.x**.
2. Cắm Arduino vào máy tính qua cáp USB.
3. Mở **Device Manager** của Windows, tìm mục **Ports (COM & LPT)**:
   - Nếu xuất hiện **"USB-SERIAL CH340 (COMx)"** thì hệ thống đã tự động nhận driver.
   - Nếu bị báo dấu chấm vàng hoặc thiếu driver, tải driver tại [WCH Official Page](https://www.wch-ic.com/downloads/CH341SER_EXE.html) và tiến hành cài đặt.

---

## 📦 Clone & Cài đặt Project

### Bước 1: Tải mã nguồn

Mở PowerShell và điều hướng tới thư mục bạn muốn lưu trữ dự án:

```powershell
cd ~\Desktop
git clone https://github.com/haianh06/PlantBot.git
cd PlantBot
```

### Bước 2: Khởi tạo và thiết lập Backend (Python)

```powershell
# Khởi tạo môi trường ảo Python
uv venv

# Kích hoạt môi trường ảo
.\.venv\Scripts\Activate.ps1
```

> ⚠️ Nếu gặp lỗi bảo mật hệ thống **"cannot be loaded because running scripts is disabled"**, chạy lệnh sau để cấp quyền thực thi kịch bản PowerShell trên máy của bạn:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

Cài đặt các gói phụ thuộc:

```powershell
uv pip install fastapi "uvicorn[standard]" pyserial opencv-python pydantic pydantic-settings websockets
```

Xác nhận cài đặt thành công:
```powershell
python -c "import fastapi; import serial; import cv2; print('All packages OK')"
```

### Bước 3: Cài đặt Frontend (React)

```powershell
cd frontend
npm install
cd ..
```

---

## 🔧 Upload Firmware lên Arduino

### Bước 1: Thiết lập môi trường Arduino IDE

1. Mở **Arduino IDE**.
2. Vào **Sketch → Include Library → Manage Libraries...** (hoặc nhấn `Ctrl + Shift + I`).
3. Tìm kiếm và cài đặt thư viện **DHT sensor library** của **Adafruit**. Khi được hỏi, chọn **Install all** để tự động cài đặt gói phụ thuộc **Adafruit Unified Sensor**.

### Bước 2: Chuẩn bị file và Upload

1. Copy các file trong project về chung một thư mục để biên dịch dễ dàng hơn:
   ```powershell
   # Tạo thư mục làm việc cho Arduino
   mkdir ~\Documents\Arduino\PlantBot_Firmware -Force
   
   # Copy các file firmware
   Copy-Item firmware\src\* ~\Documents\Arduino\PlantBot_Firmware\
   Copy-Item firmware\lib\MyIrrigationPump\* ~\Documents\Arduino\PlantBot_Firmware\
   
   # Đổi tên tệp chính phù hợp với quy tắc của Arduino IDE
   Rename-Item ~\Documents\Arduino\PlantBot_Firmware\main.ino PlantBot_Firmware.ino
   ```
2. Mở file `~\Documents\Arduino\PlantBot_Firmware\PlantBot_Firmware.ino` bằng **Arduino IDE**.
3. Kết nối board Arduino qua cổng USB, cấu hình thông tin trong **Tools**:
   - **Board**: Chọn `Arduino Nano` hoặc `Arduino Uno`.
   - **Processor** (với board Nano): Chọn `ATmega328P (Old Bootloader)` nếu dùng chip nạp CH340 giá rẻ.
   - **Port**: Chọn đúng cổng COM tương ứng của board.
4. Nhấn nút **Upload** (mũi tên hướng sang phải). Đợi màn hình thông báo `Done uploading.` là thành công.

*Lưu ý: Luôn đóng **Serial Monitor** trên Arduino IDE trước khi chạy ứng dụng Backend để tránh lỗi tranh chấp cổng COM.*

---

## 🚀 Chạy hệ thống

### Chạy nhanh bằng One-Click Script ⚡

Để khởi chạy song song cả máy chủ Backend và giao diện Frontend chỉ với một lệnh duy nhất:

```powershell
# Chạy từ thư mục gốc của dự án
.\start.ps1
```

Script sẽ tự động dọn dẹp các cổng cũ, kích hoạt môi trường ảo Python, khởi chạy máy chủ FastAPI (cổng `8000`) và máy chủ giao diện React Vite (cổng `5173`).

Để **dừng toàn bộ hệ thống**, nhấn `Ctrl + C` tại cửa sổ dòng lệnh.

---

## 🌐 Truy cập Dashboard

| Địa chỉ | Chức năng |
|-----|--------|
| **http://localhost:5173** | 🖥️ Giao diện Dashboard quản lý chính (Local) |
| **http://<ip-tailscale>:5173** | 🌐 Truy cập Dashboard từ xa qua mạng Tailscale hoặc IP mạng LAN |
| **http://localhost:8000/docs** | 📚 Tài liệu kiểm thử API tương tác (Swagger UI) |

### Thiết kế Dashboard Premium

Giao diện Dashboard được tối ưu hóa hiển thị với 4 thẻ điều khiển thiết bị có kích thước đồng đều trong một lưới cân xứng:

```
┌────────────────────────────────────────────────────────────────┐
│  🌿 PlantBot  ● Live                            [📥 Export CSV]│
├───────────┬────────────────────────────────────────────────────┤
│           │                                                    │
│ SIDEBAR   │  📷 CAMERA GIÁM SÁT SÂN VƯỜN      [🔘 Cam 0] [🔘 Cam 1]│
│           │  ┌────────────────────────────────────────┐        │
│ 📡 KẾT NỐI│  │       Video Stream Thời Gian Thực      │        │
│ COM3      │  └────────────────────────────────────────┘        │
│ ● Online  │                                                    │
│           │  ┌───────────┐ ┌───────────┐ ┌───────────┐         │
│ ⚙️ CALIB.  │  │ Nhiệt Độ  │ │ Độ Ẩm KK  │ │ Độ Ẩm Đất │         │
│ KHÔ: 500  │  │  28.5 °C  │ │  65.2 %   │ │   42 %    │         │
│ ƯỚT: 150  │  └───────────┘ └───────────┘ └───────────┘         │
│ [Lưu]     │                                                    │
│           │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
│           │  │ Máy Bơm   │ │ Phun Sương│ │ Quạt Gió  │ │ Đèn LED   │
│           │  │ [TẮT]     │ │ [TẮT]     │ │ [TẮT]     │ │ [TẮT]     │
│           │  └───────────┘ └───────────┘ └───────────┘ └───────────┘
└───────────┴────────────────────────────────────────────────────┘
```

---

## 📁 Cấu trúc thư mục

```
PlantBot/
│
├── firmware/                              # 🔧 Arduino Firmware (C++)
│   ├── src/
│   │   ├── main.ino                       #    Luồng xử lý chính setup & loop
│   │   ├── SoilSensor.h                   #    Khai báo cảm biến độ ẩm đất
│   │   └── SoilSensor.cpp                 #    Xử lý chuyển đổi tín hiệu ADC
│   └── lib/
│       └── AutomationController/          #    Mã nguồn điều khiển phần cứng bổ sung
│
├── backend/                               # 🐍 FastAPI Backend (Python)
│   └── app/
│       ├── main.py                        #    Khởi động ứng dụng FastAPI
│       ├── config.py                      #    Cấu hình hệ thống chung
│       ├── models.py                      #    Định nghĩa cấu trúc thực thể dữ liệu
│       ├── api/                           #    Danh sách các cổng API
│       │   ├── sensor_routes.py           #      API đọc dữ liệu cảm biến & WebSocket
│       │   ├── pump_routes.py             #      API điều khiển bơm / phun sương
│       │   ├── fan_routes.py              #      API điều khiển quạt gió
│       │   ├── led_routes.py              #      API điều khiển đèn LED
│       │   └── system_routes.py           #      API hệ thống & hiệu chuẩn cảm biến
│       └── services/                      #    Lớp xử lý logic nghiệp vụ
│           ├── serial_service.py          #      Quản lý đọc ghi Serial USB
│           ├── csv_service.py             #      Lưu trữ lịch sử ra file CSV
│           └── camera_service.py          #      Quản lý camera và luồng stream
│
├── frontend/                              # ⚛️ Giao diện React Frontend
│   ├── vite.config.js                     #    Cấu hình Vite dev server & proxy
│   └── src/
│       ├── App.jsx                        #    Component trung tâm quản lý giao diện
│       ├── api/
│       │   └── client.js                  #    Xử lý gửi nhận HTTP API & WebSocket
│       ├── hooks/
│       │   ├── useSensorData.js           #    Đồng bộ dữ liệu thời gian thực
│       │   ├── usePumpControl.js          #    Tương tác điều khiển máy bơm & sương
│       │   ├── useFanControl.js           #    Tương tác điều khiển quạt gió
│       │   ├── useLedControl.js           #    Tương tác điều khiển đèn LED
│       │   └── useCamera.js               #    Xử lý luồng hiển thị camera
│       └── components/                    #    Các thành phần giao diện nhỏ
│
├── data/                                  # 📊 Kho lưu trữ dữ liệu
│   └── sensor_data.csv                    #    Bảng dữ liệu lịch sử cảm biến
│
├── start.ps1                              # ⚡ One-click khởi động hệ thống
└── settings.json                          # ⚙️ File cấu hình động thời gian chạy
```

---

## ⚙️ Cấu hình hệ thống

Dữ liệu được lưu trữ trong tệp `settings.json` tại thư mục gốc, cho phép cập nhật tức thời các thông số hiệu chuẩn cảm biến đất mà không cần thay đổi code của phần cứng:

```json
{
    "serial": {
        "port": "auto",
        "baudrate": 9600
    },
    "sensor_calibration": {
        "soil_moisture_dry": 500,
        "soil_moisture_wet": 150
    },
    "camera": {
        "indices": [0, 1],
        "default_index": 0
    },
    "data": {
        "csv_file_path": "data/sensor_data.csv",
        "sensor_read_interval": 2.0
    }
}
```

---

## 📡 API Endpoints

### 1. Dữ liệu cảm biến (Sensors)

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| `GET` | `/api/sensors/current` | Lấy thông số nhiệt độ, độ ẩm mới nhất |
| `GET` | `/api/sensors/history?limit=50` | Truy vấn N bản ghi lịch sử từ CSV |
| `GET` | `/api/sensors/export` | Xuất và tải file báo cáo CSV |
| `WS` | `/api/sensors/ws` | Kênh kết nối WebSocket đồng bộ thời gian thực |

### 2. Điều khiển thiết bị (Device Controls)

| Method | Endpoint | Payload ví dụ | Mô tả |
|--------|----------|---------------|--------|
| `POST` | `/api/pump/control` | `{"device":"pump","action":"on"}` | Bật / tắt máy bơm hoặc phun sương |
| `POST` | `/api/fan/control` | `{"device":"fan","action":"off"}` | Bật / tắt quạt thông gió |
| `POST` | `/api/led/control` | `{"device":"led","action":"on"}` | Bật / tắt đèn LED |

---

## 📟 Serial Protocol (Arduino ◄──► Máy tính)

### 1. Chiều Gửi (Arduino → Máy tính mỗi 2 giây)

Chuỗi JSON được tối ưu hóa truyền nhận qua cổng USB:

```json
{"temp":28.5,"humi":65.2,"soil":42,"pump":0,"mist":0,"fan":0,"led":0}
```

- `temp`: Nhiệt độ không khí (°C) từ DHT22.
- `humi`: Độ ẩm không khí (%) từ DHT22.
- `soil`: Độ ẩm đất (%) đã qua xử lý ADC dựa trên giá trị hiệu chuẩn.
- `pump` / `mist` / `fan` / `led`: Trạng thái bật (`1`) / tắt (`0`) hiện tại của thiết bị.

### 2. Chiều Nhận (Máy tính → Arduino)

Các lệnh text đơn giản (kết thúc bằng ký tự xuống dòng `\n`):
- `PUMP_ON` / `PUMP_OFF`: Điều khiển máy bơm tưới.
- `MIST_ON` / `MIST_OFF`: Điều khiển động cơ phun sương.
- `FAN_ON` / `FAN_OFF`: Điều khiển quạt gió.
- `LED_ON` / `LED_OFF`: Điều khiển đèn quang hợp.
- `STATUS`: Yêu cầu phản hồi thông số cảm biến ngay lập tức.

---

## 🔍 Troubleshooting — Xử lý lỗi thường gặp

### ❌ Thiết bị hiển thị "Ngoại tuyến" khi truy cập từ xa (Tailscale / LAN)
- **Nguyên nhân**: Bản phân phối cũ thiết lập kết nối WebSocket cố định về `localhost:8000`.
- **Giải pháp**: Bản cập nhật mới đã khắc phục bằng cách sử dụng `window.location.host`. Vui lòng xóa cache trình duyệt của bạn và tải lại trang.

### ❌ Lỗi "Access is denied" liên tục khi chạy Serial
- **Nguyên nhân**: Cổng COM đang bị chiếm dụng bởi Arduino IDE Serial Monitor hoặc một phần mềm bên thứ ba.
- **Giải pháp**: Hãy tắt toàn bộ các chương trình đọc cổng Serial đang chạy ngầm trước khi khởi động dự án FastAPI.

### ❌ Không thể điều khiển tắt thiết bị
- **Nguyên nhân**: Xảy ra khi luồng đồng bộ trạng thái thực tế WebSocket bị mất kết nối, làm giao diện frontend bị đơ trạng thái và luôn mặc định gửi lệnh Bật (`on`).
- **Giải pháp**: Kiểm tra lại trạng thái kết nối Live ở góc trên bên trái màn hình. Khi WebSocket chuyển sang màu xanh lá (`Live`), tính năng Bật / Tắt sẽ hoạt động trơn tru.

---
