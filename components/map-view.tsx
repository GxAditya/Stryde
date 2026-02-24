/**
 * Conditional Map View Component
 * 
 * This component wraps react-native-maps and provides a fallback UI
 * when the native module is not available (e.g., in Expo Go without prebuild).
 */

import { DesignTokens } from '@/constants/theme';
import { getIsMapAvailable } from '@/lib/maps';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

// Type definitions for map props
interface MapViewProps {
  style?: object;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  region?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  scrollEnabled?: boolean;
  zoomEnabled?: boolean;
  rotateEnabled?: boolean;
  pitchEnabled?: boolean;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  showsCompass?: boolean;
  showsScale?: boolean;
  mapType?: string;
  followsUserLocation?: boolean;
  userInterfaceStyle?: 'light' | 'dark';
  children?: React.ReactNode;
}

interface PolylineProps {
  coordinates: Array<{ latitude: number; longitude: number }>;
  strokeColor?: string;
  strokeWidth?: number;
  lineCap?: string;
  lineJoin?: string;
}

interface MarkerProps {
  coordinate: { latitude: number; longitude: number };
  title?: string;
  pinColor?: string;
  children?: React.ReactNode;
}

interface CircleProps {
  center: { latitude: number; longitude: number };
  radius: number;
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
}

interface UrlTileProps {
  urlTemplate: string;
  maximumZ?: number;
  flipY?: boolean;
  tileSize?: number;
}

// Fallback Map View when native module is not available
const FallbackMapView: React.FC<MapViewProps> = React.memo(({ style, children }) => (
  <View style={[styles.fallbackContainer, style]}>
    <View style={styles.fallbackContent}>
      <Text style={styles.fallbackIcon}>🗺️</Text>
      <Text style={styles.fallbackTitle}>Map Unavailable</Text>
      <Text style={styles.fallbackText}>
        Maps require native module setup.{'\n'}
        Run `expo prebuild` to enable maps.
      </Text>
    </View>
    {children}
  </View>
));

// Fallback components
const FallbackPolyline: React.FC<PolylineProps> = React.memo(() => null);
const FallbackMarker: React.FC<MarkerProps> = React.memo(({ children }) => (
  <>{children}</>
));
const FallbackCircle: React.FC<CircleProps> = React.memo(() => null);
const FallbackUrlTile: React.FC<UrlTileProps> = React.memo(() => null);

// Dynamic imports for react-native-maps components
let MapViewComponent: React.FC<MapViewProps> = FallbackMapView;
let PolylineComponent: React.FC<PolylineProps> = FallbackPolyline;
let MarkerComponent: React.FC<MarkerProps> = FallbackMarker;
let CircleComponent: React.FC<CircleProps> = FallbackCircle;
let UrlTileComponent: React.FC<UrlTileProps> = FallbackUrlTile;

// Try to import react-native-maps
try {
  const Maps = require('react-native-maps');
  MapViewComponent = Maps.default;
  PolylineComponent = Maps.Polyline;
  MarkerComponent = Maps.Marker;
  CircleComponent = Maps.Circle;
  UrlTileComponent = Maps.UrlTile;
} catch {
  console.warn('react-native-maps not available, using fallback UI');
}

// Export the components
export const MapView: React.FC<MapViewProps> = React.memo((props) => {
  const isMapAvailable = useMemo(() => getIsMapAvailable(), []);
  
  if (!isMapAvailable) {
    return <FallbackMapView {...props} />;
  }
  return <MapViewComponent {...props} />;
});

export const Polyline: React.FC<PolylineProps> = React.memo((props) => {
  const isMapAvailable = useMemo(() => getIsMapAvailable(), []);
  
  if (!isMapAvailable) {
    return <FallbackPolyline {...props} />;
  }
  return <PolylineComponent {...props} />;
});

export const Marker: React.FC<MarkerProps> = React.memo((props) => {
  const isMapAvailable = useMemo(() => getIsMapAvailable(), []);
  
  if (!isMapAvailable) {
    return <FallbackMarker {...props} />;
  }
  return <MarkerComponent {...props} />;
});

export const Circle: React.FC<CircleProps> = React.memo((props) => {
  const isMapAvailable = useMemo(() => getIsMapAvailable(), []);
  
  if (!isMapAvailable) {
    return <FallbackCircle {...props} />;
  }
  return <CircleComponent {...props} />;
});

export const UrlTile: React.FC<UrlTileProps> = React.memo((props) => {
  const isMapAvailable = useMemo(() => getIsMapAvailable(), []);
  
  if (!isMapAvailable) {
    return <FallbackUrlTile {...props} />;
  }
  return <UrlTileComponent {...props} />;
});

const styles = StyleSheet.create({
  fallbackContainer: {
    backgroundColor: DesignTokens.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    overflow: 'hidden',
  },
  fallbackContent: {
    alignItems: 'center',
    padding: 24,
  },
  fallbackIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  fallbackTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: DesignTokens.textPrimary,
    marginBottom: 8,
  },
  fallbackText: {
    fontSize: 14,
    color: DesignTokens.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
