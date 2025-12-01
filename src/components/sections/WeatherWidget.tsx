'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
  humidity: number;
  location: string;
}

// Historical average for October 31 - you can update this with actual location data
const FALLBACK_WEATHER = {
  temp: 58,
  condition: 'Partly Cloudy',
  humidity: 65,
  location: 'Wedding Venue',
  icon: '⛅',
};

// Weather icons based on condition
const getWeatherIcon = (condition: string): string => {
  const lower = condition.toLowerCase();
  if (lower.includes('sun') || lower.includes('clear')) return '☀️';
  if (lower.includes('cloud') && lower.includes('part')) return '⛅';
  if (lower.includes('cloud')) return '☁️';
  if (lower.includes('rain')) return '🌧️';
  if (lower.includes('thunder')) return '⛈️';
  if (lower.includes('snow')) return '❄️';
  if (lower.includes('fog') || lower.includes('mist')) return '🌫️';
  return '⛅';
};

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [daysUntil, setDaysUntil] = useState<number>(0);

  useEffect(() => {
    // Calculate days until wedding
    const weddingDate = new Date('2027-10-31');
    const today = new Date();
    const diffTime = weddingDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    setDaysUntil(diffDays);

    // Use fallback weather for now
    // In production, you could fetch from a weather API
    setWeather({
      ...FALLBACK_WEATHER,
      icon: getWeatherIcon(FALLBACK_WEATHER.condition),
    });
  }, []);

  if (!weather) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-olive-700 rounded-lg p-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-olive-400 text-sm mb-1">October 31, 2027 Forecast</p>
          <div className="flex items-center gap-3">
            <span className="text-4xl">{weather.icon}</span>
            <div>
              <p className="text-3xl font-heading text-cream">{weather.temp}°F</p>
              <p className="text-olive-300">{weather.condition}</p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-gold-500 font-accent text-2xl">{daysUntil}</p>
          <p className="text-olive-400 text-sm">days to go</p>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-olive-700/50 flex justify-between text-sm">
        <span className="text-olive-400">💧 Humidity: {weather.humidity}%</span>
        <span className="text-olive-400">🎃 Halloween Wedding!</span>
      </div>
      <p className="text-olive-500 text-xs mt-3 italic">
        * Historical average for this date. Actual forecast available closer to the wedding.
      </p>
    </motion.div>
  );
}
