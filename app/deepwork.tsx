import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React, { useCallback, useEffect, useMemo } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    TouchableOpacity,
    View,
} from 'react-native';

import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DesignTokens } from '@/constants/theme';
import {
    cancelDeepworkReminders,
    toggleDeepworkMode,
} from '@/lib/notifications';
import { useDeepworkStore } from '@/stores/deepwork-store';

// Interval presets for quick selection
const INTERVAL_PRESETS = [15, 30, 45, 60, 90];

export default function DeepworkScreen() {
  const {
    deepworkEnabled,
    hydrationIntervalMinutes,
    stretchIntervalMinutes,
    focusDurationMinutes,
    isLoading,
    isInitialized,
    loadSettings,
    toggleDeepwork,
    setDeepworkEnabled,
    setHydrationInterval,
    setStretchInterval,
    setFocusDuration,
    resetToDefaults,
  } = useDeepworkStore();

  // Load settings on mount
  useEffect(() => {
    if (!isInitialized) {
      loadSettings();
    }
  }, [isInitialized, loadSettings]);

  // Handle deepwork toggle with notification management
  const handleToggleDeepwork = useCallback(async () => {
    try {
      const newEnabled = !deepworkEnabled;
      
      // Update store first
      await setDeepworkEnabled(newEnabled);
      
      // Then manage notifications
      await toggleDeepworkMode(
        newEnabled,
        hydrationIntervalMinutes,
        stretchIntervalMinutes
      );
      
      if (newEnabled) {
        Alert.alert(
          'Deepwork Mode Activated',
          `You'll receive hydration reminders every ${hydrationIntervalMinutes} minutes and stretch reminders every ${stretchIntervalMinutes} minutes.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Failed to toggle deepwork mode:', error);
      Alert.alert('Error', 'Failed to update deepwork settings');
    }
  }, [deepworkEnabled, hydrationIntervalMinutes, stretchIntervalMinutes, setDeepworkEnabled]);

  // Handle hydration interval change
  const handleHydrationIntervalChange = useCallback(async (newInterval: number) => {
    await setHydrationInterval(newInterval);
    
    // If deepwork is enabled, reschedule notifications
    if (deepworkEnabled) {
      await toggleDeepworkMode(true, newInterval, stretchIntervalMinutes);
    }
  }, [deepworkEnabled, stretchIntervalMinutes, setHydrationInterval]);

  // Handle stretch interval change
  const handleStretchIntervalChange = useCallback(async (newInterval: number) => {
    await setStretchInterval(newInterval);
    
    // If deepwork is enabled, reschedule notifications
    if (deepworkEnabled) {
      await toggleDeepworkMode(true, hydrationIntervalMinutes, newInterval);
    }
  }, [deepworkEnabled, hydrationIntervalMinutes, setStretchInterval]);

  // Handle focus duration change
  const handleFocusDurationChange = useCallback(async (newDuration: number) => {
    await setFocusDuration(newDuration);
  }, [setFocusDuration]);

  // Handle reset to defaults
  const handleReset = useCallback(async () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all deepwork settings to defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetToDefaults();
            await cancelDeepworkReminders();
          },
        },
      ]
    );
  }, [resetToDefaults]);

  // Render interval picker
  const renderIntervalPicker = useMemo(() => (
    <View style={styles.pickerContainer}>
      <TouchableOpacity
        onPress={() => handleHydrationIntervalChange(Math.max(5, hydrationIntervalMinutes - 5))}
        style={styles.pickerButton}
        disabled={hydrationIntervalMinutes <= 5}>
        <Ionicons
          name="remove-circle"
          size={28}
          color={hydrationIntervalMinutes <= 5 ? DesignTokens.border : DesignTokens.primary}
        />
      </TouchableOpacity>
      <View style={styles.pickerValue}>
        <ThemedText style={styles.pickerValueText}>{hydrationIntervalMinutes}</ThemedText>
        <ThemedText style={styles.pickerValueUnit}>min</ThemedText>
      </View>
      <TouchableOpacity
        onPress={() => handleHydrationIntervalChange(Math.min(120, hydrationIntervalMinutes + 5))}
        style={styles.pickerButton}
        disabled={hydrationIntervalMinutes >= 120}>
        <Ionicons
          name="add-circle"
          size={28}
          color={hydrationIntervalMinutes >= 120 ? DesignTokens.border : DesignTokens.primary}
        />
      </TouchableOpacity>
    </View>
  ), [hydrationIntervalMinutes, handleHydrationIntervalChange]);

  // Render stretch interval picker
  const renderStretchIntervalPicker = useMemo(() => (
    <View style={styles.pickerContainer}>
      <TouchableOpacity
        onPress={() => handleStretchIntervalChange(Math.max(10, stretchIntervalMinutes - 5))}
        style={styles.pickerButton}
        disabled={stretchIntervalMinutes <= 10}>
        <Ionicons
          name="remove-circle"
          size={28}
          color={stretchIntervalMinutes <= 10 ? DesignTokens.border : DesignTokens.primary}
        />
      </TouchableOpacity>
      <View style={styles.pickerValue}>
        <ThemedText style={styles.pickerValueText}>{stretchIntervalMinutes}</ThemedText>
        <ThemedText style={styles.pickerValueUnit}>min</ThemedText>
      </View>
      <TouchableOpacity
        onPress={() => handleStretchIntervalChange(Math.min(120, stretchIntervalMinutes + 5))}
        style={styles.pickerButton}
        disabled={stretchIntervalMinutes >= 120}>
        <Ionicons
          name="add-circle"
          size={28}
          color={stretchIntervalMinutes >= 120 ? DesignTokens.border : DesignTokens.primary}
        />
      </TouchableOpacity>
    </View>
  ), [stretchIntervalMinutes, handleStretchIntervalChange]);

  // Render focus duration picker
  const renderFocusDurationPicker = useMemo(() => (
    <View style={styles.pickerContainer}>
      <TouchableOpacity
        onPress={() => handleFocusDurationChange(Math.max(15, focusDurationMinutes - 15))}
        style={styles.pickerButton}
        disabled={focusDurationMinutes <= 15}>
        <Ionicons
          name="remove-circle"
          size={28}
          color={focusDurationMinutes <= 15 ? DesignTokens.border : DesignTokens.primary}
        />
      </TouchableOpacity>
      <View style={styles.pickerValue}>
        <ThemedText style={styles.pickerValueText}>{focusDurationMinutes}</ThemedText>
        <ThemedText style={styles.pickerValueUnit}>min</ThemedText>
      </View>
      <TouchableOpacity
        onPress={() => handleFocusDurationChange(Math.min(180, focusDurationMinutes + 15))}
        style={styles.pickerButton}
        disabled={focusDurationMinutes >= 180}>
        <Ionicons
          name="add-circle"
          size={28}
          color={focusDurationMinutes >= 180 ? DesignTokens.border : DesignTokens.primary}
        />
      </TouchableOpacity>
    </View>
  ), [focusDurationMinutes, handleFocusDurationChange]);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Deep Work',
          headerStyle: { backgroundColor: DesignTokens.background },
          headerTintColor: DesignTokens.textPrimary,
          headerBackTitle: 'Back',
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        
        {/* Deepwork Status Card */}
        <Card style={deepworkEnabled ? styles.statusCardActive : styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusIconContainer}>
              <Ionicons
                name={deepworkEnabled ? 'bulb' : 'bulb-outline'}
                size={32}
                color={deepworkEnabled ? DesignTokens.warning : DesignTokens.textSecondary}
              />
            </View>
            <View style={styles.statusInfo}>
              <ThemedText type="title" style={styles.statusTitle}>
                {deepworkEnabled ? 'Deep Work Active' : 'Deep Work Mode'}
              </ThemedText>
              <ThemedText style={styles.statusDescription}>
                {deepworkEnabled
                  ? `Focus session: ${focusDurationMinutes} minutes`
                  : 'Enable to start a focused work session with regular breaks'}
              </ThemedText>
            </View>
          </View>
          
          <View style={styles.toggleRow}>
            <ThemedText style={styles.toggleLabel}>
              {deepworkEnabled ? 'Session in progress' : 'Start session'}
            </ThemedText>
            <Switch
              trackColor={{ false: DesignTokens.border, true: DesignTokens.primary }}
              thumbColor={DesignTokens.white}
              onValueChange={handleToggleDeepwork}
              value={deepworkEnabled}
              disabled={isLoading}
            />
          </View>
        </Card>

        {/* Focus Duration Setting */}
        <View style={styles.section}>
          <ThemedText type="title" style={styles.sectionTitle}>
            Focus Duration
          </ThemedText>
          <ThemedText style={styles.sectionDescription}>
            How long do you want to focus?
          </ThemedText>
          
          <Card style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingIcon}>
                <Ionicons name="timer" size={24} color={DesignTokens.primary} />
              </View>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingTitle}>Session Length</ThemedText>
                <ThemedText style={styles.settingSubtitle}>
                  Recommended: 25-90 minutes
                </ThemedText>
              </View>
            </View>
            {renderFocusDurationPicker}
          </Card>
        </View>

        {/* Hydration Reminder Setting */}
        <View style={styles.section}>
          <ThemedText type="title" style={styles.sectionTitle}>
            Hydration Reminders
          </ThemedText>
          <ThemedText style={styles.sectionDescription}>
            Stay hydrated during your focus session
          </ThemedText>
          
          <Card style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingIcon}>
                <Ionicons name="water" size={24} color={DesignTokens.primary} />
              </View>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingTitle}>Reminder Interval</ThemedText>
                <ThemedText style={styles.settingSubtitle}>
                  How often to remind you
                </ThemedText>
              </View>
            </View>
            {renderIntervalPicker}
          </Card>
        </View>

        {/* Stretch Reminder Setting */}
        <View style={styles.section}>
          <ThemedText type="title" style={styles.sectionTitle}>
            Stretch Reminders
          </ThemedText>
          <ThemedText style={styles.sectionDescription}>
            Take breaks to stretch and move
          </ThemedText>
          
          <Card style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingIcon}>
                <Ionicons name="fitness" size={24} color={DesignTokens.primary} />
              </View>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingTitle}>Reminder Interval</ThemedText>
                <ThemedText style={styles.settingSubtitle}>
                  How often to stretch
                </ThemedText>
              </View>
            </View>
            {renderStretchIntervalPicker}
          </Card>
        </View>

        {/* Tips Section */}
        <Card style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="information-circle" size={20} color={DesignTokens.primary} />
            <ThemedText style={styles.tipsTitle}>Deep Work Tips</ThemedText>
          </View>
          <View style={styles.tipsList}>
            <ThemedText style={styles.tipItem}>• Start with shorter sessions and increase gradually</ThemedText>
            <ThemedText style={styles.tipItem}>• Keep water within reach</ThemedText>
            <ThemedText style={styles.tipItem}>• Take stretch breaks when reminded</ThemedText>
            <ThemedText style={styles.tipItem}>• Disable notifications during focus time</ThemedText>
          </View>
        </Card>

        {/* Reset Button */}
        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <Ionicons name="refresh" size={20} color={DesignTokens.error} />
          <ThemedText style={styles.resetButtonText}>Reset to Defaults</ThemedText>
        </TouchableOpacity>

      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DesignTokens.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  statusCard: {
    marginBottom: 24,
    backgroundColor: DesignTokens.surface,
    borderRadius: 16,
    padding: 20,
  },
  statusCardActive: {
    borderWidth: 2,
    borderColor: DesignTokens.primary,
    backgroundColor: `${DesignTokens.primary}15`,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: DesignTokens.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 14,
    color: DesignTokens.textSecondary,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: DesignTokens.border,
  },
  toggleLabel: {
    fontSize: 16,
    color: DesignTokens.textPrimary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionDescription: {
    color: DesignTokens.textSecondary,
    marginBottom: 12,
    fontSize: 14,
  },
  settingCard: {
    backgroundColor: DesignTokens.surface,
    borderRadius: 16,
    padding: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${DesignTokens.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: DesignTokens.textSecondary,
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  pickerButton: {
    padding: 8,
  },
  pickerValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    minWidth: 100,
    justifyContent: 'center',
  },
  pickerValueText: {
    fontSize: 32,
    fontWeight: '700',
    color: DesignTokens.primary,
  },
  pickerValueUnit: {
    fontSize: 14,
    color: DesignTokens.textSecondary,
    marginLeft: 4,
  },
  tipsCard: {
    backgroundColor: `${DesignTokens.primary}10`,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  tipsList: {
    gap: 6,
  },
  tipItem: {
    fontSize: 14,
    color: DesignTokens.textSecondary,
    lineHeight: 20,
  },
  resetButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  resetButtonText: {
    fontSize: 16,
    color: DesignTokens.error,
    fontWeight: '500',
  },
});
