import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Share,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  interpolate,
  Extrapolate,
  runOnJS,
  FadeIn,
  FadeInUp,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/card';
import { ProgressRing } from '@/components/progress-ring';
import { ShareCard } from '@/components/share-card';
import { DesignTokens } from '@/constants/theme';
import { useActivityStore } from '@/stores/activity-store';
import { useGoalStore } from '@/stores/goal-store';
import {
  generateWrapUp,
  WrapUpData,
  StoryCard,
  Personality,
  Achievement,
  AnnualStats,
} from '@/lib/wrapup';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Animation constants
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;
const CARD_PADDING = 24;

// Personality icon mapping
const PERSONALITY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  compass: 'compass',
  calendar: 'calendar',
  trophy: 'trophy',
  sunny: 'sunny',
  moon: 'moon',
  rocket: 'rocket',
};

// Achievement icon mapping
const ACHIEVEMENT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  footsteps: 'footsteps',
  map: 'map',
  flame: 'flame',
  fitness: 'fitness',
  'checkmark-circle': 'checkmark-circle',
  trophy: 'trophy',
};

// Intro Card Component
function IntroCard({ card, onNext }: { card: StoryCard; onNext: () => void }) {
  return (
    <View style={styles.cardContent}>
      <Animated.View entering={FadeInUp.duration(600)} style={styles.introContainer}>
        <ThemedText variant="h1" style={styles.introTitle}>
          {card.title}
        </ThemedText>
        <ThemedText variant="h2" color="secondary" style={styles.introSubtitle}>
          {card.subtitle}
        </ThemedText>
        <ThemedText variant="body" color="secondary" style={styles.introText}>
          {card.content}
        </ThemedText>
      </Animated.View>

      <TouchableOpacity style={styles.startButton} onPress={onNext}>
        <ThemedText variant="bodyBold" style={styles.startButtonText}>
          Begin Journey
        </ThemedText>
        <Ionicons name="arrow-forward" size={20} color={DesignTokens.white} />
      </TouchableOpacity>
    </View>
  );
}

// Stats Overview Card Component
function StatsOverviewCard({ card }: { card: StoryCard }) {
  const data = card.data as {
    steps: number;
    distance: string;
    duration: string;
    activities: number;
    activeDays: number;
  };

  const stats = [
    { icon: 'footsteps' as const, label: 'Steps', value: data.steps.toLocaleString() },
    { icon: 'map' as const, label: 'Distance', value: data.distance },
    { icon: 'time' as const, label: 'Duration', value: data.duration },
    { icon: 'flame' as const, label: 'Activities', value: data.activities.toString() },
    { icon: 'calendar' as const, label: 'Active Days', value: data.activeDays.toString() },
  ];

  return (
    <View style={styles.cardContent}>
      <ThemedText variant="h1" style={styles.cardTitle}>
        {card.title}
      </ThemedText>

      <View style={styles.statsGrid}>
        {stats.map((stat, index) => (
          <Animated.View
            key={stat.label}
            entering={FadeInUp.delay(index * 100).duration(400)}
            style={styles.statItem}
          >
            <View style={styles.statIconContainer}>
              <Ionicons
                name={stat.icon}
                size={24}
                color={DesignTokens.primary}
              />
            </View>
            <ThemedText variant="h2" style={styles.statValue}>
              {stat.value}
            </ThemedText>
            <ThemedText variant="caption" color="secondary">
              {stat.label}
            </ThemedText>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

// Personality Reveal Card Component
function PersonalityRevealCard({
  card,
  personality,
}: {
  card: StoryCard;
  personality: Personality;
}) {
  const scale = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 100 });
    rotation.value = withTiming(360, { duration: 1000 });
  }, []);

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const iconName = PERSONALITY_ICONS[personality.icon] || 'star';

  return (
    <View style={styles.cardContent}>
      <ThemedText variant="h1" style={styles.cardTitle}>
        {card.title}
      </ThemedText>

      <Animated.View style={[styles.personalityBadge, badgeStyle]}>
        <View
          style={[
            styles.personalityIconContainer,
            { backgroundColor: personality.color },
          ]}
        >
          <Ionicons name={iconName} size={64} color={DesignTokens.white} />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(400).duration(500)}>
        <ThemedText variant="display" style={[styles.personalityName, { color: personality.color }]}>
          {personality.name}
        </ThemedText>
        <ThemedText variant="body" color="secondary" style={styles.personalityDescription}>
          {personality.description}
        </ThemedText>
      </Animated.View>
    </View>
  );
}

// Achievements Card Component
function AchievementsCard({ card }: { card: StoryCard }) {
  const achievements = (card.data?.achievements as Achievement[]) || [];

  return (
    <View style={styles.cardContent}>
      <ThemedText variant="h1" style={styles.cardTitle}>
        {card.title}
      </ThemedText>

      <ThemedText variant="body" color="secondary" style={styles.achievementsSubtitle}>
        {card.content}
      </ThemedText>

      <ScrollView
        style={styles.achievementsList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.achievementsContent}
      >
        {achievements.map((achievement, index) => {
          const iconName = ACHIEVEMENT_ICONS[achievement.icon] || 'star';
          return (
            <Animated.View
              key={achievement.id}
              entering={FadeInUp.delay(index * 80).duration(400)}
            >
              <Card style={styles.achievementCard}>
                <View style={styles.achievementIconContainer}>
                  <Ionicons name={iconName} size={28} color={DesignTokens.accent} />
                </View>
                <View style={styles.achievementTextContainer}>
                  <ThemedText variant="bodyBold">{achievement.title}</ThemedText>
                  <ThemedText variant="caption" color="secondary">
                    {achievement.description}
                  </ThemedText>
                </View>
              </Card>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// Highlights Card Component
function HighlightsCard({ card }: { card: StoryCard }) {
  const highlights = (card.data?.highlights as string[]) || [];

  return (
    <View style={styles.cardContent}>
      <ThemedText variant="h1" style={styles.cardTitle}>
        {card.title}
      </ThemedText>

      <View style={styles.highlightsContainer}>
        {highlights.map((highlight, index) => (
          <Animated.View
            key={index}
            entering={FadeInUp.delay(index * 150).duration(500)}
            style={styles.highlightItem}
          >
            <View style={styles.highlightBullet} />
            <ThemedText variant="body" style={styles.highlightText}>
              {highlight}
            </ThemedText>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

// Comparison Card Component
function ComparisonCard({ card }: { card: StoryCard }) {
  const changes = card.data?.changes as {
    steps: number;
    distance: number;
    duration: number;
    activities: number;
    activeDays: number;
  };

  const improvements = card.content.split('. ').filter(Boolean);

  const formatChange = (value: number): string => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${Math.round(value * 100)}%`;
  };

  return (
    <View style={styles.cardContent}>
      <ThemedText variant="h1" style={styles.cardTitle}>
        {card.title}
      </ThemedText>

      <View style={styles.comparisonGrid}>
        {[
          { label: 'Steps', value: changes.steps },
          { label: 'Distance', value: changes.distance },
          { label: 'Duration', value: changes.duration },
          { label: 'Activities', value: changes.activities },
        ].map((item, index) => (
          <Animated.View
            key={item.label}
            entering={FadeInUp.delay(index * 100).duration(400)}
            style={styles.comparisonItem}
          >
            <ThemedText
              variant="h2"
              style={[
                styles.comparisonValue,
                { color: item.value >= 0 ? DesignTokens.accent : DesignTokens.error },
              ]}
            >
              {formatChange(item.value)}
            </ThemedText>
            <ThemedText variant="caption" color="secondary">
              {item.label}
            </ThemedText>
          </Animated.View>
        ))}
      </View>

      <View style={styles.improvementsContainer}>
        {improvements.map((improvement, index) => (
          <Animated.View
            key={index}
            entering={FadeInUp.delay(400 + index * 100).duration(400)}
            style={styles.improvementItem}
          >
            <Ionicons name="trending-up" size={20} color={DesignTokens.accent} />
            <ThemedText variant="body" style={styles.improvementText}>
              {improvement}
            </ThemedText>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

// Share Card Component
function ShareCardStory({
  card,
  wrapUpData,
  onShare,
}: {
  card: StoryCard;
  wrapUpData: WrapUpData;
  onShare: () => void;
}) {
  return (
    <View style={styles.cardContent}>
      <ThemedText variant="h1" style={styles.cardTitle}>
        {card.title}
      </ThemedText>

      <ThemedText variant="body" color="secondary" style={styles.shareSubtitle}>
        {card.content}
      </ThemedText>

      <View style={styles.shareCardContainer}>
        <ShareCard wrapUpData={wrapUpData} />
      </View>

      <View style={styles.shareButtonsContainer}>
        <TouchableOpacity style={styles.shareButton} onPress={onShare}>
          <Ionicons name="share-outline" size={24} color={DesignTokens.white} />
          <ThemedText variant="bodyBold" style={styles.shareButtonText}>
            Share
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Story Card Component
function StoryCardComponent({
  card,
  index,
  totalCards,
  wrapUpData,
  onNext,
  onShare,
}: {
  card: StoryCard;
  index: number;
  totalCards: number;
  wrapUpData: WrapUpData;
  onNext: () => void;
  onShare: () => void;
}) {
  const renderCardContent = () => {
    switch (card.type) {
      case 'intro':
        return <IntroCard card={card} onNext={onNext} />;
      case 'stats-overview':
        return <StatsOverviewCard card={card} />;
      case 'personality-reveal':
        return <PersonalityRevealCard card={card} personality={wrapUpData.personality} />;
      case 'achievements':
        return <AchievementsCard card={card} />;
      case 'highlights':
        return <HighlightsCard card={card} />;
      case 'comparison':
        return <ComparisonCard card={card} />;
      case 'share':
        return <ShareCardStory card={card} wrapUpData={wrapUpData} onShare={onShare} />;
      default:
        return null;
    }
  };

  return (
    <Card style={styles.storyCard}>
      {renderCardContent()}

      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        {Array.from({ length: totalCards }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              i === index && styles.progressDotActive,
              i < index && styles.progressDotCompleted,
            ]}
          />
        ))}
      </View>
    </Card>
  );
}

// Main WrapUp Screen
export default function WrapUpScreen() {
  const router = useRouter();
  const { year } = useLocalSearchParams<{ year?: string }>();
  const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();

  const { activities, loadActivities } = useActivityStore();
  const { goals, loadGoals } = useGoalStore();

  const [wrapUpData, setWrapUpData] = useState<WrapUpData | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const translateX = useSharedValue(0);
  const cardOpacity = useSharedValue(1);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([loadActivities(1000), loadGoals()]);
      setIsLoading(false);
    };
    loadData();
  }, [loadActivities, loadGoals]);

  // Generate wrap-up data when activities are loaded
  useEffect(() => {
    if (!isLoading && activities.length > 0) {
      const data = generateWrapUp(activities, goals, targetYear);
      setWrapUpData(data);
    }
  }, [isLoading, activities, goals, targetYear]);

  // Handle swipe gesture
  const swipeGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (wrapUpData) {
        const totalCards = wrapUpData.storyCards.length;

        if (event.translationX < -SWIPE_THRESHOLD && currentCardIndex < totalCards - 1) {
          // Swipe left - next card
          translateX.value = withTiming(-SCREEN_WIDTH, { duration: 300 }, () => {
            runOnJS(setCurrentCardIndex)(currentCardIndex + 1);
            translateX.value = SCREEN_WIDTH;
            translateX.value = withTiming(0, { duration: 300 });
          });
        } else if (event.translationX > SWIPE_THRESHOLD && currentCardIndex > 0) {
          // Swipe right - previous card
          translateX.value = withTiming(SCREEN_WIDTH, { duration: 300 }, () => {
            runOnJS(setCurrentCardIndex)(currentCardIndex - 1);
            translateX.value = -SCREEN_WIDTH;
            translateX.value = withTiming(0, { duration: 300 });
          });
        } else {
          // Snap back
          translateX.value = withSpring(0);
        }
      }
    });

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: interpolate(
      Math.abs(translateX.value),
      [0, SCREEN_WIDTH / 2],
      [1, 0.5],
      Extrapolate.CLAMP
    ),
  }));

  const handleNext = useCallback(() => {
    if (wrapUpData && currentCardIndex < wrapUpData.storyCards.length - 1) {
      translateX.value = withTiming(-SCREEN_WIDTH, { duration: 300 }, () => {
        runOnJS(setCurrentCardIndex)(currentCardIndex + 1);
        translateX.value = SCREEN_WIDTH;
        translateX.value = withTiming(0, { duration: 300 });
      });
    }
  }, [currentCardIndex, wrapUpData, translateX]);

  const handleShare = useCallback(async () => {
    if (!wrapUpData) return;

    try {
      await Share.share({
        message: wrapUpData.shareText,
        title: `My ${wrapUpData.year} with Stryde`,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share your wrap-up. Please try again.');
    }
  }, [wrapUpData]);

  const handleClose = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ProgressRing progress={0.5} animated size="large" label="Loading..." />
        </View>
      </ThemedView>
    );
  }

  if (!wrapUpData) {
    return (
      <ThemedView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={64} color={DesignTokens.textSecondary} />
          <ThemedText variant="h2" style={styles.emptyTitle}>
            No Data Yet
          </ThemedText>
          <ThemedText variant="body" color="secondary" style={styles.emptyText}>
            Keep tracking your activities to see your year-end wrap-up!
          </ThemedText>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <ThemedText variant="bodyBold" style={styles.closeButtonText}>
              Go Back
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  const currentCard = wrapUpData.storyCards[currentCardIndex];

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={DesignTokens.textPrimary} />
        </TouchableOpacity>
        <ThemedText variant="bodyBold">{wrapUpData.year} Wrap-Up</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      {/* Story Cards */}
      <GestureDetector gesture={swipeGesture}>
        <Animated.View style={[styles.cardContainer, cardAnimatedStyle]}>
          <StoryCardComponent
            card={currentCard}
            index={currentCardIndex}
            totalCards={wrapUpData.storyCards.length}
            wrapUpData={wrapUpData}
            onNext={handleNext}
            onShare={handleShare}
          />
        </Animated.View>
      </GestureDetector>

      {/* Navigation hints */}
      <View style={styles.navigationHints}>
        {currentCardIndex > 0 && (
          <View style={styles.navHint}>
            <Ionicons name="chevron-back" size={20} color={DesignTokens.textSecondary} />
            <ThemedText variant="caption" color="secondary">
              Swipe right
            </ThemedText>
          </View>
        )}
        {currentCardIndex < wrapUpData.storyCards.length - 1 && (
          <View style={styles.navHint}>
            <ThemedText variant="caption" color="secondary">
              Swipe left
            </ThemedText>
            <Ionicons name="chevron-forward" size={20} color={DesignTokens.textSecondary} />
          </View>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DesignTokens.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  closeButton: {
    padding: 8,
  },
  headerSpacer: {
    width: 44,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: 24,
  },
  closeButtonText: {
    color: DesignTokens.primary,
  },
  cardContainer: {
    flex: 1,
    padding: CARD_PADDING,
    justifyContent: 'center',
  },
  storyCard: {
    flex: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
    padding: 8,
  },
  cardTitle: {
    marginBottom: 24,
    textAlign: 'center',
  },
  // Intro card styles
  introContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  introTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  introSubtitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  introText: {
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DesignTokens.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
    marginTop: 'auto',
  },
  startButtonText: {
    color: DesignTokens.white,
  },
  // Stats card styles
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statItem: {
    width: '47%',
    alignItems: 'center',
    padding: 16,
    backgroundColor: DesignTokens.surface,
    borderRadius: 12,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${DesignTokens.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    marginBottom: 4,
  },
  // Personality card styles
  personalityBadge: {
    alignSelf: 'center',
    marginVertical: 32,
  },
  personalityIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: DesignTokens.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  personalityName: {
    textAlign: 'center',
    marginBottom: 12,
  },
  personalityDescription: {
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 24,
  },
  // Achievements card styles
  achievementsSubtitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  achievementsList: {
    flex: 1,
  },
  achievementsContent: {
    gap: 12,
    paddingBottom: 16,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  achievementIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${DesignTokens.accent}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementTextContainer: {
    flex: 1,
  },
  // Highlights card styles
  highlightsContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 24,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
  },
  highlightBullet: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: DesignTokens.accent,
  },
  highlightText: {
    flex: 1,
    lineHeight: 24,
  },
  // Comparison card styles
  comparisonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  comparisonItem: {
    width: '47%',
    alignItems: 'center',
    padding: 16,
    backgroundColor: DesignTokens.surface,
    borderRadius: 12,
  },
  comparisonValue: {
    marginBottom: 4,
  },
  improvementsContainer: {
    gap: 12,
  },
  improvementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  improvementText: {
    flex: 1,
  },
  // Share card styles
  shareSubtitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  shareCardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButtonsContainer: {
    marginTop: 16,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DesignTokens.accent,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
  },
  shareButtonText: {
    color: DesignTokens.white,
  },
  // Progress indicator styles
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DesignTokens.border,
  },
  progressDotActive: {
    backgroundColor: DesignTokens.primary,
    width: 24,
  },
  progressDotCompleted: {
    backgroundColor: DesignTokens.primary,
  },
  // Navigation hints
  navigationHints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingBottom: 32,
  },
  navHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
