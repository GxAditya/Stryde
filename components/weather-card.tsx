import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';

import { DesignTokens } from '@/constants/theme';
import {
  DailyForecast,
  formatTemperature,
  getActivitySuggestion,
  getDayName,
  getRainAlert,
  getWeatherIoniconsName,
  isDaytime,
  WeatherForecast,
} from '@/lib/weather';
import { Card } from './card';
import { ThemedText } from './themed-text';

interface WeatherCardProps {
  weather: WeatherForecast | null;
  onPress?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  compact?: boolean;
  showForecast?: boolean;
}

interface WeatherIconProps {
  type: string;
  size?: number;
  isDay?: boolean;
}

const WeatherIcon = memo(function WeatherIcon({ type, size = 32, isDay = true }: WeatherIconProps) {
  const iconName = getWeatherIoniconsName(type as Parameters<typeof getWeatherIoniconsName>[0]);
  
  // Map to available Ionicons
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    'sunny': isDay ? 'sunny' : 'moon',
    'partly-sunny': isDay ? 'partly-sunny' : 'cloudy-night',
    'cloudy': 'cloudy',
    'cloud': 'cloud',
    'rainy': 'rainy',
    'thunderstorm': 'thunderstorm',
    'snow': 'snow',
  };
  
  const mappedIcon = iconMap[iconName] || 'cloud';
  
  // Get color based on weather type
  const getIconColor = () => {
    switch (type) {
      case 'clear':
        return isDay ? '#F59E0B' : '#9CA3AF'; // Yellow for sun, gray for moon
      case 'clouds':
        return '#9CA3AF';
      case 'rain':
      case 'drizzle':
        return '#3B82F6';
      case 'thunderstorm':
        return '#8B5CF6';
      case 'snow':
        return '#60A5FA';
      default:
        return '#9CA3AF';
    }
  };

  return (
    <Ionicons 
      name={mappedIcon} 
      size={size} 
      color={getIconColor()} 
    />
  );
});

interface MiniForecastItemProps {
  forecast: DailyForecast;
  index: number;
}

const MiniForecastItem = memo(function MiniForecastItem({ forecast, index }: MiniForecastItemProps) {
  const isToday = index === 0;
  
  return (
    <View style={styles.forecastItem}>
      <ThemedText variant="micro" color="secondary">
        {isToday ? 'Today' : getDayName(forecast.timestamp, true)}
      </ThemedText>
      <WeatherIcon 
        type={forecast.weatherType} 
        size={20} 
      />
      <ThemedText variant="caption">
        {formatTemperature(forecast.tempMax)}
      </ThemedText>
      <ThemedText variant="micro" color="secondary">
        {formatTemperature(forecast.tempMin)}
      </ThemedText>
    </View>
  );
});

export function WeatherCard({
  weather,
  onPress,
  onRefresh,
  isLoading = false,
  compact = false,
  showForecast = true,
}: WeatherCardProps) {
  if (!weather) {
    const containerStyle: ViewStyle = compact
      ? { ...styles.container, ...styles.compact }
      : styles.container;
    return (
      <Card style={containerStyle}>
        <View style={styles.loadingContainer}>
          <Ionicons 
            name="cloud-offline" 
            size={32} 
            color={DesignTokens.textSecondary} 
          />
          <ThemedText variant="body" color="secondary" style={styles.loadingText}>
            Weather data unavailable
          </ThemedText>
          {onRefresh && (
            <Pressable 
              onPress={onRefresh} 
              style={styles.refreshButton}
              accessibilityLabel="Refresh weather data"
              accessibilityRole="button"
            >
              <ThemedText variant="caption" color="primary">
                Try Again
              </ThemedText>
            </Pressable>
          )}
        </View>
      </Card>
    );
  }

  const { current, daily } = weather;
  const suggestion = getActivitySuggestion(current);
  const rainAlert = getRainAlert(weather.hourly);
  const isDay = isDaytime(current.sunrise, current.sunset);

  // Get suggestion color
  const getSuggestionColor = () => {
    switch (suggestion.type) {
      case 'great':
        return DesignTokens.accent;
      case 'good':
        return DesignTokens.primary;
      case 'caution':
        return DesignTokens.warning;
      case 'avoid':
      case 'indoor':
        return DesignTokens.error;
      default:
        return DesignTokens.textSecondary;
    }
  };

  // Get suggestion icon
  const getSuggestionIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (suggestion.type) {
      case 'great':
        return 'checkmark-circle';
      case 'good':
        return 'thumbs-up';
      case 'caution':
        return 'warning';
      case 'avoid':
      case 'indoor':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  if (compact) {
    const compactContainerStyle: ViewStyle = { ...styles.container, ...styles.compact };
    return (
      <Pressable 
        onPress={onPress} 
        style={compactContainerStyle}
        accessibilityLabel={`Weather for ${current.location.name}, ${formatTemperature(current.temperature)}, ${current.condition}`}
        accessibilityRole="button"
      >
        <Card style={compactContainerStyle}>
          <View style={styles.compactContent}>
            <View style={styles.compactMain}>
              <WeatherIcon type={current.weatherType} size={28} isDay={isDay} />
              <View style={styles.compactTemp}>
                <ThemedText variant="h2">
                  {formatTemperature(current.temperature)}
                </ThemedText>
                <ThemedText variant="micro" color="secondary" style={styles.capitalize}>
                  {current.condition}
                </ThemedText>
              </View>
            </View>
            {rainAlert.willRain && (
              <View style={styles.rainAlertCompact}>
                <Ionicons name="rainy" size={16} color={DesignTokens.primary} />
                <ThemedText variant="micro" color="primary">
                  Rain soon
                </ThemedText>
              </View>
            )}
          </View>
        </Card>
      </Pressable>
    );
  }

  return (
    <Card style={styles.container}>
      {/* Header with location and refresh */}
      <View style={styles.header}>
        <View style={styles.locationRow}>
          <Ionicons 
            name="location" 
            size={16} 
            color={DesignTokens.textSecondary} 
          />
          <ThemedText variant="caption" color="secondary">
            {current.location.name}
          </ThemedText>
        </View>
        {onRefresh && (
          <Pressable 
            onPress={onRefresh} 
            disabled={isLoading}
            style={styles.refreshButton}
            accessibilityLabel="Refresh weather data"
            accessibilityRole="button"
            accessibilityState={{ disabled: isLoading }}
          >
            <Ionicons 
              name="refresh" 
              size={18} 
              color={isLoading ? DesignTokens.textSecondary : DesignTokens.primary}
              style={isLoading ? [styles.rotating, { transform: [{ rotate: '360deg' }] }] : undefined}
            />
          </Pressable>
        )}
      </View>

      {/* Main weather display */}
      <View style={styles.mainWeather}>
        <View style={styles.weatherIconContainer}>
          <WeatherIcon type={current.weatherType} size={64} isDay={isDay} />
        </View>
        <View style={styles.temperatureContainer}>
          <ThemedText variant="display">
            {formatTemperature(current.temperature)}
          </ThemedText>
          <ThemedText variant="body" color="secondary" style={styles.capitalize}>
            {current.condition}
          </ThemedText>
          <ThemedText variant="caption" color="secondary">
            Feels like {formatTemperature(current.feelsLike)}
          </ThemedText>
        </View>
      </View>

      {/* Weather details */}
      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Ionicons name="water" size={16} color={DesignTokens.textSecondary} />
          <ThemedText variant="caption" color="secondary">
            {current.humidity}%
          </ThemedText>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="speedometer" size={16} color={DesignTokens.textSecondary} />
          <ThemedText variant="caption" color="secondary">
            {current.windSpeed} m/s
          </ThemedText>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="eye" size={16} color={DesignTokens.textSecondary} />
          <ThemedText variant="caption" color="secondary">
            {(current.visibility / 1000).toFixed(1)} km
          </ThemedText>
        </View>
      </View>

      {/* Rain alert */}
      {rainAlert.willRain && (
        <View style={styles.rainAlertContainer}>
          <Ionicons name="umbrella" size={20} color={DesignTokens.primary} />
          <View style={styles.rainAlertText}>
            <ThemedText variant="bodyBold" color="primary">
              Walk before it rains!
            </ThemedText>
            <ThemedText variant="caption" color="secondary">
              {rainAlert.message}
            </ThemedText>
          </View>
        </View>
      )}

      {/* Activity suggestion */}
      <View style={[styles.suggestionContainer, { borderLeftColor: getSuggestionColor() }]}>
        <View style={styles.suggestionHeader}>
          <Ionicons 
            name={getSuggestionIcon()} 
            size={20} 
            color={getSuggestionColor()} 
          />
          <ThemedText variant="bodyBold" style={{ color: getSuggestionColor() }}>
            {suggestion.title}
          </ThemedText>
        </View>
        <ThemedText variant="caption" color="secondary" style={styles.suggestionMessage}>
          {suggestion.message}
        </ThemedText>
        
        {/* Hydration recommendation */}
        {suggestion.hydrationRecommendation && (
          <View style={styles.hydrationRow}>
            <Ionicons name="water" size={14} color={DesignTokens.primary} />
            <ThemedText variant="micro" color="primary">
              {suggestion.hydrationRecommendation}
            </ThemedText>
          </View>
        )}
        
        {/* Clothing recommendation */}
        {suggestion.clothingRecommendation && (
          <View style={styles.clothingRow}>
            <Ionicons name="shirt" size={14} color={DesignTokens.textSecondary} />
            <ThemedText variant="micro" color="secondary">
              {suggestion.clothingRecommendation}
            </ThemedText>
          </View>
        )}
      </View>

      {/* 5-day forecast */}
      {showForecast && daily.length > 0 && (
        <View style={styles.forecastContainer}>
          <ThemedText variant="caption" color="secondary" style={styles.forecastTitle}>
            5-Day Forecast
          </ThemedText>
          <View style={styles.forecastRow}>
            {daily.slice(0, 5).map((day, index) => (
              <MiniForecastItem key={day.date} forecast={day} index={index} />
            ))}
          </View>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  compact: {
    padding: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    marginTop: 8,
    marginBottom: 12,
  },
  refreshButton: {
    padding: 4,
  },
  rotating: {
    opacity: 0.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mainWeather: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  weatherIconContainer: {
    marginRight: 16,
  },
  temperatureContainer: {
    flex: 1,
  },
  capitalize: {
    textTransform: 'capitalize',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: DesignTokens.border,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rainAlertContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${DesignTokens.primary}15`,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  rainAlertCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${DesignTokens.primary}15`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rainAlertText: {
    marginLeft: 12,
    flex: 1,
  },
  suggestionContainer: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    marginBottom: 16,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  suggestionMessage: {
    marginBottom: 8,
  },
  hydrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  clothingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  forecastContainer: {
    borderTopWidth: 1,
    borderColor: DesignTokens.border,
    paddingTop: 16,
  },
  forecastTitle: {
    marginBottom: 12,
  },
  forecastRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  forecastItem: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  compactContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  compactTemp: {
    justifyContent: 'center',
  },
});

export default WeatherCard;
