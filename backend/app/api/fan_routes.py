"""
fan_routes.py — API endpoints điều khiển quạt
============================================================
Endpoints:
  POST /api/fan/control  — Gửi lệnh bật/tắt quạt
  GET  /api/fan/status   — Trạng thái hiện tại của relay
"""

import logging

from fastapi import APIRouter, Request

from backend.app.models import FanCommand, FanStatus, MessageResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/fan", tags=["Fan Control"])


@router.post("/control", response_model=MessageResponse)
async def control_fan(command: FanCommand, request: Request):
    """
    Điều khiển quạt.

    Body:
      - device: "fan"
      - action: "on" hoặc "off"
    """
    serial_service = request.app.state.serial_service

    if not serial_service.is_connected:
        return MessageResponse(
            message="Chưa kết nối Arduino",
            success=False,
        )

    # Map command → Serial command string
    cmd_map = {
        ("fan", "on"): "FAN_ON",
        ("fan", "off"): "FAN_OFF",
    }

    serial_cmd = cmd_map.get((command.device, command.action))
    if not serial_cmd:
        return MessageResponse(
            message=f"Lệnh không hợp lệ: {command.device} {command.action}",
            success=False,
        )

    # Gửi lệnh xuống Arduino
    success = serial_service.send_command(serial_cmd)

    device_name = "Quạt"
    action_name = "bật" if command.action == "on" else "tắt"

    return MessageResponse(
        message=f"Đã {action_name} {device_name}" if success else f"Lỗi gửi lệnh {device_name}",
        success=success,
    )


@router.get("/status", response_model=FanStatus)
async def get_fan_status(request: Request):
    """Lấy trạng thái hiện tại của quạt."""
    serial_service = request.app.state.serial_service
    data = serial_service.get_latest_data()

    if data:
        return FanStatus(fan_on=data.fan_on)

    # Chưa có dữ liệu → tắt
    return FanStatus(fan_on=False)
