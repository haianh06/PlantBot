import cv2
import numpy as np

cap = cv2.VideoCapture(0)
ret, frame = cap.read()
print(f"Original frame mean B: {np.mean(frame[:,:,0])}, G: {np.mean(frame[:,:,1])}, R: {np.mean(frame[:,:,2])}")

b, g, r = cv2.split(frame)
m_b, m_g, m_r = np.mean(b), np.mean(g), np.mean(r)
m = (m_b + m_g + m_r) / 3.0
print(f"m_b: {m_b}, m_g: {m_g}, m_r: {m_r}, m: {m}")

b = np.clip(b * (m / (m_b + 1e-5)), 0, 255).astype(np.uint8)
g = np.clip(g * (m / (m_g + 1e-5)), 0, 255).astype(np.uint8)
r = np.clip(r * (m / (m_r + 1e-5)), 0, 255).astype(np.uint8)
frame2 = cv2.merge((b, g, r))

print(f"Processed frame mean B: {np.mean(frame2[:,:,0])}, G: {np.mean(frame2[:,:,1])}, R: {np.mean(frame2[:,:,2])}")
cap.release()
