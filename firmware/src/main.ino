/**
 * main.ino — PlantBot Firmware
 * 
 * Điều phối toàn bộ hoạt động Arduino:
 *   1. Đọc cảm biến DHT22 (nhiệt độ + độ ẩm không khí)
 *   2. Đọc cảm biến Capacitive Soil Moisture (độ ẩm đất)
 *   3. Điều khiển 3 relay (bơm nước + phun sương + quạt) qua lệnh Serial
 *   4. Gửi dữ liệu JSON qua Serial mỗi 1 giây (High-Fidelity cho ML)
 */

#include <DHT.h>
#include "SoilSensor.h"
#include "RelayController.h"

// ─── Pin Configuration ─────────────────────────────────────
#define DHT_PIN       4     // D4
#define DHT_TYPE      DHT22
#define SOIL_PIN      A0    // A0
#define PUMP_RELAY    5     // D5
#define MIST_RELAY    6     // D6
#define FAN_RELAY     7     // D7
#define LED_RELAY     8     // D8

// ─── Timing ────────────────────────────────────────────────
#define SEND_INTERVAL 1000   

// ─── Object Instances ──────────────────────────────────────
DHT dht(DHT_PIN, DHT_TYPE);
SoilSensor soilSensor(SOIL_PIN);
RelayController pumpRelay(PUMP_RELAY, false);  // Active LOW
RelayController mistRelay(MIST_RELAY, false);  // Active LOW
RelayController fanRelay(FAN_RELAY, false);  // Active LOW
RelayController ledRelay(LED_RELAY, false);  // Active LOW

// ─── Variables ─────────────────────────────────────────────
unsigned long lastSendTime = 0;
String inputBuffer = "";

enum ErrorCode {
    NO_ERROR = 0,
    DHT_ERROR = 1,
    SOIL_ERROR = 2,
    SOIL_OVERWATER_ERROR = 3
};

bool isSafeMode = false;
int currentErrorCode = NO_ERROR;
unsigned long soilErrorStartTime = 0;
bool soilPotentialError = false;
bool envOverriding = false;
unsigned long dhtErrorStartTime = 0;
bool dhtPotentialError = false;
int currentEnvCode = 0; // 0 = Normal, 1 = Heat Shock, 2 = Humidity Crisis

// Biến điều khiển Offline Failsafe
unsigned long lastHeartbeatTime = 0;
bool isOfflineMode = false;
unsigned long offlineLedCycleStartTime = 0;
unsigned long offlinePumpLastTime = 0;
bool offlineLedState = true;

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

// ─── Forward Declarations ──────────────────────────────────
void processSerialCommands();
void executeCommand(String cmd);
void sendSensorData(float temp, float humi, int soil);
void sanityCheck(float temp, float humi, int soilMoistureRaw);
void evaluateEnvironment(float temp, float humi, int soilPercent);
void checkConnection();

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

    // 3. Chu kỳ đọc cảm biến
    unsigned long now = millis();
    if (now - lastSendTime >= SEND_INTERVAL) {
        lastSendTime = now;
        
        float temperature = dht.readTemperature();
        float humidity = dht.readHumidity();
        int soilMoistureRaw = analogRead(SOIL_PIN);
        int soilPercent = soilSensor.readPercent();
        
        // Tầng 1: Sanity Check
        sanityCheck(temperature, humidity, soilMoistureRaw);
        
        // Tầng 2: Environmental Crisis
        evaluateEnvironment(temperature, humidity, soilPercent);
        
        // Gửi dữ liệu
        sendSensorData(temperature, humidity, soilPercent);
    }
}

// ─── Logic An Toàn ────────────────────────────────────────
void sanityCheck(float temp, float humi, int soilMoistureRaw) {
    bool dhtIsNormal = !(isnan(temp) || isnan(humi) || temp <= -100.0);
    bool soilIsNormal = !(soilMoistureRaw <= 5 || soilMoistureRaw >= 1020);

    // Case 1: Lỗi DHT22 (chờ 30s)
    if (!dhtIsNormal) {
        if (!dhtPotentialError) {
            dhtPotentialError = true;
            dhtErrorStartTime = millis();
        } else if (millis() - dhtErrorStartTime >= 30000UL) {
            if (currentErrorCode != DHT_ERROR) {
                isSafeMode = true;
                currentErrorCode = DHT_ERROR;
                mistRelay.forceLock();
                fanRelay.setCyclicMode(300000UL, 1500000UL); // 5 phút on, 25 phút off
            }
        }
    } else {
        dhtPotentialError = false;
    }

    // Case 2: Lỗi cảm biến đất (0 hoặc 1023, chờ 30s)
    if (!soilIsNormal) {
        if (!soilPotentialError) {
            soilPotentialError = true;
            soilErrorStartTime = millis();
        } else if (millis() - soilErrorStartTime >= 30000UL) {
            if (currentErrorCode != SOIL_ERROR) {
                isSafeMode = true;
                currentErrorCode = SOIL_ERROR;
                pumpRelay.forceLock();
            }
        }
    } else {
        soilPotentialError = false;
    }

    // Tính % độ ẩm phục vụ kiểm tra úng nước
    int soilPercent = soilSensor.readPercent();

    // Case 3: Bảo vệ đất quá ẩm (>85%)
    if (soilIsNormal && soilPercent > 85) {
        if (currentErrorCode != SOIL_OVERWATER_ERROR) {
            isSafeMode = true;
            currentErrorCode = SOIL_OVERWATER_ERROR;
            pumpRelay.forceLock();
        }
    }

    // Tự động khôi phục
    if (isSafeMode) {
        // Khôi phục khi cảm biến hoạt động bình thường trở lại (trừ lỗi quá ẩm)
        if (dhtIsNormal && soilIsNormal && currentErrorCode != SOIL_OVERWATER_ERROR) {
            isSafeMode = false;
            currentErrorCode = NO_ERROR;
            pumpRelay.clearLock();
            mistRelay.clearLock();
            fanRelay.clearLock();
            fanRelay.clearCyclicMode();
        }
        // Khôi phục khi lỗi quá ẩm đã hạ về dưới 80%
        else if (currentErrorCode == SOIL_OVERWATER_ERROR && soilIsNormal && soilPercent <= 80) {
            isSafeMode = false;
            currentErrorCode = NO_ERROR;
            pumpRelay.clearLock();
        }
    }
}

// ─── Kiểm tra kết nối & Failsafe Ngoại tuyến ──────────────
void checkConnection() {
    unsigned long now = millis();

    // Nếu quá 60 giây không nhận được tín hiệu Serial
    if (now - lastHeartbeatTime >= 60000UL) {
        if (!isOfflineMode) {
            isOfflineMode = true;
            offlineLedCycleStartTime = now;
            offlinePumpLastTime = now;
            offlineLedState = true;
            ledRelay.turnOn(); // Mặc định bật đèn khi mất kết nối
        }

        // --- Lịch đèn quang hợp ngoại tuyến (Bật 14h / Tắt 10h) ---
        // 14h = 50,400,000 ms, 10h = 36,000,000 ms
        unsigned long elapsedLed = now - offlineLedCycleStartTime;
        if (offlineLedState) {
            if (elapsedLed >= 50400000UL) {
                ledRelay.turnOff();
                offlineLedState = false;
                offlineLedCycleStartTime = now;
            } else {
                ledRelay.turnOn();
            }
        } else {
            if (elapsedLed >= 36000000UL) {
                ledRelay.turnOn();
                offlineLedState = true;
                offlineLedCycleStartTime = now;
            } else {
                ledRelay.turnOff();
            }
        }

        // --- Lịch bơm nước ngoại tuyến (Tưới 20s mỗi 6 tiếng) ---
        // 6 tiếng = 21,600,000 ms
        if (now - offlinePumpLastTime >= 21600000UL) {
            if (!pumpRelay.isOn() && !pumpRelay.isCooldown() && !pumpRelay.isLocked()) {
                pumpRelay.turnOnWithTimeout(20000UL, 300000UL); // Bơm 20s, 5m cooldown
                offlinePumpLastTime = now;
            }
        }
    } else {
        if (isOfflineMode) {
            isOfflineMode = false;
        }
    }
}

void evaluateEnvironment(float temp, float humi, int soilPercent) {
    if (isSafeMode) return; // Nếu đã lỗi cảm biến thì ưu tiên Sanity Check

    bool isHeatShock = (temp > 40.0 && !isnan(temp));
    bool isHumidityCrisis = (humi > 85.0 && !isnan(humi));
    bool isExtreme = isHeatShock || isHumidityCrisis;

    if (isExtreme) {
        envOverriding = true;
        if (isHumidityCrisis) {
            // Độ ẩm quá cao: Tắt phun sương ngay lập tức và bật quạt
            mistRelay.clearCyclicMode();
            mistRelay.turnOff();
            fanRelay.turnOn();
            currentEnvCode = 2; // Úng khí
        } else if (isHeatShock) {
            // Quá nhiệt: Bật quạt và phun sương tuần hoàn để làm mát
            fanRelay.turnOn();
            if (currentEnvCode != 1) {
                mistRelay.setCyclicMode(30000UL, 120000UL); // 30s on, 2m off
            }
            currentEnvCode = 1; // Sốc nhiệt
        }
    } else {
        currentEnvCode = 0;
        if (envOverriding) {
            envOverriding = false;
            mistRelay.clearCyclicMode();
            fanRelay.turnOff();
        }
    }
    
    // Case 5: Khô hạn -> Safe Pumping
    if (soilPercent < 45) {
        if (!pumpRelay.isOn() && !pumpRelay.isCooldown() && !pumpRelay.isLocked()) {
             pumpRelay.turnOnWithTimeout(15000UL, 300000UL); // 15s timeout, 5m cooldown
        }
    }
}

// ─── Đọc cảm biến và gửi JSON qua Serial ──────────────────
void sendSensorData(float temperature, float humidity, int soilMoisture) {
    if (isnan(temperature) || isnan(humidity)) {
        temperature = -1;
        humidity = -1;
    }
    
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
    Serial.print(",\"led\":");
    Serial.print(ledRelay.isOn() ? 1 : 0);
    Serial.print(",\"safe_mode\":");
    Serial.print(isSafeMode ? "true" : "false");
    Serial.print(",\"error_code\":");
    Serial.print(currentErrorCode);
    Serial.print(",\"env_code\":");
    Serial.print(currentEnvCode);
    Serial.print(",\"offline\":");
    Serial.print(isOfflineMode ? 1 : 0);
    Serial.println("}");
}

// ─── Xử lý lệnh từ Serial ─────────────────────────────────
void processSerialCommands() {
    while (Serial.available() > 0) {
        char c = Serial.read();
        
        if (c == '\n' || c == '\r') {
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
    
    // Cập nhật nhịp tim khi có bất kỳ lệnh nào từ PC
    lastHeartbeatTime = millis();

    if (cmd == "HB") {
        // Tín hiệu Heartbeat, không xử lý gì thêm
        return;
    }

    bool stateChanged = false;

    // Chặn lệnh nếu đang ở Safe Mode
    if (isSafeMode && cmd != "STATUS") {
        return;
    }

    if (cmd == "PUMP_ON") {
        pumpRelay.turnOnWithTimeout(15000UL, 300000UL);
        stateChanged = true;
    } else if (cmd == "PUMP_OFF") {
        pumpRelay.turnOff();
        stateChanged = true;
    } else if (cmd == "MIST_ON") {
        mistRelay.turnOn();
        stateChanged = true;
    } else if (cmd == "MIST_OFF") {
        mistRelay.turnOff();
        stateChanged = true;
    } else if (cmd == "FAN_ON") {
        fanRelay.turnOn();
        stateChanged = true;
    } else if (cmd == "FAN_OFF") {
        fanRelay.turnOff();
        stateChanged = true;
    } else if (cmd == "LED_ON") {
        ledRelay.turnOn();
        stateChanged = true;
    } else if (cmd == "LED_OFF") {
        ledRelay.turnOff();
        stateChanged = true;
    } else if (cmd == "STATUS") {
        stateChanged = true;
    }

    if (stateChanged) {
        // Gửi lập tức trạng thái hiện tại (có thể là cached sensor data)
        float t = dht.readTemperature();
        float h = dht.readHumidity();
        int s = soilSensor.readPercent();
        sendSensorData(t, h, s);
        lastSendTime = millis(); // Reset chu kỳ
    }
}
