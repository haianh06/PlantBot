import cv2
import numpy as np

frame = np.ones((100, 100, 3), dtype=np.uint8) * 100
try:
    b, g, r = cv2.split(frame)
    b = cv2.convertScaleAbs(b, alpha=0.8, beta=0)
    g = cv2.convertScaleAbs(g, alpha=1.3, beta=15)
    r = cv2.convertScaleAbs(r, alpha=0.8, beta=0)
    frame = cv2.merge((b, g, r))
    print(f"B: {np.mean(frame[:,:,0])}, G: {np.mean(frame[:,:,1])}, R: {np.mean(frame[:,:,2])}")
except Exception as e:
    print(f"Error: {e}")
