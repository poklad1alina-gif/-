/**
 * Клиент для Open-Meteo API: геокодинг + прогноз погоды.
 * Ключ доступа не требуется.
 */
import { AppError } from './utils.js';

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Выполняет fetch с таймаутом и единообразной обработкой сетевых ошибок.
 */
async function fetchJson(url, { city }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new AppError(`[${city}] Превышено время ожидания ответа от сервера погоды.`);
    }
    throw new AppError(`[${city}] Не удалось подключиться к сервису погоды. Проверьте подключение к интернету.`);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    let details = '';
    try {
      const body = await response.json();
      if (body && body.reason) details = `: ${body.reason}`;
    } catch {
      // тело ответа не JSON — игнорируем
    }
    throw new AppError(`[${city}] Ошибка API (HTTP ${response.status})${details}`);
  }

  try {
    return await response.json();
  } catch {
    throw new AppError(`[${city}] Сервер вернул некорректный JSON.`);
  }
}

/**
 * Получает координаты и метаданные города по названию.
 * Возвращает { name, country, latitude, longitude }.
 */
export async function geocodeCity(city) {
  const url = `${GEOCODING_URL}?name=${encodeURIComponent(city)}&count=1&language=ru&format=json`;
  const data = await fetchJson(url, { city });

  if (!data.results || data.results.length === 0) {
    throw new AppError(`[${city}] Город не найден. Проверьте правильность названия.`);
  }

  const result = data.results[0];
  return {
    name: result.name,
    country: result.country || 'неизвестно',
    latitude: result.latitude,
    longitude: result.longitude,
  };
}

/**
 * Получает прогноз погоды по координатам на заданное число дней.
 * Возвращает массив { date, tempMin, tempMax, precipitation }.
 */
export async function getForecast({ city, latitude, longitude, days }) {
  const url =
    `${FORECAST_URL}?latitude=${latitude}&longitude=${longitude}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum` +
    `&forecast_days=${days}&timezone=auto`;

  const data = await fetchJson(url, { city });

  if (!data.daily || !Array.isArray(data.daily.time)) {
    throw new AppError(`[${city}] Сервис погоды вернул неожиданный формат данных прогноза.`);
  }

  const { time, temperature_2m_max, temperature_2m_min, precipitation_sum } = data.daily;

  return time.map((date, i) => ({
    date,
    tempMin: temperature_2m_min[i],
    tempMax: temperature_2m_max[i],
    precipitation: precipitation_sum[i],
  }));
}
