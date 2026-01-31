import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/card';
import { Button } from '@/components/button';
import { useGoalStore } from '@/stores/goal-store';
import { DesignTokens } from '@/constants/theme';
import { Goal } from '@/lib/db';
import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';

// Goal type configuration
interface GoalTypeConfig {
  type: Goal['type'];
  label: string;
  description: string;
  icon: IconSymbolName;
  color: string;
  defaultTarget: number;
  minTarget: number;
  maxTarget: number;
  step: number;
  unit: string;
}

const GOAL_TYPES: GoalTypeConfig[] = [
  {
    type: 'daily_steps',
    label: 'Daily Steps',
    description: 'Set a target for steps to take each day',
    icon: 'figure.walk',
    color: DesignTokens.primary,
    defaultTarget: 10000,
    minTarget: 1000,
    maxTarget: 50000,
    step: 500,
    unit: 'steps',
  },
  {
    type: 'weekly_steps',
    label: 'Weekly Steps',
    description: 'Set a cumulative target for steps over a week',
    icon: 'figure.walk.motion',
    color: DesignTokens.accent,
    defaultTarget: 70000,
    minTarget: 7000,
    maxTarget: 350000,
    step: 1000,
    unit: 'steps',
  },
  {
    type: 'daily_distance',
    label: 'Daily Distance',
    description: 'Set a target distance to cover each day',
    icon: 'location.north',
    color: DesignTokens.warning,
    defaultTarget: 5000,
    minTarget: 500,
    maxTarget: 50000,
    step: 100,
    unit: 'm',
  },
];

// Format number with commas
function formatNumber(num: number): string {
  return num.toLocaleString();
}

// Format distance for display
function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${meters} m`;
}

// Format value based on goal type
function formatValue(value: number, type: Goal['type']): string {
  if (type === 'daily_distance') {
    return formatDistance(value);
  }
  return formatNumber(value);
}

// Get today's date string
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

// Get start of week string
function getWeekStartString(): string {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d.toISOString().split('T')[0];
}

// Goal Type Selector Component
interface GoalTypeSelectorProps {
  selectedType: Goal['type'] | null;
  onSelect: (type: Goal['type']) => void;
  disabled?: boolean;
}

function GoalTypeSelector({ selectedType, onSelect, disabled }: GoalTypeSelectorProps) {
  return (
    <View style={styles.typeSelector}>
      <ThemedText variant="bodyBold" style={styles.sectionLabel}>
        Goal Type
      </ThemedText>
      <View style={styles.typeOptions}>
        {GOAL_TYPES.map((goalType) => (
          <TouchableOpacity
            key={goalType.type}
            onPress={() => !disabled && onSelect(goalType.type)}
            disabled={disabled}
            activeOpacity={0.8}
            style={[
              styles.typeOption,
              selectedType === goalType.type && {
                borderColor: goalType.color,
                backgroundColor: `${goalType.color}15`,
              },
              disabled && styles.typeOptionDisabled,
            ]}
          >
            <View
              style={[
                styles.typeIconContainer,
                { backgroundColor: `${goalType.color}25` },
              ]}
            >
              <IconSymbol name={goalType.icon} size={28} color={goalType.color} />
            </View>
            <ThemedText
              variant="bodyBold"
              style={[
                styles.typeLabel,
                selectedType === goalType.type && { color: goalType.color },
              ]}
            >
              {goalType.label}
            </ThemedText>
            <ThemedText variant="caption" color="secondary" style={styles.typeDescription}>
              {goalType.description}
            </ThemedText>
            {selectedType === goalType.type && (
              <View style={[styles.selectedIndicator, { backgroundColor: goalType.color }]}>
                <IconSymbol name="checkmark.circle.fill" size={16} color={DesignTokens.white} />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// Target Input Component
interface TargetInputProps {
  value: number;
  onChange: (value: number) => void;
  goalType: GoalTypeConfig;
}

function TargetInput({ value, onChange, goalType }: TargetInputProps) {
  const [inputValue, setInputValue] = useState(value.toString());

  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  const handleChangeText = (text: string) => {
    // Allow only numbers
    const numericValue = text.replace(/[^0-9]/g, '');
    setInputValue(numericValue);

    const numValue = parseInt(numericValue, 10);
    if (!isNaN(numValue)) {
      onChange(Math.min(goalType.maxTarget, Math.max(goalType.minTarget, numValue)));
    }
  };

  const handleBlur = () => {
    const numValue = parseInt(inputValue, 10);
    if (isNaN(numValue) || numValue < goalType.minTarget) {
      onChange(goalType.minTarget);
    } else if (numValue > goalType.maxTarget) {
      onChange(goalType.maxTarget);
    }
  };

  const decreaseValue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(Math.max(goalType.minTarget, value - goalType.step));
  };

  const increaseValue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(Math.min(goalType.maxTarget, value + goalType.step));
  };

  return (
    <View style={styles.targetInputContainer}>
      <ThemedText variant="bodyBold" style={styles.sectionLabel}>
        Target Value
      </ThemedText>

      <View style={styles.inputRow}>
        <TouchableOpacity
          onPress={decreaseValue}
          style={styles.adjustButton}
          activeOpacity={0.8}
        >
          <ThemedText variant="h2" color="secondary">
            −
          </ThemedText>
        </TouchableOpacity>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputValue}
            onChangeText={handleChangeText}
            onBlur={handleBlur}
            keyboardType="number-pad"
            maxLength={6}
            selectTextOnFocus
          />
          <ThemedText variant="body" color="secondary" style={styles.inputUnit}>
            {goalType.unit}
          </ThemedText>
        </View>

        <TouchableOpacity
          onPress={increaseValue}
          style={styles.adjustButton}
          activeOpacity={0.8}
        >
          <ThemedText variant="h2" color="secondary">
            +
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Quick select buttons */}
      <View style={styles.quickSelectContainer}>
        {[0.5, 0.75, 1, 1.25, 1.5].map((multiplier) => {
          const quickValue = Math.round(goalType.defaultTarget * multiplier / goalType.step) * goalType.step;
          return (
            <TouchableOpacity
              key={multiplier}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onChange(quickValue);
              }}
              style={[
                styles.quickSelectButton,
                value === quickValue && { backgroundColor: `${goalType.color}30` },
              ]}
            >
              <ThemedText
                variant="caption"
                style={value === quickValue ? { color: goalType.color, fontWeight: '700' } : undefined}
              >
                {formatValue(quickValue, goalType.type)}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// Suggested Goal Card
interface SuggestedGoalCardProps {
  goalType: GoalTypeConfig;
  suggestedValue: number;
  onApply: (value: number) => void;
}

function SuggestedGoalCard({ goalType, suggestedValue, onApply }: SuggestedGoalCardProps) {
  return (
    <Card style={styles.suggestedCard}>
      <View style={styles.suggestedHeader}>
        <IconSymbol name="lightbulb.fill" size={20} color={DesignTokens.warning} />
        <ThemedText variant="bodyBold" style={{ color: DesignTokens.warning }}>
          Smart Suggestion
        </ThemedText>
      </View>
      <ThemedText variant="body" color="secondary" style={styles.suggestedText}>
        Based on your recent activity, we suggest a target of{' '}
        <ThemedText variant="bodyBold" color="primary">
          {formatValue(suggestedValue, goalType.type)}
        </ThemedText>
        . This is calculated from your 7-day rolling average plus a 5% improvement factor.
      </ThemedText>
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onApply(suggestedValue);
        }}
        style={styles.applyButton}
      >
        <ThemedText variant="bodyBold" style={{ color: goalType.color }}>
          Apply Suggested Goal
        </ThemedText>
      </TouchableOpacity>
    </Card>
  );
}

// Explanation Card
function GoalExplanationCard({ goalType }: { goalType: GoalTypeConfig }) {
  const getExplanation = () => {
    switch (goalType.type) {
      case 'daily_steps':
        return (
          <>
            Your daily steps goal tracks the total number of steps you take each day. 
            The recommended target is 10,000 steps, which is approximately 8km of walking. 
            Progress is automatically updated as you record activities.
          </>
        );
      case 'weekly_steps':
        return (
          <>
            Your weekly steps goal is a cumulative target for the entire week (Sunday to Saturday). 
            This helps you maintain consistency even if you miss a day. 
            The default target is 70,000 steps (10,000 per day).
          </>
        );
      case 'daily_distance':
        return (
          <>
            Your daily distance goal tracks how far you travel each day, regardless of activity type. 
            The default target is 5km. Distance is calculated using GPS tracking during activities 
            or estimated from your step count and calibrated stride length.
          </>
        );
    }
  };

  return (
    <Card style={styles.explanationCard}>
      <ThemedText variant="bodyBold" style={styles.explanationTitle}>
        How {goalType.label} Works
      </ThemedText>
      <ThemedText variant="body" color="secondary" style={styles.explanationText}>
        {getExplanation()}
      </ThemedText>
    </Card>
  );
}

// Main Set Goal Screen
export default function SetGoalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Extract params for editing
  const editId = params.editId as string | undefined;
  const editType = params.type as Goal['type'] | undefined;
  const editTarget = params.target ? parseFloat(params.target as string) : undefined;
  const editDate = params.date as string | undefined;

  const isEditing = !!editId;

  // Store actions
  const setGoal = useGoalStore((state) => state.setGoal);
  const calculateAdaptiveTarget = useGoalStore((state) => state.calculateAdaptiveTarget);

  // Local state
  const [selectedType, setSelectedType] = useState<Goal['type'] | null>(editType || null);
  const [target, setTarget] = useState(editTarget || GOAL_TYPES[0].defaultTarget);
  const [isSaving, setIsSaving] = useState(false);

  // Get current goal type config
  const currentGoalType = GOAL_TYPES.find((gt) => gt.type === selectedType) || GOAL_TYPES[0];

  // Calculate suggested target
  const suggestedTarget = selectedType
    ? calculateAdaptiveTarget(selectedType)
    : currentGoalType.defaultTarget;

  // Update target when type changes
  useEffect(() => {
    if (selectedType && !editTarget) {
      const goalType = GOAL_TYPES.find((gt) => gt.type === selectedType);
      if (goalType) {
        setTarget(goalType.defaultTarget);
      }
    }
  }, [selectedType, editTarget]);

  // Handle save
  const handleSave = async () => {
    if (!selectedType) {
      Alert.alert('Select Goal Type', 'Please select a goal type to continue.');
      return;
    }

    setIsSaving(true);

    try {
      // Determine the date for the goal
      let goalDate: string;
      if (isEditing && editDate) {
        goalDate = editDate;
      } else if (selectedType === 'weekly_steps') {
        goalDate = getWeekStartString();
      } else {
        goalDate = getTodayString();
      }

      await setGoal({
        type: selectedType,
        target,
        date: goalDate,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      Alert.alert('Error', 'Failed to save goal. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <ThemedText variant="h1" style={styles.title}>
              {isEditing ? 'Edit Goal' : 'Set New Goal'}
            </ThemedText>
            <ThemedText variant="body" color="secondary">
              {isEditing
                ? 'Update your fitness goal target'
                : 'Create a new fitness goal to track your progress'}
            </ThemedText>
          </View>

          {/* Goal Type Selector */}
          <GoalTypeSelector
            selectedType={selectedType}
            onSelect={(type) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedType(type);
            }}
            disabled={isEditing}
          />

          {/* Target Input */}
          {selectedType && (
            <>
              <TargetInput
                value={target}
                onChange={setTarget}
                goalType={currentGoalType}
              />

              {/* Suggested Goal Card */}
              {!isEditing && (
                <SuggestedGoalCard
                  goalType={currentGoalType}
                  suggestedValue={suggestedTarget}
                  onApply={setTarget}
                />
              )}

              {/* Explanation Card */}
              <GoalExplanationCard goalType={currentGoalType} />
            </>
          )}

          {/* Spacer for bottom buttons */}
          <View style={styles.spacer} />
        </ScrollView>

        {/* Bottom Buttons */}
        <View style={styles.bottomButtons}>
          <Button
            title="Cancel"
            variant="secondary"
            onPress={handleCancel}
            style={styles.cancelButton}
          />
          <Button
            title={isEditing ? 'Update Goal' : 'Save Goal'}
            onPress={handleSave}
            disabled={!selectedType || isSaving}
            style={styles.saveButton}
          />
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    marginBottom: 8,
  },
  spacer: {
    height: 20,
  },

  // Type Selector Styles
  typeSelector: {
    marginBottom: 24,
  },
  sectionLabel: {
    marginBottom: 12,
  },
  typeOptions: {
    gap: 12,
  },
  typeOption: {
    backgroundColor: DesignTokens.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: DesignTokens.border,
    position: 'relative',
  },
  typeOptionDisabled: {
    opacity: 0.6,
  },
  typeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeLabel: {
    marginBottom: 4,
  },
  typeDescription: {
    lineHeight: 18,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Target Input Styles
  targetInputContainer: {
    marginBottom: 24,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  adjustButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: DesignTokens.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DesignTokens.surface,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: DesignTokens.border,
    minWidth: 160,
    justifyContent: 'center',
  },
  textInput: {
    color: DesignTokens.textPrimary,
    fontSize: 32,
    fontWeight: '700',
    minWidth: 80,
    textAlign: 'center',
  },
  inputUnit: {
    marginLeft: 4,
  },
  quickSelectContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  quickSelectButton: {
    backgroundColor: DesignTokens.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },

  // Suggested Card Styles
  suggestedCard: {
    marginBottom: 16,
    backgroundColor: `${DesignTokens.warning}10`,
    borderColor: `${DesignTokens.warning}30`,
    borderWidth: 1,
  },
  suggestedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  suggestedText: {
    lineHeight: 20,
    marginBottom: 12,
  },
  applyButton: {
    alignSelf: 'flex-start',
    backgroundColor: `${DesignTokens.warning}20`,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },

  // Explanation Card Styles
  explanationCard: {
    marginBottom: 16,
  },
  explanationTitle: {
    marginBottom: 8,
  },
  explanationText: {
    lineHeight: 20,
  },

  // Bottom Buttons
  bottomButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: `${DesignTokens.background}F0`,
    borderTopWidth: 1,
    borderTopColor: DesignTokens.border,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },
});
