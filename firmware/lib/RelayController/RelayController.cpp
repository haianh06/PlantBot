/**
 * RelayController.cpp — Implementation Relay Controller
 */

#include "RelayController.h"

RelayController::RelayController(uint8_t pin, bool activeLow)
    : _pin(pin), _activeLow(activeLow), _state(false),
      _timeoutDuration(0), _cooldownDuration(0), _lastOnTime(0), _lastOffTime(0),
      _hasTimeout(false), _inCooldown(false),
      _isCyclic(false), _cyclicOnTime(0), _cyclicOffTime(0), _lastCyclicSwitch(0),
      _locked(false) {}

void RelayController::begin() {
    pinMode(_pin, OUTPUT);
    _setHardwareState(false);
}

void RelayController::_setHardwareState(bool state) {
    _state = state;
    if (_activeLow) {
        digitalWrite(_pin, state ? LOW : HIGH);
    } else {
        digitalWrite(_pin, state ? HIGH : LOW);
    }
}

void RelayController::turnOn() {
    if (_locked || _inCooldown || _isCyclic) return;
    if (!_state) {
        _setHardwareState(true);
        _hasTimeout = false; 
    }
}

void RelayController::turnOff() {
    if (_locked || _isCyclic) return;
    if (_state) {
        _setHardwareState(false);
        _hasTimeout = false;
    }
}

void RelayController::toggle() {
    if (_locked || _inCooldown || _isCyclic) return;
    if (_state) turnOff();
    else turnOn();
}

bool RelayController::isOn() const {
    return _state;
}

void RelayController::turnOnWithTimeout(unsigned long timeout, unsigned long cooldown) {
    if (_locked || _inCooldown || _isCyclic) return;
    
    _setHardwareState(true);
    _timeoutDuration = timeout;
    _cooldownDuration = cooldown;
    _hasTimeout = true;
    _lastOnTime = millis();
}

bool RelayController::isCooldown() const {
    return _inCooldown;
}

void RelayController::setCyclicMode(unsigned long onTime, unsigned long offTime) {
    if (_locked) return;
    _isCyclic = true;
    _cyclicOnTime = onTime;
    _cyclicOffTime = offTime;
    
    _setHardwareState(true);
    _lastCyclicSwitch = millis();
    _hasTimeout = false;
    _inCooldown = false;
}

void RelayController::clearCyclicMode() {
    _isCyclic = false;
    _setHardwareState(false);
}

bool RelayController::isCyclic() const {
    return _isCyclic;
}

void RelayController::forceLock() {
    _locked = true;
    _isCyclic = false;
    _hasTimeout = false;
    _inCooldown = false;
    _setHardwareState(false);
}

void RelayController::clearLock() {
    _locked = false;
}

bool RelayController::isLocked() const {
    return _locked;
}

void RelayController::update() {
    unsigned long now = millis();

    if (_isCyclic && !_locked) {
        unsigned long elapsed = now - _lastCyclicSwitch;
        if (_state) {
            if (elapsed >= _cyclicOnTime) {
                _setHardwareState(false);
                _lastCyclicSwitch = now;
            }
        } else {
            if (elapsed >= _cyclicOffTime) {
                _setHardwareState(true);
                _lastCyclicSwitch = now;
            }
        }
        return;
    }

    if (_hasTimeout && _state && !_locked) {
        if (now - _lastOnTime >= _timeoutDuration) {
            _setHardwareState(false);
            _hasTimeout = false;
            if (_cooldownDuration > 0) {
                _inCooldown = true;
                _lastOffTime = now;
            }
        }
    }

    if (_inCooldown && !_locked) {
        if (now - _lastOffTime >= _cooldownDuration) {
            _inCooldown = false;
        }
    }
}
