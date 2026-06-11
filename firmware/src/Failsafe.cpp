#include "Failsafe.h"
#include "Globals.h"

// ─── Logic An Toàn ────────────────────────────────────────
void sanityCheck(float temp, float humi, int soilMoistureRaw) {
    if (!isTracking) {
        if (isSafeMode) {
            isSafeMode = false;
            currentErrorCode = NO_ERROR;
            pumpRelay.clearLock();
            mistRelay.clearLock();
            fanRelay.clearLock();
            fanRelay.clearCyclicMode();
        }
        return;
    }
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
            if (isAutoMode && isTracking) {
                ledRelay.turnOn(); // Mặc định bật đèn khi mất kết nối
            }
        }

        // Chỉ chạy lịch tự trị nếu Auto Mode được bật và đang gieo trồng
        if (isAutoMode && isTracking) {
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
        }
    } else {
        if (isOfflineMode) {
            isOfflineMode = false;
        }
    }
}

void evaluateEnvironment(float temp, float humi, int soilPercent) {
    if (!isTracking) return; // Không đánh giá môi trường khi không gieo trồng
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
