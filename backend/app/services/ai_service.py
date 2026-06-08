import cv2
import logging
import numpy as np

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

    def detect_and_draw(self, frame: np.ndarray) -> np.ndarray:
        """
        Dự đoán bệnh trên ảnh và vẽ bounding box.
        """
        if self.model is None:
            return frame
        
        try:
            results = self.model(frame, verbose=False)
            
            # Vẽ kết quả lên ảnh
            for r in results:
                frame = r.plot()
                
            return frame
        except Exception as e:
            logger.error(f"Lỗi khi dự đoán ảnh: {e}")
            return frame
