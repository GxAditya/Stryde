/**
 * Map tile management and network status detection for Stryde
 * Handles online/offline state and provides appropriate map tile sources
 * 
 * NOTE: This module now provides conditional map support to work without
 * react-native-maps native module dependencies in Expo Go
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { DesignTokens } from '@/constants/theme';

// Map tile URL templates
const TILE_URLS = {
  // OpenStreetMap standard tiles
  osm: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  // OpenStreetMap dark theme (CartoDB Dark Matter)
  osmDark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  // OpenStreetMap light theme (CartoDB Positron)
  osmLight: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
} as const;

// Map configuration
export interface MapConfig {
  urlTemplate: string;
  tileSize: number;
  maximumZ: number;
  minimumZ: number;
  flipY: boolean;
}

// Network status type
export type NetworkStatus = 'online' | 'offline' | 'unknown';

// Map style type
export type MapStyle = 'standard' | 'dark' | 'light';

// Default map configuration
const DEFAULT_CONFIG: MapConfig = {
  urlTemplate: TILE_URLS.osmDark,
  tileSize: 256,
  maximumZ: 19,
  minimumZ: 1,
  flipY: false,
};

// Cache for network status
let cachedNetworkStatus: NetworkStatus = 'unknown';
let networkUnsubscribe: (() => void) | null = null;

// Map availability flag - will be false if react-native-maps is not available
let isMapAvailable = true;

/**
 * Check if react-native-maps is available
 * This allows the app to work without the native module
 */
export function checkMapAvailability(): boolean {
  try {
    // Try to require react-native-maps
    require('react-native-maps');
    isMapAvailable = true;
    return true;
  } catch {
    console.warn('react-native-maps is not available. Map features will be disabled.');
    isMapAvailable = false;
    return false;
  }
}

/**
 * Get map availability status
 */
export function getIsMapAvailable(): boolean {
  return isMapAvailable;
}

/**
 * Initialize network monitoring
 * Call this early in app lifecycle
 */
export function initNetworkMonitoring(): void {
  // Check map availability on init
  checkMapAvailability();
  
  // Clean up existing listener
  if (networkUnsubscribe) {
    networkUnsubscribe();
  }

  // Subscribe to network state changes
  networkUnsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    cachedNetworkStatus = state.isConnected ? 'online' : 'offline';
  });

  // Get initial state
  NetInfo.fetch().then((state: NetInfoState) => {
    cachedNetworkStatus = state.isConnected ? 'online' : 'offline';
  });
}

/**
 * Clean up network monitoring
 */
export function cleanupNetworkMonitoring(): void {
  if (networkUnsubscribe) {
    networkUnsubscribe();
    networkUnsubscribe = null;
  }
}

/**
 * Get current network status
 */
export async function getNetworkStatus(): Promise<NetworkStatus> {
  const state = await NetInfo.fetch();
  cachedNetworkStatus = state.isConnected ? 'online' : 'offline';
  return cachedNetworkStatus;
}

/**
 * Check if device is currently online
 */
export async function isOnline(): Promise<boolean> {
  const status = await getNetworkStatus();
  return status === 'online';
}

/**
 * Get cached network status (synchronous)
 */
export function getCachedNetworkStatus(): NetworkStatus {
  return cachedNetworkStatus;
}

/**
 * Get map configuration based on network status and style preference
 */
export function getMapConfig(
  style: MapStyle = 'dark',
  forceOffline: boolean = false
): MapConfig {
  const isConnected = !forceOffline && cachedNetworkStatus === 'online';

  if (!isConnected) {
    // Return null config to indicate offline mode
    // In offline mode, we rely on the Map component's default tiles or cached tiles
    return {
      ...DEFAULT_CONFIG,
      urlTemplate: '', // Empty URL indicates offline mode
    };
  }

  let urlTemplate: string;
  switch (style) {
    case 'dark':
      urlTemplate = TILE_URLS.osmDark;
      break;
    case 'light':
      urlTemplate = TILE_URLS.osmLight;
      break;
    case 'standard':
    default:
      urlTemplate = TILE_URLS.osm;
      break;
  }

  return {
    ...DEFAULT_CONFIG,
    urlTemplate,
  };
}

/**
 * Get URL template for map tiles
 */
export function getTileUrlTemplate(style: MapStyle = 'dark'): string {
  switch (style) {
    case 'dark':
      return TILE_URLS.osmDark;
    case 'light':
      return TILE_URLS.osmLight;
    case 'standard':
    default:
      return TILE_URLS.osm;
  }
}

/**
 * Calculate map region from route points
 */
export function calculateRegionFromPoints(
  points: Array<{ latitude: number; longitude: number }>,
  padding: number = 0.1
): {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
} | null {
  if (points.length === 0) {
    return null;
  }

  let minLat = points[0].latitude;
  let maxLat = points[0].latitude;
  let minLng = points[0].longitude;
  let maxLng = points[0].longitude;

  for (const point of points) {
    minLat = Math.min(minLat, point.latitude);
    maxLat = Math.max(maxLat, point.latitude);
    minLng = Math.min(minLng, point.longitude);
    maxLng = Math.max(maxLng, point.longitude);
  }

  const latDelta = (maxLat - minLat) * (1 + padding);
  const lngDelta = (maxLng - minLng) * (1 + padding);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(latDelta, 0.001),
    longitudeDelta: Math.max(lngDelta, 0.001),
  };
}

/**
 * Calculate appropriate zoom level for a given distance
 */
export function getZoomLevelForDistance(distanceMeters: number): number {
  if (distanceMeters < 100) return 18;
  if (distanceMeters < 500) return 16;
  if (distanceMeters < 1000) return 15;
  if (distanceMeters < 5000) return 13;
  if (distanceMeters < 10000) return 12;
  if (distanceMeters < 50000) return 10;
  return 8;
}

/**
 * Dark theme map style for react-native-maps
 */
export const darkMapStyle = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#242f3e' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#242f3e' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#746855' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#263c3f' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b9a76' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#38414e' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#212a37' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9ca5b3' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#746855' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1f2835' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f3d19c' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#2f3948' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#17263c' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#515c6d' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#17263c' }],
  },
];

/**
 * Route line styles
 */
export const routeLineStyles = {
  default: {
    strokeColor: DesignTokens.primary,
    strokeWidth: 4,
  },
  active: {
    strokeColor: DesignTokens.accent,
    strokeWidth: 5,
  },
  completed: {
    strokeColor: DesignTokens.primaryDark,
    strokeWidth: 4,
  },
};

/**
 * Map marker colors
 */
export const markerColors = {
  start: DesignTokens.accent,
  end: DesignTokens.error,
  current: DesignTokens.primary,
  waypoint: DesignTokens.warning,
};
