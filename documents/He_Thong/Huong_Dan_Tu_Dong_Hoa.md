# Hướng Dẫn Hệ Thống Tự Động Hóa (Hybrid & Data-Driven)

Tài liệu này mô tả chi tiết cơ chế hoạt động, thiết kế tối giản, và giao thức giao tiếp của hệ thống tự động hóa thích ứng thông minh (Adaptive Automation) trên **PlantBot**.

---

## 1. Cơ Chế Điều Khiển Hybrid (Hỗn Hợp)

Hệ thống được tổ chức thành hai tầng rõ rệt nhằm phân tách chức năng (Separation of Concerns) và đảm bảo an toàn vận hành:

```
┌──────────────────────────────────────┐
│          TẦNG PC (Backend)           │  <-- Chạy AutomationService (Python)
│    Lập kế hoạch, Tính VPD, Gated     │      Tính toán logic phức tạp
└──────────────────┬───────────────────┘
                   │  USB Serial
                   ▼  Commands (e.g. PUMP_ON 10000 15000)
┌──────────────────────────────────────┐
│        TẦNG THIẾT BỊ (Arduino)       │  <-- Chạy RelayController (C++)
│  survival Failsafe, Thực thi xung    │      Đếm thời gian bằng hardware timer
└──────────────────────────────────────┘
```

*   **Tầng PC (Lớp Trí tuệ - Python):** Chạy tác vụ nền [automation.py](file:///d:/Project/PlantBot/backend/app/services/automation.py) quét dữ liệu cảm biến, tính toán chỉ số sinh thái phức tạp (VPD, điểm đọng sương), kiểm tra cấu hình gieo trồng và quyết định thời điểm, phương thức kích hoạt thiết bị.
*   **Tầng Arduino (Lớp Thực thi & Sinh tồn - C++):** Đọc cảm biến vật lý trực tiếp, thực thi các xung bật tắt thiết bị bằng bộ đếm thời gian phần cứng (Hardware Timer) độc lập để đảm bảo an toàn tuyệt đối cho rơ-le, đồng thời tự chạy lịch tưới cứu sinh khi mất kết nối PC quá 60 giây.

---

## 2. Chi Tiết Thiết Kế Tự Động Hóa Ở Backend

Để tránh thiết bị hoạt động quá mức thiết kế (over-engineering) và giải quyết triệt để các nút thắt hiệu năng (I/O Bottleneck), dịch vụ [AutomationService](file:///d:/Project/PlantBot/backend/app/services/automation.py#L40) được tối ưu hóa như sau:

### A. Tối Ưu Bộ Đệm RAM Cache (RAM-Buffered Configuration)
*   **Cơ chế:** Backend không đọc đĩa tệp cấu hình `settings.json` mỗi 10 giây. Thay vào đó, nó kiểm tra thời gian thay đổi tệp (`os.path.getmtime`). Chỉ khi phát hiện người dùng cập nhật cấu hình qua giao diện Web UI, backend mới nạp lại cấu hình vào bộ nhớ RAM.
*   **Đo lường lịch sử một lần:** Khi khởi động, backend chỉ quét tệp tin CSV [sensor_data.csv](file:///d:/Project/PlantBot/data/sensor_data.csv) một lần duy nhất để khôi phục mốc giờ tưới nước cuối cùng (`_last_watered_hour`). Các vòng lặp sau đó hoàn toàn đọc ghi từ RAM.

### B. Hàng Đợi Nhiệt Độ Tính Trung Bình (In-Memory Telemetry Queue)
*   **Cơ chế:** Sử dụng hàng đợi hai đầu `collections.deque(maxlen=60)` lưu trực tiếp các chỉ số nhiệt độ thời gian thực nhận được từ cổng Serial vào RAM.
*   **Ưu điểm:** Loại bỏ hoàn toàn việc đọc ngược 600 dòng từ tệp CSV mỗi 10 giây để tính toán nhiệt độ trung bình 10 phút. Hệ số tối ưu hóa nhiệt độ (`temp_factor`) tăng thời gian tưới thêm 25% khi trời nóng ($>28^\circ\text{C}$) hiện chạy tức thời trên RAM với độ trễ 0ms.

### C. Tưới Nước Chặn Độ Ẩm Đất & Tưới Xung (Soil Moisture-Gated Pulse Watering)
Đến các mốc giờ tưới theo lịch trình của từng giai đoạn tăng trưởng (Stage), backend thực hiện kiểm tra phản hồi độ ẩm đất thời gian thực trước khi ra lệnh tưới:
1.  **Ẩm đất > 70%:** Bỏ qua (Skip) lượt tưới này để phòng úng rễ. Ghi log trạng thái lên hệ thống.
2.  **Ẩm đất 60% - 70% (Đất ẩm vừa):** Kích hoạt tưới xung ngắn (1 xung 10 giây) để bù ẩm nhẹ.
3.  **Ẩm đất < 60% (Đất khô):** Kích hoạt tưới xung đầy đủ (3 xung $\times$ 10 giây, giãn cách nhau 15 giây cooldown).
*   **Tưới Xung (Pulse Watering):** Giúp đất hấp thụ nước như một miếng bọt biển, tránh chảy tràn (Run-off) và trôi chất dinh dưỡng ra ngoài khay.

### D. Điều Hòa Không Khí Thích Ứng Theo VPD & Điểm Đọng Sương
Thay vì bật tắt phun sương tĩnh theo độ ẩm tương đối ($RH$), hệ thống tính toán chỉ số Áp suất hơi nước thiếu hụt (VPD) và Điểm đọng sương ($T_{dew}$) thời gian thực:
*   **Công thức tính VPD ($kPa$):**
    $$VP_{sat} = 0.61078 \times e^{\left(\frac{17.27 \times Temp}{Temp + 237.3}\right)}$$
    $$VPD = VP_{sat} \times \left(1 - \frac{Humidity}{100}\right)$$
*   **Cơ chế Chống Đọng Sương (Anti-Condensation):** Tính toán $T_{dew} \approx Temp - (100 - Humidity)/5$. Nếu chênh lệch nhiệt độ thực tế và điểm đọng sương $< 2.0^\circ\text{C}$ (nguy cơ tạo sương đọng trên lá gây nấm mốc cải thìa), hệ thống lập tức khóa phun sương (`MIST_OFF`) và bật quạt tản ẩm (`FAN_ON`).
*   **Điều khiển VPD trong dải tối ưu cho cải thìa ($0.8 - 1.2\text{ kPa}$):**
    *   $VPD > 1.2\text{ kPa}$ (Không khí khô, lá mất nước nhanh): Bật phun sương ngắt quãng tuần hoàn thông qua lệnh `MIST_CYCLIC 5000 45000` (phun 5s, nghỉ 45s).
    *   $VPD < 0.8\text{ kPa}$ (Không khí quá ẩm, bão hòa hơi nước): Tắt phun sương, bật quạt tản ẩm.
    *   $0.8 \le VPD \le 1.2\text{ kPa}$ (Dải lý tưởng): Tắt các thiết bị hỗ trợ về trạng thái chờ bình thường.

---

## 3. Giao Thức Lệnh Serial Mới (PC ◄──► Arduino)

Để PC không phải tự tạo thread và tự gọi hàm `sleep()` chờ ngắt thiết bị (dễ gây lỗi bất đồng bộ), các tham số thời gian chạy được đóng gói trực tiếp vào dòng lệnh gửi qua Serial:

### A. Lệnh Điều Khiển Máy Bơm Gốc
*   **Cú pháp:** `PUMP_ON [timeout_ms] [cooldown_ms]\n`
*   **Ví dụ:** `PUMP_ON 10000 15000\n`
    *   Bơm sẽ được kích hoạt bật ngay lập tức.
    *   Arduino tự động đếm thời gian bằng timer và tắt bơm sau đúng 10,000ms (10 giây) để đảm bảo an toàn vật lý kể cả khi PC bị treo.
    *   Thiết lập trạng thái khóa tạm thời (Cooldown) trong vòng 15 giây tiếp theo, Arduino từ chối mọi lệnh bật bơm tiếp theo trong thời gian này để bảo vệ động cơ.
*   **Tương thích ngược:** Lệnh `PUMP_ON` không tham số sẽ chạy mặc định 15 giây và cooldown 5 phút.

### B. Lệnh Phun Sương Tuần Hoàn (Cyclic Misting)
*   **Cú pháp:** `MIST_CYCLIC [on_ms] [off_ms]\n`
*   **Ví dụ:** `MIST_CYCLIC 5000 45000\n`
    *   Arduino Nano chuyển sang chế độ cyclic tự trị: Phun sương 5 giây, dừng 45 giây và lặp lại liên tục.
    *   PC chỉ cần gửi lệnh này một lần duy nhất khi VPD vượt ngưỡng, không cần gửi tín hiệu bật tắt liên tục gây nghẽn đường truyền Serial.
*   **Tắt chế độ tuần hoàn:** Gửi lệnh `MIST_OFF\n` để xóa bỏ chế độ cyclic và tắt hẳn đầu phun sương.
