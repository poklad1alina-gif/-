/**
 * Общие утилиты: свой класс ошибки и разбор аргументов командной строки.
 */

/**
 * Ошибка приложения с понятным пользователю сообщением.
 * exitCode задаёт код завершения процесса при фатальных ошибках (например, в аргументах).
 */
export class AppError extends Error {
  constructor(message, { exitCode = 1 } = {}) {
    super(message);
    this.name = 'AppError';
    this.exitCode = exitCode;
  }
}

/**
 * Разбирает process.argv в объект вида { city, days }.
 * Поддерживает формы: --city "A, B" --days 3   и   --city=A --days=3
 */
export function parseArgs(argv) {
  const args = { city: undefined, days: undefined };

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];

    if (token === '--city' || token === '--days') {
      const key = token.slice(2);
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) {
        throw new AppError(`Отсутствует значение для параметра ${token}.`);
      }
      args[key] = value;
      i++;
      continue;
    }

    if (token.startsWith('--city=')) {
      args.city = token.slice('--city='.length);
      continue;
    }

    if (token.startsWith('--days=')) {
      args.days = token.slice('--days='.length);
      continue;
    }

    throw new AppError(`Неизвестный аргумент: ${token}`);
  }

  return args;
}

/**
 * Проверяет и нормализует аргументы.
 * Возвращает { cities: string[], days: number }.
 */
export function validateArgs({ city, days }) {
  if (!city || !city.trim()) {
    throw new AppError(
      'Параметр --city обязателен. Пример: node src/index.js --city "Нижний Новгород" --days 3'
    );
  }

  const cities = city
    .split(',')
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  if (cities.length === 0) {
    throw new AppError('Параметр --city не содержит ни одного корректного названия города.');
  }

  let parsedDays = 3;
  if (days !== undefined) {
    if (!/^-?\d+$/.test(days)) {
      throw new AppError(`Параметр --days должен быть целым числом, получено: "${days}".`);
    }
    parsedDays = Number(days);
    if (parsedDays < 1 || parsedDays > 7) {
      throw new AppError(`Параметр --days должен быть в диапазоне от 1 до 7, получено: ${parsedDays}.`);
    }
  }

  return { cities, days: parsedDays };
}

/** Форматирует Date в YYYY-MM-DD */
export function formatDateISO(date) {
  return date.toISOString().slice(0, 10);
}

/** Делает строку безопасной для использования в имени файла */
export function sanitizeFileName(name) {
  return name
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[\\/:*?"<>|,]/g, '');
}
