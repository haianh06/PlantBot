import cv2
import numpy as np

frame = np.ones((100, 100, 3), dtype=np.uint8) * 100
frame[:, :, 0] = 50  # B
frame[:, :, 1] = 50  # G
frame[:, :, 2] = 200 # R (Reddish image)

b, g, r = cv2.split(frame)
m_b, m_g, m_r = np.mean(b), np.mean(g), np.mean(r)
m = (m_b + m_g + m_r) / 3.0

print(f"m_b: {m_b}, m_g: {m_g}, m_r: {m_r}, m: {m}")

b = np.clip(b * (m / (m_b + 1e-5)), 0, 255).astype(np.uint8)
g = np.clip(g * (m / (m_g + 1e-5)), 0, 255).astype(np.uint8)
r = np.clip(r * (m / (m_r + 1e-5)), 0, 255).astype(np.uint8)

frame2 = cv2.merge((b, g, r))
frame2 = cv2.convertScaleAbs(frame2, alpha=1.1, beta=10)

print(f"frame2 mean B: {np.mean(frame2[:,:,0])}, G: {np.mean(frame2[:,:,1])}, R: {np.mean(frame2[:,:,2])}")
