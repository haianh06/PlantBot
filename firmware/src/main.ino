/**
 * main.ino — PlantBot Firmware
 * 
 * Điều phối toàn bộ hoạt động Arduino:
 *   1. Đọc cảm biến DHT22 (nhiệt độ + độ ẩm không khí)
 *   2. Đọc cảm biến Capacitive Soil Moisture (độ ẩm đất)
 *   3. Điều khiển 3 relay (bơm nước + phun sương + quạt) qua lệnh Serial
 *   4. Gửi dữ liệu JSON qua Serial mỗi 1 giây (High-Fidelity cho phân tích dữ liệu)
 */

#include "Config.h"
#include "Globals.h"
#include "Failsafe.h"
#include "SerialHandler.h"

// ─── Setup ─────────────────────────────────────────────────
void setup() {
    Serial.begin(9600);
    
    dht.begin();
    
    pumpRelay.begin();
    mistRelay.begin();
    fanRelay.begin();
    ledRelay.begin();
    
    lastHeartbeatTime = millis(); // Khởi tạo mốc heartbeat
    Serial.println("{\"status\":\"ready\"}");
}

// ─── Loop ──────────────────────────────────────────────────
void loop() {
    // 1. Kiểm tra kết nối & Failsafe ngoại tuyến
    checkConnection();

    // 2. Xử lý lệnh
    processSerialCommands();
    
    // 3. Cập nhật trạng thái Relay (Timeout, Cooldown, Cyclic)
    pumpRelay.update();
    mistRelay.update();
    fanRelay.update();
    ledRelay.update();

    // 4. Chu kỳ đọc cảm biến
    unsigned long now = millis();
    if (now - lastSendTime >= SEND_INTERVAL) {
        lastSendTime = now;
        
        float temperature = dht.readTemperature();
        float humidity = dht.readHumidity();
        int soilMoistureRaw = analogRead(SOIL_PIN);
        int soilPercent = soilSensor.readPercent();
        
        // Tầng 1: Sanity Check
        sanityCheck(temperature, humidity, soilMoistureRaw);
        
        // Tầng 2: Environmental Crisis (Chỉ chạy khi bật Auto Mode)
        if (isAutoMode) {
            evaluateEnvironment(temperature, humidity, soilPercent);
        }
        
        // Gửi dữ liệu
        sendSensorData(temperature, humidity, soilPercent, soilMoistureRaw);
    }
}
