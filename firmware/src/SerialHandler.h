#ifndef SERIALHANDLER_H
#define SERIALHANDLER_H

#include <Arduino.h>

void processSerialCommands();
void executeCommand(String cmd);
void sendSensorData(float temperature, float humidity, int soilMoisturePercent, int soilMoistureRaw);

#endif
