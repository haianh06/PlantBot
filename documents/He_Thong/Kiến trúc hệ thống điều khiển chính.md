# Kiến Trúc Hệ Thống Điều Khiển Trên Laptop (Backend Architecture)

Tài liệu này giải thích chi tiết cách vận hành của hệ thống điều khiển tự động thích ứng trên Laptop (PC Backend) và cách các thành phần tương tác với vi điều khiển Arduino.

---

## 1. Các Dịch Vụ Core Ở Backend (Core Services)

Ứng dụng backend FastAPI tổ chức các tác vụ nền thành các lớp dịch vụ độc lập, quản lý vòng đời (Lifecycle) thông qua [main.py](file:///d:/Project/PlantBot/backend/app/main.py):

```
                       ┌─────────────────────────┐
                       │        FastAPI          │
                       │   (main.py Lifecycle)   │
                       └───────────┬─────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  SerialService  │       │   CSVService    │       │Camera/AIService │
│  Quản lý Serial │       │ Ghi dữ liệu CSV │       │ Stream & YOLO   │
└────────┬────────┘       └────────┬────────┘       └────────┬────────┘
         │                         │                         │
         └───────────┬─────────────┘                         │
                     ▼                                       │
       ┌───────────────────────────┐                         │
       │     AutomationService     │◄────────────────────────┘
       │  Bộ não tự động hóa thích  │ (Nhận phản hồi bệnh từ AI)
       │    ứng (VPD, Gated, RAM)  │
       └───────────────────────────┘
```

### A. Serial Service ([serial_service.py](file:///d:/Project/PlantBot/backend/app/services/serial_service.py))
*   **Nhiệm vụ:** Quản lý kết nối USB Serial. Chạy một luồng nền đọc liên tục (Reader Thread) để phân tích dữ liệu JSON từ Arduino gửi lên.
*   **Gửi lệnh:** Cung cấp hàm luồng an toàn (Thread-safe) `send_command(cmd)` để đẩy lệnh điều khiển xuống Arduino.

### B. CSV Service ([csv_service.py](file:///d:/Project/PlantBot/backend/app/services/csv_service.py))
*   **Nhiệm vụ:** Đảm nhận việc lưu trữ dữ liệu telemetry. Định kỳ append bản ghi đo đạc vào file [sensor_data.csv](file:///d:/Project/PlantBot/data/sensor_data.csv). 
*   **Tính năng bổ sung:** Tự động sao lưu (Backup) tệp CSV cũ sang một tên tệp có nhãn thời gian và reset tệp CSV mới khi người dùng nhấn nút khởi tạo lứa gieo trồng mới trên UI.

### C. Automation Service ([automation.py](file:///d:/Project/PlantBot/backend/app/services/automation.py))
*   **Nhiệm vụ:** Là bộ não tự động hóa thích ứng. Nhận các chỉ số cảm biến, so khớp với cấu hình gieo trồng hiện tại để ra quyết định điều khiển thiết bị (Bơm, Phun sương, Quạt, LED).
*   **Tối ưu hiệu năng:** Chạy hoàn toàn trên bộ đệm RAM (RAM Cache) để tính trung bình nhiệt độ và kiểm tra cấu hình, loại bỏ Disk I/O trong vòng lặp vô hạn.

---

## 2. Các Luồng Nghiệp Vụ Đồng Bộ (Execution Workflows)

### A. Luồng Đọc & Xử lý Telemetry (Telemetry Loop)
1.  **Arduino** gửi JSON đo đạc qua Serial $\rightarrow$ Lọt vào Reader Thread của [SerialService](file:///d:/Project/PlantBot/backend/app/services/serial_service.py).
2.  [SerialService](file:///d:/Project/PlantBot/backend/app/services/serial_service.py) parse JSON và gọi hàm callback đăng ký tại [main.py](file:///d:/Project/PlantBot/backend/app/main.py#L68).
3.  Callback thực hiện:
    *   Đẩy trị số nhiệt độ vào hàng đợi RAM `temp_history` của [AutomationService](file:///d:/Project/PlantBot/backend/app/services/automation.py).
    *   Lưu dòng dữ liệu vào đĩa thông qua [CSVService](file:///d:/Project/PlantBot/backend/app/services/csv_service.py).
    *   Phát tán qua WebSocket đến trình duyệt Client của người dùng để cập nhật Dashboard tức thời.

### B. Luồng Tự Động Hóa Thích Ứng (Adaptive Control Loop)
1.  [AutomationService](file:///d:/Project/PlantBot/backend/app/services/automation.py) chạy vòng lặp vô tận (chu kỳ 10 giây).
2.  Kiểm tra mốc thời gian cập nhật tệp `settings.json`. Nếu có thay đổi, tự động cập nhật cache cấu hình trên RAM.
3.  Kiểm tra chỉ số VPD và điểm đọng sương $T_{dew}$:
    *   Nếu có nguy cơ đọng sương (chênh lệch $<2^\circ\text{C}$): Khóa phun sương, bật quạt.
    *   Nếu VPD lệch dải tối ưu ($0.8 - 1.2\text{ kPa}$): Bật phun sương cyclic hoặc bật quạt tản ẩm tương ứng.
4.  Đến giờ tưới nước gieo trồng:
    *   Kiểm tra ẩm đất hiện tại: $>70\%$ thì bỏ qua (Skip); $60\% - 70\%$ tưới 1 xung 10s; $<60\%$ tưới 3 xung $\times$ 10s.
    *   Gửi lệnh xung `PUMP_ON [duration] [cooldown]` trực tiếp qua Serial để Arduino tự ngắt.
