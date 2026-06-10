/**
 * RelayController.cpp — Implementation Relay Controller
 */

#include "RelayController.h"

RelayController::RelayController(uint8_t pin, bool activeLow)
    : _pin(pin), _activeLow(activeLow), _state(false) {}

void RelayController::begin() {
    pinMode(_pin, OUTPUT);
    turnOff(); // Đảm bảo relay tắt khi khởi động
}

void RelayController::turnOn() {
    _state = true;
    // Active LOW: LOW = bật | Active HIGH: HIGH = bật
    digitalWrite(_pin, _activeLow ? LOW : HIGH);
}

void RelayController::turnOff() {
    _state = false;
    // Active LOW: HIGH = tắt | Active HIGH: LOW = tắt
    digitalWrite(_pin, _activeLow ? HIGH : LOW);
}

void RelayController::toggle() {
    if (_state) {
        turnOff();
    } else {
        turnOn();
    }
}

bool RelayController::isOn() const {
    return _state;
}
