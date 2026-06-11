#include "Globals.h"

// ─── Object Instances Definition ───────────────────────────
DHT dht(DHT_PIN, DHT_TYPE);
SoilSensor soilSensor(SOIL_PIN);
RelayController pumpRelay(PUMP_RELAY, false);  // Active LOW
RelayController mistRelay(MIST_RELAY, false);  // Active LOW
RelayController fanRelay(FAN_RELAY, false);    // Active LOW
RelayController ledRelay(LED_RELAY, false);    // Active LOW

// ─── Variables Definition ──────────────────────────────────
unsigned long lastSendTime = 0;
String inputBuffer = "";
bool isSafeMode = false;
int currentErrorCode = NO_ERROR;
unsigned long soilErrorStartTime = 0;
bool soilPotentialError = false;
bool envOverriding = false;
unsigned long dhtErrorStartTime = 0;
bool dhtPotentialError = false;
int currentEnvCode = 0;

unsigned long lastHeartbeatTime = 0;
bool isOfflineMode = false;
unsigned long offlineLedCycleStartTime = 0;
unsigned long offlinePumpLastTime = 0;
bool offlineLedState = true;
bool isAutoMode = true;
bool isTracking = true;
