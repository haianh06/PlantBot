#include "SerialHandler.h"
#include "Globals.h"

// ─── Đọc cảm biến và gửi JSON qua Serial ──────────────────
void sendSensorData(float temperature, float humidity, int soilMoisturePercent, int soilMoistureRaw) {
    if (isnan(temperature) || isnan(humidity)) {
        temperature = -1;
        humidity = -1;
    }
    
    Serial.print("{\"temp\":");
    Serial.print(temperature, 1);
    Serial.print(",\"humi\":");
    Serial.print(humidity, 1);
    Serial.print(",\"soil\":");
    Serial.print(soilMoisturePercent);
    Serial.print(",\"soil_raw\":");
    Serial.print(soilMoistureRaw);
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
    Serial.print(",\"dev_auto\":");
    Serial.print(isAutoMode ? 1 : 0);
    Serial.print(",\"tracking\":");
    Serial.print(isTracking ? 1 : 0);
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

    // Chặn lệnh nếu đang ở Safe Mode (cho phép lệnh hiệu chuẩn và tắt tracking đi qua để tự phục hồi)
    if (isSafeMode && cmd != "STATUS" && !cmd.startsWith("CALIB ") && cmd != "TRACKING_OFF") {
        return;
    }

    if (cmd.startsWith("CALIB ")) {
        int firstSpace = cmd.indexOf(' ');
        int secondSpace = cmd.indexOf(' ', firstSpace + 1);
        if (firstSpace != -1 && secondSpace != -1) {
            int dry = cmd.substring(firstSpace + 1, secondSpace).toInt();
            int wet = cmd.substring(secondSpace + 1).toInt();
            if (dry > 0 && wet > 0) {
                soilSensor.setCalibration(dry, wet);
                stateChanged = true;
            }
        }
    } else if (cmd == "TRACKING_ON") {
        isTracking = true;
        stateChanged = true;
    } else if (cmd == "TRACKING_OFF") {
        isTracking = false;
        isSafeMode = false;
        currentErrorCode = NO_ERROR;
        pumpRelay.clearLock();
        mistRelay.clearLock();
        fanRelay.clearLock();
        fanRelay.clearCyclicMode();
        stateChanged = true;
    } else if (cmd.startsWith("PUMP_ON")) {
        unsigned long timeout = 15000UL;
        unsigned long cooldown = 300000UL;
        int spaceIdx = cmd.indexOf(' ');
        if (spaceIdx != -1) {
            int secondSpaceIdx = cmd.indexOf(' ', spaceIdx + 1);
            if (secondSpaceIdx != -1) {
                timeout = cmd.substring(spaceIdx + 1, secondSpaceIdx).toInt();
                cooldown = cmd.substring(secondSpaceIdx + 1).toInt();
            } else {
                timeout = cmd.substring(spaceIdx + 1).toInt();
                cooldown = 5000UL; // 5s cooldown mặc định cho lệnh PC
            }
        }
        pumpRelay.turnOnWithTimeout(timeout, cooldown);
        stateChanged = true;
    } else if (cmd == "PUMP_OFF") {
        pumpRelay.turnOff();
        stateChanged = true;
    } else if (cmd == "MIST_ON") {
        mistRelay.turnOn();
        stateChanged = true;
    } else if (cmd.startsWith("MIST_CYCLIC ")) {
        int spaceIdx = cmd.indexOf(' ');
        int secondSpaceIdx = cmd.indexOf(' ', spaceIdx + 1);
        if (spaceIdx != -1 && secondSpaceIdx != -1) {
            unsigned long onTime = cmd.substring(spaceIdx + 1, secondSpaceIdx).toInt();
            unsigned long offTime = cmd.substring(secondSpaceIdx + 1).toInt();
            if (onTime > 0 && offTime > 0) {
                mistRelay.setCyclicMode(onTime, offTime);
                stateChanged = true;
            }
        }
    } else if (cmd == "MIST_OFF") {
        mistRelay.clearCyclicMode();
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
    } else if (cmd == "AUTO_ON") {
        isAutoMode = true;
        stateChanged = true;
    } else if (cmd == "AUTO_OFF") {
        isAutoMode = false;
        mistRelay.clearCyclicMode();
        fanRelay.clearCyclicMode();
        stateChanged = true;
    } else if (cmd == "STATUS") {
        stateChanged = true;
    }

    if (stateChanged) {
        // Gửi lập tức trạng thái hiện tại (có thể là cached sensor data)
        float t = dht.readTemperature();
        float h = dht.readHumidity();
        int s = soilSensor.readPercent();
        sendSensorData(t, h, s, analogRead(SOIL_PIN));
        lastSendTime = millis(); // Reset chu kỳ
    }
}
