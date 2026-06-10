

### Mục Tiêu:
- Xây dựng hệ thống tự động điều khiển các thiết bị IOT hardcode vào phần cứng của arduino
- Đảm bảo hệ thống hoạt động nếu máy chủ không hoạt động 
- Có thể đảm bảo chăm sóc tối thiểu cho cây
### Thiết kế:
- Các thiết bị cần điều khiển
	- Quạt gió x1
	- Đèn quang hợp x1
	- Mô tơ phun sương x1
	- Mô tơ tưới x1
- Các thiết bị cảm biến
	- Cảm biến độ ẩm đất x5
	- Cảm biến độ ẩm không khí và nhiệt độ không khí 
#### Các yếu tố ảnh hưởng
- Điều khiển quạt:
	- Bật:
		- Độ ẩm: giảm 
		- Nhiệt độ: giảm
	- Tắt:
		- Tăng ẩm
		- Không có thông khí 
- Điều khiển phun sương
	- Bật
		- Nhiệt độ: giảm
		- Độ ẩm tăng:
	- Nếu bật lâu: 
		- Sương đọng lá, gây nấm bệnh
	- Tắt
		- Nhiệt độ: tăng
		- Độ ẩm: giảm
- Điều khiển tưới
	- Bật:
		 - Độ ẩm đất: tăng
		 - Độ ẩm không khí: tăng nhẹ
	- Tắt
		- Độ ẩm đất: giảm 


| **Thiết bị (Khi ON)** | **Nhiệt độ phòng** | **Độ ẩm không khí** | **Độ ẩm đất** | **Lượng CO2/Khí lưu thông** | **Tác động lên Cây cải thìa**             |
| ------------------------- | ---------------------- | ----------------------- | ----------------- | ------------------------------- | --------------------------------------------- |
| **Quạt thông gió**        | 📉 Giảm                | 📉 Giảm                 | 📉 Giảm nhẹ       | 📈 Tăng                         | Làm mát, ngăn nấm, bổ sung khí CO2.           |
| **Đèn quang hợp**         | 📈 Tăng                | 📉 Giảm                 | 📉 Giảm           | ➖ Không đổi                     | Kích thích sinh trưởng, tăng trao đổi chất.   |
| **Phun sương**            | 📉 Giảm                | 📈 Tăng                 | ➖ Không đổi       | ➖ Không đổi                     | Hạ nhiệt nhanh, giữ lá tươi, bù ẩm không khí. |
| **Bơm tưới gốc**          | ➖ Không đổi            | 📈 Tăng nhẹ             | 📈 Tăng mạnh      | ➖ Không đổi                     | Cung cấp nước và dinh dưỡng cho rễ.           |
#### Tương tác giữa các thiết bị phần cứng

| **Nếu Thiết bị A đang...** | **(Quạt)**           | ** (Đèn)**        | ** (Phun Sương)**    | ** (Bơm tưới)**         |
| -------------------------- | -------------------- | ----------------- | -------------------- | ----------------------- |
| **Quạt == ON** (do quá ẩm) | -                    | Vẫn chạy theo giờ | Bắt buộc OFF         | Vẫn chạy theo độ ẩm đất |
| **Đèn == OFF** (Ban đêm)   | Chỉ chạy chu kỳ ngắn | -                 | Bắt buộc OFF         | Giảm tần suất tưới gốc  |
| **Phun Sương == ON**       | Tạm dừng 2-3 phút    | Vẫn chạy theo giờ | -                    | Vẫn chạy theo độ ẩm đất |
| **Bơm tưới == ON**         | Vẫn chạy bình thường | Vẫn chạy theo giờ | Vẫn chạy bình thường | -                       |
#### Hệ thống dự kiến 
- Nhiệt độ 
	- 

