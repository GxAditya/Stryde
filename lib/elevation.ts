/**
 * Elevation data service using Open-Elevation API
 * Provides elevation lookup, caching, and profile calculations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { isOnline } from './maps';

// Open-Elevation API endpoint
const OPEN_ELEVATION_API = 'https://api.open-elevation.com/api/v1/lookup';

// Cache configuration
const ELEVATION_CACHE_KEY = 'elevation_cache';
const CACHE_EXPIRY_DAYS = 30;
const BATCH_SIZE = 100; // Maximum points per API request

// Elevation cache entry
interface ElevationCacheEntry {
  latitude: number;
  longitude: number;
  elevation: number;
  timestamp: number;
}

// Elevation point
export interface ElevationPoint {
  latitude: number;
  longitude: number;
  elevation: number;
}

// Elevation profile result
export interface ElevationProfile {
  points: ElevationPoint[];
  totalGain: number;
  totalLoss: number;
  minElevation: number;
  maxElevation: number;
  averageElevation: number;
}

// In-memory cache
let memoryCache: Map<string, ElevationCacheEntry> = new Map();
let cacheLoaded = false;

/**
 * Generate cache key for coordinates
 */
function getCacheKey(lat: number, lng: number): string {
  // Round to 5 decimal places (~1.1m precision) for caching
  const roundedLat = Math.round(lat * 100000) / 100000;
  const roundedLng = Math.round(lng * 100000) / 100000;
  return `${roundedLat},${roundedLng}`;
}

/**
 * Load elevation cache from AsyncStorage
 */
async function loadCache(): Promise<void> {
  if (cacheLoaded) return;

  try {
    const cached = await AsyncStorage.getItem(ELEVATION_CACHE_KEY);
    if (cached) {
      const entries: ElevationCacheEntry[] = JSON.parse(cached);
      const now = Date.now();
      const expiryMs = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

      for (const entry of entries) {
        // Only load non-expired entries
        if (now - entry.timestamp < expiryMs) {
          const key = getCacheKey(entry.latitude, entry.longitude);
          memoryCache.set(key, entry);
        }
      }
    }
    cacheLoaded = true;
  } catch (error) {
    console.error('Failed to load elevation cache:', error);
  }
}

/**
 * Save elevation cache to AsyncStorage
 */
async function saveCache(): Promise<void> {
  try {
    const entries = Array.from(memoryCache.values());
    await AsyncStorage.setItem(ELEVATION_CACHE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error('Failed to save elevation cache:', error);
  }
}

/**
 * Get cached elevation for coordinates
 */
function getCachedElevation(lat: number, lng: number): number | null {
  const key = getCacheKey(lat, lng);
  const entry = memoryCache.get(key);
  if (entry) {
    return entry.elevation;
  }
  return null;
}

/**
 * Cache elevation data
 */
function cacheElevation(lat: number, lng: number, elevation: number): void {
  const key = getCacheKey(lat, lng);
  memoryCache.set(key, {
    latitude: lat,
    longitude: lng,
    elevation,
    timestamp: Date.now(),
  });
}

/**
 * Fetch elevation data from Open-Elevation API
 */
async function fetchElevationFromAPI(
  locations: Array<{ latitude: number; longitude: number }>
): Promise<Array<{ latitude: number; longitude: number; elevation: number }>> {
  const online = await isOnline();
  if (!online) {
    throw new Error('No internet connection');
  }

  const response = await fetch(OPEN_ELEVATION_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ locations }),
  });

  if (!response.ok) {
    throw new Error(`Elevation API error: ${response.status}`);
  }

  const data = await response.json();
  return data.results || [];
}

/**
 * Get elevation for a single point
 */
export async function getElevation(
  latitude: number,
  longitude: number
): Promise<number | null> {
  await loadCache();

  // Check cache first
  const cached = getCachedElevation(latitude, longitude);
  if (cached !== null) {
    return cached;
  }

  // Fetch from API
  try {
    const results = await fetchElevationFromAPI([{ latitude, longitude }]);
    if (results.length > 0) {
      const elevation = results[0].elevation;
      cacheElevation(latitude, longitude, elevation);
      await saveCache();
      return elevation;
    }
  } catch (error) {
    console.error('Failed to fetch elevation:', error);
  }

  return null;
}

/**
 * Get elevations for multiple points (with batching)
 */
export async function getElevations(
  points: Array<{ latitude: number; longitude: number }>
): Promise<Array<{ latitude: number; longitude: number; elevation: number | null }>> {
  await loadCache();

  const results: Array<{ latitude: number; longitude: number; elevation: number | null }> = [];
  const toFetch: Array<{ latitude: number; longitude: number; index: number }> = [];

  // Check cache for each point
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const cached = getCachedElevation(point.latitude, point.longitude);
    if (cached !== null) {
      results.push({ ...point, elevation: cached });
    } else {
      toFetch.push({ ...point, index: i });
      results.push({ ...point, elevation: null });
    }
  }

  // Fetch missing elevations in batches
  if (toFetch.length > 0) {
    const online = await isOnline();
    if (!online) {
      console.warn('No internet connection, using cached elevations only');
      return results;
    }

    // Process in batches
    for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
      const batch = toFetch.slice(i, i + BATCH_SIZE);
      const locations = batch.map((p) => ({
        latitude: p.latitude,
        longitude: p.longitude,
      }));

      try {
        const apiResults = await fetchElevationFromAPI(locations);

        for (const apiResult of apiResults) {
          const { latitude, longitude, elevation } = apiResult;
          cacheElevation(latitude, longitude, elevation);

          // Update results array
          const batchItem = batch.find(
            (p) => p.latitude === latitude && p.longitude === longitude
          );
          if (batchItem) {
            results[batchItem.index].elevation = elevation;
          }
        }
      } catch (error) {
        console.error('Failed to fetch elevation batch:', error);
      }
    }

    // Save updated cache
    await saveCache();
  }

  return results;
}

/**
 * Calculate elevation profile for a route
 */
export async function calculateElevationProfile(
  routePoints: Array<{ latitude: number; longitude: number; elevation?: number }>
): Promise<ElevationProfile> {
  if (routePoints.length === 0) {
    return {
      points: [],
      totalGain: 0,
      totalLoss: 0,
      minElevation: 0,
      maxElevation: 0,
      averageElevation: 0,
    };
  }

  // Check if we already have elevation data for all points
  const needsFetch = routePoints.some((p) => p.elevation === undefined);

  let pointsWithElevation: ElevationPoint[];

  if (needsFetch) {
    // Fetch elevations from API
    const elevations = await getElevations(
      routePoints.map((p) => ({ latitude: p.latitude, longitude: p.longitude }))
    );

    pointsWithElevation = elevations.map((e, i) => ({
      latitude: e.latitude,
      longitude: e.longitude,
      elevation: e.elevation ?? routePoints[i].elevation ?? 0,
    }));
  } else {
    // Use existing elevation data
    pointsWithElevation = routePoints.map((p) => ({
      latitude: p.latitude,
      longitude: p.longitude,
      elevation: p.elevation ?? 0,
    }));
  }

  // Calculate statistics
  let totalGain = 0;
  let totalLoss = 0;
  let minElevation = Infinity;
  let maxElevation = -Infinity;
  let totalElevation = 0;

  for (let i = 0; i < pointsWithElevation.length; i++) {
    const point = pointsWithElevation[i];
    const elevation = point.elevation;

    minElevation = Math.min(minElevation, elevation);
    maxElevation = Math.max(maxElevation, elevation);
    totalElevation += elevation;

    if (i > 0) {
      const diff = elevation - pointsWithElevation[i - 1].elevation;
      if (diff > 0) {
        totalGain += diff;
      } else {
        totalLoss += Math.abs(diff);
      }
    }
  }

  return {
    points: pointsWithElevation,
    totalGain: Math.round(totalGain),
    totalLoss: Math.round(totalLoss),
    minElevation: Math.round(minElevation),
    maxElevation: Math.round(maxElevation),
    averageElevation: Math.round(totalElevation / pointsWithElevation.length),
  };
}

/**
 * Smooth elevation data using moving average
 */
export function smoothElevationData(
  points: ElevationPoint[],
  windowSize: number = 5
): ElevationPoint[] {
  if (points.length < windowSize) return points;

  const halfWindow = Math.floor(windowSize / 2);
  const smoothed: ElevationPoint[] = [];

  for (let i = 0; i < points.length; i++) {
    let sum = 0;
    let count = 0;

    for (let j = -halfWindow; j <= halfWindow; j++) {
      const idx = i + j;
      if (idx >= 0 && idx < points.length) {
        sum += points[idx].elevation;
        count++;
      }
    }

    smoothed.push({
      ...points[i],
      elevation: sum / count,
    });
  }

  return smoothed;
}

/**
 * Clear elevation cache
 */
export async function clearElevationCache(): Promise<void> {
  memoryCache.clear();
  try {
    await AsyncStorage.removeItem(ELEVATION_CACHE_KEY);
  } catch (error) {
    console.error('Failed to clear elevation cache:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  size: number;
  memorySize: number;
}> {
  await loadCache();
  return {
    size: memoryCache.size,
    memorySize: memoryCache.size * 32, // Approximate bytes per entry
  };
}
