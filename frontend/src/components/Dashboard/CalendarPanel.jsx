import React, { useState, useEffect } from 'react';
import { fetchCalendar } from '../../api/client';
import './CalendarPanel.css';

export function CalendarPanel() {
  const [calendar, setCalendar] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [isMlOptimized, setIsMlOptimized] = useState(true);
  const [viewMode, setViewMode] = useState('week'); // 'week' or 'day'
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);

  useEffect(() => {
    fetchCalendar()
      .then((data) => {
        setCalendar(data);
        // Tìm ngày hiện tại
        const currentIdx = data.findIndex((d) => d.is_current);
        let defaultDay = data[0] || null;
        if (currentIdx !== -1) {
          defaultDay = data[currentIdx];
          // Tự động chuyển đến tuần của ngày hiện tại
          setCurrentWeekIndex(Math.floor(currentIdx / 7));
        }
        setSelectedDay(defaultDay);
      })
      .catch((err) => console.error("Lỗi lấy thông tin lịch trình: ", err));
  }, []);

  if (calendar.length === 0) {
    return (
      <div className="calendar-panel card animate-pulse-glow" style={{ padding: '40px', textAlign: 'center' }}>
        <span className="spinner" style={{ marginRight: '10px' }} /> Đang tải lịch trình gieo trồng...
      </div>
    );
  }

  // Phân chia dữ liệu lịch trình theo tuần
  const totalWeeks = Math.ceil(calendar.length / 7);
  const weekDays = calendar.slice(currentWeekIndex * 7, (currentWeekIndex + 1) * 7);

  // Danh sách các giờ hiển thị trên trục dọc của lịch Tuần (từ 06h đến 22h)
  const hourTicks = Array.from({ length: 17 }, (_, i) => i + 6); // [6, 7, ..., 22]

  const handlePrevWeek = () => {
    if (currentWeekIndex > 0) setCurrentWeekIndex(currentWeekIndex - 1);
  };

  const handleNextWeek = () => {
    if (currentWeekIndex < totalWeeks - 1) setCurrentWeekIndex(currentWeekIndex + 1);
  };

  return (
    <div className="calendar-panel card animate-fade-in">
      <div className="card__header calendar-panel__header">
        <div className="calendar-panel__header-left">
          <h2 className="card__title">
            <span>📅</span> Lịch Trình Chăm Sóc Sinh Trưởng
          </h2>
          <span className="calendar-panel__subtitle">
            Hôm nay: {calendar.find(d => d.is_current) ? `Ngày ${calendar.find(d => d.is_current).day_number} (${calendar.find(d => d.is_current).stage_name})` : 'Chưa trồng'}
          </span>
        </div>
        
        <div className="calendar-panel__controls">
          {/* Switcher Chế độ xem */}
          <div className="view-switcher">
            <button 
              className={`view-btn ${viewMode === 'week' ? 'active' : ''}`}
              onClick={() => setViewMode('week')}
            >
              📅 Xem theo Tuần
            </button>
            <button 
              className={`view-btn ${viewMode === 'day' ? 'active' : ''}`}
              onClick={() => setViewMode('day')}
            >
              🕒 Xem theo Ngày
            </button>
          </div>

          {/* Switch Tối ưu hoá ML */}
          <div className="calendar-panel__opt">
            <label className="ml-switch">
              <input
                type="checkbox"
                checked={isMlOptimized}
                onChange={(e) => setIsMlOptimized(e.target.checked)}
              />
              <span className="ml-switch__slider"></span>
            </label>
            <span className="ml-switch__label">Tối ưu ML (YOLO + CSV)</span>
          </div>
        </div>
      </div>

      <div className="card__body calendar-panel__body">
        
        {/* ========================================================= */}
        {/* CHẾ ĐỘ XEM THEO TUẦN (WEEKLY VIEW - GOOGLE CALENDAR STYLE) */}
        {/* ========================================================= */}
        {viewMode === 'week' && (
          <div className="weekly-calendar-view animate-fade-in">
            {/* Thanh điều hướng tuần */}
            <div className="week-navigation">
              <button className="btn btn--sm" onClick={handlePrevWeek} disabled={currentWeekIndex === 0}>
                ◀ Tuần trước
              </button>
              <span className="week-navigation__title">
                Tuần {currentWeekIndex + 1} (Ngày {currentWeekIndex * 7 + 1} - {Math.min(calendar.length, (currentWeekIndex + 1) * 7)})
              </span>
              <button className="btn btn--sm" onClick={handleNextWeek} disabled={currentWeekIndex === totalWeeks - 1}>
                Tuần sau ▶
              </button>
            </div>

            {/* Lưới Google Calendar */}
            <div className="calendar-week-grid">
              {/* Trục giờ dọc */}
              <div className="calendar-hour-axis">
                <div className="axis-header-cell">Giờ</div>
                {hourTicks.map(hour => (
                  <div key={hour} className="hour-axis-cell">
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                ))}
              </div>

              {/* Các cột ngày */}
              <div className="calendar-days-columns">
                {weekDays.map((day) => {
                  const isDaySelected = selectedDay?.day_number === day.day_number;
                  
                  return (
                    <div 
                      key={day.day_number} 
                      className={`day-column stage-${day.stage} ${day.is_current ? 'is-current' : ''} ${isDaySelected ? 'is-selected' : ''}`}
                      onClick={() => setSelectedDay(day)}
                    >
                      {/* Tiêu đề cột */}
                      <div className="day-column-header">
                        <span className="day-column-number">Ngày {day.day_number}</span>
                        <span className="day-column-date">{day.date.split('-').slice(1).reverse().join('/')}</span>
                        {day.is_current && <span className="day-live-badge">LIVE</span>}
                      </div>

                      {/* Vùng chứa các khối thiết bị */}
                      <div className="day-events-container">
                        {/* Kẻ vạch giờ ngang mờ */}
                        {hourTicks.map(hour => (
                          <div key={hour} className="hour-grid-line" style={{ top: `${(hour - 6) * 28}px` }} />
                        ))}

                        {/* 1. Khối Đèn LED */}
                        {day.led_hours.length > 0 && (
                          <div 
                            className="event-block event-block--led" 
                            style={{ 
                              top: `${(day.led_hours[0] - 6) * 28}px`, 
                              height: `${day.led_hours.length * 28}px` 
                            }}
                            title={`Đèn LED Quang Hợp: ${day.led_hours[0]}h - ${day.led_hours[day.led_hours.length - 1] + 1}h`}
                          >
                            💡 LED
                          </div>
                        )}

                        {/* 2. Khối Quạt Gió */}
                        {day.fan_hours.length > 0 && (
                          <div 
                            className="event-block event-block--fan" 
                            style={{ 
                              top: `${(day.fan_hours[0] - 6) * 28}px`, 
                              height: `${day.fan_hours.length * 28}px` 
                            }}
                            title={`Quạt thông gió: ${day.fan_hours[0]}h - ${day.fan_hours[day.fan_hours.length - 1] + 1}h`}
                          >
                            🌬️ Quạt
                          </div>
                        )}

                        {/* 3. Điểm/Pills Tưới nước (Pump) */}
                        {day.pump_hours.map((hour) => {
                          if (hour >= 6 && hour <= 22) {
                            return (
                              <div 
                                key={hour}
                                className="event-pill event-pill--pump animate-pulse-glow"
                                style={{ top: `${(hour - 6) * 28 + 6}px` }}
                                title={`Tưới gốc: ${hour}:00`}
                              >
                                💧 Tưới
                              </div>
                            );
                          }
                          return null;
                        })}

                        {/* Chỉ số Phun sương / target độ ẩm nền */}
                        <div className="mist-target-overlay">
                          🌫️ target: {day.mist_target}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* CHẾ ĐỘ XEM THEO NGÀY (DAILY VIEW - HORIZONTAL TIMELINES)  */}
        {/* ========================================================= */}
        {viewMode === 'day' && (
          <div className="daily-timeline-view animate-fade-in">
            {/* Thanh chọn ngày nhanh bằng lưới nhỏ */}
            <div className="day-quick-selector">
              {calendar.map((day) => (
                <button
                  key={day.day_number}
                  className={`day-selector-btn stage-${day.stage} ${day.is_current ? 'is-current' : ''} ${selectedDay?.day_number === day.day_number ? 'active' : ''}`}
                  onClick={() => setSelectedDay(day)}
                >
                  {day.day_number}
                </button>
              ))}
            </div>

            {/* Timelines cho ngày được chọn */}
            {selectedDay && (
              <div className="day-timelines-card card">
                <div className="day-timelines-header">
                  <h3>🕒 Lộ trình hoạt động 24h — Ngày {selectedDay.day_number} ({selectedDay.date})</h3>
                  <span className={`badge stage-${selectedDay.stage}`}>{selectedDay.stage_name}</span>
                </div>

                <div className="timeline-grid-wrapper">
                  {/* Trục mốc giờ ngang */}
                  <div className="timeline-hours-header">
                    <div className="timeline-label-col">Thiết bị</div>
                    <div className="timeline-hours-row">
                      {Array.from({ length: 24 }, (_, h) => (
                        <span key={h} className="timeline-hour-tick">{h}h</span>
                      ))}
                    </div>
                  </div>

                  {/* 1. Row LED */}
                  <div className="timeline-device-row">
                    <div className="timeline-label-col">💡 LED Quang hợp</div>
                    <div className="timeline-track-col">
                      {selectedDay.led_hours.length > 0 ? (
                        <div 
                          className="timeline-duration-block timeline-duration-block--led"
                          style={{
                            left: `${(selectedDay.led_hours[0] / 24) * 100}%`,
                            width: `${(selectedDay.led_hours.length / 24) * 100}%`
                          }}
                        >
                          Bật (06h - 20h)
                        </div>
                      ) : (
                        <span className="timeline-row-empty">Tắt hoàn toàn</span>
                      )}
                    </div>
                  </div>

                  {/* 2. Row Pump */}
                  <div className="timeline-device-row">
                    <div className="timeline-label-col">💧 Bơm tưới gốc</div>
                    <div className="timeline-track-col">
                      {selectedDay.pump_hours.length > 0 ? (
                        selectedDay.pump_hours.map((hour) => (
                          <div 
                            key={hour}
                            className="timeline-moment-marker timeline-moment-marker--pump"
                            style={{ left: `${(hour / 24) * 100}%` }}
                            title={`Tưới nước lúc ${hour}:00`}
                          >
                            💧 Tưới
                          </div>
                        ))
                      ) : (
                        <span className="timeline-row-empty">Khóa tưới gốc</span>
                      )}
                    </div>
                  </div>

                  {/* 3. Row Fan */}
                  <div className="timeline-device-row">
                    <div className="timeline-label-col">🌬️ Quạt thông gió</div>
                    <div className="timeline-track-col">
                      {selectedDay.fan_hours.length > 0 ? (
                        <div 
                          className="timeline-duration-block timeline-duration-block--fan"
                          style={{
                            left: `${(selectedDay.fan_hours[0] / 24) * 100}%`,
                            width: `${(selectedDay.fan_hours.length / 24) * 100}%`
                          }}
                        >
                          Bật (Chạy theo đèn LED)
                        </div>
                      ) : (
                        <span className="timeline-row-empty">Chỉ bật khi quá nhiệt</span>
                      )}
                    </div>
                  </div>

                  {/* 4. Row Mist */}
                  <div className="timeline-device-row">
                    <div className="timeline-label-col">🌫️ Phun sương tạo ẩm</div>
                    <div className="timeline-track-col">
                      <div 
                        className="timeline-duration-block timeline-duration-block--mist"
                        style={{ left: 0, width: '100%' }}
                      >
                        Target độ ẩm môi trường duy trì: {selectedDay.mist_target}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* CHI TIẾT NGÀY ĐƯỢC CHỌN (SELECTED DAY DETAILS - FOOTER)   */}
        {/* ========================================================= */}
        {selectedDay && (
          <div className="day-details animate-fade-in" style={{ marginTop: '20px' }}>
            <div className="day-details__header">
              <h4 className="day-details__title">
                Chi tiết Ngày {selectedDay.day_number} — {selectedDay.date}
              </h4>
              <span className={`day-details__badge stage-${selectedDay.stage}`}>
                Giai đoạn {selectedDay.stage}: {selectedDay.stage_name}
              </span>
            </div>
            
            <div className="day-details__events">
              <h5 className="events-title">📋 Lịch hoạt động tự động chi tiết:</h5>
              <ul className="events-list">
                {selectedDay.events.map((evt, idx) => (
                  <li key={idx} className="event-item">
                    <span className="event-item__dot">⚡</span>
                    <span className="event-item__text">
                      {isMlOptimized && evt.includes("Tưới gốc tự động")
                        ? `${evt} (ML: +25% thời lượng tưới khi nhiệt độ trung bình >28°C)`
                        : evt}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
