import React, { useRef, forwardRef } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

import { ThemedView } from './themed-view';
import { ThemedText } from './themed-text';
import { DesignTokens } from '@/constants/theme';
import { WrapUpData } from '@/lib/wrapup';
import { formatNumber, formatDistance, formatDuration } from '@/lib/statistics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 64;
const CARD_HEIGHT = CARD_WIDTH * 1.4;

// Personality icon mapping
const PERSONALITY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  compass: 'compass',
  calendar: 'calendar',
  trophy: 'trophy',
  sunny: 'sunny',
  moon: 'moon',
  rocket: 'rocket',
};

export interface ShareCardProps {
  wrapUpData: WrapUpData;
}

export interface ShareCardRef {
  captureAndShare: () => Promise<void>;
  capture: () => Promise<string>;
}

export const ShareCard = forwardRef<ShareCardRef, ShareCardProps>(
  ({ wrapUpData }, ref) => {
    const cardRef = useRef<View>(null);

    const { stats, personality, year } = wrapUpData;
    const iconName = PERSONALITY_ICONS[personality.icon] || 'star';

    // Expose capture methods via ref
    React.useImperativeHandle(ref, () => ({
      captureAndShare: async () => {
        if (!cardRef.current) return;

        try {
          const uri = await captureRef(cardRef, {
            format: 'png',
            quality: 1,
            result: 'tmpfile',
          });

          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: `My ${year} with Stryde`,
            UTI: 'public.png',
          });
        } catch (error) {
          console.error('Failed to capture and share:', error);
          throw error;
        }
      },
      capture: async () => {
        if (!cardRef.current) throw new Error('Card ref not available');

        const uri = await captureRef(cardRef, {
          format: 'png',
          quality: 1,
          result: 'tmpfile',
        });

        return uri;
      },
    }));

    return (
      <View
        ref={cardRef}
        style={[styles.container, { backgroundColor: DesignTokens.surface }]}
        collapsable={false}
      >
        {/* Header with year */}
        <View style={styles.header}>
          <ThemedText variant="caption" color="secondary" style={styles.yearLabel}>
            {year} WRAP-UP
          </ThemedText>
        </View>

        {/* Personality Badge */}
        <View style={styles.personalitySection}>
          <View
            style={[
              styles.personalityIconContainer,
              { backgroundColor: personality.color },
            ]}
          >
            <Ionicons name={iconName} size={48} color={DesignTokens.white} />
          </View>
          <ThemedText
            variant="h1"
            style={[styles.personalityName, { color: personality.color }]}
          >
            {personality.name}
          </ThemedText>
          <ThemedText variant="caption" color="secondary" style={styles.personalityLabel}>
            MY STRIDE PERSONALITY
          </ThemedText>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsSection}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Ionicons name="footsteps" size={20} color={DesignTokens.primary} />
              <ThemedText variant="h2" style={styles.statValue}>
                {formatNumber(stats.totalSteps)}
              </ThemedText>
              <ThemedText variant="micro" color="secondary">
                STEPS
              </ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="map" size={20} color={DesignTokens.accent} />
              <ThemedText variant="h2" style={styles.statValue}>
                {formatDistance(stats.totalDistance)}
              </ThemedText>
              <ThemedText variant="micro" color="secondary">
                DISTANCE
              </ThemedText>
            </View>
          </View>

          <View style={styles.statRowDivider} />

          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Ionicons name="time" size={20} color={DesignTokens.warning} />
              <ThemedText variant="h2" style={styles.statValue}>
                {formatDuration(stats.totalDuration)}
              </ThemedText>
              <ThemedText variant="micro" color="secondary">
                DURATION
              </ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="calendar" size={20} color={DesignTokens.error} />
              <ThemedText variant="h2" style={styles.statValue}>
                {stats.activeDays}
              </ThemedText>
              <ThemedText variant="micro" color="secondary">
                ACTIVE DAYS
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Best Day Highlight */}
        {stats.bestDay && (
          <View style={styles.highlightSection}>
            <Ionicons name="trophy" size={16} color={DesignTokens.accent} />
            <ThemedText variant="caption" style={styles.highlightText}>
              Best Day: {formatNumber(stats.bestDay.steps)} steps
            </ThemedText>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.logoContainer}>
            <Ionicons name="footsteps" size={16} color={DesignTokens.primary} />
            <ThemedText variant="caption" style={styles.logoText}>
              STRYDE
            </ThemedText>
          </View>
          <ThemedText variant="micro" color="secondary">
            #Stryde #YearInReview
          </ThemedText>
        </View>

        {/* Decorative elements */}
        <View
          style={[
            styles.decorativeCircle,
            styles.decorativeCircleTop,
            { backgroundColor: `${personality.color}15` },
          ]}
        />
        <View
          style={[
            styles.decorativeCircle,
            styles.decorativeCircleBottom,
            { backgroundColor: `${DesignTokens.primary}10` },
          ]}
        />
      </View>
    );
  }
);

ShareCard.displayName = 'ShareCard';

// Standalone share function for use outside the component
export async function captureShareCard(
  cardRef: React.RefObject<View>
): Promise<string> {
  if (!cardRef.current) {
    throw new Error('Card ref not available');
  }

  const uri = await captureRef(cardRef, {
    format: 'png',
    quality: 1,
    result: 'tmpfile',
  });

  return uri;
}

export async function shareWrapUpCard(uri: string, year: number): Promise<void> {
  await Sharing.shareAsync(uri, {
    mimeType: 'image/png',
    dialogTitle: `My ${year} with Stryde`,
    UTI: 'public.png',
  });
}

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    padding: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  yearLabel: {
    letterSpacing: 4,
  },
  personalitySection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  personalityIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: DesignTokens.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  personalityName: {
    marginBottom: 4,
  },
  personalityLabel: {
    letterSpacing: 2,
  },
  statsSection: {
    backgroundColor: `${DesignTokens.background}80`,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statRowDivider: {
    height: 1,
    backgroundColor: DesignTokens.border,
    marginVertical: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: DesignTokens.border,
  },
  statValue: {
    fontSize: 18,
  },
  highlightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    paddingVertical: 8,
    backgroundColor: `${DesignTokens.accent}15`,
    borderRadius: 8,
  },
  highlightText: {
    color: DesignTokens.accent,
  },
  footer: {
    marginTop: 'auto',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoText: {
    color: DesignTokens.primary,
    fontWeight: '700',
    letterSpacing: 1,
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 999,
    zIndex: -1,
  },
  decorativeCircleTop: {
    width: 200,
    height: 200,
    top: -50,
    right: -50,
  },
  decorativeCircleBottom: {
    width: 150,
    height: 150,
    bottom: -30,
    left: -30,
  },
});
