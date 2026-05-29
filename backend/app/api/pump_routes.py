"""
pump_routes.py — API endpoints điều khiển bơm & phun sương
============================================================
Endpoints:
  POST /api/pump/control  — Gửi lệnh bật/tắt bơm hoặc phun sương
  GET  /api/pump/status   — Trạng thái hiện tại của relay
"""

import logging

from fastapi import APIRouter, Request

from backend.app.models import PumpCommand, PumpStatus, MessageResponse

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

    # Map command → Serial command string
    cmd_map = {
        ("pump", "on"): "PUMP_ON",
        ("pump", "off"): "PUMP_OFF",
        ("mist", "on"): "MIST_ON",
        ("mist", "off"): "MIST_OFF",
    }

    serial_cmd = cmd_map.get((command.device, command.action))
    if not serial_cmd:
        return MessageResponse(
            message=f"Lệnh không hợp lệ: {command.device} {command.action}",
            success=False,
        )

    # Gửi lệnh xuống Arduino
    success = serial_service.send_command(serial_cmd)

    device_name = "Máy bơm" if command.device == "pump" else "Phun sương"
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
        return PumpStatus(pump_on=data.pump_on, mist_on=data.mist_on)

    # Chưa có dữ liệu → cả 2 đều tắt
    return PumpStatus(pump_on=False, mist_on=False)
