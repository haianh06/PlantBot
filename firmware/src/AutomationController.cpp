#include "AutomationController.h"

AutomationController::AutomationController(RelayController& pump, RelayController& mist, RelayController& fan, RelayController& led)
    : _pump(pump), _mist(mist), _fan(fan), _led(led), _currentStage(1), _autoEnabled(true), _lastPumpTime(0), _pumpStartTime(0), _isPumping(false) {}

void AutomationController::begin() {
    // Khởi tạo mặc định cho Stage 1
    setStage(1);
    _lastPumpTime = millis(); 
}

void AutomationController::setStage(int stage) {
    if (stage < 1 || stage > 4) return;
    _currentStage = stage;
    
    // Reset thiết bị khi đổi giai đoạn để đảm bảo an toàn
    _led.turnOff();
    _pump.turnOff();
    _fan.turnOff();
    _mist.turnOff();
    _isPumping = false;
    _lastPumpTime = millis(); // Reset lịch tưới khi đổi giai đoạn
}

void AutomationController::update(float temp, float humi, int soil) {
    if (!_autoEnabled) return;

    // Quản lý việc tắt bơm sau khi đủ thời gian tưới định kỳ
    if (_isPumping) {
        unsigned long duration = 20000; // Tưới 20s cho mọi giai đoạn theo yêu cầu mới
        if (millis() - _pumpStartTime >= duration) {
            _pump.turnOff();
            _isPumping = false;
            _lastPumpTime = millis();
        }
        return; // Đang trong chu kỳ tưới định kỳ thì không check logic khác
    }

    switch (_currentStage) {
        case 1: handleStage1(humi); break;
        case 2: handleStage2(temp, humi, soil); break;
        case 3: handleStage3(temp, humi, soil); break;
        case 4: handleStage4(); break;
    }
}

void AutomationController::handleStage1(float humi) {
    // Stage 1: Awakening - Đánh thức phôi
    _led.turnOff();
    _pump.turnOff();
    
    if (humi < 55.0) _mist.turnOn();
    else if (humi > 65.0) _mist.turnOff();
}

void AutomationController::handleStage2(float temp, float humi, int soil) {
    // Stage 2: Seedling - Đón sáng & Định hình
    // Tưới định kỳ: 3 tiếng/lần (10800000 ms), chỉ khi đèn đang bật
    if (_led.isOn() && (millis() - _lastPumpTime >= 10800000UL)) {
        _pump.turnOn();
        _isPumping = true;
        _pumpStartTime = millis();
        return;
    }

    // Bảo vệ cảm biến: Ngăn đất quá khô
    if (soil < 35) _pump.turnOn();
    else if (soil > 65 && !_isPumping) _pump.turnOff();
    
    if (humi < 60.0) _mist.turnOn();
    else if (humi > 75.0) _mist.turnOff();
}

void AutomationController::handleStage3(float temp, float humi, int soil) {
    // Stage 3: Vegetative - Phát triển mạnh
    // Tưới định kỳ: 2 tiếng/lần (7200000 ms)
    if (millis() - _lastPumpTime >= 7200000UL) {
        _pump.turnOn();
        _isPumping = true;
        _pumpStartTime = millis();
        return;
    }

    if (soil < 55) _pump.turnOn();
    else if (soil > 85 && !_isPumping) _pump.turnOff();
    
    if (humi < 75.0) _mist.turnOn();
    else if (humi > 85.0) _mist.turnOff();

    if (temp > 28.0 && _led.isOn()) _fan.turnOn();
    else if (temp < 25.0 || !_led.isOn()) _fan.turnOff();
}

void AutomationController::handleStage4() {
    // Stage 4: Harvest - Stop watering
    _pump.turnOff();
}
