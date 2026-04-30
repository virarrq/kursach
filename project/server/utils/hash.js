const crypto = require('crypto');

/**
 * Хеширование данных с использованием SHA-256
 * @param {string} data - Данные для хеширования
 * @returns {string} - Хеш в формате hex
 */
function hashData(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Хеширование данных с солью
 * @param {string} data - Данные для хеширования
 * @param {string} salt - Соль для хеширования
 * @returns {string} - Хеш в формате hex
 */
function hashWithSalt(data, salt) {
  return crypto.createHash('sha256').update(data + salt).digest('hex');
}

/**
 * Генерация случайной соли
 * @param {number} length - Длина соли в байтах (по умолчанию 16)
 * @returns {string} - Соль в формате hex
 */
function generateSalt(length = 16) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Создание HMAC подписи
 * @param {string} data - Данные для подписи
 * @param {string} secret - Секретный ключ
 * @returns {string} - HMAC подпись в формате hex
 */
function createHMAC(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Проверка HMAC подписи
 * @param {string} data - Данные
 * @param {string} signature - Подпись для проверки
 * @param {string} secret - Секретный ключ
 * @returns {boolean} - true если подпись верна
 */
function verifyHMAC(data, signature, secret) {
  const expectedSignature = createHMAC(data, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

/**
 * Хеширование задачи для создания уникального идентификатора
 * @param {Object} task - Объект задачи
 * @returns {string} - Хеш задачи
 */
function hashTask(task) {
  const taskString = JSON.stringify({
    title: task.title,
    description: task.description || '',
    date: task.date,
    time: task.time,
    priority: task.priority,
    user_id: task.user_id
  });
  return hashData(taskString);
}

/**
 * Создание контрольной суммы для задачи
 * @param {Object} task - Объект задачи
 * @returns {string} - Контрольная сумма
 */
function createTaskChecksum(task) {
  const taskData = `${task.id}:${task.title}:${task.date}:${task.time}`;
  return hashData(taskData).substring(0, 8);
}

module.exports = {
  hashData,
  hashWithSalt,
  generateSalt,
  createHMAC,
  verifyHMAC,
  hashTask,
  createTaskChecksum
};
