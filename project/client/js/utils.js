// Задержка выполнения функции (для оптимизации поиска)
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Защита от XSS атак
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Возвращает дату в формате YYYY-MM-DD по локальному времени (без UTC-смещения)
export function getLocalDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Форматирование даты (сегодня, завтра или дата)
export function formatDate(dateStr) {
  const lang = localStorage.getItem('language') || 'en';
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';

  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Сравниваем по локальным компонентам даты, а не через ISO (UTC)
  const sameDay = (d1, d2) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  if (sameDay(date, today)) return lang === 'ru' ? 'Сегодня' : 'Today';
  if (sameDay(date, tomorrow)) return lang === 'ru' ? 'Завтра' : 'Tomorrow';

  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
  });
}

// Форматирование времени в 24-часовой формат
export function formatTime(timeStr) {
  const [hours, minutes] = timeStr.split(':');
  return `${hours.padStart(2, '0')}:${minutes}`;
}

// Получить первую букву email для аватара
export function getUserInitials(email) {
  return email.charAt(0).toUpperCase();
}
