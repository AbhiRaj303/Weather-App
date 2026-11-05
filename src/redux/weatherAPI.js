
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

const WEATHER_CODES = {
  0: ['Clear sky', 'Sun'],
  1: ['Mainly clear', 'Sun'],
  2: ['Partly cloudy', 'Cloud'],
  3: ['Overcast', 'Cloud'],
  45: ['Fog', 'CloudFog'],
  48: ['Depositing rime fog', 'CloudFog'],
  51: ['Light drizzle', 'CloudDrizzle'],
  53: ['Moderate drizzle', 'CloudDrizzle'],
  55: ['Dense drizzle', 'CloudDrizzle'],
  61: ['Slight rain', 'CloudRain'],
  63: ['Moderate rain', 'CloudRain'],
  65: ['Heavy rain', 'CloudRain'],
  71: ['Slight snow', 'CloudSnow'],
  73: ['Moderate snow', 'CloudSnow'],
  75: ['Heavy snow', 'CloudSnow'],
  80: ['Rain showers', 'CloudRain'],
  81: ['Moderate rain showers', 'CloudRain'],
  82: ['Violent rain showers', 'CloudRain'],
  95: ['Thunderstorm', 'CloudLightning'],
  96: ['Thunderstorm with hail', 'CloudLightning'],
  99: ['Heavy thunderstorm with hail', 'CloudLightning']
};

const getWeatherInfo = (code) =>
  WEATHER_CODES[code] || ['Unknown', 'Cloud'];

const getWindDirection = (degrees) => {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return directions[Math.round(degrees / 45) % 8];
};

const getDayName = (dateString, index) => {
  if (index === 0) return 'Today';
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short'
  });
};

const buildTips = (temp, humidity, uv, wind) => {
  const tips = [];

  if (temp >= 35) tips.push('Stay hydrated and avoid direct sunlight.');
  else if (temp <= 10) tips.push('Wear warm clothes when going outside.');
  else tips.push('Enjoy the pleasant weather today.');

  if (humidity >= 70) tips.push('High humidity. Stay cool and comfortable.');
  if (uv >= 6) tips.push('High UV levels. Use sunscreen outdoors.');
  if (wind >= 30) tips.push('Strong winds expected. Be careful outdoors.');

  return tips;
};

const mapAirQuality = (value) => {
  if (value == null) return 'Unknown';
  if (value <= 20) return 'Good';
  if (value <= 40) return 'Fair';
  if (value <= 60) return 'Moderate';
  if (value <= 80) return 'Poor';
  if (value <= 100) return 'Very Poor';
  return 'Extremely Poor';
};

const fetchAirQuality = async (latitude, longitude, signal) => {
  try {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      current: 'european_aqi'
    });

    const response = await fetch(`${AIR_QUALITY_URL}?${params}`, { signal });

    if (!response.ok) throw new Error('Air quality data unavailable');

    const data = await response.json();
    return data.current?.european_aqi ?? null;
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    return null;
  }
};

export const fetchWeather = async (location, signal) => {
  const { latitude, longitude } = location;

  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'is_day',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m',
      'surface_pressure'
    ].join(','),
    hourly: [
      'temperature_2m',
      'relative_humidity_2m',
      'precipitation_probability',
      'weather_code',
      'wind_speed_10m'
    ].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'sunrise',
      'sunset',
      'uv_index_max'
    ].join(','),
    timezone: 'auto',
    forecast_days: '7'
  });

  const response = await fetch(`${FORECAST_URL}?${params}`, { signal });

  if (!response.ok) {
    throw new Error('Unable to fetch weather data');
  }

  const data = await response.json();

  const current = data.current;
  const hourly = data.hourly;
  const daily = data.daily;

  const aqi = await fetchAirQuality(latitude, longitude, signal);

  const [condition, icon] = getWeatherInfo(current.weather_code);

  const hourlyData = hourly.time.slice(0, 24).map((time, index) => {
    const [hourCondition, hourIcon] = getWeatherInfo(hourly.weather_code[index]);

    return {
      time: new Date(time).toLocaleTimeString('en-US', {
        hour: 'numeric',
        hour12: true
      }),
      tempC: hourly.temperature_2m[index],
      humidity: hourly.relative_humidity_2m[index],
      pop: hourly.precipitation_probability[index],
      wind: hourly.wind_speed_10m[index],
      condition: hourCondition,
      icon: hourIcon
    };
  });

  const sevenDay = daily.time.map((date, index) => {
    const [dayCondition, dayIcon] = getWeatherInfo(daily.weather_code[index]);

    return {
      day: getDayName(date, index),
      date,
      condition: dayCondition,
      icon: dayIcon,
      highC: daily.temperature_2m_max[index],
      lowC: daily.temperature_2m_min[index],
      uv: daily.uv_index_max[index]
    };
  });

  return {
    id: location.id,
    city: location.name,
    country: location.country || '',
    coords: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
    latitude,
    longitude,
    timeOfDay: current.is_day ? 'Daylight' : 'Night',

    currentTempC: current.temperature_2m,
    condition,
    icon,
    feelsLikeC: current.apparent_temperature,
    humidity: current.relative_humidity_2m,
    windSpeed: current.wind_speed_10m,
    windDirection: getWindDirection(current.wind_direction_10m),
    uvIndex: daily.uv_index_max[0],
    aqi: aqi == null ? 'N/A' : mapAirQuality(aqi),
    visibility: 'N/A',
    pressure: current.surface_pressure,

    tips: buildTips(
      current.temperature_2m,
      current.relative_humidity_2m,
      daily.uv_index_max[0],
      current.wind_speed_10m
    ),

    severeAlert: null,
    hourly: hourlyData,
    sevenDay,
    sunrise: daily.sunrise[0],
    sunset: daily.sunset[0],
    lastUpdated: new Date().toISOString()
  };
};

export const searchCitiesApi = async (query) => {
  const params = new URLSearchParams({
    name: query.trim(),
    count: '6',
    language: 'en',
    format: 'json'
  });

  const response = await fetch(`${GEOCODING_URL}?${params}`);

  if (!response.ok) {
    throw new Error('Location search failed');
  }

  const data = await response.json();

  return (data.results || []).map((item) => ({
    ...item,
    id: `search-${item.id}`
  }));
};
