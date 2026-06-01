"""
sensor_routes.py — API endpoints cho dữ liệu cảm biến
========================================================
Endpoints:
  GET  /api/sensors/current   — Dữ liệu cảm biến mới nhất
  GET  /api/sensors/history   — Lịch sử từ CSV (query: limit)
  GET  /api/sensors/export    — Download file CSV
  WS   /ws/sensors            — Stream real-time sensor data
"""

import asyncio
import logging
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Request, Query
from fastapi.responses import FileResponse

from backend.app.schemas.sensor_data import SensorData

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sensors", tags=["Sensors"])

# ─── WebSocket clients ──────────────────────────────────────
# Set lưu tất cả WebSocket connections đang active
ws_clients: set[WebSocket] = set()


async def broadcast_sensor_data(data: SensorData) -> None:
    """
    Gửi dữ liệu sensor đến tất cả WebSocket clients.
    Được gọi từ serial_service callback.
    """
    if not ws_clients:
        return

    message = data.model_dump_json()
    disconnected = set()

    for client in ws_clients:
        try:
            await client.send_text(message)
        except Exception:
            disconnected.add(client)

    # Cleanup clients đã disconnect
    ws_clients.difference_update(disconnected)


# ─── REST Endpoints ─────────────────────────────────────────

@router.get("/current", response_model=Optional[SensorData])
async def get_current_sensor_data(request: Request):
    """Lấy dữ liệu cảm biến mới nhất từ Arduino."""
    serial_service = request.app.state.serial_service
    data = serial_service.get_latest_data()
    return data


@router.get("/history")
async def get_sensor_history(
    request: Request,
    limit: int = Query(default=50, ge=1, le=1000, description="Số bản ghi tối đa"),
):
    """Lấy lịch sử dữ liệu sensor từ file CSV."""
    csv_service = request.app.state.csv_service
    history = csv_service.get_history(limit=limit)
    return {"data": history, "count": len(history)}


@router.get("/export")
async def export_csv(request: Request):
    """Download file CSV dữ liệu sensor."""
    csv_service = request.app.state.csv_service
    file_path = csv_service.get_file_path()

    if not file_path.exists():
        return {"error": "Chưa có dữ liệu để export"}

    return FileResponse(
        path=str(file_path),
        filename="plantbot_sensor_data.csv",
        media_type="text/csv",
    )


# ─── WebSocket Endpoint ─────────────────────────────────────

@router.websocket("/ws")
async def websocket_sensor_stream(websocket: WebSocket):
    """
    WebSocket endpoint: stream dữ liệu sensor real-time.
    Client connect → nhận JSON mỗi khi có data mới từ Arduino.
    """
    await websocket.accept()
    ws_clients.add(websocket)
    logger.info(f"WebSocket client connected. Total: {len(ws_clients)}")

    try:
        # Giữ connection mở — đợi client disconnect
        while True:
            # Nhận ping/heartbeat từ client (hoặc bất kỳ message nào)
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        ws_clients.discard(websocket)
        logger.info(f"WebSocket client disconnected. Total: {len(ws_clients)}")
