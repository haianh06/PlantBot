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
async def update_calibration_settings(data: CalibrationData, request: Request):
    """
    Cập nhật thông số calibration và lưu vào settings.json.
    Giá trị sẽ được giữ lại cho những lần chạy sau.
    """
    updated = update_calibration(
        dry_value=data.soil_moisture_dry,
        wet_value=data.soil_moisture_wet,
    )
    logger.info(f"Calibration updated: DRY={data.soil_moisture_dry}, WET={data.soil_moisture_wet}")
    
    # Gửi lệnh hiệu chuẩn xuống Arduino trực tiếp
    serial_service = request.app.state.serial_service
    if serial_service and serial_service.is_connected:
        serial_service.send_command(f"CALIB {data.soil_moisture_dry} {data.soil_moisture_wet}")
        
    return CalibrationData(**updated)


# ─── Automation, Presets & Calendar ─────────────────────────
from pydantic import BaseModel
from backend.app.config import get_auto_mode, update_auto_mode, get_growth_preset, update_growth_preset
from datetime import datetime, timedelta

class AutoModeResponse(BaseModel):
    auto_mode: bool
    growth_preset: str

class AutoModeRequest(BaseModel):
    enabled: bool

class PresetRequest(BaseModel):
    preset: str  # mature, baby, custom

class CalendarDay(BaseModel):
    day_number: int
    date: str
    stage: int
    is_current: bool
    stage_name: str
    events: list[str]
    led_hours: list[int]
    fan_hours: list[int]
    pump_hours: list[int]
    mist_target: str


@router.get("/auto-mode", response_model=AutoModeResponse)
async def get_auto_mode_route():
    """Lấy trạng thái tự động và preset hiện tại."""
    return AutoModeResponse(
        auto_mode=get_auto_mode(),
        growth_preset=get_growth_preset()
    )


@router.post("/auto-mode", response_model=AutoModeResponse)
async def update_auto_mode_route(body: AutoModeRequest, request: Request):
    """Cập nhật trạng thái tự động và đồng bộ xuống Arduino."""
    enabled = update_auto_mode(body.enabled)
    serial_service = request.app.state.serial_service
    if serial_service.is_connected:
        cmd = "AUTO_ON" if enabled else "AUTO_OFF"
        serial_service.send_command(cmd)
    return AutoModeResponse(
        auto_mode=enabled,
        growth_preset=get_growth_preset()
    )


@router.post("/preset")
async def update_preset_route(body: PresetRequest):
    """Cập nhật preset gieo trồng (mature, baby, custom)."""
    preset = update_growth_preset(body.preset)
    return {"status": "success", "preset": preset, "growth_config": get_growth_settings()}


@router.get("/calendar", response_model=list[CalendarDay])
async def get_calendar_route():
    """Tạo lịch gieo trồng N ngày dựa trên preset hiện tại."""
    cfg = get_growth_settings()
    planting_date_str = cfg.get("planting_date", "2026-06-10")
    try:
        planting_date = datetime.strptime(planting_date_str, "%Y-%m-%d")
    except:
        planting_date = datetime.now()

    # Tính tổng số ngày dựa trên config hiện tại
    s1 = cfg["growth_config"].get("stage1_days", 5)
    s2 = cfg["growth_config"].get("stage2_days", 17)
    s3 = cfg["growth_config"].get("stage3_days", 32)
    total_days = s3 + 3  # Giai đoạn 4 kéo dài khoảng 3 ngày (tổng cộng s3 + 3 ngày)

    today = datetime.now().date()
    calendar = []

    for i in range(1, total_days + 1):
        day_date = (planting_date + timedelta(days=i-1)).date()
        is_current = (day_date == today)
        
        # Xác định Giai đoạn và Sự kiện tương ứng
        if i <= s1:
            stage = 1
            stage_name = "Kích mầm"
            events = [
                "Đèn LED quang hợp: Tắt hoàn toàn",
                "Tưới gốc: Khóa tưới gốc",
                "Phun sương giữ ẩm mặt đất (ẩm khí 75% - 80%)"
            ]
            led_hours = []
            fan_hours = []
            pump_hours = []
            mist_target = "75% - 80%"
        elif i <= s2:
            stage = 2
            stage_name = "Cây con"
            events = [
                "Đèn LED quang hợp: Bật 14h/ngày (06:00 - 20:00)",
                "Tưới gốc tự động: 3 tiếng/lần (09:00, 12:00, 15:00, 18:00) cho 35s",
                "Phun sương trung bình (ẩm khí 70% - 75%)"
            ]
            led_hours = list(range(6, 20))
            fan_hours = []
            pump_hours = [9, 12, 15, 18]
            mist_target = "70% - 75%"
        elif i <= s3:
            stage = 3
            stage_name = "Sinh khối"
            events = [
                "Đèn LED quang hợp: Bật 14h/ngày (06:00 - 20:00)",
                "Tưới gốc tự động: 2 tiếng/lần (08:00 - 18:00) cho 45s",
                "Quạt gió: Bật 24/24 trong thời gian chiếu sáng",
                "Phun sương tăng cường (ẩm khí 75% - 80%)"
            ]
            led_hours = list(range(6, 20))
            fan_hours = list(range(6, 20))
            pump_hours = [8, 10, 12, 14, 16, 18]
            mist_target = "75% - 80%"
        else:
            stage = 4
            stage_name = "Thu hoạch"
            events = [
                "Đèn LED quang hợp: Tắt hoàn toàn",
                "Tưới gốc: Ngừng tưới gốc hoàn toàn 24h",
                "Phun sương nhẹ chống héo (ẩm khí 70% - 75%)",
                "Thu hoạch: Cắt sát gốc trước 06:00 AM"
            ]
            led_hours = []
            fan_hours = []
            pump_hours = []
            mist_target = "70% - 75%"

        calendar.append(CalendarDay(
            day_number=i,
            date=day_date.strftime("%Y-%m-%d"),
            stage=stage,
            stage_name=stage_name,
            is_current=is_current,
            events=events,
            led_hours=led_hours,
            fan_hours=fan_hours,
            pump_hours=pump_hours,
            mist_target=mist_target
        ))

    return calendar


from typing import Optional

class NewBatchRequest(BaseModel):
    preset: str
    planting_date: str
    growth_config: Optional[dict] = None


@router.post("/new-batch")
async def start_new_batch_route(body: NewBatchRequest, request: Request):
    """
    Bắt đầu một lứa rau mới:
    1. Sao lưu file CSV dữ liệu hiện tại
    2. Reset file CSV hiện tại về rỗng
    3. Cập nhật ngày trồng và preset cấu hình sinh trưởng trong settings.json
    4. Reset trạng thái override thủ công của AutomationService
    """
    csv_service = request.app.state.csv_service
    automation_service = request.app.state.automation_service
    
    # 1 & 2. Backup và reset CSV
    backup_file = csv_service.backup_and_reset()
    
    # 3. Cập nhật settings
    update_growth_preset(body.preset)
    
    config_data = {
        "planting_date": body.planting_date,
        "is_tracking": True
    }
    if body.preset == "custom" and body.growth_config:
        config_data["growth_config"] = {
            "stage1_days": body.growth_config.get("stage1_days", 5),
            "stage2_days": body.growth_config.get("stage2_days", 17),
            "stage3_days": body.growth_config.get("stage3_days", 32)
        }
    update_growth_settings(config_data)
    
    # 4. Reset AutomationService states
    if hasattr(automation_service, "reset_overrides"):
        automation_service.reset_overrides()
    else:
        automation_service._override_until = {"pump": 0.0, "mist": 0.0, "fan": 0.0, "led": 0.0}
        automation_service._last_watered_hour = -1
        automation_service._last_watered_date = ""

    return {
        "status": "success",
        "backup_file": backup_file,
        "growth_config": get_growth_settings()
    }
