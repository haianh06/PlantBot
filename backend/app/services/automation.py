import time
import threading
import logging
from datetime import datetime
from typing import Optional

from backend.app.config import get_auto_mode, get_growth_settings, load_json_settings
from backend.app.services.serial_service import SerialService
from backend.app.services.csv_service import CSVService

logger = logging.getLogger(__name__)

def get_current_stage() -> int:
    try:
        from backend.app.config import load_json_settings
        from datetime import datetime
        cfg = load_json_settings()
        data_cfg = cfg.get("data", {})
        
        if not data_cfg.get("is_tracking", True):
            return 0
            
        planting_date_str = data_cfg.get("planting_date", "2026-06-10")
        planting_date = datetime.strptime(planting_date_str, "%Y-%m-%d")
        days_passed = (datetime.now() - planting_date).days + 1
        
        growth_cfg = data_cfg.get("growth_config", {})
        s1 = growth_cfg.get("stage1_days", 5)
        s2 = growth_cfg.get("stage2_days", 17)
        s3 = growth_cfg.get("stage3_days", 32)
        
        if days_passed <= s1: return 1
        if days_passed <= s2: return 2
        if days_passed <= s3: return 3
        return 4
    except:
        return 1


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
                # 1. Kiểm tra xem chế độ Auto Mode có bật hay không
                if not get_auto_mode():
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
                latest_data = self.serial_service.get_latest_data()
                if not latest_data:
                    time.sleep(5)
                    continue

                humi = latest_data.humidity
                
                # ML Optimizer: Phân tích CSV tính nhiệt độ trung bình trong 10 phút gần đây
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
                                logger.info(f"🤖 [ML Optimization] Nhiệt độ TB nóng ({avg_temp:.1f}°C > 28°C), tăng thời gian tưới thêm 25%")
                except Exception as e:
                    logger.warning(f"Lỗi đọc CSV trong ML Optimizer: {e}")

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
                        logger.info(f"🤖 [Auto Pump] Kích hoạt tưới giai đoạn {stage} trong {pump_duration} giây.")
                        self.serial_service.send_command("PUMP_ON")
                        self._last_watered_hour = current_hour
                        self._last_watered_date = current_date
                        
                        # Luồng ngắt bơm sau thời gian chạy chỉ định
                        def _stop_pump_after(sec):
                            time.sleep(sec)
                            if not self.is_overridden("pump") and self.serial_service.is_connected:
                                self.serial_service.send_command("PUMP_OFF")
                                logger.info("🤖 [Auto Pump] Tắt bơm tự động hoàn thành.")
                                
                        threading.Thread(target=_stop_pump_after, args=(pump_duration,), daemon=True).start()

                # 5. Phun sương điều hòa độ ẩm khí (Hysteresis dải trễ tránh chập chờn)
                # Stage 1 & 3: ẩm khí dưới 75% bật, vượt qua 80% tắt
                # Stage 2 & 4: ẩm khí dưới 70% bật, vượt qua 75% tắt
                mist_low = 70
                mist_high = 75
                if stage in [1, 3]:
                    mist_low = 75
                    mist_high = 80

                if not self.is_overridden("mist"):
                    if humi > 0:  # Cảm biến bình thường
                        if humi < mist_low and not latest_data.mist_on:
                            self.serial_service.send_command("MIST_ON")
                        elif humi >= mist_high and latest_data.mist_on:
                            self.serial_service.send_command("MIST_OFF")

                # 6. Quạt thông gió
                # Stage 3: Bật 24/24 trong suốt thời gian bật đèn
                # Khác: Tắt (quá nhiệt Arduino tự failsafe cứu cánh)
                should_fan_on = False
                if stage == 3 and should_led_on:
                    should_fan_on = True

                if not self.is_overridden("fan"):
                    if should_fan_on and not latest_data.fan_on:
                        self.serial_service.send_command("FAN_ON")
                    elif not should_fan_on and latest_data.fan_on:
                        self.serial_service.send_command("FAN_OFF")

            except Exception as e:
                logger.error(f"Lỗi vòng lặp tự động hóa: {e}")

            time.sleep(10)  # Chu kỳ 10 giây/lần
