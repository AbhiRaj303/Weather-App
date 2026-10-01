# AETHER METEO // Meteorological Intelligence & Radar

A next-generation weather and atmospheric intelligence application built with React, Vite, Tailwind CSS, and Zustand, powered by live Open-Meteo forecast and geocoding APIs.

## 🌤️ Core Features
- **Dynamic Daylight & Twilight Sky Gradients**: Adaptive color temperature shifting automatically with local city day/night phases.
- **Glassmorphic Meteorological Dashboard**: Live humidity, wind vectors, UV index, air quality (AQI), atmospheric pressure, and visibility metrics.
- **24-Hour Synoptic Curve**: Hourly forecast timeline with precipitation probability and temperature trends.
- **7-Day Extended Forecast**: Daily high/low temperature distribution bars and weather condition indicators.
- **Severe Weather Alert Broadcasts**: Automated telemetry banners for coastal gale warnings and extreme heat advisories.
- **Interactive High-Resolution Radar Simulation**: Multi-layer radar scanner (Precipitation, Cloud Mass, Wind Vectors) with play/pause satellite loops.
- **Personalized Lifestyle Recommendations**: Actionable daily advice based on UV index, wind speed, and rain probability.
- **Dual Unit Conversion**: Instant °C / °F temperature toggling across all dashboards.

## 🚀 Quickstart
```bash
npm install
npm run dev
```

## 🎨 Design System
- **Palette**: Atmospheric sky-blue to twilight indigo gradients, rounded frosted glass widgets (`backdrop-blur-md`).
- **Typography**: Plus Jakarta Sans & JetBrains Mono for coordinates and telemetry.


## Live API integration

This version uses Open-Meteo directly from the browser:
- Geocoding API for city search
- Forecast API for current, hourly and 7-day weather
- Air Quality API for European AQI
- Loading, timeout and error states
- No API key is required for Open-Meteo

The radar panel remains a visual UI simulation; it is not a live radar feed.
