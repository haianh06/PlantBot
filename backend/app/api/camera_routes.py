"""
camera_routes.py — API endpoints cho Camera Stream
====================================================
Hỗ trợ multi-camera (chạy 1 hoặc 2 camera cùng lúc).

Endpoints:
  GET  /api/camera/stream/{index}   — MJPEG video stream
  POST /api/camera/toggle/{index}   — Bật/tắt camera theo index
  GET  /api/camera/status           — Trạng thái tất cả camera
  GET  /api/camera/list             — Danh sách camera khả dụng
"""

import logging

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from backend.app.schemas.camera_infor import CameraInfo, CameraListResponse
from backend.app.schemas.message import MessageResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/camera", tags=["Camera"])


@router.get("/stream/{index}")
async def camera_stream(index: int, request: Request):
    """
    MJPEG video stream từ camera.

    Args:
        index: Camera index (0 = laptop cam, 1 = USB webcam)
    """
    camera_service = request.app.state.camera_service

    if not camera_service.is_active(index):
        return MessageResponse(
            message=f"Camera {index} chưa được bật",
            success=False,
        )

    return StreamingResponse(
        camera_service.generate_stream(index),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@router.post("/toggle/{index}", response_model=MessageResponse)
async def toggle_camera(index: int, request: Request):
    """
    Bật/tắt camera theo index.
    Nếu camera đang tắt → bật. Nếu đang bật → tắt.
    """
    camera_service = request.app.state.camera_service

    if camera_service.is_active(index):
        # Đang bật → tắt
        camera_service.stop(index)
        return MessageResponse(message=f"Đã tắt camera {index}")
    else:
        # Đang tắt → bật
        success = camera_service.start(index)
        if success:
            return MessageResponse(message=f"Đã bật camera {index}")
        return MessageResponse(
            message=f"Không thể bật camera {index} — không tìm thấy thiết bị",
            success=False,
        )


@router.get("/status")
async def camera_status(request: Request):
    """Trạng thái tất cả camera (đang bật/tắt)."""
    camera_service = request.app.state.camera_service
    active = camera_service.get_active_cameras()

    cameras = []
    # Hiển thị tối đa 3 camera slots
    for i in range(3):
        cameras.append(CameraInfo(index=i, is_active=(i in active)))

    return {"cameras": cameras}


@router.get("/list", response_model=CameraListResponse)
async def list_cameras(request: Request):
    """Scan và liệt kê camera khả dụng trên máy."""
    camera_service = request.app.state.camera_service
    available = camera_service.list_available()
    active = camera_service.get_active_cameras()

    cameras = [
        CameraInfo(index=i, is_active=(i in active))
        for i in available
    ]

    return CameraListResponse(
        cameras=cameras,
        available_indices=available,
    )

