import cv2
import logging
import numpy as np
import time
import os
from datetime import datetime

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self, model_path: str):
        try:
            from ultralytics import YOLO
            self.model = YOLO(model_path)
            logger.info(f"Đã load AI model từ {model_path}")
        except ImportError:
            logger.error("Không tìm thấy thư viện ultralytics. Vui lòng cài đặt: pip install ultralytics")
            self.model = None
        except Exception as e:
            logger.error(f"Lỗi khi load model: {e}")
            self.model = None
            
        self._last_saved_time = 0
        self._cooldown_seconds = 5 # Lưu tối đa 1 ảnh mỗi 5 giây
        
        self.notification_service = None # Được set từ main.py
        self._last_notification_time = 0
        
        self._save_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "diseased_images")
        os.makedirs(self._save_dir, exist_ok=True)


    def detect_and_draw(self, frame: np.ndarray) -> np.ndarray:
        """
        Dự đoán bệnh trên ảnh và vẽ bounding box.
        """
        if self.model is None:
            return frame
        
        try:
            results = self.model(frame, verbose=False)
            # Kiểm tra xem có phát hiện được bệnh nào không
            has_disease = False
            for r in results:
                frame = r.plot()
                if len(r.boxes) > 0:
                    has_disease = True
                    
            if has_disease:
                current_time = time.time()
                if current_time - self._last_saved_time >= self._cooldown_seconds:
                    self._last_saved_time = current_time
                    
                    # Lấy ngày giờ định dạng
                    now = datetime.now()
                    timestamp_str = now.strftime("%Y-%m-%d %H:%M:%S")
                    
                    # Vẽ ngày giờ lên góc trái dưới của ảnh
                    cv2.putText(frame, timestamp_str, (10, frame.shape[0] - 10), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2, cv2.LINE_AA)
                    
                    # Lưu file
                    filename = f"disease_{now.strftime('%Y%m%d_%H%M%S')}.jpg"
                    filepath = os.path.join(self._save_dir, filename)
                    cv2.imwrite(filepath, frame)
                    logger.info(f"Đã lưu ảnh phát hiện bệnh: {filename}")
                    
                    # Kiểm tra và gửi thông báo
                    if self.notification_service:
                        from backend.app.config import get_notification_settings
                        settings = get_notification_settings()
                        notification_cooldown = settings.get("cooldown_minutes", 5) * 60
                        
                        if current_time - self._last_notification_time >= notification_cooldown:
                            self._last_notification_time = current_time
                            alert_msg = f"Cảnh báo: Phát hiện dấu hiệu bệnh trên cây lúc {timestamp_str}"
                            self.notification_service.trigger_notification(filename, filepath, alert_msg)
                

            return frame
        except Exception as e:
            logger.error(f"Lỗi khi dự đoán ảnh: {e}")
            return frame
