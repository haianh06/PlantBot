import os
import cv2
import glob
from ultralytics import YOLO
import torch
import logging

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def main():
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    logger.info(f"Using device: {device.upper()}")
    
    if device == 'cpu':
        logger.warning("CUDA is not available. PyTorch will run on CPU. Consider installing the CUDA-enabled version for GPU acceleration.")

    model_path = r"c:\Documents\Project\PlantBot\ai_module\plantbot_best_v1.pt"
    test_dir = r"c:\Documents\Project\PlantBot\ai_module\test"
    output_dir = r"c:\Documents\Project\PlantBot\ai_module\test_results"
    
    os.makedirs(output_dir, exist_ok=True)

    if not os.path.exists(model_path):
        logger.error(f"Model file not found at: {model_path}")
        return

    logger.info(f"Loading Ultralytics YOLO model from: {model_path}")
    try:
        model = YOLO(model_path)
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        return
    logger.info("Model loaded successfully.")

    if not os.path.exists(test_dir):
        logger.error(f"Test directory not found at: {test_dir}")
        return

    image_paths = glob.glob(os.path.join(test_dir, "*.jpg")) + \
                  glob.glob(os.path.join(test_dir, "*.png")) + \
                  glob.glob(os.path.join(test_dir, "*.jpeg"))
                  
    if not image_paths:
        logger.warning(f"No images found in directory: {test_dir}")
        return

    logger.info(f"Found {len(image_paths)} images. Starting inference...")

    for img_path in image_paths:
        img_name = os.path.basename(img_path)
        logger.info(f"Processing: {img_name}")
        
        results = model.predict(source=img_path, device=device, conf=0.25, iou=0.45, save=False, verbose=False)
        
        for r in results:
            img_plotted = r.plot()
            
            out_path = os.path.join(output_dir, f"result_{img_name}")
            cv2.imwrite(out_path, img_plotted)
            
            if len(r.boxes) > 0:
                logger.info(f"Detected {len(r.boxes)} disease spots.")
            else:
                logger.info(f"No disease detected (Healthy).")

    logger.info(f"Inference complete. Results saved to: {output_dir}")

if __name__ == "__main__":
    main()
