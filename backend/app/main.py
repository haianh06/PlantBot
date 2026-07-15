"""
main.py — FastAPI Application Entry Point
===========================================
Khởi tạo FastAPI app, mount middleware, include routers,
và quản lý lifecycle (startup/shutdown) cho các services.

Architecture:
  App → Routers → Services → Data (CSV/Serial/Camera)
  Services được mount vào app.state để routers truy cập.
"""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import get_settings, load_json_settings
from backend.app.services.serial_service import SerialService
from backend.app.services.csv_service import CSVService
from backend.app.services.camera_service import CameraService
from backend.app.api import sensor_routes, pump_routes, camera_routes, system_routes, fan_routes, led_routes
from backend.app.api.sensor_routes import broadcast_sensor_data

# ─── Logging ─────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(name)-25s │ %(levelname)-7s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


# ─── Application Lifecycle ──────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup/Shutdown lifecycle manager.
    Startup:  init services, kết nối Arduino
    Shutdown: cleanup tất cả resources
    """
    settings = get_settings()
    logger.info("PlantBot Backend starting...")

    # --- Startup ---

    # 1. CSV Service
    csv_service = CSVService(file_path=settings.CSV_FILE_PATH)
    app.state.csv_service = csv_service
    logger.info("CSV Service ready")

    # 2. Serial Service
    serial_service = SerialService()
    app.state.serial_service = serial_service

    # 3. Automation Service
    from backend.app.services.automation import AutomationService, get_current_stage
    automation_service = AutomationService(serial_service=serial_service, csv_service=csv_service)
    app.state.automation_service = automation_service
    automation_service.start()
    logger.info("Automation Service ready")

    # Callback: khi có data mới → lưu CSV + broadcast WebSocket
    loop = asyncio.get_event_loop()

    def on_sensor_data(data):
        """Callback từ serial reader thread → lưu CSV + broadcast WS."""
        # Bổ sung giai đoạn tăng trưởng vào dữ liệu
        data.growth_stage = get_current_stage()
        
        # Ghi nhận nhiệt độ vào bộ đệm RAM của AutomationService
        automation_service.record_temp(data.temperature)
        
        csv_service.save_record(data)
        # Schedule async broadcast trong event loop
        asyncio.run_coroutine_threadsafe(broadcast_sensor_data(data), loop)

    serial_service.set_on_data_callback(on_sensor_data)

    # Tự động kết nối Arduino
    connected = serial_service.connect(port=settings.SERIAL_PORT)
    if connected:
        logger.info(f"Arduino connected at {serial_service.port}")
    else:
        logger.warning("Arduino not connected — running in offline mode")

    # 3. Camera Service
    from backend.app.services.ai_service import AIService
    import os
    
    # Path to AI model
    model_path = "../ai_module/plantbot_best_v1.pt"
    ai_service = AIService(model_path=model_path)
    app.state.ai_service = ai_service

    camera_service = CameraService(ai_service=ai_service, serial_service=serial_service)
    app.state.camera_service = camera_service
    logger.info("Camera Service ready")
    
    # 4. Notification Service
    from backend.app.services.notification_service import NotificationService
    notification_service = NotificationService(loop=loop)
    app.state.notification_service = notification_service
    # Truyền notification_service vào ai_service để gọi khi có bệnh
    ai_service.notification_service = notification_service
    logger.info("Notification Service ready")

    logger.info("PlantBot Backend is ready!")
    logger.info(f"   Serial: {'Online' if connected else 'Offline'}")
    logger.info(f"   CSV: {settings.CSV_FILE_PATH}")

    yield

    # --- Shutdown ---
    logger.info("PlantBot Backend shutting down...")
    try:
        app.state.automation_service.stop()
    except Exception as e:
        logger.error(f"Error stopping Automation Service: {e}")
    serial_service.disconnect()
    camera_service.stop_all()
    logger.info("All resources cleaned up. Exit.")


# ─── FastAPI App ─────────────────────────────────────────────

app = FastAPI(
    title="PlantBot API",
    description="Hệ thống IoT chăm sóc cây tự động — Backend API",
    version="1.0.0",
    lifespan=lifespan,
)

# ─── CORS Middleware ─────────────────────────────────────────
# Cho phép React frontend (localhost:5173) gọi API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:3000",   # Backup
        "http://0.0.0.0:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from backend.app.api import sensor_routes, pump_routes, camera_routes, system_routes, fan_routes, led_routes, gallery_routes, notification_routes

# ─── Include Routers ─────────────────────────────────────────
app.include_router(sensor_routes.router)
app.include_router(pump_routes.router)
app.include_router(fan_routes.router)
app.include_router(led_routes.router)
app.include_router(camera_routes.router)
app.include_router(system_routes.router)
app.include_router(gallery_routes.router)
app.include_router(notification_routes.router)


# ─── Root Endpoint ───────────────────────────────────────────
@app.get("/", tags=["Root"])
async def root():
    """Health check endpoint."""
    return {
        "name": "PlantBot API",
        "version": "1.0.0",
        "status": "running",
    }
