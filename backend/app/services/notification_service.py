import logging
import requests
import asyncio
from fastapi import WebSocket
from backend.app.config import get_notification_settings

logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self, loop=None):
        self.ws_clients: set[WebSocket] = set()
        self.loop = loop

    async def add_client(self, websocket: WebSocket):
        await websocket.accept()
        self.ws_clients.add(websocket)
        logger.info(f"Notification WebSocket client connected. Total: {len(self.ws_clients)}")

    def remove_client(self, websocket: WebSocket):
        self.ws_clients.discard(websocket)
        logger.info(f"Notification WebSocket client disconnected. Total: {len(self.ws_clients)}")

    async def broadcast_alert(self, message: dict):
        """Gửi JSON message cho toàn bộ các WebSocket clients đang kết nối"""
        if not self.ws_clients:
            return
            
        disconnected = set()
        for client in self.ws_clients:
            try:
                await client.send_json(message)
            except Exception:
                disconnected.add(client)
                
        self.ws_clients.difference_update(disconnected)

    def send_telegram_photo(self, photo_path: str, caption: str):
        """Gửi ảnh và caption qua Telegram Bot (Synchronous)"""
        settings = get_notification_settings()
        if not settings.get("telegram_enabled", False):
            return
            
        bot_token = settings.get("bot_token", "").strip()
        chat_id = settings.get("chat_id", "").strip()
        
        if not bot_token or not chat_id:
            logger.warning("Telegram Bot Token hoặc Chat ID chưa được cấu hình. Bỏ qua gửi thông báo.")
            return
            
        url = f"https://api.telegram.org/bot{bot_token}/sendPhoto"
        
        try:
            with open(photo_path, "rb") as photo_file:
                files = {"photo": photo_file}
                data = {"chat_id": chat_id, "caption": caption}
                response = requests.post(url, data=data, files=files, timeout=10)
                
                if response.status_code == 200:
                    logger.info("Đã gửi thông báo Telegram thành công.")
                else:
                    logger.error(f"Lỗi gửi Telegram: {response.status_code} - {response.text}")
        except Exception as e:
            logger.error(f"Exception khi gửi Telegram: {e}")

    def trigger_notification(self, image_filename: str, image_path: str, alert_message: str):
        """
        Được gọi bởi AIService khi cần gửi thông báo.
        Vì function này được gọi trong một luồng đồng bộ, ta sẽ:
        1. Gọi Telegram đồng bộ (hoặc đẩy vào Thread, nhưng để đơn giản ta chạy luôn vì cooldown lâu).
        2. Tạo task gửi WebSocket bất đồng bộ vào Event Loop.
        """
        # 1. Gửi Telegram
        self.send_telegram_photo(photo_path=image_path, caption=alert_message)
        
        # 2. Gửi qua WebSocket cho Frontend
        if self.loop and self.loop.is_running():
            ws_message = {
                "type": "disease_alert",
                "message": alert_message,
                "image": image_filename
            }
            asyncio.run_coroutine_threadsafe(self.broadcast_alert(ws_message), self.loop)
        else:
            logger.error("Không tìm thấy Event Loop đang chạy để gửi WebSocket.")
