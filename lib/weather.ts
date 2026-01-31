import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// OpenWeatherMap API Configuration
// Note: In a production app, this should be stored securely (e.g., environment variables)
const OPENWEATHER_API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY || 'YOUR_OPENWEATHER_API_KEY';
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Cache configuration
const CACHE_KEY = 'stryde_weather_cache';
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Weather condition codes from OpenWeatherMap
export const WeatherConditions = {
  CLEAR: [800] as number[],
  CLOUDS: [801, 802, 803, 804] as number[],
  RAIN: [500, 501, 502, 503, 504, 511, 520, 521, 522, 531] as number[],
  DRIZZLE: [300, 301, 302, 310, 311, 312, 313, 314, 321] as number[],
  THUNDERSTORM: [200, 201, 202, 210, 211, 212, 221, 230, 231, 232] as number[],
  SNOW: [600, 601, 602, 611, 612, 613, 615, 616, 620, 621, 622] as number[],
  ATMOSPHERE: [701, 711, 721, 731, 741, 751, 761, 762, 771, 781] as number[],
};

// Weather types for UI
export type WeatherType = 
  | 'clear' 
  | 'clouds' 
  | 'rain' 
  | 'drizzle' 
  | 'thunderstorm' 
  | 'snow' 
  | 'atmosphere';

// Weather data interfaces
export interface CurrentWeather {
  temperature: number; // Celsius
  feelsLike: number; // Celsius
  humidity: number; // Percentage
  pressure: number; // hPa
  windSpeed: number; // m/s
  windDeg: number; // Degrees
  condition: string; // Description
  conditionCode: number; // Weather condition code
  weatherType: WeatherType;
  icon: string; // OpenWeatherMap icon code
  sunrise: number; // Unix timestamp
  sunset: number; // Unix timestamp
  visibility: number; // Meters
  uvIndex?: number; // UV index
  timestamp: number;
  location: {
    name: string;
    country: string;
    lat: number;
    lon: number;
  };
}

export interface ForecastItem {
  timestamp: number;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  conditionCode: number;
  weatherType: WeatherType;
  icon: string;
  pop: number; // Probability of precipitation
}

export interface DailyForecast {
  date: string;
  timestamp: number;
  tempMin: number;
  tempMax: number;
  tempDay: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  conditionCode: number;
  weatherType: WeatherType;
  icon: string;
  pop: number;
  rainVolume?: number; // mm
}

export interface WeatherForecast {
  current: CurrentWeather;
  hourly: ForecastItem[];
  daily: DailyForecast[];
  fetchedAt: number;
}

export interface WeatherCache {
  data: WeatherForecast;
  timestamp: number;
  location: {
    lat: number;
    lon: number;
  };
}

// Activity suggestion interface
export interface ActivitySuggestion {
  type: 'great' | 'good' | 'caution' | 'avoid' | 'indoor';
  title: string;
  message: string;
  icon: string;
  hydrationRecommendation?: string;
  clothingRecommendation?: string;
}

// Rain alert interface
export interface RainAlert {
  willRain: boolean;
  timeUntilRain?: number; // Minutes
  intensity?: 'light' | 'moderate' | 'heavy';
  message: string;
}

/**
 * Check if API key is configured
 */
function isApiKeyConfigured(): boolean {
  return OPENWEATHER_API_KEY !== 'YOUR_OPENWEATHER_API_KEY' && 
         OPENWEATHER_API_KEY !== '' &&
         OPENWEATHER_API_KEY !== undefined;
}

/**
 * Get weather type from condition code
 */
function getWeatherType(code: number): WeatherType {
  if (WeatherConditions.CLEAR.includes(code)) return 'clear';
  if (WeatherConditions.CLOUDS.includes(code)) return 'clouds';
  if (WeatherConditions.RAIN.includes(code)) return 'rain';
  if (WeatherConditions.DRIZZLE.includes(code)) return 'drizzle';
  if (WeatherConditions.THUNDERSTORM.includes(code)) return 'thunderstorm';
  if (WeatherConditions.SNOW.includes(code)) return 'snow';
  return 'atmosphere';
}

/**
 * Get icon name for weather condition
 */
export function getWeatherIconName(type: WeatherType, isDay: boolean = true): string {
  const icons: Record<WeatherType, { day: string; night: string }> = {
    clear: { day: 'sunny', night: 'moon' },
    clouds: { day: 'partly-sunny', night: 'cloudy-night' },
    rain: { day: 'rainy', night: 'rainy' },
    drizzle: { day: 'rainy', night: 'rainy' },
    thunderstorm: { day: 'thunderstorm', night: 'thunderstorm' },
    snow: { day: 'snow', night: 'snow' },
    atmosphere: { day: 'cloud', night: 'cloud' },
  };
  return isDay ? icons[type].day : icons[type].night;
}

/**
 * Get Ionicons name for weather (fallback)
 */
export function getWeatherIoniconsName(type: WeatherType): string {
  const icons: Record<WeatherType, string> = {
    clear: 'sunny',
    clouds: 'cloudy',
    rain: 'rainy',
    drizzle: 'rainy',
    thunderstorm: 'thunderstorm',
    snow: 'snow',
    atmosphere: 'cloud',
  };
  return icons[type];
}

/**
 * Check if device is online
 */
async function isOnline(): Promise<boolean> {
  const netInfo = await NetInfo.fetch();
  return netInfo.isConnected === true && netInfo.isInternetReachable !== false;
}

/**
 * Get cached weather data
 */
async function getCachedWeather(): Promise<WeatherCache | null> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const cache: WeatherCache = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is still valid
    if (now - cache.timestamp < CACHE_DURATION_MS) {
      return cache;
    }
    
    return null;
  } catch (error) {
    console.error('Error reading weather cache:', error);
    return null;
  }
}

/**
 * Save weather data to cache
 */
async function saveWeatherCache(cache: WeatherCache): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error saving weather cache:', error);
  }
}

/**
 * Clear weather cache
 */
export async function clearWeatherCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('Error clearing weather cache:', error);
  }
}

/**
 * Fetch current weather from OpenWeatherMap API
 */
async function fetchCurrentWeather(
  lat: number,
  lon: number
): Promise<CurrentWeather | null> {
  // Check if API key is configured
  if (!isApiKeyConfigured()) {
    console.warn('OpenWeatherMap API key not configured. Using mock weather data.');
    return null;
  }

  try {
    const url = `${OPENWEATHER_BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    const response = await fetch(url);
    
    if (!response.ok) {
      // Handle specific error codes
      if (response.status === 401) {
        console.error('Weather API 401: Invalid API key. Please check your OpenWeatherMap API key.');
      } else if (response.status === 429) {
        console.error('Weather API 429: Rate limit exceeded. Please wait before making more requests.');
      } else {
        console.error(`Weather API error: ${response.status}`);
      }
      return null;
    }
    
    const data = await response.json();
    
    return {
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      windSpeed: data.wind?.speed || 0,
      windDeg: data.wind?.deg || 0,
      condition: data.weather[0]?.description || 'unknown',
      conditionCode: data.weather[0]?.id || 800,
      weatherType: getWeatherType(data.weather[0]?.id || 800),
      icon: data.weather[0]?.icon || '01d',
      sunrise: data.sys?.sunrise * 1000,
      sunset: data.sys?.sunset * 1000,
      visibility: data.visibility || 10000,
      timestamp: Date.now(),
      location: {
        name: data.name,
        country: data.sys?.country || '',
        lat: data.coord?.lat || lat,
        lon: data.coord?.lon || lon,
      },
    };
  } catch (error) {
    console.error('Error fetching current weather:', error);
    return null;
  }
}

/**
 * Fetch 5-day forecast from OpenWeatherMap API
 */
async function fetchForecast(
  lat: number,
  lon: number
): Promise<{ hourly: ForecastItem[]; daily: DailyForecast[] } | null> {
  // Check if API key is configured
  if (!isApiKeyConfigured()) {
    console.warn('OpenWeatherMap API key not configured. Using mock forecast data.');
    return null;
  }

  try {
    const url = `${OPENWEATHER_BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    const response = await fetch(url);
    
    if (!response.ok) {
      // Handle specific error codes
      if (response.status === 401) {
        console.error('Forecast API 401: Invalid API key. Please check your OpenWeatherMap API key.');
      } else if (response.status === 429) {
        console.error('Forecast API 429: Rate limit exceeded. Please wait before making more requests.');
      } else {
        console.error(`Forecast API error: ${response.status}`);
      }
      return null;
    }
    
    const data = await response.json();
    
    // Process hourly forecast (API returns 3-hour intervals)
    const hourly: ForecastItem[] = data.list.slice(0, 8).map((item: unknown) => ({
      timestamp: (item as { dt: number }).dt * 1000,
      temperature: Math.round((item as { main: { temp: number } }).main.temp),
      feelsLike: Math.round((item as { main: { feels_like: number } }).main.feels_like),
      humidity: (item as { main: { humidity: number } }).main.humidity,
      windSpeed: (item as { wind: { speed: number } }).wind?.speed || 0,
      condition: (item as { weather: [{ description: string }] }).weather[0]?.description || 'unknown',
      conditionCode: (item as { weather: [{ id: number }] }).weather[0]?.id || 800,
      weatherType: getWeatherType((item as { weather: [{ id: number }] }).weather[0]?.id || 800),
      icon: (item as { weather: [{ icon: string }] }).weather[0]?.icon || '01d',
      pop: Math.round(((item as { pop: number }).pop || 0) * 100),
    }));
    
    // Process daily forecast (aggregate from 3-hour data)
    const dailyMap = new Map<string, {
      temps: number[];
      feelsLike: number[];
      humidity: number[];
      windSpeed: number[];
      conditions: { code: number; desc: string; icon: string; count: number }[];
      pop: number[];
      rain: number[];
      timestamp: number;
    }>();
    
    for (const item of data.list) {
      const date = new Date((item as { dt: number }).dt * 1000);
      const dateKey = date.toISOString().split('T')[0];
      
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          temps: [],
          feelsLike: [],
          humidity: [],
          windSpeed: [],
          conditions: [],
          pop: [],
          rain: [],
          timestamp: (item as { dt: number }).dt * 1000,
        });
      }
      
      const dayData = dailyMap.get(dateKey)!;
      dayData.temps.push((item as { main: { temp: number } }).main.temp);
      dayData.feelsLike.push((item as { main: { feels_like: number } }).main.feels_like);
      dayData.humidity.push((item as { main: { humidity: number } }).main.humidity);
      dayData.windSpeed.push((item as { wind: { speed: number } }).wind?.speed || 0);
      dayData.pop.push(Math.round(((item as { pop: number }).pop || 0) * 100));
      
      if ((item as { rain?: { '3h': number } }).rain?.['3h']) {
        dayData.rain.push((item as { rain: { '3h': number } }).rain['3h']);
      }
      
      // Track condition frequency
      const code = (item as { weather: [{ id: number }] }).weather[0]?.id || 800;
      const desc = (item as { weather: [{ description: string }] }).weather[0]?.description || 'unknown';
      const icon = (item as { weather: [{ icon: string }] }).weather[0]?.icon || '01d';
      
      const existing = dayData.conditions.find(c => c.code === code);
      if (existing) {
        existing.count++;
      } else {
        dayData.conditions.push({ code, desc, icon, count: 1 });
      }
    }
    
    // Convert to daily forecast array
    const daily: DailyForecast[] = Array.from(dailyMap.entries()).slice(0, 5).map(([date, data]) => {
      // Get most frequent condition
      const mainCondition = data.conditions.reduce((prev, current) => 
        prev.count > current.count ? prev : current
      );
      
      return {
        date,
        timestamp: data.timestamp,
        tempMin: Math.round(Math.min(...data.temps)),
        tempMax: Math.round(Math.max(...data.temps)),
        tempDay: Math.round(data.temps.reduce((a, b) => a + b, 0) / data.temps.length),
        humidity: Math.round(data.humidity.reduce((a, b) => a + b, 0) / data.humidity.length),
        windSpeed: Math.round((data.windSpeed.reduce((a, b) => a + b, 0) / data.windSpeed.length) * 10) / 10,
        condition: mainCondition.desc,
        conditionCode: mainCondition.code,
        weatherType: getWeatherType(mainCondition.code),
        icon: mainCondition.icon,
        pop: Math.max(...data.pop),
        rainVolume: data.rain.length > 0 
          ? Math.round(data.rain.reduce((a, b) => a + b, 0) * 10) / 10 
          : undefined,
      };
    });
    
    return { hourly, daily };
  } catch (error) {
    console.error('Error fetching forecast:', error);
    return null;
  }
}

/**
 * Get weather data (from cache or fetch fresh)
 */
export async function getWeather(
  lat: number,
  lon: number,
  forceRefresh: boolean = false
): Promise<WeatherForecast | null> {
  // Check cache first if not forcing refresh
  if (!forceRefresh) {
    const cached = await getCachedWeather();
    if (cached && 
        Math.abs(cached.location.lat - lat) < 0.1 && 
        Math.abs(cached.location.lon - lon) < 0.1) {
      return cached.data;
    }
  }
  
  // Check if online
  const online = await isOnline();
  if (!online) {
    // Return cached data even if expired when offline
    const cached = await getCachedWeather();
    if (cached) {
      return cached.data;
    }
    return null;
  }
  
  // Check if API key is configured before making requests
  if (!isApiKeyConfigured()) {
    console.warn('OpenWeatherMap API key not configured. Returning null to trigger mock data.');
    return null;
  }
  
  // Fetch fresh data
  const [current, forecast] = await Promise.all([
    fetchCurrentWeather(lat, lon),
    fetchForecast(lat, lon),
  ]);
  
  if (!current || !forecast) {
    return null;
  }
  
  const weatherData: WeatherForecast = {
    current,
    hourly: forecast.hourly,
    daily: forecast.daily,
    fetchedAt: Date.now(),
  };
  
  // Save to cache
  await saveWeatherCache({
    data: weatherData,
    timestamp: Date.now(),
    location: { lat, lon },
  });
  
  return weatherData;
}

/**
 * Get activity suggestion based on weather
 */
export function getActivitySuggestion(weather: CurrentWeather): ActivitySuggestion {
  const temp = weather.temperature;
  const type = weather.weatherType;
  const windSpeed = weather.windSpeed;
  
  // Thunderstorm - avoid outdoor
  if (type === 'thunderstorm') {
    return {
      type: 'avoid',
      title: 'Stay Indoors',
      message: 'Thunderstorm detected. It\'s safer to exercise indoors today.',
      icon: 'thunderstorm',
      hydrationRecommendation: 'Stay hydrated even when indoors.',
    };
  }
  
  // Heavy rain - avoid
  if (type === 'rain' && [502, 503, 504, 522].includes(weather.conditionCode)) {
    return {
      type: 'avoid',
      title: 'Heavy Rain',
      message: 'Heavy rain makes outdoor activities unsafe. Consider indoor exercises.',
      icon: 'rainy',
      clothingRecommendation: 'Waterproof jacket if you must go out.',
    };
  }
  
  // Snow - caution
  if (type === 'snow') {
    return {
      type: 'caution',
      title: 'Snowy Conditions',
      message: 'Dress warmly and watch for slippery surfaces. Great for a winter walk!',
      icon: 'snow',
      clothingRecommendation: 'Warm layers, waterproof boots, and gloves.',
      hydrationRecommendation: 'Cold weather can be deceptively dehydrating. Drink water!',
    };
  }
  
  // Extreme heat
  if (temp >= 35) {
    return {
      type: 'caution',
      title: 'Extreme Heat',
      message: 'It\'s very hot outside. Consider early morning or evening activities.',
      icon: 'sunny',
      clothingRecommendation: 'Light, breathable clothing and a hat.',
      hydrationRecommendation: 'Drink extra water! Aim for 500ml before and after.',
    };
  }
  
  // High heat
  if (temp >= 30) {
    return {
      type: 'caution',
      title: 'Hot Weather',
      message: 'Stay hydrated! It\'s warm outside - perfect for a light walk.',
      icon: 'sunny',
      clothingRecommendation: 'Light-colored, loose-fitting clothing.',
      hydrationRecommendation: 'Increase water intake. Drink before you feel thirsty.',
    };
  }
  
  // Cold weather
  if (temp <= 0) {
    return {
      type: 'caution',
      title: 'Freezing Cold',
      message: 'Bundle up! It\'s freezing outside but great for a brisk walk.',
      icon: 'snow',
      clothingRecommendation: 'Multiple layers, hat, gloves, and warm socks.',
      hydrationRecommendation: 'Hydration is important even in cold weather.',
    };
  }
  
  // Cool weather
  if (temp <= 10) {
    return {
      type: 'good',
      title: 'Cool & Crisp',
      message: 'Perfect weather for a brisk walk! Dress warmly.',
      icon: 'partly-sunny',
      clothingRecommendation: 'Jacket or sweater recommended.',
      hydrationRecommendation: 'Remember to hydrate during your walk.',
    };
  }
  
  // Light rain/drizzle
  if (type === 'rain' || type === 'drizzle') {
    return {
      type: 'caution',
      title: 'Light Rain',
      message: 'A light rain won\'t stop you! Great for a refreshing walk.',
      icon: 'rainy',
      clothingRecommendation: 'Water-resistant jacket recommended.',
    };
  }
  
  // Strong winds
  if (windSpeed >= 10) {
    return {
      type: 'caution',
      title: 'Windy Conditions',
      message: 'It\'s windy out there! Hold onto your hat.',
      icon: 'cloudy',
      clothingRecommendation: 'Windbreaker jacket recommended.',
    };
  }
  
  // Perfect conditions
  if (type === 'clear' && temp >= 15 && temp <= 25 && windSpeed < 5) {
    return {
      type: 'great',
      title: 'Perfect Day!',
      message: 'Ideal conditions for outdoor activities. Go for it!',
      icon: 'sunny',
      hydrationRecommendation: 'Don\'t forget to bring water on your walk.',
    };
  }
  
  // Partly cloudy - good
  if (type === 'clouds') {
    return {
      type: 'good',
      title: 'Nice & Cloudy',
      message: 'Comfortable weather for a walk. No harsh sun!',
      icon: 'partly-sunny',
      hydrationRecommendation: 'Bring water for your activity.',
    };
  }
  
  // Default - good
  return {
    type: 'good',
    title: 'Good Conditions',
    message: 'Weather looks fine for outdoor activities.',
    icon: 'sunny',
    hydrationRecommendation: 'Stay hydrated during your walk.',
  };
}

/**
 * Check for rain alert (rain coming in next few hours)
 */
export function getRainAlert(hourly: ForecastItem[]): RainAlert {
  const now = Date.now();
  
  // Find first rain occurrence
  const rainItem = hourly.find(item => 
    item.weatherType === 'rain' || 
    item.weatherType === 'thunderstorm' ||
    item.weatherType === 'drizzle'
  );
  
  if (!rainItem) {
    return { willRain: false, message: 'No rain expected in the next 24 hours.' };
  }
  
  const timeUntilRain = Math.round((rainItem.timestamp - now) / (1000 * 60)); // Minutes
  
  // If rain is more than 4 hours away, don't alert
  if (timeUntilRain > 240) {
    return { willRain: false, message: 'No rain expected soon.' };
  }
  
  // Determine intensity
  let intensity: 'light' | 'moderate' | 'heavy' = 'light';
  if (rainItem.conditionCode >= 502) intensity = 'heavy';
  else if (rainItem.conditionCode >= 500) intensity = 'moderate';
  
  // Format time message
  let timeMessage: string;
  if (timeUntilRain < 60) {
    timeMessage = `in ${timeUntilRain} minutes`;
  } else {
    const hours = Math.floor(timeUntilRain / 60);
    timeMessage = `in ${hours} hour${hours > 1 ? 's' : ''}`;
  }
  
  return {
    willRain: true,
    timeUntilRain,
    intensity,
    message: `${intensity.charAt(0).toUpperCase() + intensity.slice(1)} rain expected ${timeMessage}. Go for a walk now!`,
  };
}

/**
 * Get hydration recommendation based on temperature
 */
export function getHydrationRecommendation(temp: number): string {
  if (temp >= 35) {
    return 'It\'s extremely hot! Drink 500ml before your walk and 250ml every 15 minutes.';
  }
  if (temp >= 30) {
    return 'Hot weather ahead. Drink 400ml before and bring water with you.';
  }
  if (temp >= 25) {
    return 'Warm day! Drink 300ml before your walk and stay hydrated.';
  }
  if (temp <= 0) {
    return 'Cold weather can be dehydrating. Drink water before and after.';
  }
  if (temp <= 10) {
    return 'Cool weather. Drink 250ml before your walk.';
  }
  return 'Moderate temperature. Bring water for your activity.';
}

/**
 * Get suggested activity type based on weather
 */
export function getSuggestedActivityType(weather: CurrentWeather): 'walking' | 'running' | 'indoor' {
  const type = weather.weatherType;
  const temp = weather.temperature;
  
  // Avoid outdoor in severe weather
  if (type === 'thunderstorm' || type === 'snow' || temp >= 38 || temp <= -5) {
    return 'indoor';
  }
  
  // Good for running
  if ((type === 'clear' || type === 'clouds') && temp >= 10 && temp <= 25) {
    return 'running';
  }
  
  // Default to walking
  return 'walking';
}

/**
 * Format temperature with unit
 */
export function formatTemperature(temp: number, unit: 'C' | 'F' = 'C'): string {
  if (unit === 'F') {
    return `${Math.round(temp * 9 / 5 + 32)}°F`;
  }
  return `${temp}°C`;
}

/**
 * Format wind speed
 */
export function formatWindSpeed(speed: number, unit: 'metric' | 'imperial' = 'metric'): string {
  if (unit === 'imperial') {
    return `${Math.round(speed * 2.237)} mph`;
  }
  return `${speed} m/s`;
}

/**
 * Get day name from timestamp
 */
export function getDayName(timestamp: number, short: boolean = false): string {
  const date = new Date(timestamp);
  const days = short 
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

/**
 * Check if it's currently daytime based on sunrise/sunset
 */
export function isDaytime(sunrise: number, sunset: number): boolean {
  const now = Date.now();
  return now >= sunrise && now < sunset;
}

// Mock weather data for development/testing
export const MOCK_WEATHER: WeatherForecast = {
  current: {
    temperature: 22,
    feelsLike: 21,
    humidity: 65,
    pressure: 1013,
    windSpeed: 3.5,
    windDeg: 180,
    condition: 'scattered clouds',
    conditionCode: 802,
    weatherType: 'clouds',
    icon: '03d',
    sunrise: Date.now() - 3600000 * 4,
    sunset: Date.now() + 3600000 * 6,
    visibility: 10000,
    timestamp: Date.now(),
    location: {
      name: 'San Francisco',
      country: 'US',
      lat: 37.7749,
      lon: -122.4194,
    },
  },
  hourly: [
    {
      timestamp: Date.now() + 3600000,
      temperature: 22,
      feelsLike: 21,
      humidity: 65,
      windSpeed: 3.5,
      condition: 'scattered clouds',
      conditionCode: 802,
      weatherType: 'clouds',
      icon: '03d',
      pop: 10,
    },
    {
      timestamp: Date.now() + 7200000,
      temperature: 21,
      feelsLike: 20,
      humidity: 70,
      windSpeed: 4.0,
      condition: 'light rain',
      conditionCode: 500,
      weatherType: 'rain',
      icon: '10d',
      pop: 60,
    },
  ],
  daily: [
    {
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
      tempMin: 15,
      tempMax: 24,
      tempDay: 20,
      humidity: 65,
      windSpeed: 3.5,
      condition: 'scattered clouds',
      conditionCode: 802,
      weatherType: 'clouds',
      icon: '03d',
      pop: 20,
    },
    {
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      timestamp: Date.now() + 86400000,
      tempMin: 14,
      tempMax: 22,
      tempDay: 18,
      humidity: 75,
      windSpeed: 4.2,
      condition: 'light rain',
      conditionCode: 500,
      weatherType: 'rain',
      icon: '10d',
      pop: 70,
      rainVolume: 2.5,
    },
  ],
  fetchedAt: Date.now(),
};

/**
 * Get mock weather data (for development)
 */
export function getMockWeather(): WeatherForecast {
  return MOCK_WEATHER;
}
