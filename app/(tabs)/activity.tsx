import React from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, DesignTokens } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

// Workout types with their details - ALL using theme color
const workoutTypes = [
  {
    id: 'walking',
    title: 'Walking',
    icon: 'directions-walk',
    description: 'Track your daily walks',
    calories: '~200/hour',
    route: '/walking',
  },
  {
    id: 'running',
    title: 'Running',
    icon: 'directions-run',
    description: 'Track your runs and jogs',
    calories: '~500/hour',
    route: '/running',
  },
  {
    id: 'cycling',
    title: 'Cycling',
    icon: 'directions-bike',
    description: 'Track your bike rides',
    calories: '~400/hour',
    route: '/cycling',
  },
  {
    id: 'hiking',
    title: 'Hiking',
    icon: 'terrain',
    description: 'Track your outdoor hikes',
    calories: '~350/hour',
    route: '/hiking',
  },
  {
    id: 'yoga',
    title: 'Yoga',
    icon: 'self-improvement',
    description: 'Mindful yoga sessions',
    calories: '~150/hour',
    route: '/yoga',
  },
  {
    id: 'strength',
    title: 'Strength Training',
    icon: 'fitness-center',
    description: 'Weight lifting & resistance',
    calories: '~300/hour',
    route: '/strength-training',
  },
  {
    id: 'swimming',
    title: 'Swimming',
    icon: 'pool',
    description: 'Track your swim workouts',
    calories: '~450/hour',
    route: '/swimming',
  },
  {
    id: 'dance',
    title: 'Dance',
    icon: 'music-note',
    description: 'Dance and cardio workouts',
    calories: '~250/hour',
    route: '/dance',
  },
];

export default function ActivityScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const handleWorkoutPress = (route: string) => {
    router.push(route as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Choose Workout</Text>
        <Text style={[styles.headerSubtitle, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>
          Select an activity to get started
        </Text>
      </View>

      {/* Workout Grid */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {workoutTypes.map((workout) => (
            <Pressable
              key={workout.id}
              style={({ pressed }) => [
                styles.workoutCard,
                {
                  backgroundColor: isDark ? DesignTokens.surface : colors.white,
                  borderColor: isDark ? DesignTokens.border : colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              onPress={() => handleWorkoutPress(workout.route)}
            >
              {/* Icon */}
              <View style={[styles.iconContainer, { backgroundColor: `${DesignTokens.primary}20` }]}>
                <MaterialIcons name={workout.icon as any} size={32} color={DesignTokens.primary} />
              </View>

              {/* Content */}
              <Text style={[styles.workoutTitle, { color: colors.text }]}>{workout.title}</Text>
              <Text style={[styles.workoutDescription, { color: isDark ? DesignTokens.textSecondary : '#64748b' }]}>
                {workout.description}
              </Text>

              {/* Stats */}
              <View style={styles.statsContainer}>
                <View style={styles.stat}>
                  <MaterialIcons name="local-fire-department" size={16} color={DesignTokens.primary} />
                  <Text style={[styles.statText, { color: DesignTokens.primary }]}>{workout.calories}</Text>
                </View>
              </View>

              {/* Arrow */}
              <View style={styles.arrowContainer}>
                <MaterialIcons name="arrow-forward" size={20} color={DesignTokens.primary} />
              </View>
            </Pressable>
          ))}
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  workoutCard: {
    width: (width - 48) / 2,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    position: 'relative',
    minHeight: 200,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  workoutTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  workoutDescription: {
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  statsContainer: {
    marginTop: 'auto',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
  },
  arrowContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
});
