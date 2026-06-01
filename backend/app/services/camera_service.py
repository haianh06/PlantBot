"""
camera_service.py — Quản lý Camera Stream (Multi-Camera)
==========================================================
- Hỗ trợ chạy 1 hoặc 2 camera cùng lúc (laptop cam + USB webcam)
- Stream MJPEG qua HTTP cho frontend
- Bật/tắt từng camera độc lập
- Scan camera khả dụng (probe index 0, 1, 2)
- Tích hợp AI Disease Detection cho Camera 2 (index=1)
"""

import cv2
import time
import threading
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Generator

logger = logging.getLogger(__name__)

# Số camera tối đa scan
MAX_CAMERA_PROBE = 3

# Interval giữa các lần chạy AI inference (giây)
# Chỉ chạy 1 lần mỗi N giây để giảm tải CPU
PREDICT_INTERVAL = 3.0

# Camera index cho USB webcam (được gắn AI)
AI_CAMERA_INDEX = 1


class CameraService:
    """
    Quản lý multiple cameras qua OpenCV.

    Mỗi camera được quản lý bởi index (0, 1, ...).
    Có thể chạy nhiều camera đồng thời.
    Camera index=1 (USB) được tích hợp AI phát hiện bệnh cây.

    Usage:
        service = CameraService()
        service.set_disease_detector(detector)  # Gắn AI
        service.start(0)    # Bật camera 0
        service.start(1)    # Bật camera 1 (chạy song song + AI)
        frame = service.get_frame(0)
        service.stop(0)     # Tắt camera 0
        service.stop_all()  # Tắt tất cả
    """

    def __init__(self):
        self._captures: dict[int, cv2.VideoCapture] = {}
        self._locks: dict[int, threading.Lock] = {}

        # ─── Disease Detection (chỉ cho camera USB, index=1) ───
        self._disease_detector = None       # DiseaseDetector instance
        self._last_prediction: dict | None = None  # Cache kết quả gần nhất
        self._last_predict_time: float = 0.0       # Timestamp predict cuối

    def set_disease_detector(self, detector) -> None:
        """
        Gắn DiseaseDetector vào camera service.
        Detector sẽ chỉ chạy trên camera index=1 (USB).
        """
        self._disease_detector = detector
        logger.info("🧠 DiseaseDetector đã được gắn vào CameraService")

    def start(self, index: int = 0) -> bool:
        """
        Bật camera theo index.

        Args:
            index: Camera index (0 = laptop cam, 1 = USB webcam, ...)

        Returns:
            True nếu mở camera thành công
        """
        if index in self._captures:
            logger.info(f"Camera {index} đã đang chạy")
            return True

        try:
            # Sử dụng DirectShow (cv2.CAP_DSHOW) trên Windows để thay đổi độ phân giải camera USB ổn định hơn
            cap = cv2.VideoCapture(index, cv2.CAP_DSHOW)
            if not cap.isOpened():
                # Fallback về backend mặc định nếu DSHOW không mở được
                cap = cv2.VideoCapture(index)

            if not cap.isOpened():
                logger.warning(f"Không thể mở camera {index}")
                return False

            # Thiết lập codec MJPEG để mở khóa độ phân giải rộng HD (16:9) trên các webcam USB
            cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'MJPG'))

            # Cấu hình camera — Sử dụng độ phân giải HD 1280x720 (16:9) để có góc camera rộng nhất
            # Tránh việc bị crop hẹp ở tỉ lệ 4:3 (640x480) mặc định của OpenCV
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
            cap.set(cv2.CAP_PROP_FPS, 15)

            self._captures[index] = cap
            self._locks[index] = threading.Lock()

            actual_w = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
            actual_h = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
            logger.info(f"Đã bật camera {index} thành công. Độ phân giải thực tế: {actual_w}x{actual_h}")

            # Reset prediction cache khi bật camera AI
            if index == AI_CAMERA_INDEX:
                self._last_prediction = None
                self._last_predict_time = 0.0

            return True

        except Exception as e:
            logger.error(f"Lỗi khởi tạo camera {index}: {e}")
            return False

    def stop(self, index: int = 0) -> None:
        """Tắt camera theo index."""
        if index in self._captures:
            try:
                self._captures[index].release()
            except Exception as e:
                logger.error(f"Lỗi tắt camera {index}: {e}")
            finally:
                del self._captures[index]
                if index in self._locks:
                    del self._locks[index]

            # Clear prediction cache khi tắt camera AI
            if index == AI_CAMERA_INDEX:
                self._last_prediction = None
                self._last_predict_time = 0.0

            logger.info(f"Đã tắt camera {index}")

    def stop_all(self) -> None:
        """Tắt tất cả camera."""
        indices = list(self._captures.keys())
        for index in indices:
            self.stop(index)

    def is_active(self, index: int = 0) -> bool:
        """Kiểm tra camera có đang chạy không."""
        return index in self._captures and self._captures[index].isOpened()

    def get_active_cameras(self) -> list[int]:
        """Trả về danh sách index các camera đang chạy."""
        return [i for i, cap in self._captures.items() if cap.isOpened()]

    def get_frame(self, index: int = 0) -> Optional[bytes]:
        """
        Capture 1 frame JPEG từ camera.
        Nếu index == 1 (USB) và có DiseaseDetector → chạy AI + vẽ overlay.

        Args:
            index: Camera index

        Returns:
            bytes JPEG hoặc None nếu lỗi
        """
        if index not in self._captures:
            return None

        lock = self._locks.get(index)
        if not lock:
            return None

        with lock:
            try:
                ret, frame = self._captures[index].read()
                if not ret:
                    return None

                # ── AI Disease Detection (chỉ cho camera USB, index=1) ──
                if index == AI_CAMERA_INDEX and self._disease_detector is not None:
                    frame = self._apply_disease_detection(frame)

                # Encode frame sang JPEG
                _, jpeg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
                return jpeg.tobytes()

            except Exception as e:
                logger.error(f"Lỗi capture frame camera {index}: {e}")
                return None

    def _apply_disease_detection(self, frame: "np.ndarray") -> "np.ndarray":
        """
        Chạy AI inference (nếu đến lượt) và vẽ overlay lên frame.
        Inference chỉ chạy mỗi PREDICT_INTERVAL giây để giảm tải.
        Overlay sử dụng kết quả cache gần nhất.

        Args:
            frame: BGR frame từ camera

        Returns:
            Frame BGR đã vẽ overlay
        """
        current_time = time.time()

        # Kiểm tra có cần chạy inference không
        if current_time - self._last_predict_time >= PREDICT_INTERVAL:
            try:
                self._last_prediction = self._disease_detector.predict(frame)
                self._last_predict_time = current_time

                # Log kết quả
                label = self._last_prediction["label"]
                conf = self._last_prediction["confidence"]
                n_bbox = len(self._last_prediction.get("bboxes", []))
                logger.debug(
                    f"🧠 AI Prediction: {label} ({conf}%) — {n_bbox} bounding box(es)"
                )

            except Exception as e:
                logger.error(f"Lỗi AI inference: {e}")

        # Vẽ overlay từ kết quả cache (cho MỌI frame, không chỉ frame inference)
        if self._last_prediction is not None:
            frame = self._disease_detector.draw_overlay(frame, self._last_prediction)

        return frame

    def get_disease_status(self) -> dict:
        """
        Trả về kết quả AI prediction gần nhất (cho API endpoint).

        Returns:
            dict: Kết quả prediction hoặc trạng thái inactive
        """
        is_active = (
            self._disease_detector is not None
            and self.is_active(AI_CAMERA_INDEX)
        )

        if not is_active or self._last_prediction is None:
            return {
                "label": "N/A",
                "label_vn": "N/A",
                "confidence": 0.0,
                "is_active": is_active,
                "timestamp": "",
                "bboxes": [],
            }

        # Timezone Việt Nam (UTC+7)
        vn_tz = timezone(timedelta(hours=7))
        timestamp = datetime.now(vn_tz).strftime("%H:%M:%S %d/%m/%Y")

        return {
            "label": self._last_prediction["label"],
            "label_vn": self._last_prediction["label_vn"],
            "confidence": self._last_prediction["confidence"],
            "is_active": True,
            "timestamp": timestamp,
            "bboxes": self._last_prediction.get("bboxes", []),
        }

    def generate_stream(self, index: int = 0) -> Generator[bytes, None, None]:
        """
        Generator tạo MJPEG stream cho StreamingResponse.

        Args:
            index: Camera index

        Yields:
            MJPEG frame bytes (multipart/x-mixed-replace)
        """
        while self.is_active(index):
            frame = self.get_frame(index)
            if frame:
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" + frame + b"\r\n"
                )
            # ~15 FPS
            time.sleep(0.067)

    def list_available(self) -> list[int]:
        """
        Scan và trả về danh sách camera index khả dụng.
        Probe index 0 → MAX_CAMERA_PROBE.
        """
        available = []
        for i in range(MAX_CAMERA_PROBE):
            try:
                cap = cv2.VideoCapture(i)
                if cap.isOpened():
                    available.append(i)
                    cap.release()
            except Exception:
                pass
        return available
