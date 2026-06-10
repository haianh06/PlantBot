
# TÀI LIỆU KỸ THUẬT: FAIL-SAFE SYSTEM

**Dự án:** Nhà kính mini thông minh trồng cải thìa (Bokchoy)

**Thiết bị phần cứng:** Arduino (hoặc tương thích)

**Vai trò:** Giám sát thời gian thực, bảo vệ sự sống thực vật và an toàn thiết bị độc lập (không phụ thuộc vào máy chủ/mạng).

---

## 1. KIẾN TRÚC TỔNG QUAN

Hệ thống hoạt động theo mô hình **Phòng thủ đa tầng**. Mọi dữ liệu từ cảm biến trước khi đưa vào thuật toán điều khiển đều phải đi qua bộ lọc kiểm tra tính toàn vẹn (Sanity Check). Nếu phát hiện bất thường về phần cứng hoặc môi trường, Arduino sẽ lập tức kích hoạt chế độ cứu vãn và bỏ qua các lệnh không thiết yếu từ Bộ não (Máy tính).

---

## 2. ĐỊNH NGHĨA NGƯỠNG MÔI TRƯỜNG & THIẾT BỊ

### 2.1. Cảm biến đầu vào (Inputs)

* **Nhiệt độ không khí ($T$):** Dải hoạt động an toàn $15^\circ\text{C} - 28^\circ\text{C}$.
* **Độ ẩm không khí ($H_{air}$):** Dải hoạt động lý tưởng $60\% - 80\%$.
* **Độ ẩm đất ($H_{soil}$):** Giá trị Analog ($0 - 1023$), ngưỡng cần tưới khi giá trị quy đổi $< 45\%$.

### 2.2. Thiết bị đầu ra (Outputs)

* **Quạt thông gió:** Giải nhiệt, lưu thông khí và giảm độ ẩm.
* **Hệ thống phun sương:** Hạ nhiệt độ môi trường, tăng độ ẩm không khí.
* **Máy bơm nước:** Cấp ẩm cho đất.

---

## 3. CÁC KỊCH BẢN PHÒNG THỦ CHI TIẾT (FAIL-SAFE CASES)

### TẦNG 1: BẢO VỆ PHẦN CỨNG (Sanity Check Logic)

*Tầng này kiểm tra lỗi vật lý (tuột dây, chập mạch, cảm biến hỏng). Thực hiện ngay đầu chu kỳ lặp.*

#### Case 1: Lỗi Cảm biến Khí (Nhiệt độ/Độ ẩm)

* **Dấu hiệu:** Giá trị đọc trả về `NaN` (Not a Number) hoặc giá trị không tưởng ($T = -127^\circ\text{C}$).
* **Trạng thái an toàn (Safe Mode):** * Khóa chặt hệ thống Phun sương (`LOW`).
* Chuyển Quạt thông gió sang chế độ chạy nền tuần hoàn (Bật 5 phút, tắt 25 phút) để giữ lưu thông khí tối thiểu.



#### Case 2: Lỗi Cảm biến Độ ẩm đất (Nguy cơ tràn nước)

* **Dấu hiệu:** Giá trị Analog giữ nguyên ở mức tuyệt đối ($0$ hoặc $1023$) liên tục trong 1 phút, không có sự dao động nhỏ của nhiễu môi trường.
* **Trạng thái an toàn (Safe Mode):** * **KHÓA CHẶT MÁY BƠM NƯỚC (`LOW`)**.
* Phát tín hiệu cảnh báo (nếu có còi/LED) và ngừng mọi lệnh tưới tự động cho đến khi phần cứng được thiết lập lại (Reset).



---

### TẦNG 2: PHẢN ỨNG ĐIỀU KIỆN CỰC ĐOAN (Environmental Crisis Logic)

*Tầng này xử lý khi cảm biến hoạt động đúng nhưng thời tiết/môi trường biến động mạnh.*

#### Case 3: Sốc nhiệt (Nhiệt độ $> 30^\circ\text{C}$)

* **Hành động:** Kích hoạt Quạt thông gió liên tục $100\%$ công suất để hút khí nóng ra ngoài. Đồng thời, bật Phun sương ngắt quãng (Bật 30 giây, dừng 2 phút) để hạ nhiệt mặt lá bằng phương pháp bay hơi, tránh phun liên tục gây úng không khí.

#### Case 4: Úng khí (Độ ẩm không khí $> 85\%$)

* **Hành động:** Tắt ngay lập tức hệ thống Phun sương. Ép bật Quạt thông gió ở mức tối đa nhằm cưỡng bức luồng khí khô bên ngoài tràn vào, ngăn chặn nấm mốc và thối bẹ lá.

#### Case 5: Khô hạn (Độ ẩm đất $< 45\%$)

* **Hành động:** Kích hoạt thuật toán **Tưới cây an toàn (Safe Pumping)**.

---

## 4. THUẬT TOÁN TƯỚI CÂY AN TOÀN (CRITICAL PUMPING TIMEOUT)

Để ngăn chặn hiện tượng kẹt Rơ-le hoặc cảm biến đọc sai khiến máy bơm chạy vô hạn làm ngập nhà kính, thuật toán tưới bắt buộc phải tuân theo chu kỳ **Timeout & Cooldown** sử dụng `millis()` (tuyệt đối không dùng `delay` làm nghẽn hệ thống).

* **Thời gian bơm tối đa (Timeout):** 15 giây. Sau 15 giây, dù độ ẩm đất chưa đạt ngưỡng mong muốn, máy bơm **bắt buộc phải tắt**.
* **Thời gian khóa bơm (Cooldown):** 5 phút. Trong 5 phút này, nước có thời gian ngấm đều vào đất và khuếch tán đến đầu dò cảm biến. Mọi lệnh yêu cầu tưới từ máy tính hoặc từ cảm biến trong thời gian này đều bị **vô hiệu hóa**.
* **Chu kỳ lặp:** Sau 5 phút khóa, hệ thống mới cho phép đọc lại cảm biến đất và đưa ra quyết định có cần tưới tiếp 15 giây nữa hay không.

---

## 5. QUY TRÌNH KIỂM THỬ (TESTING & VALIDATION)

Để đảm bảo hệ thống tự vận hành tốt khi bạn vắng mặt, hãy test thử 3 bài test thực tế sau sau khi nạp code:

1. **Test Tuột Dây:** Khi hệ thống đang chạy bình thường, hãy rút dây tín hiệu của cảm biến đất ra. Nếu máy bơm lập tức ngắt (hoặc không thể bật lên dù bạn đổ nước khô vào), mạch của bạn đã pass lớp bảo vệ 1.
2. **Test Khô Hạn Giả Lập:** Nhấc cảm biến đất bỏ ra ngoài không khí (để mô phỏng đất khô dưới 45%). Xem máy bơm có bật đúng 15 giây rồi tắt hẳn không. Đợi thử xem trong vòng 5 phút tiếp theo bơm có bị kích hoạt lại vô lý không.
3. **Test Quá Nhiệt:** Dùng bật lửa hoặc máy sấy hơ nhẹ gần cảm biến nhiệt độ để đẩy số đo lên $>30^\circ\text{C}$. Kiểm tra xem quạt có lập tức quay hết công suất và phun sương có phun theo chu kỳ ngắt quãng hay không.