import { create } from 'zustand';

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

const WEATHER_CODES = {
  0: ['Clear sky', 'Sun'],
  1: ['Mainly clear', 'Sun'],
  2: ['Partly cloudy', 'CloudSun'],
  3: ['Overcast', 'Cloud'],
  45: ['Fog', 'Cloud'],
  48: ['Depositing rime fog', 'Cloud'],
  51: ['Light drizzle', 'CloudRain'],
  53: ['Moderate drizzle', 'CloudRain'],
  55: ['Dense drizzle', 'CloudRain'],
  56: ['Light freezing drizzle', 'CloudRain'],
  57: ['Dense freezing drizzle', 'CloudRain'],
  61: ['Slight rain', 'CloudRain'],
  63: ['Moderate rain', 'CloudRain'],
  65: ['Heavy rain', 'CloudRain'],
  66: ['Light freezing rain', 'CloudRain'],
  67: ['Heavy freezing rain', 'CloudRain'],
  71: ['Slight snow', 'CloudRain'],
  73: ['Moderate snow', 'CloudRain'],
  75: ['Heavy snow', 'CloudRain'],
  77: ['Snow grains', 'CloudRain'],
  80: ['Slight rain showers', 'CloudRain'],
  81: ['Moderate rain showers', 'CloudRain'],
  82: ['Violent rain showers', 'CloudRain'],
  85: ['Slight snow showers', 'CloudRain'],
  86: ['Heavy snow showers', 'CloudRain'],
  95: ['Thunderstorm', 'CloudRain'],
  96: ['Thunderstorm with hail', 'CloudRain'],
  99: ['Thunderstorm with heavy hail', 'CloudRain']
};

const getWeatherInfo = (code) => WEATHER_CODES[code] || ['Unknown conditions', 'Cloud'];

const getWindDirection = (degrees) => {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return directions[Math.round(degrees / 22.5) % 16];
};

const getDayName = (dateString, index) => {
  if (index === 0) return 'Today';
  return new Date(`${dateString}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' });
};

const buildTips = ({ current, daily }) => {
  const tips = [];
  const rainChance = daily.precipitation_probability_max?.[0] ?? 0;
  const uv = daily.uv_index_max?.[0] ?? 0;
  const wind = current.wind_speed_10m ?? 0;
  const feels = current.apparent_temperature ?? current.temperature_2m ?? 0;

  if (rainChance >= 50) tips.push(`Rain probability is ${Math.round(rainChance)}% today — keep an umbrella nearby.`);
  else if (rainChance >= 20) tips.push(`There is a ${Math.round(rainChance)}% chance of precipitation today.`);
  else tips.push('Low precipitation probability today — outdoor plans look relatively dry.');

  if (uv >= 6) tips.push(`UV index may reach ${uv.toFixed(1)} — sun protection is recommended during peak hours.`);
  else if (uv >= 3) tips.push(`UV index may reach ${uv.toFixed(1)} — consider sunscreen during prolonged outdoor exposure.`);
  else tips.push('UV levels are currently low to moderate.');

  if (wind >= 30) tips.push(`Wind speeds around ${Math.round(wind)} km/h may make conditions feel breezy.`);
  else if (feels < 12) tips.push('Cool apparent temperatures — a light jacket or warm layer may be useful.');
  else if (feels > 30) tips.push('Warm apparent temperatures — stay hydrated and take breaks from direct sun.');

  return tips.slice(0, 3);
};

const mapAirQuality = (value) => {
  if (value == null) return 'N/A';
  if (value <= 20) return `${Math.round(value)} (Good)`;
  if (value <= 40) return `${Math.round(value)} (Fair)`;
  if (value <= 60) return `${Math.round(value)} (Moderate)`;
  if (value <= 80) return `${Math.round(value)} (Poor)`;
  return `${Math.round(value)} (Very Poor)`;
};

const fetchAirQuality = async (latitude, longitude, signal) => {
  const params = new URLSearchParams({
    latitude,
    longitude,
    current: 'european_aqi,pm2_5,pm10',
    timezone: 'auto'
  });
  const response = await fetch(`${AIR_QUALITY_URL}?${params}`, { signal });
  if (!response.ok) throw new Error(`Air quality request failed (${response.status})`);
  return response.json();
};

const fetchWeather = async (location, signal) => {
  const params = new URLSearchParams({
    latitude: location.latitude,
    longitude: location.longitude,
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl,is_day,visibility',
    hourly: 'temperature_2m,precipitation_probability,weather_code,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,wind_speed_10m_max,sunrise,sunset',
    forecast_days: '7',
    timezone: 'auto',
    wind_speed_unit: 'kmh'
  });

  const [weatherResponse, airQualityResponse] = await Promise.all([
    fetch(`${FORECAST_URL}?${params}`, { signal }),
    fetchAirQuality(location.latitude, location.longitude, signal).catch(() => null)
  ]);

  if (!weatherResponse.ok) throw new Error(`Weather request failed (${weatherResponse.status})`);
  const data = await weatherResponse.json();
  const airQuality = airQualityResponse?.current;
  const [condition, icon] = getWeatherInfo(data.current.weather_code);
  const now = new Date();
  const hourlyStart = data.hourly.time.findIndex((time) => new Date(time) >= now);
  const start = hourlyStart >= 0 ? hourlyStart : 0;
  const hourly = data.hourly.time.slice(start, start + 24).map((time, index) => ({
    time: new Date(time).toLocaleTimeString([], { hour: 'numeric' }),
    tempC: data.hourly.temperature_2m[start + index],
    pop: `${Math.round(data.hourly.precipitation_probability[start + index] ?? 0)}%`,
    code: data.hourly.weather_code[start + index]
  }));

  const sevenDay = data.daily.time.map((date, index) => {
    const [dayCondition] = getWeatherInfo(data.daily.weather_code[index]);
    return {
      day: getDayName(date, index),
      highC: data.daily.temperature_2m_max[index],
      lowC: data.daily.temperature_2m_min[index],
      condition: dayCondition,
      pop: `${Math.round(data.daily.precipitation_probability_max[index] ?? 0)}%`
    };
  });

  return {
    id: location.id,
    city: location.name,
    country: location.country || location.country_code || '',
    coords: `${Number(location.latitude).toFixed(4)}° ${location.latitude >= 0 ? 'N' : 'S'}, ${Math.abs(Number(location.longitude)).toFixed(4)}° ${location.longitude >= 0 ? 'E' : 'W'}`,
    latitude: location.latitude,
    longitude: location.longitude,
    timeOfDay: data.current.is_day ? 'Daylight' : 'Night',
    currentTempC: data.current.temperature_2m,
    condition,
    icon,
    feelsLikeC: data.current.apparent_temperature,
    humidity: `${Math.round(data.current.relative_humidity_2m)}%`,
    windSpeed: `${Math.round(data.current.wind_speed_10m)} km/h ${getWindDirection(data.current.wind_direction_10m)}`,
    uvIndex: `${(data.daily.uv_index_max?.[0] ?? 0).toFixed(1)}`,
    aqi: mapAirQuality(airQuality?.european_aqi),
    visibility: `${Math.round((data.current.visibility ?? 0) / 1000)} km`,
    pressure: `${Math.round(data.current.pressure_msl)} hPa`,
    tips: buildTips({ current: data.current, daily: data.daily }),
    severeAlert: null,
    hourly,
    sevenDay,
    sunrise: data.daily.sunrise?.[0],
    sunset: data.daily.sunset?.[0],
    lastUpdated: data.current.time
  };
};

export const useStore = create((set, get) => ({
  unit: 'C',
  toggleUnit: () => set((state) => ({ unit: state.unit === 'C' ? 'F' : 'C' })),

  activeLocationId: null,
  locations: [],
  searchResults: [],
  loading: false,
  searchLoading: false,
  error: null,
  searchError: null,
  lastUpdated: null,

  setActiveLocationId: (id) => set({ activeLocationId: id }),

  searchCities: async (query) => {
    const trimmed = query.trim();
    if (!trimmed) {
      set({ searchResults: [], searchError: null });
      return;
    }

    set({ searchLoading: true, searchError: null });
    try {
      const params = new URLSearchParams({ name: trimmed, count: '6', language: 'en', format: 'json' });
      const response = await fetch(`${GEOCODING_URL}?${params}`);
      if (!response.ok) throw new Error(`Location search failed (${response.status})`);
      const data = await response.json();
      set({
        searchResults: (data.results || []).map((item) => ({
          ...item,
          id: `search-${item.id}`
        })),
        searchError: data.results?.length ? null : 'No matching cities found.'
      });
    } catch (error) {
      if (error.name !== 'AbortError') set({ searchResults: [], searchError: error.message || 'Unable to search for that city.' });
    } finally {
      set({ searchLoading: false });
    }
  },

  loadLocation: async (location) => {
    set({ loading: true, error: null, searchResults: [] });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const weather = await fetchWeather(location, controller.signal);
      set((state) => ({
        locations: [weather, ...state.locations.filter((item) => item.id !== weather.id)],
        activeLocationId: weather.id,
        lastUpdated: weather.lastUpdated,
        error: null
      }));
    } catch (error) {
      set({ error: error.name === 'AbortError' ? 'The weather request timed out. Please try again.' : (error.message || 'Unable to load weather data.') });
    } finally {
      clearTimeout(timeout);
      set({ loading: false });
    }
  },

  convertTemp: (tempC) => {
    if (tempC == null) return '--';
    const unit = get().unit;
    if (unit === 'F') return Math.round((tempC * 9) / 5 + 32);
    return Math.round(tempC);
  }
}));
