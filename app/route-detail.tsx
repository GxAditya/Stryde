import React, { useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Import map components from our conditional wrapper
import { MapView, Polyline, Marker, UrlTile } from '@/components/map-view';

import { useActivityStore } from '@/stores/activity-store';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/card';
import { Button } from '@/components/button';
import { Activity, RoutePoint } from '@/lib/db';
import { DesignTokens } from '@/constants/theme';
import {
  calculateRegionFromPoints,
  getTileUrlTemplate,
  getCachedNetworkStatus,
  initNetworkMonitoring,
  cleanupNetworkMonitoring,
  NetworkStatus,
  markerColors,
  getIsMapAvailable,
} from '@/lib/maps';
import {
  calculateElevationProfile,
  ElevationProfile as ElevationProfileData,
} from '@/lib/elevation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Format duration from milliseconds to HH:MM:SS
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Format distance from meters to km or m
function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
}

// Format pace (min/km)
function formatPace(durationMs: number, distanceM: number): string {
  if (distanceM <= 0) return '--:--';
  const minutesPerKm = (durationMs / 60000) / (distanceM / 1000);
  const mins = Math.floor(minutesPerKm);
  const secs = Math.round((minutesPerKm - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Format date to readable string
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// Format time to readable string
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// Offline Indicator Component
function OfflineIndicator() {
  return (
    <View style={styles.offlineIndicator}>
      <Ionicons name="cloud-offline" size={16} color={DesignTokens.warning} />
      <ThemedText variant="micro" color="secondary" style={styles.offlineText}>
        Offline Mode
      </ThemedText>
    </View>
  );
}

// Map Component with OpenStreetMap tiles
function RouteMap({
  points,
  networkStatus,
}: {
  points: RoutePoint[];
  networkStatus: NetworkStatus;
}) {
  const region = useMemo(() => {
    return calculateRegionFromPoints(points, 0.2);
  }, [points]);

  const isOffline = networkStatus === 'offline';
  const isMapEnabled = getIsMapAvailable();

  if (!region || points.length < 2) {
    return (
      <View style={styles.mapPlaceholder}>
        <ThemedText variant="body" color="secondary">
          No route data available
        </ThemedText>
      </View>
    );
  }

  const routeCoordinates = points.map((p) => ({
    latitude: p.latitude,
    longitude: p.longitude,
  }));

  const startPoint = points[0];
  const endPoint = points[points.length - 1];

  return (
    <View style={styles.mapContainer}>
      {isOffline && <OfflineIndicator />}
      {!isMapEnabled && (
        <View style={styles.mapDisabledIndicator}>
          <ThemedText variant="micro" color="secondary">
            Map disabled - run `expo prebuild` to enable
          </ThemedText>
        </View>
      )}
      <MapView
        style={styles.map}
        initialRegion={region}
        scrollEnabled={true}
        zoomEnabled={true}
        rotateEnabled={true}
        pitchEnabled={false}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
        mapType="standard"
      >
        {/* OpenStreetMap tiles - only when online */}
        {!isOffline && (
          <UrlTile
            urlTemplate={getTileUrlTemplate('dark')}
            maximumZ={19}
            flipY={false}
            tileSize={256}
          />
        )}

        {/* Route polyline */}
        <Polyline
          coordinates={routeCoordinates}
          strokeColor={DesignTokens.primary}
          strokeWidth={4}
          lineCap="round"
          lineJoin="round"
        />

        {/* Start marker */}
        <Marker
          coordinate={{
            latitude: startPoint.latitude,
            longitude: startPoint.longitude,
          }}
          title="Start"
          pinColor={markerColors.start}
        >
          <View style={[styles.marker, { backgroundColor: markerColors.start }]}>
            <Ionicons name="play" size={12} color={DesignTokens.white} />
          </View>
        </Marker>

        {/* End marker */}
        <Marker
          coordinate={{
            latitude: endPoint.latitude,
            longitude: endPoint.longitude,
          }}
          title="End"
          pinColor={markerColors.end}
        >
          <View style={[styles.marker, { backgroundColor: markerColors.end }]}>
            <Ionicons name="flag" size={12} color={DesignTokens.white} />
          </View>
        </Marker>
      </MapView>

      {/* Legend */}
      <View style={styles.mapLegend}>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: markerColors.start }]}
          />
          <ThemedText variant="micro" color="secondary">
            Start
          </ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: markerColors.end }]}
          />
          <ThemedText variant="micro" color="secondary">
            End
          </ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendLine, { backgroundColor: DesignTokens.primary }]}
          />
          <ThemedText variant="micro" color="secondary">
            Route
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

// Elevation Profile Component with real data
function ElevationProfile({
  profile,
  loading,
}: {
  profile: ElevationProfileData | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <Card style={styles.elevationCard}>
        <ThemedText variant="h2" style={styles.elevationTitle}>
          Elevation Profile
        </ThemedText>
        <View style={styles.elevationLoading}>
          <ActivityIndicator size="small" color={DesignTokens.primary} />
          <ThemedText variant="caption" color="secondary">
            Loading elevation data...
          </ThemedText>
        </View>
      </Card>
    );
  }

  if (!profile || profile.points.length === 0) {
    return null;
  }

  const chartWidth = SCREEN_WIDTH - 64;
  const chartHeight = 100;
  const padding = 16;

  const { minElevation, maxElevation, totalGain, totalLoss, points } = profile;
  const elevationRange = maxElevation - minElevation || 1;

  // Build SVG path for elevation
  const pointsStr = points
    .map((point, index) => {
      const x =
        padding + (index / (points.length - 1)) * (chartWidth - 2 * padding);
      const y =
        chartHeight -
        padding -
        ((point.elevation - minElevation) / elevationRange) *
          (chartHeight - 2 * padding);
      return `${x},${y}`;
    })
    .join(' ');

  // Build area path
  const areaPath = `${pointsStr} ${chartWidth - padding},${chartHeight} ${padding},${chartHeight}`;

  return (
    <Card style={styles.elevationCard}>
      <ThemedText variant="h2" style={styles.elevationTitle}>
        Elevation Profile
      </ThemedText>

      <View style={styles.elevationStats}>
        <View style={styles.elevationStat}>
          <ThemedText variant="bodyBold">{totalGain} m</ThemedText>
          <ThemedText variant="micro" color="secondary">
            Total Gain
          </ThemedText>
        </View>
        <View style={styles.elevationStat}>
          <ThemedText variant="bodyBold">{totalLoss} m</ThemedText>
          <ThemedText variant="micro" color="secondary">
            Total Loss
          </ThemedText>
        </View>
        <View style={styles.elevationStat}>
          <ThemedText variant="bodyBold">{minElevation} m</ThemedText>
          <ThemedText variant="micro" color="secondary">
            Min
          </ThemedText>
        </View>
        <View style={styles.elevationStat}>
          <ThemedText variant="bodyBold">{maxElevation} m</ThemedText>
          <ThemedText variant="micro" color="secondary">
            Max
          </ThemedText>
        </View>
      </View>

      {Platform.OS === 'web' ? (
        <svg
          width={chartWidth}
          height={chartHeight}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          style={styles.elevationSvg}
        >
          {/* Grid lines */}
          {[0, 1, 2, 3].map((i) => (
            <line
              key={i}
              x1={padding}
              y1={padding + ((chartHeight - 2 * padding) / 3) * i}
              x2={chartWidth - padding}
              y2={padding + ((chartHeight - 2 * padding) / 3) * i}
              stroke={DesignTokens.border}
              strokeWidth={1}
              strokeDasharray="2,2"
              opacity={0.3}
            />
          ))}

          {/* Area fill */}
          <polygon points={areaPath} fill={DesignTokens.primary} opacity={0.2} />

          {/* Line */}
          <polyline
            points={pointsStr}
            fill="none"
            stroke={DesignTokens.primary}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <View style={[styles.elevationChart, { width: chartWidth, height: chartHeight }]}>
          {/* Simple bar chart for native */}
          <View style={styles.barChartContainer}>
            {points.slice(0, 20).map((point, index) => {
              const height =
                ((point.elevation - minElevation) / elevationRange) * 100;
              return (
                <View
                  key={index}
                  style={[
                    styles.bar,
                    {
                      height: `${Math.max(height, 5)}%`,
                      backgroundColor: DesignTokens.primary,
                      opacity: 0.6 + (index / points.length) * 0.4,
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>
      )}
    </Card>
  );
}

// Stat card component
function StatCard({
  label,
  value,
  subvalue,
}: {
  label: string;
  value: string;
  subvalue?: string;
}) {
  return (
    <Card style={styles.statCard}>
      <ThemedText variant="caption" color="secondary">
        {label}
      </ThemedText>
      <ThemedText variant="h2" style={styles.statValue}>
        {value}
      </ThemedText>
      {subvalue && (
        <ThemedText variant="micro" color="secondary">
          {subvalue}
        </ThemedText>
      )}
    </Card>
  );
}

export default function RouteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { activities, deleteActivity, loadActivities } = useActivityStore();
  const [isLoading, setIsLoading] = useState(true);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>('unknown');
  const [elevationProfile, setElevationProfile] =
    useState<ElevationProfileData | null>(null);
  const [elevationLoading, setElevationLoading] = useState(false);

  // Initialize network monitoring
  useEffect(() => {
    initNetworkMonitoring();

    // Get initial network status
    const checkNetwork = async () => {
      const status = getCachedNetworkStatus();
      setNetworkStatus(status);
    };
    checkNetwork();

    return () => {
      cleanupNetworkMonitoring();
    };
  }, []);

  // Load activity data
  useEffect(() => {
    const loadActivity = async () => {
      setIsLoading(true);
      try {
        // Ensure activities are loaded
        if (activities.length === 0) {
          await loadActivities();
        }

        const found = activities.find((a) => a.id === id);
        if (found) {
          setActivity(found);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadActivity();
  }, [id, activities, loadActivities]);

  // Fetch elevation profile when activity loads
  useEffect(() => {
    const fetchElevation = async () => {
      if (!activity || activity.route_points.length === 0) return;

      setElevationLoading(true);
      try {
        const profile = await calculateElevationProfile(activity.route_points);
        setElevationProfile(profile);
      } catch (error) {
        console.error('Failed to fetch elevation:', error);
      } finally {
        setElevationLoading(false);
      }
    };

    fetchElevation();
  }, [activity]);

  // Handle delete
  const handleDelete = () => {
    if (!activity) return;

    Alert.alert(
      'Delete Route',
      'Are you sure you want to delete this route? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteActivity(activity.id);
              router.back();
            } catch {
              Alert.alert('Error', 'Failed to delete route. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={DesignTokens.primary} />
          <ThemedText variant="body" color="secondary" style={styles.loadingText}>
            Loading route...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!activity) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <ThemedText variant="display" style={styles.errorIcon}>
            ⚠️
          </ThemedText>
          <ThemedText variant="h2" style={styles.errorTitle}>
            Route Not Found
          </ThemedText>
          <ThemedText variant="body" color="secondary" style={styles.errorText}>
            The route you're looking for doesn't exist or has been deleted.
          </ThemedText>
          <Button title="Go Back" onPress={() => router.back()} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Button
            title="← Back"
            onPress={() => router.back()}
            variant="secondary"
            style={styles.backButton}
          />
          <ThemedText variant="h1" style={styles.title}>
            Route Details
          </ThemedText>
        </View>

        {/* Date and Time */}
        <Card style={styles.dateCard}>
          <ThemedText variant="h2">{formatDate(activity.started_at)}</ThemedText>
          <ThemedText variant="body" color="secondary">
            {formatTime(activity.started_at)} -{' '}
            {activity.ended_at ? formatTime(activity.ended_at) : 'Ongoing'}
          </ThemedText>
        </Card>

        {/* Map Visualization */}
        <Card style={styles.mapCard}>
          <View style={styles.mapHeader}>
            <ThemedText variant="h2" style={styles.mapTitle}>
              Route Map
            </ThemedText>
            {networkStatus === 'offline' && <OfflineIndicator />}
          </View>
          <RouteMap points={activity.route_points} networkStatus={networkStatus} />
        </Card>

        {/* Elevation Profile */}
        <ElevationProfile
          profile={elevationProfile}
          loading={elevationLoading}
        />

        {/* Statistics Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Distance"
            value={formatDistance(activity.distance_m)}
            subvalue={`${activity.route_points.length} points`}
          />
          <StatCard
            label="Duration"
            value={formatDuration(activity.duration_ms)}
          />
          <StatCard
            label="Steps"
            value={activity.steps.toLocaleString()}
          />
          <StatCard
            label="Pace"
            value={formatPace(activity.duration_ms, activity.distance_m)}
            subvalue="min/km"
          />
        </View>

        {/* Elevation Stats */}
        {(activity.elevation_gain_m > 0 ||
          (elevationProfile && elevationProfile.totalGain > 0)) && (
          <Card style={styles.elevationSummaryCard}>
            <ThemedText variant="h2" style={styles.elevationSummaryTitle}>
              Elevation
            </ThemedText>
            <View style={styles.elevationSummaryContent}>
              <View style={styles.elevationSummaryItem}>
                <ThemedText variant="display" style={styles.elevationSummaryValue}>
                  {elevationProfile
                    ? elevationProfile.totalGain
                    : Math.round(activity.elevation_gain_m)}
                </ThemedText>
                <ThemedText variant="caption" color="secondary">
                  meters gained
                </ThemedText>
              </View>
              {elevationProfile && elevationProfile.totalLoss > 0 && (
                <View style={styles.elevationSummaryItem}>
                  <ThemedText
                    variant="display"
                    style={[styles.elevationSummaryValue, { color: DesignTokens.error }]}
                  >
                    {elevationProfile.totalLoss}
                  </ThemedText>
                  <ThemedText variant="caption" color="secondary">
                    meters lost
                  </ThemedText>
                </View>
              )}
            </View>
          </Card>
        )}

        {/* Delete Button */}
        <Button
          title="Delete Route"
          onPress={handleDelete}
          variant="danger"
          style={styles.deleteButton}
        />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 24,
  },
  header: {
    marginBottom: 16,
  },
  backButton: {
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  title: {
    marginBottom: 8,
  },
  dateCard: {
    marginBottom: 16,
    padding: 16,
  },
  mapCard: {
    marginBottom: 16,
    padding: 16,
    overflow: 'hidden',
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mapTitle: {
    marginBottom: 0,
  },
  mapContainer: {
    alignItems: 'center',
  },
  map: {
    width: SCREEN_WIDTH - 64,
    height: 250,
    borderRadius: 12,
  },
  mapPlaceholder: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: DesignTokens.surface,
    borderRadius: 12,
  },
  mapDisabledIndicator: {
    backgroundColor: DesignTokens.surface,
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  mapLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLine: {
    width: 16,
    height: 3,
    borderRadius: 2,
  },
  marker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: DesignTokens.white,
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DesignTokens.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  offlineText: {
    marginLeft: 2,
  },
  elevationCard: {
    marginBottom: 16,
    padding: 16,
  },
  elevationTitle: {
    marginBottom: 12,
  },
  elevationLoading: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  elevationStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: DesignTokens.border,
  },
  elevationStat: {
    alignItems: 'center',
  },
  elevationSvg: {
    borderRadius: 8,
  },
  elevationChart: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  barChartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 80,
    width: '100%',
    paddingHorizontal: 16,
  },
  bar: {
    width: 8,
    borderRadius: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - 56) / 2,
    padding: 16,
  },
  statValue: {
    marginVertical: 4,
  },
  elevationSummaryCard: {
    marginBottom: 16,
    padding: 16,
  },
  elevationSummaryTitle: {
    marginBottom: 12,
  },
  elevationSummaryContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  elevationSummaryItem: {
    alignItems: 'center',
  },
  elevationSummaryValue: {
    color: DesignTokens.accent,
  },
  deleteButton: {
    marginTop: 8,
  },
});
