"""
disease_detector.py — Phát hiện bệnh cây bằng PlantBotCNN + CAM
================================================================
- Load mô hình PlantBotCNN đã huấn luyện từ file .pth
- Inference trên CPU, tối ưu nhẹ cho hệ thống IoT
- Sử dụng CAM (Class Activation Mapping) để tạo bounding boxes
  vùng nghi ngờ bệnh mà không cần mô hình detection riêng
- Chỉ áp dụng cho Camera 2 (USB webcam)

Kiến trúc mô hình PlantBotCNN:
  - DepthwiseSeparableConv: giảm params ~8-9x so với Conv2d thường
  - CBAM: Channel + Spatial Attention → tập trung vào vết bệnh
  - GAP + Linear(256, 1): Binary classifier
  - Input: 224×224 RGB (resize, KHÔNG crop để giữ feature)
  - Normalize: ImageNet mean/std

Labels:
  0 = Diseased (Có bệnh)
  1 = Healthy  (Khỏe mạnh)
"""

import logging
import numpy as np
import cv2

logger = logging.getLogger(__name__)

# ─── Kiểm tra PyTorch khả dụng ──────────────────────────────
try:
    import torch
    import torch.nn as nn
    from torchvision import transforms
    from PIL import Image

    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    logger.warning(
        "⚠️ PyTorch / torchvision chưa được cài đặt. "
        "Chức năng phát hiện bệnh cây sẽ bị tắt. "
        "Cài đặt: uv pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu"
    )


# ═══════════════════════════════════════════════════════════════
#  KIẾN TRÚC CNN  (đồng bộ chính xác với notebook huấn luyện)
# ═══════════════════════════════════════════════════════════════

if TORCH_AVAILABLE:

    class DepthwiseSeparableConv(nn.Module):
        """
        Tách biệt tính toán không gian (Depthwise) và kênh màu (Pointwise).
        Giảm đột biến số lượng tham số và FLOPs so với Conv2d thông thường.
        """

        def __init__(self, in_channels, out_channels, stride=1):
            super().__init__()
            self.depthwise = nn.Conv2d(
                in_channels, in_channels,
                kernel_size=3, padding=1, stride=stride,
                groups=in_channels, bias=False,
            )
            self.pointwise = nn.Conv2d(
                in_channels, out_channels,
                kernel_size=1, bias=False,
            )
            self.bn = nn.BatchNorm2d(out_channels)
            self.relu = nn.ReLU(inplace=True)

        def forward(self, x):
            x = self.depthwise(x)
            x = self.pointwise(x)
            return self.relu(self.bn(x))

    class CBAM(nn.Module):
        """
        Convolutional Block Attention Module.
        Ép mạng chú ý vào các đốm bệnh nhỏ (Spatial) và
        dải màu bất thường (Channel).
        """

        def __init__(self, channels, reduction=16):
            super().__init__()
            # Channel Attention
            self.avg_pool = nn.AdaptiveAvgPool2d(1)
            self.max_pool = nn.AdaptiveMaxPool2d(1)
            self.fc = nn.Sequential(
                nn.Conv2d(channels, channels // reduction, 1, bias=False),
                nn.ReLU(inplace=True),
                nn.Conv2d(channels // reduction, channels, 1, bias=False),
            )
            self.sigmoid_channel = nn.Sigmoid()

            # Spatial Attention
            self.conv_spatial = nn.Conv2d(
                2, 1, kernel_size=7, padding=3, bias=False,
            )
            self.sigmoid_spatial = nn.Sigmoid()

        def forward(self, x):
            # Channel Attention
            avg_out = self.fc(self.avg_pool(x))
            max_out = self.fc(self.max_pool(x))
            channel_out = self.sigmoid_channel(avg_out + max_out)
            x = x * channel_out

            # Spatial Attention
            avg_spatial = torch.mean(x, dim=1, keepdim=True)
            max_spatial, _ = torch.max(x, dim=1, keepdim=True)
            spatial_out = torch.cat([avg_spatial, max_spatial], dim=1)
            spatial_out = self.sigmoid_spatial(self.conv_spatial(spatial_out))
            x = x * spatial_out

            return x

    class PlantBotCNN(nn.Module):
        """
        Mô hình CNN tùy chỉnh cho phân loại bệnh cây cải bẹ xanh.

        Kiến trúc:
            Stem (Conv2d) → Block1 (DWConv+CBAM+Pool)
                          → Block2 (DWConv+CBAM+Pool)
                          → Block3 (DWConv+CBAM, KHÔNG pool)
                          → GAP → Dropout → Linear(256, 1)

        Feature map cuối (block3): [B, 256, 28, 28]
        → Dùng cho CAM (Class Activation Mapping) để tạo heatmap.
        """

        def __init__(self):
            super(PlantBotCNN, self).__init__()

            # Stem Layer
            self.stem = nn.Sequential(
                nn.Conv2d(3, 32, kernel_size=3, padding=1, bias=False),
                nn.BatchNorm2d(32),
                nn.ReLU(inplace=True),
                nn.MaxPool2d(kernel_size=2, stride=2),
            )

            # Block 1
            self.block1 = nn.Sequential(
                DepthwiseSeparableConv(32, 64),
                CBAM(64),
                nn.MaxPool2d(kernel_size=2, stride=2),
            )

            # Block 2
            self.block2 = nn.Sequential(
                DepthwiseSeparableConv(64, 128),
                CBAM(128),
                nn.MaxPool2d(kernel_size=2, stride=2),
            )

            # Block 3 — Không MaxPool, giữ độ phân giải texture vết bệnh
            self.block3 = nn.Sequential(
                DepthwiseSeparableConv(128, 256),
                CBAM(256),
            )

            # Head
            self.gap = nn.AdaptiveAvgPool2d((1, 1))
            self.dropout = nn.Dropout(p=0.4)
            self.classifier = nn.Linear(256, 1)  # Binary logit

        def forward(self, x, return_features=False):
            x = self.stem(x)
            x = self.block1(x)
            x = self.block2(x)
            features = self.block3(x)  # [B, 256, 28, 28]

            x = self.gap(features)
            x = torch.flatten(x, 1)
            x = self.dropout(x)
            x = self.classifier(x)

            if return_features:
                return x, features
            return x


# ═══════════════════════════════════════════════════════════════
#  DISEASE DETECTOR SERVICE
# ═══════════════════════════════════════════════════════════════

class DiseaseDetector:
    """
    Service phát hiện bệnh cây từ frame camera.

    Chiến lược tối ưu hiệu năng:
      - Model ~245KB, chạy CPU inference ~5-15ms / frame
      - Chỉ inference mỗi N giây (configurable), cache kết quả
      - Resize 224×224 (không crop) chỉ khi cần inference
      - torch.no_grad() tắt gradient computation
      - CAM tạo bounding box mà không cần backward pass (dùng weights trực tiếp)

    Usage:
        detector = DiseaseDetector("module_2/models/bokchoy_cnn.pth")
        result = detector.predict(frame_bgr)
        frame_with_overlay = detector.draw_overlay(frame_bgr, result)
    """

    # Label mapping: 0 = Diseased, 1 = Healthy
    LABELS = {0: "Diseased", 1: "Healthy"}
    LABELS_VN = {0: "Co benh", 1: "Khoe manh"}

    # CAM config
    CAM_THRESHOLD = 0.4       # Ngưỡng heatmap để tạo bounding box
    MIN_BBOX_RATIO = 0.01     # Diện tích tối thiểu bbox (% so với frame)

    def __init__(self, model_path: str):
        """
        Khởi tạo DiseaseDetector.

        Args:
            model_path: Đường dẫn tới file bokchoy_cnn.pth
        """
        if not TORCH_AVAILABLE:
            raise RuntimeError(
                "PyTorch chưa được cài đặt. Không thể khởi tạo DiseaseDetector."
            )

        self.device = torch.device("cpu")
        self._model_path = model_path

        # Load model
        self.model = PlantBotCNN()
        state_dict = torch.load(model_path, map_location=self.device, weights_only=True)
        self.model.load_state_dict(state_dict)
        self.model.eval()  # Chuyển sang eval mode (tắt Dropout, BN dùng running stats)

        # Transform pipeline — Resize KHÔNG crop, giữ nguyên tất cả feature
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),   # Resize (stretch), KHÔNG center-crop
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
        ])

        logger.info(
            f"✅ DiseaseDetector đã load model từ {model_path} "
            f"(device={self.device}, params={sum(p.numel() for p in self.model.parameters()):,})"
        )

    def predict(self, frame: np.ndarray) -> dict:
        """
        Chạy inference trên 1 frame BGR từ camera.

        Pipeline: BGR → RGB → PIL → Resize(224) → Tensor → Normalize → Model → Sigmoid

        Args:
            frame: numpy array BGR từ OpenCV (H, W, 3)

        Returns:
            dict: {
                "label": "Healthy" | "Diseased",
                "label_vn": "Khoe manh" | "Co benh",
                "confidence": float (0-100%),
                "bboxes": [{"x": int, "y": int, "w": int, "h": int}, ...]
            }
        """
        orig_h, orig_w = frame.shape[:2]

        # BGR → RGB → PIL Image
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        pil_image = Image.fromarray(rgb_frame)

        # Transform + batch dimension
        input_tensor = self.transform(pil_image).unsqueeze(0).to(self.device)

        # Inference — no_grad giảm bộ nhớ, tắt gradient tracking
        with torch.no_grad():
            logit, features = self.model(input_tensor, return_features=True)

        # Sigmoid → probability
        prob = torch.sigmoid(logit).item()

        # prob > 0.5 → label 1 (Healthy)
        # prob <= 0.5 → label 0 (Diseased)
        label_idx = 1 if prob > 0.5 else 0
        confidence = prob if label_idx == 1 else (1.0 - prob)

        result = {
            "label": self.LABELS[label_idx],
            "label_vn": self.LABELS_VN[label_idx],
            "confidence": round(confidence * 100, 1),
            "bboxes": [],
        }

        # Tạo bounding boxes từ CAM chỉ khi phát hiện bệnh
        if label_idx == 0:  # Diseased
            result["bboxes"] = self._generate_cam_bboxes(features, orig_h, orig_w)

        return result

    def _generate_cam_bboxes(
        self, features: "torch.Tensor", orig_h: int, orig_w: int
    ) -> list[dict]:
        """
        Tạo bounding boxes từ Class Activation Mapping (CAM).

        CAM sử dụng weights của classifier layer kết hợp với
        feature maps từ block3 để xác định vùng mà model
        tập trung chú ý → vùng nghi ngờ có bệnh.

        Ưu điểm: Không cần backward pass, rất nhẹ.

        Args:
            features: Feature maps từ block3 [1, 256, 28, 28]
            orig_h, orig_w: Kích thước frame gốc

        Returns:
            list[dict]: Danh sách bounding boxes [{"x","y","w","h"}, ...]
        """
        # Lấy weights của classifier: [1, 256] → [256]
        weights = self.model.classifier.weight.data.squeeze()

        # Feature maps: [1, 256, H, W] → [256, H, W]
        feat = features.squeeze(0)

        # Với class Diseased (label=0): model output logit THẤP (sigmoid < 0.5)
        # Vùng bệnh là vùng đẩy logit XUỐNG → dùng NEGATIVE weights
        cam = torch.zeros(feat.shape[1:], device=self.device)
        for i in range(feat.shape[0]):
            cam += (-weights[i]) * feat[i]

        # Chuẩn hóa về [0, 1]
        cam = cam - cam.min()
        cam_max = cam.max()
        if cam_max > 0:
            cam = cam / cam_max

        cam_np = cam.cpu().numpy()

        # Resize heatmap về kích thước frame gốc
        cam_resized = cv2.resize(cam_np, (orig_w, orig_h))

        # Threshold → binary mask
        binary = (cam_resized > self.CAM_THRESHOLD).astype(np.uint8) * 255

        # Morphological close để lấp khoảng trống nhỏ
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)

        # Tìm contours
        contours, _ = cv2.findContours(
            binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE,
        )

        # Lọc contours quá nhỏ
        min_area = orig_h * orig_w * self.MIN_BBOX_RATIO
        bboxes = []
        for cnt in contours:
            x, y, bw, bh = cv2.boundingRect(cnt)
            if bw * bh >= min_area:
                bboxes.append({"x": int(x), "y": int(y), "w": int(bw), "h": int(bh)})

        return bboxes

    def draw_overlay(self, frame: np.ndarray, result: dict | None) -> np.ndarray:
        """
        Vẽ kết quả prediction + bounding boxes lên frame.

        Args:
            frame: BGR frame từ camera (sẽ bị modify in-place)
            result: dict từ predict(), hoặc None nếu chưa có kết quả

        Returns:
            Frame BGR đã vẽ overlay
        """
        if result is None:
            return frame

        h, w = frame.shape[:2]
        is_diseased = result["label"] == "Diseased"
        confidence = result["confidence"]

        # Màu sắc (BGR)
        if is_diseased:
            color = (0, 0, 255)          # Đỏ
            text_color = (120, 120, 255)  # Đỏ nhạt
            status_text = f"DISEASED ({confidence}%)"
        else:
            color = (0, 200, 0)          # Xanh lá
            text_color = (120, 255, 120)  # Xanh nhạt
            status_text = f"HEALTHY ({confidence}%)"

        # ── Vẽ bounding boxes (chỉ khi có bệnh) ──
        for bbox in result.get("bboxes", []):
            bx, by, bw, bh = bbox["x"], bbox["y"], bbox["w"], bbox["h"]

            # Rectangle viền
            cv2.rectangle(frame, (bx, by), (bx + bw, by + bh), color, 2)

            # Semi-transparent fill nhẹ
            overlay_roi = frame.copy()
            cv2.rectangle(overlay_roi, (bx, by), (bx + bw, by + bh), color, -1)
            cv2.addWeighted(overlay_roi, 0.1, frame, 0.9, 0, frame)

            # Label trên bbox
            bbox_label = f"Disease ({confidence}%)"
            label_size, _ = cv2.getTextSize(
                bbox_label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1,
            )
            # Background cho text
            cv2.rectangle(
                frame,
                (bx, by - label_size[1] - 8),
                (bx + label_size[0] + 4, by),
                color, -1,
            )
            cv2.putText(
                frame, bbox_label,
                (bx + 2, by - 4),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1,
                cv2.LINE_AA,
            )

        # ── Status bar ở bottom ──
        bar_h = 32
        overlay_bar = frame.copy()
        cv2.rectangle(overlay_bar, (0, h - bar_h), (w, h), (0, 0, 0), -1)
        cv2.addWeighted(overlay_bar, 0.65, frame, 0.35, 0, frame)

        # Dot indicator
        dot_color = (0, 0, 255) if is_diseased else (0, 220, 0)
        cv2.circle(frame, (18, h - bar_h // 2), 5, dot_color, -1, cv2.LINE_AA)

        # Status text
        cv2.putText(
            frame, f"AI: {status_text}",
            (30, h - 10),
            cv2.FONT_HERSHEY_SIMPLEX, 0.55, text_color, 1,
            cv2.LINE_AA,
        )

        return frame
