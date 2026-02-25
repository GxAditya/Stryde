import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { Pedometer } from 'expo-sensors';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  AppStateStatus,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';



import { ProgressRing } from '@/components/progress-ring';
import { Colors, DesignTokens } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { RoutePoint } from '@/lib/db';
import {
  NetworkStatus,
} from '@/lib/maps';
import { } from '@/lib/weather';
import { useActivityStore } from '@/stores/activity-store';
import { useCalibrationStore } from '@/stores/calibration-store';
import { useGoalStore } from '@/stores/goal-store';

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
    getElapsedTime,
  } = useActivityStore();

  const { getActiveProfile, loadProfiles } = useCalibrationStore();
  
  const { getTodayGoals } = useGoalStore();

  // Local state
  const [isPedometerAvailable, setIsPedometerAvailable] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScreenLocked, setIsScreenLocked] = useState(false);
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
  const statusRef = useRef<string>(status);
  const lastLocationRef = useRef<Location.LocationObject | null>(null);
  const totalDistanceRef = useRef<number>(0);
  const lastDbWriteTime = useRef<number>(0);

  // Get today's step goal
  const todayGoals = getTodayGoals();
  const stepGoal = todayGoals.find(g => g.type === 'daily_steps')?.target || 10000;
  const stepProgress = stepGoal > 0 ? stepCount / stepGoal : 0;

  // Keep statusRef in sync with status
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Handle app state changes
  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    if (appState.current === 'active' && nextAppState === 'background') {
      // App is going to background - pause activity if active
      if (statusRef.current === 'active') {
        console.log('App going to background - pausing activity timer');
        pauseActivity();
      }
    } else if (appState.current === 'background' && nextAppState === 'active') {
      // App is coming to foreground - resume if it was paused
      if (statusRef.current === 'paused') {
        console.log('App coming to foreground - resuming activity');
        resumeActivity();
      }
    }
    appState.current = nextAppState;
  }, [pauseActivity, resumeActivity]);

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
      lastDbWriteTime.current = Date.now();
      setElapsedTime(0);
      setStepCount(0);
      setDistance(0);
      setElevationGain(0);
      setRoutePoints([]);
      totalDistanceRef.current = 0;
      // await startStepTracking(); // Removed Pedometer tracking
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

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const startGPSTracking = async () => {
    const initialLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation });
    setLastLocation(initialLocation);
    lastLocationRef.current = initialLocation;
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
        // Use ref to avoid stale closure
        if (statusRef.current !== 'active') return;
        
        const prevLocation = lastLocationRef.current;
        
        // Calculate distance from previous point
        if (prevLocation) {
          const segmentDistance = calculateDistance(
            prevLocation.coords.latitude,
            prevLocation.coords.longitude,
            location.coords.latitude,
            location.coords.longitude
          );
          
          // Only add distance if it's reasonable (filter out GPS noise)
          if (segmentDistance > 1 && segmentDistance < 100) {
            totalDistanceRef.current += segmentDistance;
            setDistance(totalDistanceRef.current);
            await updateDistance(totalDistanceRef.current);
          }
          
          // Calculate elevation gain
          if (prevLocation.coords.altitude && location.coords.altitude) {
            const elevationChange = location.coords.altitude - prevLocation.coords.altitude;
            if (elevationChange > 0) {
              setElevationGain((prev) => prev + elevationChange);
            }
          }
        }
        
        // Update last location ref
        lastLocationRef.current = location;
        setLastLocation(location);
        
        const point: RoutePoint = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: Date.now(),
          elevation: location.coords.altitude || undefined,
        };
        setRoutePoints((prev) => [...prev, point]);
        await updateRoute(point);
      }
    );
  };

  const handlePause = () => {
    console.log('[DEBUG] handlePause called, current status:', status);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Persist current duration before pausing
    const currentElapsed = getElapsedTime(startTimeRef.current);
    updateDuration(currentElapsed);
    
    pauseActivity();
    pausedTimeRef.current = Date.now();
    cleanupSubscriptions();
    console.log('[DEBUG] After pauseActivity, new status should be: paused');
  };

  const handleResume = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const pauseDuration = Date.now() - pausedTimeRef.current;
    startTimeRef.current += pauseDuration;
    resumeActivity();
    // Get fresh location for resume to avoid distance jump
    const freshLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation });
    lastLocationRef.current = freshLocation;
    setLastLocation(freshLocation);
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
              // Calculate final duration accounting for pauses
              // Use getElapsedTime to get accurate time with pause deducted
              const finalDuration = getElapsedTime(startTimeRef.current);
              
              await updateDistance(distance);
              await updateDuration(finalDuration);
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
            setIsScreenLocked(false);
            startTimeRef.current = 0;
            pausedTimeRef.current = 0;
            lastDbWriteTime.current = 0;
          } catch (_err) {
            Alert.alert('Error', 'Failed to save activity.');
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);
  };

  // Screen lock toggle function
  const handleScreenLock = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsScreenLocked(!isScreenLocked);
  };

  // Timer effect - Uses timestamps for accurate time tracking
  // This approach avoids drift when app is backgrounded
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (status === 'active' && startTimeRef.current > 0) {
      // Timer for Duration - calculates from timestamps to avoid drift
      interval = setInterval(() => {
        const now = Date.now();
        // Use timestamp-based calculation: now - startTime - totalPausedTime
        const elapsed = getElapsedTime(startTimeRef.current);
        setElapsedTime(elapsed);
        
        // Only persist to database every 30 seconds or if significant time has passed
        // This reduces excessive database writes
        if (now - lastDbWriteTime.current >= 30000) {
          updateDuration(elapsed);
          lastDbWriteTime.current = now;
        }
      }, 1000); // Update UI every second, but only write to DB every 30s
    }
    return () => clearInterval(interval);
  }, [status, getElapsedTime, updateDuration]);

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
        <View style={{ width: 40 }} />
      </View>

      {/* Confidence Chips Section */}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Main Stats Dashboard */}
        <View style={styles.dashboardContainer}>
          {/* Progress Ring Section */}
          <View style={styles.progressRingContainer}>
            <ProgressRing 
              progress={stepProgress} 
              size="large"
              displayValue={stepCount.toLocaleString()}
              label="steps"
            />
          </View>

          {/* Distance and Time Below */}
          <View style={styles.statsBelowRing}>
            <View style={[styles.statBox, { backgroundColor: isDark ? DesignTokens.surface : colors.white }]}>
              <Text style={[styles.statLabel, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>DISTANCE</Text>
              <View style={styles.statValueContainer}>
                <Text style={[styles.statValue, { color: colors.text }]}>{(distance / 1000).toFixed(2)}</Text>
                <Text style={styles.statUnit}>km</Text>
              </View>
            </View>

            <View style={[styles.statBox, { backgroundColor: isDark ? DesignTokens.surface : colors.white }]}>
              <Text style={[styles.statLabel, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>TIME</Text>
              <View style={styles.statValueContainer}>
                <Text style={[styles.statValue, { color: colors.text }]}>{formatDuration(elapsedTime)}</Text>
              </View>
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
        <Pressable
          style={styles.playPauseButton}
          onPress={() => {
            if (status === 'active') {
              handlePause();
            } else if (status === 'paused') {
              handleResume();
            } else {
              handleStart();
            }
          }}
        >
          <MaterialIcons
            name={status === 'active' ? "pause" : "play-arrow"}
            size={32}
            color={DesignTokens.background}
          />
          <Text style={styles.playPauseText}>
            {status === 'active' ? 'PAUSE' : (status === 'paused' ? 'RESUME' : 'START')}
          </Text>
        </Pressable>

        {/* Lock Button - Toggle screen lock */}
        <TouchableOpacity 
          style={[styles.screenLockButton, { backgroundColor: isDark ? DesignTokens.surface : '#e2e8f0' }]}
          onPress={handleScreenLock}
        >
          <MaterialIcons name={isScreenLocked ? 'lock' : 'screen-lock-portrait'} size={24} color={isDark ? '#94a3b8' : '#64748b'} />
        </TouchableOpacity>
      </View>

      {/* Screen Lock Overlay - Pocket Mode */}
      {isScreenLocked && (
        <View style={styles.lockOverlay} pointerEvents="box-none">
          <View style={styles.lockOverlayContent} pointerEvents="auto">
            <TouchableOpacity 
              style={styles.unlockButton}
              onPress={handleScreenLock}
            >
              <MaterialIcons name="lock" size={48} color="#ffffff" />
              <Text style={styles.unlockText}>Tap to Unlock</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 16,
  },
  progressRingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  statsBelowRing: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
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
  // Screen Lock Overlay Styles
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  lockOverlayContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  unlockButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  unlockText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
});
