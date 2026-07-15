from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Request
import logging
from pydantic import BaseModel

from backend.app.config import get_notification_settings, update_notification_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

class NotificationSettingsUpdate(BaseModel):
    telegram_enabled: bool
    bot_token: str
    chat_id: str
    cooldown_minutes: int

@router.get("/settings")
async def get_settings():
    """Lấy cấu hình thông báo."""
    return get_notification_settings()

@router.post("/settings")
async def update_settings(settings: NotificationSettingsUpdate):
    """Cập nhật cấu hình thông báo."""
    updated = update_notification_settings(settings.model_dump())
    return {"status": "success", "settings": updated}

@router.websocket("/ws")
async def websocket_notification_stream(websocket: WebSocket):
    """
    WebSocket endpoint: stream thông báo real-time.
    """
    notification_service = websocket.app.state.notification_service
    await notification_service.add_client(websocket)

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        notification_service.remove_client(websocket)
