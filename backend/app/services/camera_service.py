"""
camera_service.py — Quản lý Camera Stream (Multi-Camera)
==========================================================
- Hỗ trợ chạy 1 hoặc 2 camera cùng lúc (laptop cam + USB webcam)
- Stream MJPEG qua HTTP cho frontend
- Bật/tắt từng camera độc lập
- Scan camera khả dụng (probe index 0, 1, 2)
"""

import cv2
import numpy as np
import threading
import logging
import time

from typing import Optional, Generator

logger = logging.getLogger(__name__)

# Số camera tối đa scan
MAX_CAMERA_PROBE = 3



class CameraService:
    """
    Quản lý multiple cameras qua OpenCV.

    Mỗi camera được quản lý bởi index (0, 1, ...).
    Có thể chạy nhiều camera đồng thời.

    Usage:
        service = CameraService()
        service.start(0)    # Bật camera 0
        service.start(1)    # Bật camera 1 (chạy song song)
        frame = service.get_frame(0)
        service.stop(0)     # Tắt camera 0
        service.stop_all()  # Tắt tất cả
    """

    def __init__(self, ai_service=None):
        self._captures: dict[int, cv2.VideoCapture] = {}
        self._locks: dict[int, threading.Lock] = {}
        self._ai_service = ai_service
        self._ai_enabled: dict[int, bool] = {0: False, 1: False}

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




                # Nếu AI đang bật cho camera này, dự đoán và vẽ box
                if self._ai_enabled.get(index, False) and self._ai_service:
                    frame = self._ai_service.detect_and_draw(frame)

                # Encode frame sang JPEG
                _, jpeg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
                return jpeg.tobytes()

            except Exception as e:
                logger.error(f"Lỗi capture frame camera {index}: {e}")
                return None


    def toggle_ai(self, index: int) -> bool:
        """Bật/tắt AI cho camera index. Trả về trạng thái mới."""
        current = self._ai_enabled.get(index, False)
        self._ai_enabled[index] = not current
        logger.info(f"Đã {'bật' if not current else 'tắt'} AI cho camera {index}")
        return not current

    def is_ai_enabled(self, index: int) -> bool:
        return self._ai_enabled.get(index, False)
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
