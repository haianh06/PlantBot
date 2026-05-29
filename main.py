"""
PlantBot — Entry point khởi chạy FastAPI Backend
==================================================
Chạy: python main.py
"""

import uvicorn
from backend.app.config import get_settings


def main():
    """Khởi chạy PlantBot Backend server."""
    settings = get_settings()
    print("🌿 PlantBot Backend đang khởi động...")
    uvicorn.run(
        "backend.app.main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=False,
    )


if __name__ == "__main__":
    main()
