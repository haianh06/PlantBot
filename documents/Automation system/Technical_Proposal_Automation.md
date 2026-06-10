# TÀI LIỆU ĐỀ XUẤT PHƯƠNG ÁN TRIỂN KHAI HỆ THỐNG PLANTBOT

Tài liệu này chi tiết hóa các cấp độ tự động hóa cho hệ thống PlantBot, dựa trên nghiên cứu về cây Bok Choy và kiến trúc hiện tại của dự án.

---

## 1. Phương án 1: Điều khiển theo Lịch trình (Time-based Control)
*Đây là phương án nền tảng, thay thế việc thao tác tay bằng các lệnh hẹn giờ định sẵn.*

### Cơ chế hoạt động:
- **Scheduler Engine:** Một dịch vụ chạy ngầm kiểm tra danh sách tác vụ mỗi phút. Nếu thời gian hiện tại khớp với cấu hình, lệnh sẽ được gửi xuống Arduino.
- **Cấu hình:** Lưu trữ trong `schedules.json`. Mỗi tác vụ bao gồm: `Thiết bị`, `Hành động (On/Off)`, `Thời gian (HH:mm)`, `Ngày trong tuần`.

### Áp dụng cho Bok Choy:
- **Đèn:** 06:00 ON, 20:00 OFF (14 tiếng sáng).
- **Bơm:** Thiết lập các khung giờ cố định (ví dụ: 09:00, 12:00, 15:00, 18:00 mỗi lần 45s).
- **Quạt:** 06:00 ON, 20:00 OFF.

### Đánh giá:
- **Ưu điểm:** Đơn giản nhất, ổn định, người dùng dễ dàng thay đổi qua UI.
- **Nhược điểm:** Không linh hoạt. Nếu trời nồm ẩm, bơm vẫn chạy theo lịch có thể gây úng rễ. Cần con người chủ động đổi lịch khi cây lớn.

---

## 2. Phương án 2: Lộ trình Tăng trưởng Kết hợp (Growth Profile & Hybrid Control)
*Đây là phương án tối ưu nhất cho người trồng, kết hợp tri thức sinh học và phản ứng cảm biến.*

### Cơ chế hoạt động:
- **Growth Profile:** Một file cấu hình định nghĩa "Vòng đời" của cây (Seedling -> Vegetative -> Harvest). Mỗi giai đoạn có thông số môi trường mục tiêu (Setpoints).
- **Hybrid Logic:** 
    - **Primary:** Chạy theo lịch trình giai đoạn.
    - **Secondary (Override):** Kiểm tra cảm biến trước khi thực thi. Nếu đến giờ tưới nhưng `Soil_Moisture > Threshold` -> Bỏ qua. Nếu nhiệt độ `Air_Temp > Max_Safe` -> Bật quạt khẩn cấp.

### Áp dụng cho Bok Choy (4 Giai đoạn):
1. **Giai đoạn 1 (Ngày 1-5):** Khóa bơm tự động, tắt đèn 100%.
2. **Giai đoạn 2 (Ngày 6-12):** Đèn 14h/ngày. Bơm 3h/lần nhưng chỉ hoạt động nếu `Soil_Moisture < 60%`.
3. **Giai đoạn 3 (Ngày 13-25):** Tăng ẩm không khí mục tiêu lên 80%. Quạt bật 24/24 khi đèn sáng.
4. **Giai đoạn 4 (Ngày 25-28):** Tự động ngắt tưới trước thu hoạch 24h.

### Đánh giá:
- **Ưu điểm:** Tự động hóa hoàn toàn từ lúc gieo hạt đến lúc thu hoạch. Giảm thiểu sai sót của con người.
- **Nhược điểm:** Cần logic xử lý phức tạp ở Backend để quản lý "Ngày tuổi" của cây và các ngưỡng cảm biến.

---

## 3. Phương án 3: Tối ưu hóa & Dự báo (ML-Ready Data Driven)
*Phương án nâng cao, hướng tới việc để máy tính tự học và đưa ra lịch trình tối ưu.*

### Cơ chế hoạt động:
- **Data Collection Layer:** Nâng cấp hệ thống ghi log. Lưu mọi biến số: `Môi trường (T, H, S)`, `Trạng thái thiết bị`, và `Sự thay đổi sau tác động`.
- **Feature Engineering:** Tạo bộ dataset có cấu trúc để train model.
- **ML Model (Phase tiếp theo):**
    - **Regression:** Dự báo bao lâu nữa độ ẩm đất sẽ giảm xuống mức nguy hiểm.
    - **Classification:** Phân loại sức khỏe cây dựa trên tốc độ tiêu thụ nước.

### Mục tiêu "Tune" lịch trình:
- Thay vì tưới 45s cố định, ML sẽ tính toán: "Với nhiệt độ 32°C và độ ẩm 60%, chỉ cần tưới 28s là đủ đạt mức ẩm lý tưởng".
- Tối ưu thời gian bật đèn dựa trên nhịp sinh học của cây để tiết kiệm điện.

### Đánh giá:
- **Ưu điểm:** Tiết kiệm tài nguyên tối đa, có khả năng tự thích ứng với các loại cây khác nhau mà không cần cấu hình tay nhiều.
- **Nhược điểm:** Cần thời gian thu thập dữ liệu lớn (ít nhất 2-3 vụ trồng) mới có thể xây dựng mô hình chính xác.

---

## TỔNG KẾT & ĐỀ XUẤT
Dựa trên hiện trạng dự án, lộ trình triển khai tốt nhất là:
1. **Giai đoạn 1:** Triển khai **Phương án 1** để hệ thống có khả năng vận hành cơ bản.
2. **Giai đoạn 2:** Xây dựng khung **Phương án 2** (Growth Profile) để hỗ trợ trồng Bok Choy tự động.
3. **Xuyên suốt:** Áp dụng **Phương án 3** ở mức độ thu thập dữ liệu (Logging) ngay từ đầu để có dataset cho việc phát triển AI/ML sau này.
