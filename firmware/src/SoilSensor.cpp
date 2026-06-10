/**
 * SoilSensorii.cpp — Implementation cảm biến độ ẩm đất
 */

#include "SoilSensor.h"

SoilSensor::SoilSensor(uint8_t pin, int dryValue, int wetValue)
    : _pin(pin), _dryValue(dryValue), _wetValue(wetValue) {}

int SoilSensor::readRaw() {
    return analogRead(_pin);
}

int SoilSensor::readPercent() {
    int raw = readRaw();
    // Map: wetValue (ướt) → 100%, dryValue (khô) → 0%
    int percent = map(raw, _wetValue, _dryValue, 100, 0);
    return constrain(percent, 0, 100);
}

void SoilSensor::setCalibration(int dryValue, int wetValue) {
    _dryValue = dryValue;
    _wetValue = wetValue;
}
