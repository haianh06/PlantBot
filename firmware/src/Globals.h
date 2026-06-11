#ifndef GLOBALS_H
#define GLOBALS_H

#include <Arduino.h>
#include <DHT.h>
#include "SoilSensor.h"
#include "RelayController.h"
#include "Config.h"

// ─── Object Instances (extern) ─────────────────────────────
extern DHT dht;
extern SoilSensor soilSensor;
extern RelayController pumpRelay;
extern RelayController mistRelay;
extern RelayController fanRelay;
extern RelayController ledRelay;

// ─── Variables (extern) ────────────────────────────────────
extern unsigned long lastSendTime;
extern String inputBuffer;
extern bool isSafeMode;
extern int currentErrorCode;
extern unsigned long soilErrorStartTime;
extern bool soilPotentialError;
extern bool envOverriding;
extern unsigned long dhtErrorStartTime;
extern bool dhtPotentialError;
extern int currentEnvCode;

// Biến điều khiển Offline Failsafe
extern unsigned long lastHeartbeatTime;
extern bool isOfflineMode;
extern unsigned long offlineLedCycleStartTime;
extern unsigned long offlinePumpLastTime;
extern bool offlineLedState;
extern bool isAutoMode;
extern bool isTracking;

#endif
