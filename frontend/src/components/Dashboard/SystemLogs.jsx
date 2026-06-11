import React, { useEffect, useRef } from 'react';
import './SystemLogs.css';

export function SystemLogs({ logs = [] }) {
  const terminalEndRef = useRef(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <div className="system-logs card animate-fade-in">
      <div className="card__header">
        <h2 className="card__title"><span>🖥️</span> Nhật Ký Sự Kiện Hệ Thống (Real-time Logs)</h2>
        <span className="system-logs__count">{logs.length} sự kiện</span>
      </div>
      <div className="card__body system-logs__terminal">
        {logs.length === 0 ? (
          <p className="system-logs__empty">Đang lắng nghe dữ liệu từ hệ thống...</p>
        ) : (
          <div className="system-logs__list">
            {logs.map((log, index) => {
              let typeClass = '';
              let badge = '';
              
              if (log.type === 'sanity') {
                typeClass = 'system-log--sanity';
                badge = '[LỖI CẢM BIẾN]';
              } else if (log.type === 'edgecase') {
                typeClass = 'system-log--edgecase';
                badge = '[ĐK CỰC ĐOAN]';
              } else if (log.type === 'recovery') {
                typeClass = 'system-log--recovery';
                badge = '[KHÔI PHỤC]';
              }

              return (
                <div key={index} className={`system-log ${typeClass}`}>
                  <span className="system-log__time">[{log.time}]</span>{' '}
                  <span className="system-log__badge">{badge}</span>{' '}
                  <span className="system-log__message">{log.message}</span>
                </div>
              );
            })}
            <div ref={terminalEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
