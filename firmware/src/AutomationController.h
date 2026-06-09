#ifndef AUTOMATION_CONTROLLER_H
#define AUTOMATION_CONTROLLER_H

#include <Arduino.h>
#include "MyIrrigationPump.h" // Sử dụng RelayController đã có

class AutomationController {
public:
    AutomationController(RelayController& pump, RelayController& mist, RelayController& fan, RelayController& led);
    
    void begin();
    void update(float temp, float humi, int soil);
    
    void setStage(int stage);
    int getStage() const { return _currentStage; }
    
    void setAutoMode(bool enable) { _autoEnabled = enable; }
    bool isAutoEnabled() const { return _autoEnabled; }

private:
    RelayController& _pump;
    RelayController& _mist;
    RelayController& _fan;
    RelayController& _led;
    
    int _currentStage;
    bool _autoEnabled;
    unsigned long _lastPumpTime;
    unsigned long _pumpStartTime;
    bool _isPumping;
    
    void handleStage1(float humi);
    void handleStage2(float temp, float humi, int soil);
    void handleStage3(float temp, float humi, int soil);
    void handleStage4();
};

#endif
