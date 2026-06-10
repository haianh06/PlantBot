"""
pump_routes.py — API endpoints điều khiển bơm & phun sương
============================================================
Endpoints:
  POST /api/pump/control  — Gửi lệnh bật/tắt bơm hoặc phun sương
  GET  /api/pump/status   — Trạng thái hiện tại của relay
"""

import logging

from fastapi import APIRouter, Request

from backend.app.schemas.system_infor import PumpCommand, PumpStatus
from backend.app.schemas.message import MessageResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/pump", tags=["Pump Control"])


@router.post("/control", response_model=MessageResponse)
async def control_pump(command: PumpCommand, request: Request):
    """
    Điều khiển bơm nước hoặc phun sương.

    Body:
      - device: "pump" hoặc "mist"
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
        ("pump", "on"): "PUMP_ON",
        ("pump", "off"): "PUMP_OFF",
        ("mist", "on"): "MIST_ON",
        ("mist", "off"): "MIST_OFF",
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

    device_names = {"pump": "Máy bơm", "mist": "Phun sương", "fan": "Quạt"}
    device_name = device_names.get(command.device, command.device)
    action_name = "bật" if command.action == "on" else "tắt"

    return MessageResponse(
        message=f"Đã {action_name} {device_name}" if success else f"Lỗi gửi lệnh {device_name}",
        success=success,
    )


@router.get("/status", response_model=PumpStatus)
async def get_pump_status(request: Request):
    """Lấy trạng thái hiện tại của máy bơm và phun sương."""
    serial_service = request.app.state.serial_service
    data = serial_service.get_latest_data()

    if data:
        return PumpStatus(pump_on=data.pump_on, mist_on=data.mist_on, fan_on=data.fan_on)

    # Chưa có dữ liệu → cả 2 đều tắt
    return PumpStatus(pump_on=False, mist_on=False, fan_on=False)
