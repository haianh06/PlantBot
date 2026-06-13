import time
import threading
import logging
import os
from collections import deque
from datetime import datetime
from typing import Optional

from backend.app.config import load_json_settings, SETTINGS_FILE
from backend.app.services.serial_service import SerialService
from backend.app.services.csv_service import CSVService

logger = logging.getLogger(__name__)

# Global cache để tối ưu hóa hàm get_current_stage() tránh đọc đĩa
_last_stage_mtime = 0.0
_cached_stage = 1

def get_current_stage() -> int:
    global _last_stage_mtime, _cached_stage
    try:
        mtime = os.path.getmtime(SETTINGS_FILE)
        if mtime == _last_stage_mtime:
            return _cached_stage
            
        _last_stage_mtime = mtime
        cfg = load_json_settings()
        data_cfg = cfg.get("data", {})
        
        if not data_cfg.get("is_tracking", True):
            _cached_stage = 0
            return 0
            
        planting_date_str = data_cfg.get("planting_date", "2026-06-10")
        planting_date = datetime.strptime(planting_date_str, "%Y-%m-%d")
        days_passed = (datetime.now() - planting_date).days + 1
        
        growth_cfg = data_cfg.get("growth_config", {})
        s1 = growth_cfg.get("stage1_days", 5)
        s2 = growth_cfg.get("stage2_days", 17)
        s3 = growth_cfg.get("stage3_days", 32)
        
        if days_passed <= s1:
            _cached_stage = 1
        elif days_passed <= s2:
            _cached_stage = 2
        elif days_passed <= s3:
            _cached_stage = 3
        else:
            _cached_stage = 4
        return _cached_stage
    except:
        return _cached_stage


class AutomationService:
    """
    Service quản lý tự động hóa chu trình gieo trồng (Automation Service).
    Tự động bật/tắt thiết bị dựa trên giai đoạn tăng trưởng của cây và cấu hình.
    """

    def __init__(self, serial_service: SerialService, csv_service: CSVService):
        self.serial_service = serial_service
        self.csv_service = csv_service
        self._thread: Optional[threading.Thread] = None
        self._running = False
        
        # Override cooldown trackers (timestamp cho đến khi hết hạn đè thủ công)
        self._override_until = {
            "pump": 0.0,
            "mist": 0.0,
            "fan": 0.0,
            "led": 0.0
        }
        
        # Lưu vết giờ tưới cuối cùng để tránh kích hoạt tưới lặp lại trong cùng 1 giờ
        self._last_watered_hour = -1
        self._last_watered_date = ""

        # Cấu hình bộ đệm RAM để tránh đọc đĩa liên tục trong luồng chính
        self._last_settings_mtime = 0.0
        self._cached_settings = {}
        self.temp_history = deque(maxlen=60)  # Lưu nhiệt độ trong 10 phút gần nhất (60 điểm đọc)

        # Đọc lịch sử tưới lần đầu từ CSV để khôi phục trạng thái bộ đệm khi restart
        self._init_last_watered()

    def _init_last_watered(self):
        """Đọc CSV một lần duy nhất lúc khởi động để lấy mốc giờ tưới cuối."""
        try:
            history = self.csv_service.get_history(limit=120)
            for row in history:
                ts_str = row.get("timestamp", "")
                if ts_str and bool(int(row.get("pump_on", 0) or 0)):
                    # Định dạng: "YYYY-MM-DDTHH:MM:SS+07:00"
                    parts = ts_str.split("T")
                    if len(parts) == 2:
                        date_str = parts[0]
                        time_part = parts[1]
                        hour_str = time_part.split(":")[0]
                        
                        self._last_watered_hour = int(hour_str)
                        self._last_watered_date = date_str
                        logger.info(f"🤖 [Automation Init] Khôi phục lịch sử tưới từ CSV: Ngày {date_str} lúc {hour_str} giờ.")
                        break
        except Exception as e:
            logger.error(f"Lỗi khởi tạo trạng thái tưới từ CSV: {e}")

    def record_temp(self, temp: float):
        """Lưu trữ nhiệt độ vào bộ đệm RAM để tính trung bình."""
        if temp > 0:
            self.temp_history.append(temp)

    def reset_overrides(self):
        """Reset tất cả các can thiệp thủ công và thông tin tưới nước để bắt đầu lứa mới sạch sẽ."""
        self._override_until = {
            "pump": 0.0,
            "mist": 0.0,
            "fan": 0.0,
            "led": 0.0
        }
        self._last_watered_hour = -1
        self._last_watered_date = ""
        logger.info("🤖 Automation Service: Đã reset bộ đệm và lịch sử tưới cho lứa mới.")

    def start(self):
        """Khởi động luồng chạy tự động hóa."""
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._run_loop, name="automation-loop", daemon=True)
        self._thread.start()
        logger.info("🤖 Automation Service đã khởi động.")

    def stop(self):
        """Dừng luồng chạy tự động hóa."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=3)
        logger.info("🤖 Automation Service đã dừng.")

    def register_override(self, device: str, duration_seconds: int = 900):
        """Tạm ngưng tự động hóa cho 1 thiết bị khi người dùng can thiệp thủ công (mặc định 15 phút)."""
        if device in self._override_until:
            self._override_until[device] = time.time() + duration_seconds
            logger.info(f"🤖 [Manual Override] Đè thủ công cho '{device}' - tạm ngưng tự động {duration_seconds}s")

    def is_overridden(self, device: str) -> bool:
        """Kiểm tra xem thiết bị có đang bị đè thủ công hay không."""
        return time.time() < self._override_until.get(device, 0.0)

    def get_override_remaining(self, device: str) -> int:
        """Thời gian đè thủ công còn lại (giây)."""
        remaining = int(self._override_until.get(device, 0.0) - time.time())
        return max(0, remaining)

    def _run_loop(self):
        while self._running:
            try:
                # Đồng bộ thiết lập từ settings.json bằng RAM Cache nếu có thay đổi trên đĩa
                try:
                    mtime = os.path.getmtime(SETTINGS_FILE)
                    if mtime != self._last_settings_mtime:
                        self._last_settings_mtime = mtime
                        self._cached_settings = load_json_settings()
                        logger.info("🤖 [Automation Cache] Thiết lập settings.json đã được nạp lại vào RAM.")
                except Exception as ex:
                    logger.error(f"Lỗi kiểm tra cache settings: {ex}")

                auto_mode_enabled = self._cached_settings.get("auto_mode", True)

                # 1. Kiểm tra xem chế độ Auto Mode có bật hay không
                if not auto_mode_enabled:
                    # Đảm bảo tắt cờ AUTO trên Arduino
                    latest = self.serial_service.get_latest_data()
                    if latest and getattr(latest, "dev_auto", True):
                        self.serial_service.send_command("AUTO_OFF")
                    time.sleep(5)
                    continue

                # Đảm bảo đồng bộ bật cờ AUTO trên Arduino
                latest = self.serial_service.get_latest_data()
                if latest and not getattr(latest, "dev_auto", False):
                    self.serial_service.send_command("AUTO_ON")

                if not self.serial_service.is_connected:
                    time.sleep(5)
                    continue

                # 2. Lấy thông tin cảm biến và giai đoạn hiện tại
                stage = get_current_stage()
                if stage == 0:
                    # Chưa trồng: Tạm dừng chạy tự động hóa thiết bị
                    time.sleep(5)
                    continue

                latest_data = self.serial_service.get_latest_data()
                if not latest_data:
                    time.sleep(5)
                    continue

                humi = latest_data.humidity
                
                # Temp Optimizer: Phân tích CSV tính nhiệt độ trung bình trong 10 phút gần đây
                # Nếu trời nóng (> 28°C), nhân hệ số thời gian tưới lên 1.25 (tưới nhiều hơn 25%)
                temp_factor = 1.0
                try:
                    history = self.csv_service.get_history(limit=600)  # Lấy lịch sử log
                    if history:
                        temps = [float(row["temperature"]) for row in history if row.get("temperature") and float(row["temperature"]) > 0]
                        if temps:
                            avg_temp = sum(temps) / len(temps)
                            if avg_temp > 28.0:
                                temp_factor = 1.25
                                logger.info(f"🤖 [Temp Optimization] Nhiệt độ TB nóng ({avg_temp:.1f}°C > 28°C), tăng thời gian tưới thêm 25%")
                except Exception as e:
                    logger.warning(f"Lỗi đọc CSV trong Temp Optimizer: {e}")

                now = datetime.now()
                current_hour = now.hour
                current_date = now.strftime("%Y-%m-%d")

                # 3. Chu kỳ đèn LED quang hợp (14h/ngày: 06:00 - 20:00)
                # Stage 1: Tắt hoàn toàn (trong bóng tối)
                # Stage 2 & 3: Bật 06:00 - 20:00
                # Stage 4: Tắt hoàn toàn (trước thu hoạch)
                should_led_on = False
                if stage in [2, 3]:
                    should_led_on = (6 <= current_hour < 20)

                if not self.is_overridden("led"):
                    if should_led_on and not latest_data.led_on:
                        self.serial_service.send_command("LED_ON")
                    elif not should_led_on and latest_data.led_on:
                        self.serial_service.send_command("LED_OFF")

                # 4. Lịch tưới nước tự động (Bơm gốc)
                # Stage 1: Không tưới gốc (Force OFF)
                # Stage 2: Mỗi 3 tiếng (09h, 12h, 15h, 18h) - Bơm 35s * temp_factor
                # Stage 3: Mỗi 2 tiếng (08h, 10h, 12h, 14h, 16h, 18h) - Bơm 45s * temp_factor
                # Stage 4: Không tưới gốc (Force OFF)
                should_pump_on = False
                pump_duration = 0
                
                if stage == 2 and should_led_on:
                    target_hours = [9, 12, 15, 18]
                    if current_hour in target_hours:
                        should_pump_on = True
                        pump_duration = int(35 * temp_factor)
                elif stage == 3 and should_led_on:
                    target_hours = [8, 10, 12, 14, 16, 18]
                    if current_hour in target_hours:
                        should_pump_on = True
                        pump_duration = int(45 * temp_factor)

                if should_pump_on and not self.is_overridden("pump"):
                    # Kiểm tra xem giờ hiện tại của ngày hôm nay đã tưới chưa
                    already_watered = (self._last_watered_hour == current_hour and self._last_watered_date == current_date)
                    if not already_watered:
                        # Kiểm tra file CSV phòng trường hợp khởi động lại Backend
                        try:
                            history = self.csv_service.get_history(limit=120)
                            for row in history:
                                ts_str = row.get("timestamp", "")
                                if ts_str:
                                    ts_hour = int(ts_str.split(":")[0])
                                    if ts_hour == current_hour and bool(int(row.get("pump_on", 0))):
                                        already_watered = True
                                        break
                        except Exception as e:
                            logger.error(f"Lỗi kiểm tra lịch sử tưới trong CSV: {e}")

                    if not already_watered and not latest_data.pump_on:
                        soil_moist = latest_data.soil_moisture
                        
                        # Soil Moisture-Gated Logic
                        if soil_moist > 70:
                            logger.info(f"🤖 [Smart Gating] Bỏ qua tưới (Skip) vì độ ẩm đất đã cao: {soil_moist}% (>70%)")
                            self._last_watered_hour = current_hour
                            self._last_watered_date = current_date
                        else:
                            # Xác định số lượng xung tưới (Pulse Watering)
                            # Ngưỡng:
                            # Ẩm đất 60% - 70%: Tưới xung ngắn (1 xung 10 giây)
                            # Ẩm đất < 60%: Tưới đầy đủ (3 xung, mỗi xung 10 giây cách nhau 15 giây)
                            pulse_count = 3
                            pulse_duration_ms = 10000
                            pulse_cooldown_ms = 15000
                            
                            if 60 <= soil_moist <= 70:
                                pulse_count = 1
                                logger.info(f"🤖 [Smart Gating] Độ ẩm đất trung bình ({soil_moist}%), kích hoạt tưới 1 xung (10s)")
                            else:
                                logger.info(f"🤖 [Smart Gating] Độ ẩm đất thấp ({soil_moist}%), kích hoạt tưới đầy đủ ({pulse_count} xung x 10s)")
                            
                            self._last_watered_hour = current_hour
                            self._last_watered_date = current_date

                            # Hàm chạy luồng tưới xung
                            def _run_pulse_watering(count, duration, cooldown):
                                for i in range(count):
                                    if not self.is_overridden("pump") and self.serial_service.is_connected:
                                        logger.info(f"🤖 [Pulse Pump] Xung {i+1}/{count} - Bật bơm trong {duration//1000}s.")
                                        # Gửi lệnh PUMP_ON kèm duration và cooldown
                                        self.serial_service.send_command(f"PUMP_ON {duration} {cooldown}")
                                        # Đợi hết thời gian chạy + thời gian cooldown
                                        time.sleep((duration + cooldown) / 1000.0)
                                logger.info("🤖 [Pulse Pump] Hoàn thành toàn bộ chu kỳ tưới xung.")

                            threading.Thread(target=_run_pulse_watering, args=(pulse_count, pulse_duration_ms, pulse_cooldown_ms), daemon=True).start()

                # 5. VPD & Phun sương, Quạt gió tự động
                temp = latest_data.temperature
                humi = latest_data.humidity

                if not self.is_overridden("mist") or not self.is_overridden("fan"):
                    if temp > 0 and humi > 0:  # Cảm biến bình thường
                        # A. Tính chỉ số VPD (kPa)
                        import math
                        vp_sat = 0.61078 * math.exp((17.27 * temp) / (temp + 237.3))
                        vpd = vp_sat * (1.0 - (humi / 100.0))

                        # B. Tính điểm đọng sương (Dew Point)
                        t_dew = temp - ((100.0 - humi) / 5.0)
                        dew_gap = temp - t_dew

                        should_fan_on = False
                        
                        # C. Logic kiểm soát bảo vệ đọng sương (Anti-Condensation)
                        if dew_gap < 2.0:
                            # Nguy cơ đọng sương/mốc lá: Khóa phun sương cứng và bật quạt thổi tản ẩm
                            if not self.is_overridden("mist") and latest_data.mist_on:
                                self.serial_service.send_command("MIST_OFF")
                                logger.warning(f"⚠️ [Anti-Condensation] Cảnh báo đọng sương! Gap={dew_gap:.1f}°C < 2°C. Tắt phun sương.")
                            if not self.is_overridden("fan") and not latest_data.fan_on:
                                self.serial_service.send_command("FAN_ON")
                                logger.warning("⚠️ [Anti-Condensation] Bật quạt tản ẩm.")
                            should_fan_on = True
                        else:
                            # D. Logic kiểm soát dựa trên chỉ số sinh học VPD
                            if vpd > 1.2:
                                # Không khí quá khô: Bật phun sương tuần hoàn (Pulse Misting: 5s on, 45s off)
                                if not self.is_overridden("mist") and not latest_data.mist_on:
                                    logger.info(f"🤖 [VPD Control] VPD={vpd:.2f} kPa (>1.2), bật phun sương tuần hoàn 5s-45s.")
                                    self.serial_service.send_command("MIST_CYCLIC 5000 45000")
                            elif vpd < 0.8:
                                # Không khí quá ẩm: Tắt phun sương và bật quạt tản ẩm
                                if not self.is_overridden("mist") and latest_data.mist_on:
                                    logger.info(f"🤖 [VPD Control] VPD={vpd:.2f} kPa (<0.8), tắt phun sương.")
                                    self.serial_service.send_command("MIST_OFF")
                                if not self.is_overridden("fan") and not latest_data.fan_on:
                                    logger.info(f"🤖 [VPD Control] VPD={vpd:.2f} kPa (<0.8), bật quạt tản ẩm.")
                                    self.serial_service.send_command("FAN_ON")
                                should_fan_on = True
                            else:
                                # Trong dải tối ưu: Tắt các thiết bị bù nếu không ở chế độ đặc biệt của stage
                                if not self.is_overridden("mist") and latest_data.mist_on:
                                    logger.info(f"🤖 [VPD Control] VPD={vpd:.2f} kPa trong dải tối ưu (0.8 - 1.2), tắt phun sương.")
                                    self.serial_service.send_command("MIST_OFF")
                                if not self.is_overridden("fan") and latest_data.fan_on:
                                    # Kiểm tra xem có đang ở stage 3 & bật đèn không
                                    stage3_fan = (stage == 3 and should_led_on)
                                    if not stage3_fan:
                                        logger.info(f"🤖 [VPD Control] VPD={vpd:.2f} kPa trong dải tối ưu, tắt quạt.")
                                        self.serial_service.send_command("FAN_OFF")

                        # 6. Quạt thông gió theo chu kỳ sinh trưởng (Stage 3 - Sinh khối)
                        # Nếu không bị ép bật ở trên bởi VPD hay Dew Point
                        if not should_fan_on and not self.is_overridden("fan"):
                            stage3_fan = (stage == 3 and should_led_on)
                            if stage3_fan and not latest_data.fan_on:
                                self.serial_service.send_command("FAN_ON")
                            elif not stage3_fan and latest_data.fan_on:
                                self.serial_service.send_command("FAN_OFF")

                # Cập nhật nhịp tim cho Arduino (sử dụng lệnh HB) ở tầng PC
                # (Nhịp tim PC được duy trì ở thread serial_service nên không cần gửi trực tiếp ở đây)

            except Exception as e:
                logger.error(f"Lỗi vòng lặp tự động hóa: {e}")

            time.sleep(10)  # Chu kỳ 10 giây/lần

