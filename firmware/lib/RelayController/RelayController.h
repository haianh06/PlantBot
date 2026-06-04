/**
 * MyIrrigationPump.h — Relay Controller
 * 
 * Điều khiển relay module cho máy bơm nước / phun sương.
 * Hỗ trợ cả Active LOW và Active HIGH relay.
 * 
 * Active LOW (mặc định): LOW = bật relay, HIGH = tắt relay
 * Active HIGH: HIGH = bật relay, LOW = tắt relay
 */

#ifndef MY_IRRIGATION_PUMP_H
#define MY_IRRIGATION_PUMP_H

#include <Arduino.h>

class RelayController {
public:
    /**
     * Constructor
     * @param pin — chân digital điều khiển relay (D5 hoặc D6)
     * @param activeLow — true nếu relay Active LOW (mặc định)
     */
    RelayController(uint8_t pin, bool activeLow = true);

    /** Khởi tạo pin (gọi trong setup()) */
    void begin();

    /** Bật relay */
    void turnOn();

    /** Tắt relay */
    void turnOff();

    /** Đảo trạng thái relay */
    void toggle();

    /** Kiểm tra relay đang bật hay tắt */
    bool isOn() const;

private:
    uint8_t _pin;
    bool _activeLow;
    bool _state; // true = đang bật
};

#endif // MY_IRRIGATION_PUMP_H
