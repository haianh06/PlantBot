from fastapi import APIRouter
from fastapi.responses import FileResponse
import os
import glob

router = APIRouter(prefix="/api/gallery", tags=["Gallery"])

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "diseased_images")

@router.get("/")
async def get_image_list():
    """Lấy danh sách các file ảnh bệnh đã lưu, sắp xếp mới nhất lên đầu."""
    if not os.path.exists(DATA_DIR):
        return {"images": []}
        
    # Tìm tất cả file jpg
    files = glob.glob(os.path.join(DATA_DIR, "*.jpg"))
    # Sắp xếp theo tên file (cũng là thời gian) giảm dần (mới nhất lên đầu)
    files.sort(reverse=True)
    
    # Trả về tên file
    file_names = [os.path.basename(f) for f in files]
    return {"images": file_names}

@router.get("/{filename}")
async def get_image(filename: str):
    """Trả về file ảnh cụ thể."""
    filepath = os.path.join(DATA_DIR, filename)
    if os.path.exists(filepath):
        return FileResponse(filepath, media_type="image/jpeg")
    return {"error": "Image not found"}
