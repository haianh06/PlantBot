# 🛡️ ĐẶC TẢ HỆ THỐNG AN TOÀN (FAILSAFE SPECIFICATION) — PLANTBOT

Tài liệu này đặc tả chi tiết toàn bộ các kịch bản lỗi hệ thống, cơ chế an toàn và tự động phục hồi của hệ thống điều khiển PlantBot (phiên bản Bok Choy). Mỗi kịch bản lỗi đều chỉ rõ hàm (function) chịu trách nhiệm xử lý trong mã nguồn Firmware Arduino.

---

## 1. Tổng hợp các mã lỗi & Trạng thái (Error Codes)

| Mã lỗi (`error_code`) | Định nghĩa trạng thái | Ý nghĩa |
| :--- | :--- | :--- |
| `0` | `NO_ERROR` | Hoạt động bình thường. |
| `1` | `DHT_ERROR` | Lỗi phần cứng/mất kết nối cảm biến nhiệt độ & độ ẩm DHT22. |
| `2` | `SOIL_ERROR` | Lỗi phần cứng/đứt dây cảm biến độ ẩm đất (chập mạch hoặc hở mạch). |
| `3` | `SOIL_OVERWATER_ERROR` | Cảnh báo ngập úng rễ. Độ ẩm đất vượt quá ngưỡng an toàn tối đa. |

---

## 2. Chi tiết 4 Kịch bản Failsafe & Hàm xử lý

### Case 1: Lỗi phần cứng cảm biến DHT22
*   **Mô tả kịch bản:** Cảm biến DHT22 bị đứt dây, lỏng chân tín hiệu hoặc bị hỏng dẫn đến trả về giá trị không hợp lệ (`NaN`) hoặc giá trị âm bất thường.
*   **Ngưỡng kích hoạt:** Giá trị nhiệt độ hoặc độ ẩm đo được là `NaN` hoặc nhiệt độ `<= -100.0`°C kéo dài liên tục **quá 30 giây** để tránh nhiễu tín hiệu tức thời.
*   **Hành vi thiết bị:**
    1.  Đặt `isSafeMode = true` và `currentErrorCode = 1 (DHT_ERROR)`.
    2.  Khóa chặt thiết bị phun sương: `mistRelay.forceLock()`.
    3.  Chuyển quạt thông gió sang chế độ chạy tuần hoàn an toàn: `fanRelay.setCyclicMode(300000UL, 1500000UL)` (Chạy 5 phút, nghỉ 25 phút).
*   **Cơ chế phục hồi:** Khi giá trị DHT22 hợp lệ trở lại, hệ thống tự động thoát Safe Mode, xóa mã lỗi, mở khóa phun sương (`mistRelay.clearLock()`), mở khóa quạt (`fanRelay.clearLock()`) và tắt chế độ quạt tuần hoàn an toàn.
*   **Hàm chịu trách nhiệm xử lý:** [sanityCheck(temp, humi, soilMoistureRaw)](file:///d:/Project/PlantBot/firmware/src/main.ino) trong `main.ino`.

---

### Case 2: Lỗi phần cứng cảm biến độ ẩm đất (Soil Sensor)
*   **Mô tả kịch bản:** Cảm biến độ ẩm đất bị tuột khỏi đất, đứt dây tín hiệu hoặc bị chập điện.
*   **Ngưỡng kích hoạt:** Giá trị analog thô đọc được từ chân cảm biến `soilMoistureRaw <= 5` (chập mạch) hoặc `soilMoistureRaw >= 1020` (hở mạch/đứt dây) liên tục **quá 30 giây**.
*   **Hành vi thiết bị:**
    1.  Đặt `isSafeMode = true` và `currentErrorCode = 2 (SOIL_ERROR)`.
    2.  Khóa chặt máy bơm tưới gốc ngay lập tức: `pumpRelay.forceLock()` để tránh máy bơm chạy khô gây cháy động cơ hoặc tưới tràn ngập khi cảm biến báo sai.
*   **Cơ chế phục hồi:** Khi giá trị analog thô quay về dải hợp lệ ($6 - 1019$), hệ thống tự động thoát Safe Mode, xóa mã lỗi và mở khóa máy bơm (`pumpRelay.clearLock()`).
*   **Hàm chịu trách nhiệm xử lý:** [sanityCheck(temp, humi, soilMoistureRaw)](file:///d:/Project/PlantBot/firmware/src/main.ino) trong `main.ino`.

---

### Case 3: Bảo vệ chống ngập úng rễ (Overwatering Protection)
*   **Mô tả kịch bản:** Cảm biến vẫn hoạt động tốt nhưng lượng nước tưới gốc quá nhiều, hoặc logic điều khiển của Backend gặp lỗi khiến máy bơm chạy liên tục không dừng.
*   **Ngưỡng kích hoạt:** Giá trị phần trăm độ ẩm đất quy đổi `soilPercent > 85%`.
*   **Hành vi thiết bị:**
    1.  Nếu máy bơm đang chạy $\rightarrow$ tắt máy bơm lập tức.
    2.  Khóa chặt máy bơm tưới gốc: `pumpRelay.forceLock()`.
    3.  Thiết lập mã lỗi cảnh báo `currentErrorCode = 3 (SOIL_OVERWATER_ERROR)`.
*   **Cơ chế phục hồi:** Khi nước rút bớt và độ ẩm đất giảm xuống **dưới 80%** (khoảng trễ hysteresis 5% tránh chập chờn), hệ thống sẽ tự động giải khóa cho máy bơm (`pumpRelay.clearLock()`) và xóa mã lỗi về `NO_ERROR`.
*   **Hàm chịu trách nhiệm xử lý:** [sanityCheck(temp, humi, soilMoistureRaw)](file:///d:/Project/PlantBot/firmware/src/main.ino) trong `main.ino`.

---

### Case 4: Mất kết nối với máy tính điều khiển PC (Offline Failsafe Mode)
*   **Mô tả kịch bản:** Máy tính chạy Backend bị mất nguồn đột ngột, lỗi phần mềm Backend hoặc đứt dây cáp Serial USB kết nối với Arduino.
*   **Ngưỡng kích hoạt:** Quá **60 giây** không nhận được bất cứ lệnh điều khiển nào hoặc lệnh nhịp tim `HB` (Heartbeat) từ PC.
*   **Hành vi thiết bị (Kích hoạt Offline Failsafe tự trị):**
    1.  Chuyển cờ trạng thái ngoại tuyến `isOfflineMode = true`.
    2.  **Lịch Đèn LED tự trị:** Tự động kích hoạt chu kỳ Đèn quang hợp: Bật 14 tiếng (được ưu tiên bật ngay khi bắt đầu vào chế độ Offline để đảm bảo quang hợp) và tắt 10 tiếng.
    3.  **Lịch Bơm nước tự trị:** Cứ mỗi 6 tiếng offline liên tục, tự động bật máy bơm tưới nhẹ gốc trong vòng 20 giây để duy trì sự sống cơ bản cho cây cải thìa.
*   **Cơ chế phục hồi:** Khi Backend kết nối lại thành công và gửi lệnh bất kỳ (bao gồm lệnh `HB` gửi mỗi 30s), Arduino nhận diện tín hiệu, tự động đặt `isOfflineMode = false`, hủy bỏ các lịch trình offline tự trị và trả lại quyền điều khiển cho PC Backend.
*   **Hàm chịu trách nhiệm xử lý:**
    *   Phát hiện timeout & thực thi lịch offline: [checkConnection()](file:///d:/Project/PlantBot/firmware/src/main.ino) trong `main.ino`.
    *   Cập nhật mốc thời gian khi có lệnh Serial: [executeCommand(cmd)](file:///d:/Project/PlantBot/firmware/src/main.ino) trong `main.ino`.
