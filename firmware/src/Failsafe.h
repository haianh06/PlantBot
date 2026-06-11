#ifndef FAILSAFE_H
#define FAILSAFE_H

void sanityCheck(float temp, float humi, int soilMoistureRaw);
void checkConnection();
void evaluateEnvironment(float temp, float humi, int soilPercent);

#endif
