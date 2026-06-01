/**
 * SoilSensor.h — Cảm biến độ ẩm đất Capacitive
 * 
 * Đọc giá trị analog từ cảm biến capacitive soil moisture,
 * quy đổi sang phần trăm (0–100%) dựa trên giá trị calibration.
 * 
 * Capacitive sensor: giá trị ADC CAO = đất KHÔ, giá trị ADC THẤP = đất ƯỚT
 */

#ifndef SOIL_SENSOR_H
#define SOIL_SENSOR_H

#include <Arduino.h>

class SoilSensor {
public:
    /**
     * Constructor
     * @param pin — chân analog (A0)
     * @param dryValue — giá trị ADC khi đất khô (mặc định 520)
     * @param wetValue — giá trị ADC khi đất ướt (mặc định 260)
     */
    SoilSensor(uint8_t pin, int dryValue = 520, int wetValue = 260);

    /** Đọc giá trị ADC thô (0–1023) */
    int readRaw();

    /** Đọc độ ẩm đất quy đổi ra % (0% = khô, 100% = ướt) */
    int readPercent();

    /** Cập nhật giá trị calibration */
    void setCalibration(int dryValue, int wetValue);

private:
    uint8_t _pin;
    int _dryValue;
    int _wetValue;
};

#endif // SOIL_SENSOR_H
 