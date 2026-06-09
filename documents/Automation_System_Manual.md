# HƯỚNG DẪN HỆ THỐNG TỰ ĐỘNG HÓA PLANTBOT (BOK CHOY EDITION)

Tài liệu này mô tả chi tiết cách thức vận hành của hệ thống điều khiển tự động Hybrid (Kết hợp Firmware & Backend) được tối ưu hóa cho cây Bok Choy và thu thập dữ liệu Machine Learning.

---

## 1. Kiến trúc Điều khiển Hybrid
Hệ thống hoạt động theo mô hình phân lớp để đảm bảo tính an toàn và khả năng thu thập dữ liệu:

*   **Tầng Thực thi (Firmware - Arduino):** Đóng vai trò là "Bộ não sinh tồn". Arduino trực tiếp đọc cảm biến và điều khiển Relay dựa trên Giai đoạn (Stage) được thiết lập. Nếu mất kết nối với máy tính, Arduino vẫn tự duy trì sự sống cho cây.
*   **Tầng Giám sát (Backend - PC):** Đóng vai trò là "Giám đốc dự án". Theo dõi lịch trình ngày tuổi, ghi log dữ liệu tần suất cao (ML-Ready) và gửi lệnh chuyển giai đoạn xuống Arduino.

---

## 2. Chi tiết 4 Giai đoạn Tăng trưởng (Bok Choy)

Hệ thống tự động điều chỉnh hành vi của thiết bị dựa trên 4 giai đoạn:

### Giai đoạn 1: Đánh thức phôi (Ngày 1 - 5)
*   **Mục tiêu:** Giữ ẩm bề mặt hạt, tránh úng rễ.
*   **Tưới gốc (Pump):** **KHÓA CHẶT (Always OFF)**.
*   **Phun sương (Mist):** **TỰ ĐỘNG** duy trì độ ẩm không khí/bề mặt 55% - 65%.
*   **Ánh sáng:** Tắt hoàn toàn để kích mầm.

### Giai đoạn 2: Đón sáng & Định hình (Ngày 6 - 12)
*   **Mục tiêu:** Giúp cây con cứng cáp, làm quen ánh sáng.
*   **Tưới gốc (Pump):** **TỰ ĐỘNG ĐỊNH KỲ (Firmware-side)**. Cứ 3 tiếng tưới 20 giây (chỉ khi đèn bật). Có cảm biến bảo vệ ngăn đất khô < 35%.
*   **Phun sương (Mist):** Duy trì độ ẩm không khí 60% - 75%.
*   **Ánh sáng:** Bật 14 tiếng (06:00 - 20:00).

### Giai đoạn 3: Phát triển sinh khối (Ngày 13 - 25)
*   **Mục tiêu:** Tối ưu quang hợp và làm mát lá.
*   **Tưới gốc (Pump):** Tăng tần suất. Cứ **2 tiếng** tưới 20 giây. Bảo vệ rễ khi ẩm đất < 55%.
*   **Phun sương (Mist):** Hoạt động mạnh, duy trì độ ẩm không khí **75% - 85%**.
*   **Ánh sáng & Quạt:** Đèn bật 14h. Quạt tự động bật khi nhiệt độ > 28°C để tránh cháy mép lá.

### Giai đoạn 4: Thu hoạch & Bảo quản (Ngày 25 - 28)
*   **Mục tiêu:** Tăng độ ngọt và giòn cho rau.
*   **Tưới gốc (Pump):** **NGỪNG TƯỚI** hoàn toàn 24h trước khi thu hoạch.
*   **Phun sương (Mist):** Duy trì ẩm nhẹ để rau không bị héo.
*   **Thu hoạch:** Thực hiện thủ công trước 06:00 sáng.

---

## 3. Cơ chế Logging & ML Tuning
Hệ thống được thiết kế để tạo ra bộ Dataset "sạch" cho việc xây dựng mô hình ML sau này:

*   **Tách biệt nguồn tác động:**
    *   Sự thay đổi độ ẩm đất chỉ liên quan đến cột `pump_on`.
    *   Sự thay đổi nhiệt độ/độ ẩm khí liên quan đến cột `mist_on` và `fan_on`.
*   **Tần suất ghi Log thông minh (Hybrid Logging):**
    *   **1 giây/lần:** Khi Bơm, Phun sương hoặc Quạt đang chạy (Bắt trọn phản hồi môi trường).
    *   **1 phút/lần:** Khi hệ thống ở trạng thái nghỉ (Tiết kiệm bộ nhớ).
*   **Thông tin ngữ cảnh:** Mỗi dòng log luôn chứa ID của Giai đoạn (`stage`) để ML có thể phân loại dữ liệu theo độ tuổi của cây.

---

## 4. Giao thức Điều khiển (Serial Commands)

Bạn có thể điều khiển thủ công hoặc giám sát hệ thống qua các lệnh Serial:

| Lệnh | Ý nghĩa |
| :--- | :--- |
| `SET_STAGE:x` | Chuyển hệ thống sang giai đoạn `x` (1, 2, 3, 4). |
| `AUTO_ON` | Bật chế độ tự động điều khiển (Firmware-side). |
| `AUTO_OFF` | Tắt chế độ tự động (Chỉ điều khiển tay từ Web). |
| `PUMP_ON/OFF` | Bật/Tắt máy bơm gốc thủ công. |
| `MIST_ON/OFF` | Bật/Tắt máy phun sương thủ công. |
| `STATUS` | Yêu cầu Arduino gửi lại JSON dữ liệu ngay lập tức. |

---

## 5. Lưu ý vận hành
1.  **Ngày bắt đầu:** Hãy cập nhật ngày bắt đầu gieo hạt trong `AutomationService` trên Backend để hệ thống tính toán chuyển Stage chính xác.
2.  **Cảm biến:** Đảm bảo cảm biến độ ẩm đất được cắm chắc chắn vì Stage 2 & 3 phụ thuộc rất nhiều vào thông số này để bảo vệ rễ.
3.  **An toàn:** Hệ thống Firmware có cơ chế an toàn tự tắt Bơm nếu cảm biến đất báo > 85% để tránh tràn nước.
