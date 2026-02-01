import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Alert,
  ScrollView,
  AppState,
  AppStateStatus,
  TouchableOpacity,
  Dimensions,
  ImageBackground,
  Platform,
  Text,
} from 'react-native';
import { Pedometer, Accelerometer } from 'expo-sensors';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';



import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/card';
import { Button } from '@/components/button';
import { useActivityStore } from '@/stores/activity-store';
import { useCalibrationStore } from '@/stores/calibration-store';
import { useHydrationStore } from '@/stores/hydration-store';
import { Colors, DesignTokens } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { RoutePoint } from '@/lib/db';
import { showActivityHydrationReminder, scheduleTemperatureHydrationReminder } from '@/lib/notifications';
import {
  NetworkStatus,
} from '@/lib/maps';
import {
} from '@/lib/weather';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Subscription types
type PedometerSubscription = { remove: () => void } | null;
type AccelerometerSubscription = { remove: () => void } | null;
type LocationSubscription = { remove: () => void } | null;

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



export default function ActivityScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const isDark = colorScheme === 'dark';

  // Store hooks
  const {
    currentActivity,
    status,
    startActivity,
    pauseActivity,
    resumeActivity,
    endActivity,
    updateRoute,
    updateDistance,
    updateDuration,
    updateElevationGain,
    loadActiveActivity,
    updateSteps,
  } = useActivityStore();

  const { getActiveProfile, loadProfiles } = useCalibrationStore();
  const { quickAdd } = useHydrationStore();

  // Local state
  const [isPedometerAvailable, setIsPedometerAvailable] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [stepCount, setStepCount] = useState(0);
  const [distance, setDistance] = useState(0);
  const [elevationGain, setElevationGain] = useState(0);
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [lastLocation, setLastLocation] = useState<Location.LocationObject | null>(null);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>('unknown');


  // Refs for subscriptions and timing
  const pedometerSubscription = useRef<PedometerSubscription>(null);
  const accelerometerSubscription = useRef<AccelerometerSubscription>(null);
  const locationSubscription = useRef<LocationSubscription>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const stepBuffer = useRef<number>(0);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // Initialize network monitoring
  useEffect(() => {
    return () => {
    };
  }, []);

  // Handle app state changes
  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    if (appState.current === 'active' && nextAppState === 'background') {
      if (status === 'active') {
        console.log('App going to background - activity continues');
      }
    }
    appState.current = nextAppState;
  }, [status]);

  // Load profiles and any active activity on mount
  useEffect(() => {
    loadProfiles();
    loadActiveActivity();
    Pedometer.isAvailableAsync().then(setIsPedometerAvailable);
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
      cleanupSubscriptions();
    };
  }, [handleAppStateChange, loadActiveActivity, loadProfiles]);

  const cleanupSubscriptions = () => {
    pedometerSubscription.current?.remove();
    pedometerSubscription.current = null;
    accelerometerSubscription.current?.remove();
    accelerometerSubscription.current = null;
    locationSubscription.current?.remove();
    locationSubscription.current = null;
  };

  const handleStart = async () => {
    setIsLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const activeProfile = getActiveProfile();
      if (!activeProfile) {
        Alert.alert(
          'Calibration Required',
          'You need to calibrate your step size before starting an activity for accurate tracking.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setIsLoading(false) },
            {
              text: 'Calibrate Now', onPress: () => {
                setIsLoading(false);
                router.push('/calibration');
              }
            }
          ]
        );
        return;
      }
      await proceedWithStart(activeProfile.id);
    } catch (err) {
      console.error('Failed to start activity:', err);
      Alert.alert('Error', 'Failed to start activity. Please try again.');
      setIsLoading(false);
    }
  };

  const proceedWithStart = async (profileId: string) => {
    try {
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      if (locationStatus !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is needed to track your route.');
        return;
      }
      await startActivity(profileId);
      startTimeRef.current = Date.now();
      pausedTimeRef.current = 0;
      stepBuffer.current = 0;
      setElapsedTime(0);
      setStepCount(0);
      setDistance(0);
      setElevationGain(0);
      setRoutePoints([]);
      setRoutePoints([]);
      // await startStepTracking(); // Removed Pedometer tracking
      await startGPSTracking();
      await startGPSTracking();
    } catch (err) {
      console.error('Failed to start activity:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Removed Pedometer and Accelerometer tracking functions as we use GPS based calc now
  // const startStepTracking = ...
  // const startAccelerometerTracking = ...

  const startGPSTracking = async () => {
    const initialLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation });
    setLastLocation(initialLocation);
    const initialPoint: RoutePoint = {
      latitude: initialLocation.coords.latitude,
      longitude: initialLocation.coords.longitude,
      timestamp: Date.now(),
      elevation: initialLocation.coords.altitude || undefined,
    };
    setRoutePoints([initialPoint]);
    await updateRoute(initialPoint);

    locationSubscription.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 5000, distanceInterval: 10 },
      async (location) => {
        if (status !== 'active') return;
        setLastLocation(location);
        const point: RoutePoint = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: Date.now(),
          elevation: location.coords.altitude || undefined,
        };
        setRoutePoints((prev) => [...prev, point]);
        await updateRoute(point);
        if (lastLocation?.coords.altitude && location.coords.altitude) {
          const elevationChange = location.coords.altitude - lastLocation.coords.altitude;
          if (elevationChange > 0) {
            setElevationGain((prev) => prev + elevationChange);
          }
        }
      }
    );
  };

  const handlePause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    pauseActivity();
    pausedTimeRef.current = Date.now();
    cleanupSubscriptions();
  };

  const handleResume = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const pauseDuration = Date.now() - pausedTimeRef.current;
    startTimeRef.current += pauseDuration;
    resumeActivity();
    resumeActivity();
    // await startStepTracking(); // Removed
    await startGPSTracking();
    await startGPSTracking();
  };

  const handleStop = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('End Activity', 'Are you sure you want to end this activity?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End',
        style: 'destructive',
        onPress: async () => {
          setIsLoading(true);
          try {
            if (currentActivity) {
              await updateDistance(distance);
              await updateDuration(elapsedTime);
              await updateElevationGain(elevationGain);
            }
            cleanupSubscriptions();
            await endActivity();
            setElapsedTime(0);
            setStepCount(0);
            setDistance(0);
            setElevationGain(0);
            setRoutePoints([]);
            setLastLocation(null);
            startTimeRef.current = 0;
            pausedTimeRef.current = 0;
          } catch (_err) {
            Alert.alert('Error', 'Failed to save activity.');
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (status === 'active') {
      // Timer for Duration
      interval = setInterval(() => {
        const now = Date.now();
        const elapsed = now - startTimeRef.current;
        setElapsedTime(elapsed);
        updateDuration(elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status, updateDuration]);

  // GPS-Based Step Calculation (Every 10s as requested)
  useEffect(() => {
    let stepInterval: ReturnType<typeof setInterval>;
    if (status === 'active') {
      stepInterval = setInterval(() => {
        const activeProfile = getActiveProfile();
        if (activeProfile && activeProfile.step_length_m > 0) {
          const calculatedSteps = Math.floor(distance / activeProfile.step_length_m);
          setStepCount(calculatedSteps);
          // Persist using our new store action
          updateSteps(calculatedSteps);
        }
      }, 10000); // 10 seconds
    }
    return () => clearInterval(stepInterval);
  }, [status, distance, getActiveProfile, updateSteps]);

  // Removed unused sync effect
  /*
  useEffect(() => {
     if (stepCount > 0 && currentActivity) { ... }
  }, [stepCount]);
  */

  // REMOVED REVERSE LOGIC: Distance is now the source of truth, steps are derived.
  // useEffect(() => {
  //   const activeProfile = getActiveProfile();
  //   if (activeProfile && stepCount > 0) {
  //     const newDistance = stepCount * activeProfile.step_length_m;
  //     setDistance(newDistance);
  //     updateDistance(newDistance);
  //   }
  // }, [stepCount, getActiveProfile, updateDistance]);

  useEffect(() => {
    if (elevationGain > 0) updateElevationGain(elevationGain);
  }, [elevationGain, updateElevationGain]);

  useEffect(() => {
    if (currentActivity) {
      setStepCount(currentActivity.steps);
      setDistance(currentActivity.distance_m);
      setElapsedTime(currentActivity.duration_ms);
      setElevationGain(currentActivity.elevation_gain_m);
      setRoutePoints(currentActivity.route_points);
    }
  }, [currentActivity?.id, currentActivity]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Top Navigation Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back-ios" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Running</Text>
        <TouchableOpacity style={[styles.lockButton, { backgroundColor: isDark ? DesignTokens.surface : '#e2e8f0' }]}>
          <MaterialIcons name="lock-open" size={20} color={isDark ? '#94a3b8' : '#64748b'} />
        </TouchableOpacity>
      </View>

      {/* Confidence Chips Section */}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Main Stats Dashboard */}
        <View style={styles.dashboardContainer}>
          {/* Elapsed Time - Primary Focus */}
          <View style={[styles.timeCard, { backgroundColor: isDark ? DesignTokens.surface : colors.white }]}>
            <Text style={styles.timeLabel}>ELAPSED TIME</Text>
            <Text style={styles.timeValue}>{formatDuration(elapsedTime)}</Text>
          </View>

          <View style={styles.statsRow}>
            {/* Distance */}
            <View style={[styles.statBox, { backgroundColor: isDark ? DesignTokens.surface : colors.white }]}>
              <Text style={[styles.statLabel, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>DISTANCE</Text>
              <View style={styles.statValueContainer}>
                <Text style={[styles.statValue, { color: colors.text }]}>{(distance / 1000).toFixed(2)}</Text>
                <Text style={styles.statUnit}>km</Text>
              </View>
              <Text style={styles.statDelta}>+{(distance / 1000).toFixed(1)} km</Text>
            </View>

            {/* Steps */}
            <View style={[styles.statBox, { backgroundColor: isDark ? DesignTokens.surface : colors.white }]}>
              <Text style={[styles.statLabel, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>STEPS</Text>
              <View style={styles.statValueContainer}>
                <Text style={[styles.statValue, { color: colors.text }]}>{stepCount.toLocaleString()}</Text>
              </View>
              <Text style={styles.statDelta}>+{stepCount > 0 ? stepCount : 0}</Text>
            </View>
          </View>
        </View>


      </ScrollView>

      {/* Bottom Action Controls */}
      <View style={styles.bottomControls}>
        {/* Stop Button */}
        <TouchableOpacity
          style={styles.stopButton}
          onPress={handleStop}
          disabled={status === 'idle'}
        >
          <MaterialIcons name="stop" size={24} color="#ef4444" />
        </TouchableOpacity>

        {/* Play/Pause Button */}
        <TouchableOpacity
          style={styles.playPauseButton}
          onPress={status === 'active' ? handlePause : (status === 'paused' ? handleResume : handleStart)}
          activeOpacity={0.8}
        >
          <MaterialIcons
            name={status === 'active' ? "pause" : "play-arrow"}
            size={32}
            color={DesignTokens.background}
          />
          <Text style={styles.playPauseText}>
            {status === 'active' ? 'PAUSE' : (status === 'paused' ? 'RESUME' : 'START')}
          </Text>
        </TouchableOpacity>

        {/* Lock Button (Placeholder for now) */}
        <TouchableOpacity style={[styles.screenLockButton, { backgroundColor: isDark ? DesignTokens.surface : '#e2e8f0' }]}>
          <MaterialIcons name="screen-lock-portrait" size={24} color={isDark ? '#94a3b8' : '#64748b'} />
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 48,
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  lockButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(19, 236, 109, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(19, 236, 109, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    color: DesignTokens.primary,
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  scrollContent: {
    flexGrow: 1,
  },
  dashboardContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  timeCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    borderRadius: 12,
  },
  timeLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  timeValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: DesignTokens.primary,
    fontVariant: ['tabular-nums'],
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statBox: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    gap: 4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statUnit: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  statDelta: {
    color: DesignTokens.primary,
    fontSize: 12,
    fontWeight: '500',
  },

  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 8,
    gap: 16,
  },
  stopButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPauseButton: {
    flex: 2,
    height: 64,
    backgroundColor: DesignTokens.primary,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: DesignTokens.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  playPauseText: {
    color: DesignTokens.background,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  screenLockButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
