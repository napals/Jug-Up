import * as Location from 'expo-location';
import { heatMessage, recommendExtraMl } from './core';

const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';
const REQUEST_TIMEOUT_MS = 10000;

export async function requestLocationPermission() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (_error) {
    return false;
  }
}

async function fetchJsonWithTimeout(url, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Weather service returned HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function getCurrentTemperatureC() {
  const granted = await requestLocationPermission();
  if (!granted) return { available: false, reason: 'permission_denied' };

  try {
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    const { latitude, longitude } = position.coords;
    const url = `${WEATHER_API}?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&current=temperature_2m&daily=temperature_2m_max&timezone=auto`;
    const data = await fetchJsonWithTimeout(url);
    const currentRaw = data.current?.temperature_2m;
    const todayMaxRaw = data.daily?.temperature_2m_max?.[0];
    const currentTempC = currentRaw == null ? null : Number(currentRaw);
    const todayMaxC = todayMaxRaw == null ? null : Number(todayMaxRaw);

    if (!Number.isFinite(todayMaxC)) {
      return { available: false, reason: 'invalid_response' };
    }

    return {
      available: true,
      currentTempC: Number.isFinite(currentTempC) ? currentTempC : null,
      todayMaxC,
    };
  } catch (error) {
    return {
      available: false,
      reason: error?.name === 'AbortError' ? 'timeout' : 'network_error',
    };
  }
}


export { heatMessage, recommendExtraMl } from './core';
