/**
 * RelayController.h — Relay Controller
 * 
 * Điều khiển relay module cho máy bơm nước / phun sương.
 * Hỗ trợ cả Active LOW và Active HIGH relay.
 * Tích hợp Timeout, Cooldown và Chế độ tuần hoàn.
 * 
 * Active LOW (mặc định): LOW = bật relay, HIGH = tắt relay
 * Active HIGH: HIGH = bật relay, LOW = tắt relay
 */

#ifndef RELAY_CONTROLLER_H
#define RELAY_CONTROLLER_H

#include <Arduino.h>

class RelayController {
public:
    RelayController(uint8_t pin, bool activeLow = true);

    void begin();
    
    // Điều khiển cơ bản (nếu đang bị lock hoặc cooldown sẽ bị bỏ qua)
    void turnOn();
    void turnOff();
    void toggle();
    bool isOn() const;

    // Timeout & Cooldown (Dành cho máy bơm an toàn)
    void turnOnWithTimeout(unsigned long timeout, unsigned long cooldown);
    bool isCooldown() const;

    // Chế độ tuần hoàn (Dành cho quạt / phun sương)
    void setCyclicMode(unsigned long onTime, unsigned long offTime);
    void clearCyclicMode();
    bool isCyclic() const;

    // Khóa khẩn cấp (Sanity Check fail)
    void forceLock();
    void clearLock();
    bool isLocked() const;

    // Hàm gọi trong loop() để cập nhật trạng thái thời gian
    void update();

private:
    uint8_t _pin;
    bool _activeLow;
    bool _state;

    // Quản lý Timeout & Cooldown
    unsigned long _timeoutDuration;
    unsigned long _cooldownDuration;
    unsigned long _lastOnTime;
    unsigned long _lastOffTime;
    bool _hasTimeout;
    bool _inCooldown;

    // Quản lý Cyclic
    bool _isCyclic;
    unsigned long _cyclicOnTime;
    unsigned long _cyclicOffTime;
    unsigned long _lastCyclicSwitch;

    // Khóa
    bool _locked;

    // Hàm nội bộ để ghi trực tiếp không kiểm tra điều kiện
    void _setHardwareState(bool state);
};

#endif // RELAY_CONTROLLER_H
