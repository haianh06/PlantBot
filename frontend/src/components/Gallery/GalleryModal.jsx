import { useState, useEffect } from 'react';
import { fetchGalleryImages, getGalleryImageUrl } from '../../api/client';
import './GalleryModal.css';

export function GalleryModal({ onClose }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    fetchGalleryImages()
      .then((data) => {
        setImages(data.images || []);
      })
      .catch((err) => {
        console.error('Lỗi lấy danh sách ảnh:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="gallery-modal-overlay" onClick={onClose}>
      <div className="gallery-modal-content card" onClick={(e) => e.stopPropagation()}>
        <div className="gallery-modal-header card__header">
          <h3 className="card__title">🖼️ Lịch sử phát hiện bệnh</h3>
          <button className="btn btn--icon" onClick={onClose}>&times;</button>
        </div>
        
        <div className="gallery-modal-body card__body">
          {loading ? (
            <div className="gallery-loading">Đang tải...</div>
          ) : images.length === 0 ? (
            <div className="gallery-empty">Chưa có ảnh phát hiện bệnh nào.</div>
          ) : (
            <div className="gallery-grid">
              {images.map((filename) => (
                <div 
                  key={filename} 
                  className="gallery-item"
                  onClick={() => setSelectedImage(filename)}
                >
                  <img src={getGalleryImageUrl(filename)} alt="Bệnh" loading="lazy" />
                  <div className="gallery-item-title">{filename.replace('disease_', '').replace('.jpg', '')}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Viewer */}
      {selectedImage && (
        <div className="gallery-viewer-overlay" onClick={() => setSelectedImage(null)}>
          <div className="gallery-viewer-content" onClick={(e) => e.stopPropagation()}>
            <button className="gallery-viewer-close" onClick={() => setSelectedImage(null)}>&times;</button>
            <img src={getGalleryImageUrl(selectedImage)} alt="Phóng to" />
          </div>
        </div>
      )}
    </div>
  );
}
