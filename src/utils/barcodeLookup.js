import AsyncStorage from '@react-native-async-storage/async-storage';
import { guessDrinkTypeFromCategories } from '../constants/drinkTypes';

const CACHE_KEY_PREFIX = 'hydrate:barcode:';
const API_BASE = 'https://world.openfoodfacts.org/api/v2/product';
const REQUEST_TIMEOUT_MS = 10000;

export { parseVolumeToMl } from './core';
import { parseVolumeToMl } from './core';

async function getCached(barcode) {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY_PREFIX + barcode);
    if (!raw) return null;
    const value = JSON.parse(raw);
    return value && typeof value === 'object' ? value : null;
  } catch (_error) {
    return null;
  }
}

async function setCached(barcode, result) {
  try {
    await AsyncStorage.setItem(CACHE_KEY_PREFIX + barcode, JSON.stringify(result));
  } catch (_error) {
    // Cache failures must never block scanning.
  }
}

async function fetchProduct(barcode) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE}/${encodeURIComponent(barcode)}.json`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'JugUp-App/1.2' },
    });
    if (!response.ok) throw new Error(`Product service returned HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function lookupProductByBarcode(barcode) {
  const safeBarcode = String(barcode ?? '').trim();
  if (!/^\d{6,14}$/.test(safeBarcode)) {
    return { found: false, barcode: safeBarcode, reason: 'invalid_barcode' };
  }

  const cached = await getCached(safeBarcode);
  if (cached) return cached;

  try {
    const data = await fetchProduct(safeBarcode);
    if (data.status !== 1 || !data.product) {
      const result = { found: false, barcode: safeBarcode };
      await setCached(safeBarcode, result);
      return result;
    }

    const name = data.product.product_name || data.product.generic_name || 'Unknown product';
    const volumeMl = parseVolumeToMl(data.product.quantity);
    const suggestedDrinkType = guessDrinkTypeFromCategories(data.product.categories_tags);
    const result = volumeMl
      ? { found: true, barcode: safeBarcode, name, volumeMl, suggestedDrinkType }
      : { found: false, barcode: safeBarcode, name, reason: 'no_volume_data' };

    await setCached(safeBarcode, result);
    return result;
  } catch (error) {
    return {
      found: false,
      barcode: safeBarcode,
      reason: error?.name === 'AbortError' ? 'timeout' : 'network_error',
    };
  }
}
