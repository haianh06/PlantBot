/**
 * main.ino — PlantBot Firmware
 * 
 * Điều phối toàn bộ hoạt động Arduino:
 *   1. Đọc cảm biến DHT22 (nhiệt độ + độ ẩm không khí)
 *   2. Đọc cảm biến Capacitive Soil Moisture (độ ẩm đất)
 *   3. Điều khiển 3 relay (bơm nước + phun sương + quạt) qua lệnh Serial
 *   4. Gửi dữ liệu JSON qua Serial mỗi 2 giây
 * 
 * Sơ đồ kết nối:
 *   D4  → DHT22 (data)
 *   A0  → Capacitive Soil Moisture (analog)
 *   D5  → Relay 1 (máy bơm nước)
 *   D6  → Relay 2 (phun sương)
<<<<<<< HEAD
 *   D7  → Relay 3 (quạt)
 *   D8  → Relay 4 (đèn)
 * 
 * Serial Protocol:
 *   Gửi (Arduino → PC): {"temp":28.5,"humi":65.2,"soil":42,"pump":0,"mist":0,"fan":0,"led":0}
 *   Nhận (PC → Arduino): PUMP_ON / PUMP_OFF / MIST_ON / MIST_OFF / FAN_ON / FAN_OFF / LED_ON / LED_OFF / STATUS
=======
 *   D7  → Relay 3 (quạt thông gió)
 * 
 * Serial Protocol:
 *   Gửi (Arduino → PC): {"temp":28.5,"humi":65.2,"soil":42,"pump":0,"mist":0,"fan":0}
 *   Nhận (PC → Arduino): PUMP_ON / PUMP_OFF / MIST_ON / MIST_OFF / FAN_ON / FAN_OFF / STATUS
>>>>>>> ed819e82b4960937cfd5629b9427b0064b70af3c
 */

#include <DHT.h>
#include "SoilSensor.h"
#include "MyIrrigationPump.h"

// ─── Pin Configuration ─────────────────────────────────────
#define DHT_PIN       4     // D4 — DHT22 data pin
#define DHT_TYPE      DHT22
#define SOIL_PIN      A0    // A0 — Capacitive Soil Moisture
#define PUMP_RELAY    5     // D5 — Relay máy bơm nước
#define MIST_RELAY    6     // D6 — Relay phun sương
<<<<<<< HEAD
#define FAN_RELAY     7     // D7 — Relay quạt
#define LED_RELAY     8     // D8 — Relay đèn
=======
#define FAN_RELAY     7     // D7 — Relay quạt thông gió
>>>>>>> ed819e82b4960937cfd5629b9427b0064b70af3c

// ─── Timing ────────────────────────────────────────────────
#define SEND_INTERVAL 2000  // Gửi dữ liệu mỗi 2 giây (ms)

// ─── Object Instances ──────────────────────────────────────
DHT dht(DHT_PIN, DHT_TYPE);
SoilSensor soilSensor(SOIL_PIN);
RelayController pumpRelay(PUMP_RELAY, false);  // Active LOW
RelayController mistRelay(MIST_RELAY, false);  // Active LOW
<<<<<<< HEAD
RelayController fanRelay(FAN_RELAY, false);  // Active LOW
RelayController ledRelay(LED_RELAY, false);  // Active LOW
=======
RelayController fanRelay(FAN_RELAY, false);    // Active LOW
>>>>>>> ed819e82b4960937cfd5629b9427b0064b70af3c

// ─── Variables ─────────────────────────────────────────────
unsigned long lastSendTime = 0;
String inputBuffer = "";

// ─── Setup ─────────────────────────────────────────────────
void setup() {
    Serial.begin(9600);
    
    // Khởi tạo cảm biến
    dht.begin();
    
    // Khởi tạo relay (tắt tất cả khi bắt đầu)
    pumpRelay.begin();
    mistRelay.begin();
    fanRelay.begin();
<<<<<<< HEAD
    ledRelay.begin();
=======
>>>>>>> ed819e82b4960937cfd5629b9427b0064b70af3c
    
    // Thông báo sẵn sàng
    Serial.println("{\"status\":\"ready\"}");
}

// ─── Loop ──────────────────────────────────────────────────
void loop() {
    // 1. Đọc và xử lý lệnh từ Serial (nếu có)
    processSerialCommands();
    
    // 2. Gửi dữ liệu cảm biến định kỳ
    unsigned long now = millis();
    if (now - lastSendTime >= SEND_INTERVAL) {
        lastSendTime = now;
        sendSensorData();
    }
}

// ─── Đọc cảm biến và gửi JSON qua Serial ──────────────────
void sendSensorData() {
    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();
    int soilMoisture = soilSensor.readPercent();
    
    // Kiểm tra lỗi đọc DHT22
    if (isnan(temperature) || isnan(humidity)) {
        temperature = -1;
        humidity = -1;
    }
    
    // Tạo JSON string thủ công (tiết kiệm RAM hơn ArduinoJson)
    Serial.print("{\"temp\":");
    Serial.print(temperature, 1);
    Serial.print(",\"humi\":");
    Serial.print(humidity, 1);
    Serial.print(",\"soil\":");
    Serial.print(soilMoisture);
    Serial.print(",\"pump\":");
    Serial.print(pumpRelay.isOn() ? 1 : 0);
    Serial.print(",\"mist\":");
    Serial.print(mistRelay.isOn() ? 1 : 0);
    Serial.print(",\"fan\":");
    Serial.print(fanRelay.isOn() ? 1 : 0);
<<<<<<< HEAD
    Serial.print(",\"led\":");
    Serial.print(ledRelay.isOn() ? 1 : 0);
=======
>>>>>>> ed819e82b4960937cfd5629b9427b0064b70af3c
    Serial.println("}");
}

// ─── Xử lý lệnh từ Serial ─────────────────────────────────
void processSerialCommands() {
    while (Serial.available() > 0) {
        char c = Serial.read();
        
        if (c == '\n' || c == '\r') {
            // Xử lý lệnh khi nhận ký tự xuống dòng
            if (inputBuffer.length() > 0) {
                executeCommand(inputBuffer);
                inputBuffer = "";
            }
        } else {
            inputBuffer += c;
        }
    }
}

// ─── Thực thi lệnh ────────────────────────────────────────
void executeCommand(String cmd) {
    cmd.trim();
    cmd.toUpperCase();
    
    if (cmd == "PUMP_ON") {
        pumpRelay.turnOn();
    } else if (cmd == "PUMP_OFF") {
        pumpRelay.turnOff();
    } else if (cmd == "MIST_ON") {
        mistRelay.turnOn();
    } else if (cmd == "MIST_OFF") {
        mistRelay.turnOff();
<<<<<<< HEAD
    } else if (cmd == "FAN_OFF") {
        fanRelay.turnOff();
    } else if (cmd == "FAN_ON") {
        fanRelay.turnOn();
    } else if (cmd == "LED_ON") {
        ledRelay.turnOn();
    } else if (cmd == "LED_OFF") {
        ledRelay.turnOff();
=======
    } else if (cmd == "FAN_ON") {
        fanRelay.turnOn();
    } else if (cmd == "FAN_OFF") {
        fanRelay.turnOff();
>>>>>>> ed819e82b4960937cfd5629b9427b0064b70af3c
    } else if (cmd == "STATUS") {
        // Gửi trạng thái ngay lập tức
        sendSensorData();
    }
    // Lệnh không hợp lệ → bỏ qua im lặng
}
