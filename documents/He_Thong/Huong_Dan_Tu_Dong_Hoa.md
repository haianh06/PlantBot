#  Hướng Dẫn Hệ Thống Tự Động Hóa (Hybrid & ML-Ready)

Tài liệu này chi tiết cách thức vận hành của hệ thống điều khiển thông minh, tập trung vào tính an toàn (Failsafe) và khả năng tối ưu hóa bằng dữ liệu (ML).

---

## 1. Cơ chế Điều khiển Hybrid (Hỗn hợp)

Hệ thống được thiết kế để kết hợp sức mạnh xử lý của PC và tính ổn định của vi điều khiển:

### A. Tầng PC (Lớp Trí tuệ - Ưu tiên cao khi có kết nối)
*   **Chức năng:** Chạy `AutomationService` (Python) để quản lý lịch trình chi tiết.
*   **Điều khiển:** 
    *   Tính toán lượng nước tưới chính xác dựa trên giai đoạn.
    *   Quản lý thời gian bật/tắt đèn quang hợp (14h/ngày).
    *   Gửi lệnh `SET_STAGE` hoặc các lệnh điều khiển trực tiếp xuống Arduino.
*   **Tối ưu (ML Tuning):** Khi thu thập đủ dữ liệu, hệ thống sẽ tự động "tune" (điều chỉnh) thời gian tưới và ngưỡng cảm biến để tiết kiệm tài nguyên mà vẫn đảm bảo cây phát triển tốt nhất.

### B. Tầng Arduino (Lớp Sinh tồn - Failsafe)
*   **Chức năng:** Trực tiếp thực thi lệnh từ PC và tự động kích hoạt chế độ bảo vệ khi mất kết nối.
*   **Logic Failsafe:** Nếu không nhận được tín hiệu từ PC trong một khoảng thời gian:
    *   Tự động chạy lịch tưới cơ bản (ví dụ: tưới mỗi 6 tiếng).
    *   Duy trì đèn theo chu kỳ cứng.
    *   **Bảo vệ khẩn cấp:** Tự ngắt bơm nếu cảm biến đất báo quá ẩm (>85%) để tránh ngập úng.

---

## 2. Chiến lược Dữ liệu (ML-Ready Logging)

Hệ thống ghi log liên tục để phục vụ việc huấn luyện AI trong tương lai:

*   **Tần suất Log thông minh:**
    *   **1 giây/lần:** Khi có thiết bị (Bơm, Quạt, Phun sương) đang hoạt động để ghi lại phản hồi tức thì của môi trường.
*   **Cấu trúc Log:** Bao gồm `Nhiệt độ`, `Độ ẩm khí`, `Độ ẩm đất`, `Trạng thái thiết bị (0/1)` và quan trọng nhất là `Giai đoạn (Stage)`.

---

## 3. Các Lệnh Serial Quan trọng

| Lệnh | Ý nghĩa |
| :--- | :--- |
| `SET_STAGE:x` | Chuyển hệ thống sang giai đoạn `x` (1, 2, 3, 4). |
| `AUTO_ON/OFF` | Bật/Tắt chế độ tự động hóa hoàn toàn. |
| `PUMP_ON/OFF` | Bật/Tắt máy bơm thủ công (vẫn qua kiểm tra an toàn của Arduino). |
| `STATUS` | Yêu cầu Arduino gửi lại gói JSON dữ liệu cảm biến. |

---
*Lưu ý: Luôn đảm bảo cảm biến độ ẩm đất được cắm chặt để logic Failsafe hoạt động chính xác.*
