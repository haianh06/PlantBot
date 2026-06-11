#ifndef CONFIG_H
#define CONFIG_H

// ─── Pin Configuration ─────────────────────────────────────
#define DHT_PIN       4     // D4
#define DHT_TYPE      DHT22
#define SOIL_PIN      A0    // A0
#define PUMP_RELAY    5     // D5
#define MIST_RELAY    6     // D6
#define FAN_RELAY     7     // D7
#define LED_RELAY     8     // D8

// ─── Timing ────────────────────────────────────────────────
#define SEND_INTERVAL 1000   

enum ErrorCode {
    NO_ERROR = 0,
    DHT_ERROR = 1,
    SOIL_ERROR = 2,
    SOIL_OVERWATER_ERROR = 3
};

#endif
