"""
system_routes.py — API endpoints thông tin hệ thống + Calibration
==================================================================
Endpoints:
  GET  /api/system/info          — Thông tin kết nối Serial + tổng quan
  GET  /api/system/ports         — Danh sách COM port khả dụng
  POST /api/system/connect       — Kết nối/ngắt kết nối Arduino
  GET  /api/system/calibration   — Lấy thông số calibration hiện tại
  POST /api/system/calibration   — Cập nhật thông số calibration
  GET  /api/system/growth        — Lấy cấu hình giai đoạn tăng trưởng
  POST /api/system/growth        — Cập nhật cấu hình giai đoạn tăng trưởng
"""

import logging

from fastapi import APIRouter, Request

from backend.app.schemas.system_infor import SystemInfo, ConnectRequest
from backend.app.schemas.calibration import CalibrationData
from backend.app.schemas.message import MessageResponse
from backend.app.schemas.growth import GrowthSettings
from backend.app.config import get_calibration, update_calibration, get_growth_settings, update_growth_settings
from backend.app.services.serial_service import SerialService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/system", tags=["System"])


@router.get("/info", response_model=SystemInfo)
async def get_system_info(request: Request):
    """Thông tin kết nối Serial và trạng thái hệ thống."""
    serial_service: SerialService = request.app.state.serial_service

    return SystemInfo(
        serial_port=serial_service.port,
        is_connected=serial_service.is_connected,
        baudrate=serial_service.baudrate,
        available_ports=SerialService.get_available_ports(),
    )


@router.get("/ports")
async def get_available_ports():
    """Liệt kê tất cả COM port khả dụng trên máy."""
    ports = SerialService.get_available_ports()
    return {"ports": ports}


@router.post("/connect", response_model=MessageResponse)
async def connect_serial(body: ConnectRequest, request: Request):
    """
    Kết nối hoặc reconnect Arduino.

    Body:
      - port: COM port cụ thể (vd: "COM3") hoặc "auto"
    """
    serial_service: SerialService = request.app.state.serial_service

    # Ngắt kết nối cũ nếu có
    if serial_service.is_connected:
        serial_service.disconnect()

    # Kết nối mới
    success = serial_service.connect(port=body.port)

    if success:
        return MessageResponse(
            message=f"Đã kết nối Arduino tại {serial_service.port}",
        )
    return MessageResponse(
        message="Không thể kết nối Arduino — kiểm tra dây USB và COM port",
        success=False,
    )


@router.post("/disconnect", response_model=MessageResponse)
async def disconnect_serial(request: Request):
    """Ngắt kết nối Arduino."""
    serial_service: SerialService = request.app.state.serial_service
    serial_service.disconnect()
    return MessageResponse(message="Đã ngắt kết nối Arduino")


# ─── Growth Settings ──────────────────────────────────────────

@router.get("/growth", response_model=GrowthSettings)
async def get_growth_config_route():
    """Lấy cấu hình giai đoạn tăng trưởng và ngày trồng."""
    return get_growth_settings()


@router.post("/growth", response_model=GrowthSettings)
async def update_growth_config_route(data: GrowthSettings):
    """Cập nhật ngày trồng và cấu hình giai đoạn."""
    updated = update_growth_settings(data.model_dump())
    return updated


# ─── Calibration ─────────────────────────────────────────────

@router.get("/calibration", response_model=CalibrationData)
async def get_calibration_settings():
    """Lấy thông số calibration cảm biến hiện tại từ settings.json."""
    cal = get_calibration()
    return CalibrationData(**cal)


@router.post("/calibration", response_model=CalibrationData)
async def update_calibration_settings(data: CalibrationData):
    """
    Cập nhật thông số calibration và lưu vào settings.json.
    Giá trị sẽ được giữ lại cho những lần chạy sau.
    """
    updated = update_calibration(
        dry_value=data.soil_moisture_dry,
        wet_value=data.soil_moisture_wet,
    )
    logger.info(f"Calibration updated: DRY={data.soil_moisture_dry}, WET={data.soil_moisture_wet}")
    return CalibrationData(**updated)
