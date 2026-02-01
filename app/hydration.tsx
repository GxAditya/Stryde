import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/card';
import { Button } from '@/components/button';
import { ProgressRing } from '@/components/progress-ring';
import { DesignTokens } from '@/constants/theme';
import { useHydrationStore, QUICK_ADD_PRESETS } from '@/stores/hydration-store';
import type { HydrationLog } from '@/lib/db';

// Format timestamp to readable time
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// Format date for history grouping
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }
}

// Weekly chart component
function WeeklyHydrationChart({ data }: { data: { day: string; amount: number }[] }) {
  const max = Math.max(...data.map((d) => d.amount), 1);
  const goal = 2000; // Default goal for chart reference

  return (
    <View style={styles.chartContainer}>
      {data.map((item, index) => {
        const height = Math.min((item.amount / goal) * 100, 100);
        const isGoalMet = item.amount >= goal;
        return (
          <View key={index} style={styles.barContainer}>
            <View style={styles.barWrapper}>
              <View
                style={[
                  styles.bar,
                  { height: Math.max(height, 4) },
                  isGoalMet && styles.barGoalMet,
                ]}
              />
              {item.amount > 0 && (
                <ThemedText variant="micro" color="secondary" style={styles.barValue}>
                  {Math.round(item.amount / 100) * 100 >= 1000
                    ? `${(item.amount / 1000).toFixed(1)}L`
                    : `${item.amount}`}
                </ThemedText>
              )}
            </View>
            <ThemedText variant="micro" color="secondary" style={styles.barLabel}>
              {item.day}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

// Quick log button component
function QuickLogButton({
  amount,
  onPress,
}: {
  amount: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickLogButton} onPress={onPress} activeOpacity={0.7}>
      <ThemedText variant="bodyBold" style={styles.quickLogAmount}>
        {amount}ml
      </ThemedText>
    </TouchableOpacity>
  );
}

// History item component
function HistoryItem({
  log,
  onDelete,
}: {
  log: HydrationLog;
  onDelete: (id: string) => void;
}) {
  return (
    <View style={styles.historyItem}>
      <View style={styles.historyIconContainer}>
        <Ionicons name="water" size={20} color={DesignTokens.primary} />
      </View>
      <View style={styles.historyContent}>
        <ThemedText variant="bodyBold">{log.amount_ml}ml</ThemedText>
        <ThemedText variant="caption" color="secondary">
          {formatTime(log.timestamp)}
        </ThemedText>
      </View>
      <TouchableOpacity
        style={styles.historyDeleteButton}
        onPress={() => onDelete(log.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="trash-outline" size={18} color={DesignTokens.error} />
      </TouchableOpacity>
    </View>
  );
}

// Goal setting modal
function GoalModal({
  visible,
  currentGoal,
  onClose,
  onSave,
}: {
  visible: boolean;
  currentGoal: number;
  onClose: () => void;
  onSave: (goal: number) => void;
}) {
  const [goal, setGoal] = useState(currentGoal.toString());

  useEffect(() => {
    setGoal(currentGoal.toString());
  }, [currentGoal, visible]);

  const handleSave = () => {
    const newGoal = parseInt(goal, 10);
    if (isNaN(newGoal) || newGoal < 500 || newGoal > 5000) {
      Alert.alert('Invalid Goal', 'Please enter a goal between 500ml and 5000ml');
      return;
    }
    onSave(newGoal);
    onClose();
  };

  const presetGoals = [1500, 2000, 2500, 3000, 3500];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Card style={styles.modalContent}>
          <ThemedText variant="h2" style={styles.modalTitle}>
            Daily Hydration Goal
          </ThemedText>
          <ThemedText variant="caption" color="secondary" style={styles.modalSubtitle}>
            Set your daily water intake target
          </ThemedText>

          <TextInput
            style={styles.goalInput}
            value={goal}
            onChangeText={setGoal}
            keyboardType="number-pad"
            placeholder="2000"
            placeholderTextColor={DesignTokens.textSecondary}
          />
          <ThemedText variant="caption" color="secondary" style={styles.goalUnit}>
            milliliters (ml)
          </ThemedText>

          <View style={styles.presetGoalsContainer}>
            {presetGoals.map((preset) => (
              <TouchableOpacity
                key={preset}
                style={[
                  styles.presetGoalButton,
                  parseInt(goal, 10) === preset && styles.presetGoalButtonActive,
                ]}
                onPress={() => setGoal(preset.toString())}
              >
                <ThemedText
                  variant="caption"
                  color={parseInt(goal, 10) === preset ? 'primary' : 'secondary'}
                >
                  {preset >= 1000 ? `${preset / 1000}L` : `${preset}ml`}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modalButtons}>
            <Button title="Cancel" variant="secondary" onPress={onClose} style={styles.modalButton} />
            <Button title="Save" onPress={handleSave} style={styles.modalButton} />
          </View>
        </Card>
      </View>
    </Modal>
  );
}

// Custom amount modal
function CustomAmountModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (amount: number) => void;
}) {
  const [amount, setAmount] = useState('');

  const handleSave = () => {
    const ml = parseInt(amount, 10);
    if (isNaN(ml) || ml <= 0 || ml > 2000) {
      Alert.alert('Invalid Amount', 'Please enter an amount between 1ml and 2000ml');
      return;
    }
    onSave(ml);
    setAmount('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Card style={styles.modalContent}>
          <ThemedText variant="h2" style={styles.modalTitle}>
            Custom Amount
          </ThemedText>

          <TextInput
            style={styles.goalInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
            placeholder="Enter amount in ml"
            placeholderTextColor={DesignTokens.textSecondary}
            autoFocus
          />

          <View style={styles.modalButtons}>
            <Button title="Cancel" variant="secondary" onPress={onClose} style={styles.modalButton} />
            <Button title="Add" onPress={handleSave} style={styles.modalButton} />
          </View>
        </Card>
      </View>
    </Modal>
  );
}

export default function HydrationScreen() {
  const router = useRouter();
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [weeklyData, setWeeklyData] = useState<{ day: string; amount: number }[]>([]);

  const {
    logs,
    todayTotal,
    dailyGoal,
    isLoading,
    loadLogs,
    quickAdd,
    logWater,
    deleteLog,
    setDailyGoal,
    getProgressPercentage,
    getRemainingAmount,
    getTodayLogs,
    getHistory,
  } = useHydrationStore();

  // Load logs on mount
  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Load weekly data
  useEffect(() => {
    const loadWeeklyData = async () => {
      const history = await getHistory(7);
      const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      const today = new Date();
      const data: { day: string; amount: number }[] = [];

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const dayLogs = history.filter(
          (log) => log.timestamp >= startOfDay.getTime() && log.timestamp <= endOfDay.getTime()
        );
        const total = dayLogs.reduce((sum, log) => sum + log.amount_ml, 0);

        data.push({
          day: days[date.getDay()],
          amount: total,
        });
      }

      setWeeklyData(data);
    };

    loadWeeklyData();
  }, [getHistory, logs]);

  // Handle quick log
  const handleQuickLog = useCallback(
    async (amount: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      try {
        await quickAdd(amount);
      } catch (err) {
        Alert.alert('Error', 'Failed to log water intake');
      }
    },
    [quickAdd]
  );

  // Handle custom amount
  const handleCustomAmount = useCallback(
    async (amount: number) => {
      try {
        await logWater(amount);
      } catch (err) {
        Alert.alert('Error', 'Failed to log water intake');
      }
    },
    [logWater]
  );

  // Handle delete log
  const handleDeleteLog = useCallback(
    (id: string) => {
      Alert.alert('Delete Entry', 'Are you sure you want to delete this entry?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteLog(id);
            } catch (err) {
              Alert.alert('Error', 'Failed to delete entry');
            }
          },
        },
      ]);
    },
    [deleteLog]
  );

  // Handle goal change
  const handleGoalChange = useCallback(
    (newGoal: number) => {
      setDailyGoal(newGoal);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [setDailyGoal]
  );

  // Get today's logs
  const todayLogs = getTodayLogs();

  // Calculate progress
  const progress = Math.min(todayTotal / dailyGoal, 1);
  const progressPercentage = getProgressPercentage();
  const remainingAmount = getRemainingAmount();


  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={DesignTokens.textPrimary} />
          </TouchableOpacity>
          <ThemedText variant="h1">Hydration</ThemedText>
          <TouchableOpacity onPress={() => setShowGoalModal(true)} style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={24} color={DesignTokens.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Progress Ring Section */}
        <View style={styles.progressSection}>
          <ProgressRing
            progress={progress}
            size="large"
            displayValue={`${todayTotal}`}
            label={`of ${dailyGoal}ml • ${progressPercentage}%`}
            animated={true}
          />
          {remainingAmount > 0 && (
            <ThemedText variant="caption" color="secondary" style={styles.remainingText}>
              {remainingAmount}ml more to reach your goal
            </ThemedText>
          )}
          {remainingAmount === 0 && todayTotal > 0 && (
            <ThemedText variant="caption" style={[styles.remainingText, { color: DesignTokens.accent }]}>
              🎉 Goal reached! Great job!
            </ThemedText>
          )}
        </View>

        {/* Quick Log Buttons */}
        <Card style={styles.quickLogCard}>
          <ThemedText variant="h2" style={styles.quickLogTitle}>
            Quick Log
          </ThemedText>
          <View style={styles.quickLogGrid}>
            {QUICK_ADD_PRESETS.map((preset) => (
              <QuickLogButton
                key={preset.amount}
                amount={preset.amount}
                onPress={() => handleQuickLog(preset.amount)}
              />
            ))}
          </View>
          <Button
            title="Custom Amount"
            variant="secondary"
            onPress={() => setShowCustomModal(true)}
            style={styles.customAmountButton}
          />
        </Card>

        {/* Weekly Chart */}
        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <ThemedText variant="h2">Weekly Overview</ThemedText>
            <ThemedText variant="caption" color="secondary">
              Goal: {dailyGoal >= 1000 ? `${dailyGoal / 1000}L` : `${dailyGoal}ml`}
            </ThemedText>
          </View>
          <WeeklyHydrationChart data={weeklyData} />
        </Card>

        {/* Today's History */}
        <Card style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <ThemedText variant="h2">Today&apos;s History</ThemedText>
            <ThemedText variant="caption" color="secondary">
              {todayLogs.length} {todayLogs.length === 1 ? 'entry' : 'entries'}
            </ThemedText>
          </View>
          {todayLogs.length > 0 ? (
            <View style={styles.historyList}>
              {todayLogs.map((log) => (
                <HistoryItem key={log.id} log={log} onDelete={handleDeleteLog} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="water-outline" size={48} color={DesignTokens.textSecondary} />
              <ThemedText variant="body" color="secondary" style={styles.emptyStateText}>
                No water logged today
              </ThemedText>
              <ThemedText variant="caption" color="secondary">
                Tap a quick log button to get started
              </ThemedText>
            </View>
          )}
        </Card>

        {/* Hydration Tips */}
        <Card style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb-outline" size={20} color={DesignTokens.warning} />
            <ThemedText variant="bodyBold" style={styles.tipsTitle}>
              Hydration Tip
            </ThemedText>
          </View>
          <ThemedText variant="caption" color="secondary">
            Drink water before, during, and after exercise to maintain optimal performance and
            recovery.
          </ThemedText>
        </Card>
      </ScrollView>

      {/* Modals */}
      <GoalModal
        visible={showGoalModal}
        currentGoal={dailyGoal}
        onClose={() => setShowGoalModal(false)}
        onSave={handleGoalChange}
      />

      <CustomAmountModal
        visible={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        onSave={handleCustomAmount}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  settingsButton: {
    padding: 8,
    marginRight: -8,
  },
  progressSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  remainingText: {
    marginTop: 12,
  },
  quickLogCard: {
    marginBottom: 16,
  },
  quickLogTitle: {
    marginBottom: 16,
  },
  quickLogGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  quickLogButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: DesignTokens.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DesignTokens.border,
  },
  quickLogAmount: {
    color: DesignTokens.primary,
  },
  customAmountButton: {
    marginTop: 8,
  },
  chartCard: {
    marginBottom: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingHorizontal: 8,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    width: '100%',
    alignItems: 'center',
    height: 100,
    justifyContent: 'flex-end',
  },
  bar: {
    width: 8,
    backgroundColor: DesignTokens.primary,
    borderRadius: 4,
  },
  barGoalMet: {
    backgroundColor: DesignTokens.accent,
  },
  barValue: {
    position: 'absolute',
    bottom: 4,
    fontSize: 10,
  },
  barLabel: {
    marginTop: 8,
  },
  historyCard: {
    marginBottom: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyList: {
    gap: 12,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: DesignTokens.border,
  },
  historyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${DesignTokens.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyDeleteButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    marginTop: 12,
    marginBottom: 4,
  },
  tipsCard: {
    marginBottom: 16,
    backgroundColor: `${DesignTokens.warning}10`,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tipsTitle: {
    color: DesignTokens.warning,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    textAlign: 'center',
    marginBottom: 24,
  },
  goalInput: {
    backgroundColor: DesignTokens.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: '600',
    color: DesignTokens.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  goalUnit: {
    textAlign: 'center',
    marginBottom: 16,
  },
  presetGoalsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 24,
  },
  presetGoalButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: DesignTokens.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: DesignTokens.border,
  },
  presetGoalButtonActive: {
    borderColor: DesignTokens.primary,
    backgroundColor: `${DesignTokens.primary}20`,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
});
