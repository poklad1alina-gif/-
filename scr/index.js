#!/usr/bin/env node
/**
 * Погодный дайджест — консольная утилита.
 * Использование:
 *   node src/index.js --city "Нижний Новгород" --days 3
 *   node src/index.js --city "Москва, Санкт-Петербург, Казань"
 */
import { parseArgs, validateArgs, AppError } from './utils.js';
import { geocodeCity, getForecast } from './api.js';
import { printCityReport, printCityError, saveCityReport } from './report.js';

async function processCity(city, days) {
  const location = await geocodeCity(city);
  const forecast = await getForecast({
    city,
    latitude: location.latitude,
    longitude: location.longitude,
    days,
  });
  return { ...location, forecast };
}

async function main() {
  const rawArgs = parseArgs(process.argv.slice(2));
  const { cities, days } = validateArgs(rawArgs);

  const results = await Promise.allSettled(
    cities.map((city) => processCity(city, days))
  );

  let successCount = 0;

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const cityInput = cities[i];

    if (result.status === 'fulfilled') {
      successCount++;
      printCityReport(result.value);
      try {
        const savedPath = await saveCityReport(result.value);
        console.log(`\nОтчёт сохранён: ${savedPath}`);
      } catch (err) {
        console.error(`\n[${cityInput}] Не удалось сохранить отчёт в файл: ${err.message}`);
      }
    } else {
      const err = result.reason;
      const message = err instanceof AppError ? err.message : `Непредвиденная ошибка: ${err.message}`;
      printCityError(cityInput, message);
    }
  }

  console.log(`\nГотово: ${successCount} из ${cities.length} город(ов) обработано успешно.`);

  if (successCount === 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  if (err instanceof AppError) {
    console.error(`Ошибка: ${err.message}`);
    process.exitCode = err.exitCode;
  } else {
    console.error(`Непредвиденная ошибка: ${err.message}`);
    process.exitCode = 1;
  }
});
