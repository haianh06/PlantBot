import React, { useEffect, useState } from 'react';

const AlertNotification = () => {
    const [alerts, setAlerts] = useState([]);

    useEffect(() => {
        let ws;
        let reconnectTimer;
        const connect = () => {
            ws = new WebSocket('ws://localhost:8000/api/notifications/ws');
            
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'disease_alert') {
                        const newAlert = {
                            id: Date.now(),
                            message: data.message,
                            image: data.image
                        };
                        setAlerts(prev => [...prev, newAlert]);
                        
                        // Tự động ẩn thông báo sau 10 giây
                        setTimeout(() => {
                            setAlerts(prev => prev.filter(alert => alert.id !== newAlert.id));
                        }, 10000);
                    }
                } catch (e) {
                    console.error("Error parsing notification", e);
                }
            };
            
            ws.onclose = () => {
                reconnectTimer = setTimeout(connect, 3000);
            };
        };

        connect();

        return () => {
            clearTimeout(reconnectTimer);
            if (ws) ws.close();
        };
    }, []);

    const removeAlert = (id) => {
        setAlerts(prev => prev.filter(alert => alert.id !== id));
    };

    if (alerts.length === 0) return null;

    return (
        <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
        }}>
            {alerts.map(alert => (
                <div key={alert.id} style={{
                    backgroundColor: '#ffebee',
                    border: '1px solid #f44336',
                    borderRadius: '8px',
                    padding: '15px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    maxWidth: '300px',
                    position: 'relative',
                    animation: 'slideIn 0.3s ease-out'
                }}>
                    <button 
                        onClick={() => removeAlert(alert.id)}
                        style={{
                            position: 'absolute',
                            top: '5px',
                            right: '5px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '16px',
                            color: '#d32f2f'
                        }}
                    >
                        ×
                    </button>
                    <div style={{ color: '#d32f2f', fontWeight: 'bold', marginBottom: '10px' }}>
                        ⚠️ {alert.message}
                    </div>
                    {alert.image && (
                        <img 
                            src={`http://localhost:8000/api/gallery/${alert.image}`} 
                            alt="Disease detection" 
                            style={{
                                width: '100%',
                                borderRadius: '4px',
                                objectFit: 'cover'
                            }}
                        />
                    )}
                </div>
            ))}
        </div>
    );
};

export default AlertNotification;
