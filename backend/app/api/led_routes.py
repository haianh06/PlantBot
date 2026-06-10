"""
led_routes.py — API endpoints điều khiển đèn
============================================================
Endpoints:
  POST /api/led/control  — Gửi lệnh bật/tắt đèn
  GET  /api/led/status   — Trạng thái hiện tại của relay
"""

import logging

from fastapi import APIRouter, Request

from backend.app.schemas.device_control_history import LedCommand, LedStatus

from backend.app.schemas.message import MessageResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/led", tags=["Led Control"])


@router.post("/control", response_model=MessageResponse)
async def control_led(command: LedCommand, request: Request):
    """
    Điều khiển đèn.

    Body:
      - device: "led"
      - action: "on" hoặc "off"
    """
    serial_service = request.app.state.serial_service

    if not serial_service.is_connected:
        return MessageResponse(
            message="Chưa kết nối Arduino",
            success=False,
        )

    # Kiểm tra Safe Mode
    latest_data = serial_service.get_latest_data()
    if latest_data and getattr(latest_data, "safe_mode", False):
        return MessageResponse(
            message="Hệ thống đang trong chế độ an toàn (Safe Mode). Không thể điều khiển thủ công.",
            success=False,
        )

    # Map command → Serial command string
    cmd_map = {
        ("led", "on"): "LED_ON",
        ("led", "off"): "LED_OFF",
    }

    serial_cmd = cmd_map.get((command.device, command.action))
    if not serial_cmd:
        return MessageResponse(
            message=f"Lệnh không hợp lệ: {command.device} {command.action}",
            success=False,
        )

    # Gửi lệnh xuống Arduino
    success = serial_service.send_command(serial_cmd)

    device_name = "Đèn"
    action_name = "bật" if command.action == "on" else "tắt"

    return MessageResponse(
        message=f"Đã {action_name} {device_name}" if success else f"Lỗi gửi lệnh {device_name}",
        success=success,
    )


@router.get("/status", response_model=LedStatus)
async def get_led_status(request: Request):
    """Lấy trạng thái hiện tại của đèn."""
    serial_service = request.app.state.serial_service
    data = serial_service.get_latest_data()

    if data:
        return LedStatus(led_on=data.led_on)

    # Chưa có dữ liệu → tắt
    return LedStatus(led_on=False)
