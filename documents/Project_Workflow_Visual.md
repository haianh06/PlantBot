# 🌿 PlantBot Project: Visual Workflow & Architecture

Tài liệu này mô tả chi tiết luồng hoạt động của hệ thống PlantBot, từ cảm biến phần cứng đến giao diện người dùng và trí tuệ nhân tạo.

---

## 1. Kiến trúc Tổng thể (System Architecture)

```mermaid
graph TD
    subgraph "Frontend (React + Vite)"
        UI[Dashboard UI]
        WS_Client[WebSocket Client]
        API_Client[Axios API Client]
    end

    subgraph "Backend (FastAPI)"
        Main[Main Lifecycle]
        
        subgraph "Services"
            SS[Serial Service]
            AS[Automation Service]
            CS[Camera Service]
            AI[AI Service - YOLOv8]
            CSV[CSV Logger Service]
        end
        
        subgraph "API Routers"
            RT_Sensor[Sensor Routes]
            RT_Control[Device Routes]
            RT_Sched[Schedule Routes]
        end
    end

    subgraph "Hardware (Arduino/ESP32)"
        Firmware[AutomationController.cpp]
        Sensors[Sensors: Temp, Humi, Soil]
        Relays[Relays: Pump, Fan, LED, Mist]
    end

    %% Connections
    Sensors --> Firmware
    Firmware -- "JSON via USB Serial" --> SS
    SS -- "Broadcast" --> WS_Client
    SS -- "Save" --> CSV
    
    UI -- "Action" --> API_Client
    API_Client -- "HTTP Request" --> RT_Control
    RT_Control -- "Command" --> SS
    SS -- "Text Command" --> Firmware
    Firmware --> Relays

    AS -- "Auto Logic" --> SS
    CS -- "Frame" --> AI
    AI -- "Stream" --> UI
```

---

## 2. Luồng Dữ liệu Cảm biến (Sensor Data Flow)
*Luồng này đảm bảo dữ liệu từ vườn cây được hiển thị real-time trên Dashboard.*

```mermaid
sequenceDiagram
    participant HW as Arduino (Sensors)
    participant SS as SerialService (Python)
    participant DB as CSV/Data
    participant WS as WebSocket
    participant UI as React Dashboard

    loop Mỗi 2 giây
        HW->>SS: Gửi chuỗi JSON {temp, humi, soil...}
        SS->>SS: Parse JSON & Update State
        par Lưu trữ
            SS->>DB: Ghi log vào sensor_data.csv
        and Hiển thị
            SS->>WS: Broadcast qua WebSocket
            WS->>UI: Cập nhật State & Re-render Chart
        end
    end
```

---

## 3. Luồng Điều khiển Thiết bị (Device Control Flow)
*Luồng khi người dùng thao tác thủ công trên giao diện.*

```mermaid
sequenceDiagram
    participant User as Người dùng
    participant UI as React UI
    participant API as FastAPI Router
    participant SS as SerialService
    participant HW as Arduino (Relays)

    User->>UI: Nhấn nút "Bật Bơm"
    UI->>API: POST /api/pump/on
    API->>SS: call send_command("PUMP_ON")
    SS->>HW: Gửi "PUMP_ON\n" qua Serial
    HW->>HW: digitalWrite(PUMP_PIN, HIGH)
    HW-->>SS: Phản hồi trạng thái mới {pump: 1}
    SS-->>UI: Cập nhật nút bấm sang màu xanh (Live)
```

---

## 4. Luồng Tự động hóa & AI (Automation & AI Flow)
*Sự kết hợp giữa Logic tăng trưởng và Thị giác máy tính.*

```mermaid
graph LR
    subgraph "Automation Logic"
        GP[Growth Profiles JSON] -->|Stage Config| AS[Automation Service]
        Sensors[Sensor Data] --> AS
        AS -->|Decision| Cmd[Serial Command]
    end

    subgraph "AI Vision"
        Cam[Camera Frame] --> YOLO[YOLOv8 Model]
        YOLO -->|Disease Detected?| Save[Save Photo & Alert]
        YOLO -->|Process| Stream[MJPEG Stream to UI]
    end
```

---

## 5. Cấu trúc Thư mục & Chức năng

| Thư mục | Chức năng chính |
| :--- | :--- |
| `firmware/` | Mã nguồn C++ cho Arduino, điều khiển trực tiếp Relay và đọc cảm biến. |
| `backend/app/services/` | "Trái tim" của hệ thống, xử lý Serial, AI, và Logic tự động hóa. |
| `backend/app/api/` | Các cổng kết nối (Endpoints) để Frontend giao tiếp với Backend. |
| `frontend/src/` | Giao diện người dùng, biểu đồ và các nút điều khiển. |
| `ai_module/` | Chứa model YOLOv8 (`.pt`) và các notebook huấn luyện. |
| `data/` | Nơi lưu trữ ảnh bệnh và file log CSV. |

---
*Tài liệu được tạo tự động bởi PlantBot Assistant - 2026*
