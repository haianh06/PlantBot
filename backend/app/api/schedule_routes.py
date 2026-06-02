"""
schedule_routes.py — API endpoints hẹn giờ thiết bị
=====================================================
Endpoints:
  GET    /api/schedules         — Liệt kê tất cả lịch hẹn
  POST   /api/schedules         — Tạo lịch hẹn mới
  DELETE /api/schedules/{id}    — Xóa lịch hẹn
  POST   /api/schedules/{id}/toggle — Bật/tắt lịch hẹn
"""

import logging

from fastapi import APIRouter, Request, HTTPException

from backend.app.models import (
    ScheduleCreateRequest,
    ScheduleItem,
    ScheduleListResponse,
    MessageResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/schedules", tags=["Scheduler"])


@router.get("", response_model=ScheduleListResponse)
async def list_schedules(request: Request):
    """Lấy danh sách tất cả lịch hẹn giờ."""
    scheduler = request.app.state.scheduler_service
    schedules = scheduler.get_all()
    return ScheduleListResponse(schedules=schedules)


@router.post("", response_model=ScheduleItem)
async def create_schedule(body: ScheduleCreateRequest, request: Request):
    """
    Tạo lịch hẹn giờ mới.

    Body:
      - device: "pump" | "mist" | "fan"
      - action: "on" | "off"
      - time: "HH:MM" (24h format)
      - days: [0..6] (0=Thứ Hai .. 6=Chủ Nhật). Mặc định: mỗi ngày
      - enabled: true/false
      - label: ghi chú (tùy chọn)

    Ví dụ: Bật quạt lúc 6:30 mỗi ngày
      { "device": "fan", "action": "on", "time": "06:30" }
    """
    scheduler = request.app.state.scheduler_service

    try:
        item = scheduler.add_schedule(
            device=body.device,
            action=body.action,
            time_str=body.time,
            days=body.days,
            enabled=body.enabled,
            label=body.label,
        )
        return item
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{schedule_id}", response_model=MessageResponse)
async def delete_schedule(schedule_id: str, request: Request):
    """Xóa lịch hẹn giờ theo ID."""
    scheduler = request.app.state.scheduler_service
    removed = scheduler.remove_schedule(schedule_id)

    if not removed:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy schedule: {schedule_id}")

    return MessageResponse(message=f"Đã xóa lịch {schedule_id}", success=True)


@router.post("/{schedule_id}/toggle", response_model=ScheduleItem)
async def toggle_schedule(schedule_id: str, request: Request):
    """Bật/tắt lịch hẹn giờ theo ID."""
    scheduler = request.app.state.scheduler_service
    item = scheduler.toggle_schedule(schedule_id)

    if not item:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy schedule: {schedule_id}")

    return item
