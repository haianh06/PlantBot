import React, { useState, useEffect } from 'react';
import { startNewBatch, fetchGrowthConfig, updateGrowthConfig } from '../../api/client';
import { CalibrationPanel } from './CalibrationPanel';
import './NewBatchPanel.css';

export function NewBatchPanel({ currentPreset, onPresetChange, sensorData }) {
  const [preset, setPreset] = useState(currentPreset || 'mature');
  const [plantingDate, setPlantingDate] = useState(new Date().toLocaleDateString('en-CA')); // YYYY-MM-DD
  
  // Custom stage days
  const [s1Days, setS1Days] = useState(5);
  const [s2Days, setS2Days] = useState(12); // length of stage 2
  const [s3Days, setS3Days] = useState(15); // length of stage 3
  
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });

  // Trạng thái gieo trồng
  const [isTracking, setIsTracking] = useState(true);
  const [fullGrowthConfig, setFullGrowthConfig] = useState(null);

  // Update preset state if prop changes
  useEffect(() => {
    if (currentPreset) {
      setPreset(currentPreset);
    }
  }, [currentPreset]);

  // Lấy cấu hình gieo trồng từ Backend khi load component
  useEffect(() => {
    fetchGrowthConfig()
      .then((data) => {
        setIsTracking(data.is_tracking);
        setPlantingDate(data.planting_date);
        setFullGrowthConfig(data);
        if (data.growth_config) {
          const s1 = data.growth_config.stage1_days || 5;
          const s2 = (data.growth_config.stage2_days || 17) - s1;
          const s3 = (data.growth_config.stage3_days || 32) - (data.growth_config.stage2_days || 17);
          setS1Days(s1);
          setS2Days(s2);
          setS3Days(s3);
        }
      })
      .catch((err) => console.error("Lỗi lấy cấu hình gieo trồng:", err));
  }, []);

  const handleToggleTracking = async () => {
    if (!fullGrowthConfig) return;
    setIsSubmitting(true);
    setStatusMsg({ text: '', type: '' });
    try {
      const nextTracking = !isTracking;
      const payload = {
        planting_date: fullGrowthConfig.planting_date,
        is_tracking: nextTracking,
        current_crop: fullGrowthConfig.current_crop || 'Bok Choy',
        growth_config: {
          stage1_days: fullGrowthConfig.growth_config?.stage1_days || 5,
          stage2_days: fullGrowthConfig.growth_config?.stage2_days || 17,
          stage3_days: fullGrowthConfig.growth_config?.stage3_days || 32,
        }
      };

      const res = await updateGrowthConfig(payload);
      setIsTracking(res.is_tracking);
      setFullGrowthConfig(res);
      setStatusMsg({
        text: nextTracking 
          ? '🌱 Đã bắt đầu gieo trồng. Hệ thống tự động đang hoạt động và Safe Mode đã được kích hoạt!'
          : '🛑 Đã dừng gieo trồng. Bạn có thể tự do điều khiển thiết bị, Safe Mode trên mạch đã được giải phóng.',
        type: 'success'
      });
      setTimeout(() => setStatusMsg({ text: '', type: '' }), 5000);
    } catch (err) {
      console.error(err);
      setStatusMsg({ text: '❌ Lỗi hệ thống: Không thể thay đổi trạng thái gieo trồng.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tính toán lộ trình ngày dự kiến dựa trên preset / custom
  const getRoadmap = () => {
    let s1 = 5, s2 = 12, s3 = 15; // default mature: s1=5, s2_accumulated=17 (duration=12), s3_accumulated=32 (duration=15)
    if (preset === 'baby') {
      s1 = 4;
      s2 = 8;
      s3 = 10;
    } else if (preset === 'custom') {
      s1 = Number(s1Days) || 1;
      s2 = Number(s2Days) || 1;
      s3 = Number(s3Days) || 1;
    }

    const startDate = new Date(plantingDate);
    const formatDate = (date) => date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

    const addDays = (date, days) => {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result;
    };

    const d1_start = new Date(startDate);
    const d1_end = addDays(d1_start, s1 - 1);
    
    const d2_start = addDays(d1_end, 1);
    const d2_end = addDays(d2_start, s2 - 1);

    const d3_start = addDays(d2_end, 1);
    const d3_end = addDays(d3_start, s3 - 1);

    const d4_start = addDays(d3_end, 1);

    return [
      { stage: 1, name: 'Kích mầm', range: `${formatDate(d1_start)} - ${formatDate(d1_end)}`, duration: `${s1} ngày` },
      { stage: 2, name: 'Cây con', range: `${formatDate(d2_start)} - ${formatDate(d2_end)}`, duration: `${s2} ngày` },
      { stage: 3, name: 'Sinh khối', range: `${formatDate(d3_start)} - ${formatDate(d3_end)}`, duration: `${s3} ngày` },
      { stage: 4, name: 'Thu hoạch', range: `Từ ${formatDate(d4_start)}`, duration: 'Đồng loạt' }
    ];
  };

  const roadmap = getRoadmap();

  const handleStartNewBatch = async () => {
    setIsSubmitting(true);
    setStatusMsg({ text: '', type: '' });
    
    let growthConfig = null;
    if (preset === 'custom') {
      growthConfig = {
        stage1_days: Number(s1Days),
        stage2_days: Number(s1Days) + Number(s2Days),
        stage3_days: Number(s1Days) + Number(s2Days) + Number(s3Days)
      };
    }

    try {
      const res = await startNewBatch(preset, plantingDate, growthConfig);
      setStatusMsg({ 
        text: `✅ Khởi tạo lứa rau mới thành công! Đã sao lưu dữ liệu cũ thành file: ${res.backup_file || 'backup.csv'}. Hệ thống đang khởi động lại...`, 
        type: 'success' 
      });
      setShowConfirm(false);
      
      // Reload page sau 3s
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (err) {
      console.error(err);
      setStatusMsg({ text: '❌ Lỗi hệ thống: Không thể khởi tạo lứa mới.', type: 'error' });
      setShowConfirm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="new-batch-container animate-fade-in">
      
      {/* 0. Trạng thái gieo trồng hiện tại */}
      <div className="crop-status-card card" style={{ marginBottom: '24px', border: isTracking ? '1px solid rgba(46, 204, 113, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)', background: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 4px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isTracking ? '🌱 Trạng thái: Đang gieo trồng' : '🛑 Trạng thái: Chưa gieo trồng'}
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              {isTracking 
                ? 'Hệ thống đang chạy tự động và theo dõi chu kỳ của cải thìa. Failsafe (Safe Mode) đang hoạt động bảo vệ thiết bị.' 
                : 'Đang ở chế độ rảnh/thử nghiệm. Bạn có thể tự do điều khiển thiết bị thủ công ở Dashboard mà không bị Safe Mode khóa mạch.'}
            </p>
          </div>
          <button 
            className={`btn ${isTracking ? 'btn--danger' : 'btn--primary'}`}
            onClick={handleToggleTracking}
            disabled={isSubmitting}
            style={{ minWidth: '160px', justifyContent: 'center' }}
          >
            {isTracking ? '🛑 Dừng gieo trồng' : '🌱 Bắt đầu trồng'}
          </button>
        </div>
      </div>

      {/* 1. Form Khởi tạo lứa rau mới */}
      <div className="new-batch-card card">
        <div className="card__header">
          <h2 className="card__title">🌱 Bắt Đầu Lứa Rau Mới</h2>
        </div>
        
        <div className="card__body">
          <div className="form-grid">
            {/* Lựa chọn Preset */}
            <div className="form-group">
              <label className="form-label">Chọn giống & Preset trồng</label>
              <select 
                className="form-input" 
                value={preset}
                onChange={(e) => setPreset(e.target.value)}
              >
                <option value="mature">🥬 Cải thìa già (Đầy đủ 35 ngày)</option>
                <option value="baby">🌱 Cải thìa non (Ăn non 25 ngày)</option>
                <option value="custom">⚙️ Tự chọn số ngày các giai đoạn</option>
              </select>
            </div>

            {/* Chọn ngày trồng */}
            <div className="form-group">
              <label className="form-label">Ngày bắt đầu trồng</label>
              <input 
                type="date" 
                className="form-input"
                value={plantingDate}
                onChange={(e) => setPlantingDate(e.target.value)}
              />
            </div>
          </div>

          {/* Form phụ nếu chọn Custom */}
          {preset === 'custom' && (
            <div className="custom-days-inputs animate-fade-in">
              <h4>⚙️ Nhập số ngày cho từng giai đoạn:</h4>
              <div className="custom-days-grid">
                <div className="form-group">
                  <label className="form-label">GĐ 1: Kích mầm (ngày)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={s1Days} 
                    onChange={(e) => setS1Days(Math.max(1, parseInt(e.target.value) || 1))}
                    min={1}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">GĐ 2: Cây con (ngày)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={s2Days} 
                    onChange={(e) => setS2Days(Math.max(1, parseInt(e.target.value) || 1))}
                    min={1}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">GĐ 3: Sinh khối (ngày)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={s3Days} 
                    onChange={(e) => setS3Days(Math.max(1, parseInt(e.target.value) || 1))}
                    min={1}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Bản đồ lộ trình sinh trưởng dự kiến */}
          <div className="roadmap-preview">
            <h4 className="roadmap-title">📋 Lộ trình sinh trưởng dự kiến:</h4>
            <div className="roadmap-timeline">
              {roadmap.map((step) => (
                <div key={step.stage} className={`roadmap-step roadmap-step--stage-${step.stage}`}>
                  <div className="roadmap-step__badge">{step.stage}</div>
                  <div className="roadmap-step__content">
                    <div className="roadmap-step__name">{step.name}</div>
                    <div className="roadmap-step__detail">
                      <span className="roadmap-step__range">{step.range}</span>
                      <span className="roadmap-step__dot">•</span>
                      <span className="roadmap-step__duration">{step.duration}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {statusMsg.text && (
            <div className={`status-banner status-banner--${statusMsg.type} animate-fade-in`}>
              {statusMsg.text}
            </div>
          )}

          <div className="form-actions" style={{ marginTop: '24px' }}>
            <button 
              className="btn btn--primary" 
              onClick={() => setShowConfirm(true)}
              disabled={isSubmitting}
            >
              🚀 Bắt Đầu Lứa Rau Mới
            </button>
          </div>
        </div>
      </div>

      {/* 2. Form Calibration Cảm biến đất */}
      <div className="calibration-card-wrapper card" style={{ marginTop: '24px' }}>
        <div className="card__header">
          <h2 className="card__title">⚙️ Calibration Cảm Biến Độ Ẩm Đất</h2>
        </div>
        <div className="card__body">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Nhập giá trị đọc thô Analog (ADC) từ Arduino khi đất khô hoàn toàn và ướt hoàn toàn để hiệu chuẩn độ chính xác của cảm biến độ ẩm đất.
          </p>
          <CalibrationPanel sensorData={sensorData} />
        </div>
      </div>

      {/* Modal xác nhận bắt đầu lứa mới */}
      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal-content card confirm-modal animate-fade-in" style={{ maxWidth: '450px' }}>
            <h3 className="confirm-modal__title">⚠️ Cảnh báo khởi động lứa mới</h3>
            <p className="confirm-modal__text">
              Hành động này sẽ thực hiện các thao tác sau:
            </p>
            <ul style={{ paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px', margin: '12px 0' }}>
              <li>Sao lưu file <code style={{ color: 'var(--accent-orange)' }}>sensor_data.csv</code> hiện tại thành file backup để lưu trữ lịch sử lứa cũ.</li>
              <li>Xoá rỗng dữ liệu file <code style={{ color: 'var(--accent-green)' }}>sensor_data.csv</code> hoạt động để bắt đầu ghi lại từ đầu.</li>
              <li>Thiết lập ngày trồng thành ngày <strong style={{ color: 'var(--text-primary)' }}>{plantingDate}</strong> với Preset <strong style={{ color: 'var(--accent-green)' }}>{preset === 'mature' ? 'Cải thìa già' : preset === 'baby' ? 'Cải thìa non' : 'Custom'}</strong>.</li>
              <li>Reset lại toàn bộ bộ đệm can thiệp thiết bị thủ công của Automation.</li>
            </ul>
            <p className="confirm-modal__text" style={{ fontWeight: 'bold' }}>
              Bạn có chắc chắn muốn tiến hành bắt đầu lứa gieo trồng mới này?
            </p>
            <div className="confirm-modal__actions" style={{ marginTop: '20px' }}>
              <button 
                className="btn" 
                onClick={() => setShowConfirm(false)}
                disabled={isSubmitting}
              >
                Hủy bỏ
              </button>
              <button 
                className="btn btn--primary" 
                onClick={handleStartNewBatch}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Đang khởi tạo...' : 'Xác nhận bắt đầu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
