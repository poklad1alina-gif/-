/**
 * Формирование вывода в консоль и сохранение JSON-отчёта на диск.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { formatDateISO, sanitizeFileName } from './utils.js';

const REPORTS_DIR = path.resolve('reports');

/** Печатает результат по одному городу в читаемом виде. */
export function printCityReport({ name, country, latitude, longitude, forecast }) {
  console.log('');
  console.log(`Город: ${name}, ${country}`);
  console.log(`Координаты: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
  console.log('');

  const header = ['Дата', 'Мин, °C', 'Макс, °C', 'Осадки, мм'];
  const rows = forecast.map((d) => [
    d.date,
    d.tempMin.toFixed(1),
    d.tempMax.toFixed(1),
    d.precipitation.toFixed(1),
  ]);

  const widths = header.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => r[i].length))
  );

  const printRow = (cells) =>
    console.log(cells.map((c, i) => c.padEnd(widths[i])).join('  '));

  printRow(header);
  printRow(widths.map((w) => '-'.repeat(w)));
  rows.forEach(printRow);
}

/** Печатает ошибку по конкретному городу. */
export function printCityError(city, message) {
  console.error(`\nГород: ${city}`);
  console.error(`  Ошибка: ${message}`);
}

/** Сохраняет отчёт по городу в reports/{город}-{ГГГГ-ММ-ДД}.json */
export async function saveCityReport({ name, country, latitude, longitude, forecast }) {
  await mkdir(REPORTS_DIR, { recursive: true });

  const today = formatDateISO(new Date());
  const fileName = `${sanitizeFileName(name)}-${today}.json`;
  const filePath = path.join(REPORTS_DIR, fileName);

  const report = {
    city: name,
    country,
    coordinates: { latitude, longitude },
    generatedAt: new Date().toISOString(),
    forecast,
  };

  await writeFile(filePath, JSON.stringify(report, null, 2), 'utf-8');
  return filePath;
}
