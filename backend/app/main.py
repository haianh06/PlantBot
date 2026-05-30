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

from backend.app.config import get_settings
from backend.app.services.serial_service import SerialService
from backend.app.services.csv_service import CSVService
from backend.app.services.camera_service import CameraService
from backend.app.api import sensor_routes, pump_routes, camera_routes, system_routes
from backend.app.config import PROJECT_ROOT
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
    logger.info("🌿 PlantBot Backend đang khởi động...")

    # --- Startup ---

    # 1. CSV Service
    csv_service = CSVService(file_path=settings.CSV_FILE_PATH)
    app.state.csv_service = csv_service
    logger.info("✅ CSV Service sẵn sàng")

    # 2. Serial Service
    serial_service = SerialService()
    app.state.serial_service = serial_service

    # Callback: khi có data mới → lưu CSV + broadcast WebSocket
    loop = asyncio.get_event_loop()

    def on_sensor_data(data):
        """Callback từ serial reader thread → lưu CSV + broadcast WS."""
        csv_service.save_record(data)
        # Schedule async broadcast trong event loop
        asyncio.run_coroutine_threadsafe(broadcast_sensor_data(data), loop)

    serial_service.set_on_data_callback(on_sensor_data)

    # Tự động kết nối Arduino
    connected = serial_service.connect(port=settings.SERIAL_PORT)
    if connected:
        logger.info(f"✅ Arduino kết nối tại {serial_service.port}")
    else:
        logger.warning("⚠️  Chưa kết nối Arduino — chạy ở chế độ offline")

    # 3. Camera Service
    camera_service = CameraService()
    app.state.camera_service = camera_service
    logger.info("✅ Camera Service sẵn sàng")

    # 4. Disease Detector (AI phát hiện bệnh cây — chỉ cho Camera 2 USB)
    try:
        from module_2.disease_detector import DiseaseDetector, TORCH_AVAILABLE

        if TORCH_AVAILABLE:
            model_path = str(PROJECT_ROOT / "module_2" / "models" / "bokchoy_cnn.pth")
            disease_detector = DiseaseDetector(model_path)
            camera_service.set_disease_detector(disease_detector)
            logger.info("✅ AI Disease Detector sẵn sàng (Camera 2 — USB)")
        else:
            logger.warning("⚠️  PyTorch chưa cài — AI Disease Detection bị tắt")
    except Exception as e:
        logger.warning(f"⚠️  Không thể khởi tạo AI Disease Detector: {e}")
        logger.warning("   Hệ thống vẫn chạy bình thường, chỉ tắt AI detection")

    logger.info("🌿 PlantBot Backend đã sẵn sàng!")
    logger.info(f"   📡 Serial: {'Online' if connected else 'Offline'}")
    logger.info(f"   📁 CSV: {settings.CSV_FILE_PATH}")

    yield

    # --- Shutdown ---
    logger.info("🌿 PlantBot Backend đang tắt...")
    serial_service.disconnect()
    camera_service.stop_all()
    logger.info("🌿 Đã cleanup tất cả resources. Bye!")


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
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Include Routers ─────────────────────────────────────────
app.include_router(sensor_routes.router)
app.include_router(pump_routes.router)
app.include_router(camera_routes.router)
app.include_router(system_routes.router)


# ─── Root Endpoint ───────────────────────────────────────────
@app.get("/", tags=["Root"])
async def root():
    """Health check endpoint."""
    return {
        "name": "PlantBot API",
        "version": "1.0.0",
        "status": "running",
    }
