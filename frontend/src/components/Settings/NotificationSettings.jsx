import React, { useState, useEffect } from 'react';

export function NotificationSettings() {
    const [settings, setSettings] = useState({
        telegram_enabled: false,
        bot_token: '',
        chat_id: '',
        cooldown_minutes: 5
    });
    const [isSaving, setIsSaving] = useState(false);
    const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });

    useEffect(() => {
        fetch('http://localhost:8000/api/notifications/settings')
            .then(res => res.json())
            .then(data => setSettings(data))
            .catch(err => console.error("Error fetching notification settings:", err));
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        setStatusMsg({ text: '', type: '' });
        try {
            const res = await fetch('http://localhost:8000/api/notifications/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            if (res.ok) {
                setStatusMsg({ text: '✅ Đã lưu cấu hình Thông báo thành công!', type: 'success' });
                setTimeout(() => setStatusMsg({ text: '', type: '' }), 3000);
            } else {
                throw new Error("Failed to save");
            }
        } catch (err) {
            setStatusMsg({ text: '❌ Lỗi khi lưu cấu hình Thông báo.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="card" style={{ marginTop: '24px' }}>
            <div className="card__header">
                <h2 className="card__title">🔔 Cấu hình Thông báo Bệnh (Telegram)</h2>
            </div>
            <div className="card__body">
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Hệ thống có thể gửi thông báo trực tiếp qua Web và Telegram khi AI phát hiện bệnh trên cây. Hãy cấu hình Telegram Bot dưới đây nếu muốn nhận cảnh báo qua điện thoại.
                </p>
                <div className="form-grid">
                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <label className="form-label" style={{ marginBottom: 0 }}>Bật gửi qua Telegram:</label>
                        <label className="switch">
                            <input 
                                type="checkbox" 
                                name="telegram_enabled"
                                checked={settings.telegram_enabled} 
                                onChange={handleChange} 
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>
                    
                    <div className="form-group">
                        <label className="form-label">Khoảng thời gian nghỉ giữa các lần gửi (Phút)</label>
                        <input 
                            type="number" 
                            name="cooldown_minutes"
                            className="form-input" 
                            value={settings.cooldown_minutes} 
                            onChange={handleChange}
                            min={1}
                        />
                    </div>
                    
                    <div className="form-group">
                        <label className="form-label">Telegram Bot Token</label>
                        <input 
                            type="text" 
                            name="bot_token"
                            className="form-input" 
                            value={settings.bot_token} 
                            onChange={handleChange}
                            placeholder="e.g. 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                            disabled={!settings.telegram_enabled}
                        />
                    </div>
                    
                    <div className="form-group">
                        <label className="form-label">Telegram Chat ID</label>
                        <input 
                            type="text" 
                            name="chat_id"
                            className="form-input" 
                            value={settings.chat_id} 
                            onChange={handleChange}
                            placeholder="e.g. 123456789"
                            disabled={!settings.telegram_enabled}
                        />
                    </div>
                </div>

                {statusMsg.text && (
                    <div className={`status-banner status-banner--${statusMsg.type} animate-fade-in`} style={{ marginTop: '16px' }}>
                        {statusMsg.text}
                    </div>
                )}

                <div className="form-actions" style={{ marginTop: '16px' }}>
                    <button 
                        className="btn btn--primary" 
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? 'Đang lưu...' : 'Lưu cấu hình Thông báo'}
                    </button>
                </div>
            </div>
        </div>
    );
}
