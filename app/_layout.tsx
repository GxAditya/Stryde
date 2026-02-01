import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { ErrorBoundary } from '@/components/error-boundary';
import { setupNotificationListeners } from '@/lib/notification-service';
import { initDatabase } from '@/lib/db';
import { DesignTokens } from '@/constants/theme';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Initialize database and services
        await initDatabase();
        setupNotificationListeners();
      } catch (e) {
        console.warn('Initialization error:', e);
      } finally {
        // Tell the application to render
        setAppIsReady(true);
        // Hide splash screen after initialization
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  if (!appIsReady) {
    // Return a view that matches the splash screen to avoid flickering
    return (
      <View style={[styles.loadingContainer, { backgroundColor: DesignTokens.background }]} />
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen name="route-detail" options={{ headerShown: false }} />
          <Stack.Screen name="calibration" options={{ headerShown: false }} />
          <Stack.Screen name="hydration" options={{ headerShown: false }} />
          <Stack.Screen name="set-goal" options={{ headerShown: false }} />
          <Stack.Screen name="wrapup" options={{ headerShown: false }} />

          {/* Activity Screens - No Header */}
          <Stack.Screen name="walking" options={{ headerShown: false }} />
          <Stack.Screen name="running" options={{ headerShown: false }} />
          <Stack.Screen name="cycling" options={{ headerShown: false }} />
          <Stack.Screen name="hiking" options={{ headerShown: false }} />
          <Stack.Screen name="yoga" options={{ headerShown: false }} />
          <Stack.Screen name="swimming" options={{ headerShown: false }} />
          <Stack.Screen name="dance" options={{ headerShown: false }} />
          <Stack.Screen name="strength-training" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
