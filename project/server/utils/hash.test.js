const {
  hashData,
  hashWithSalt,
  generateSalt,
  createHMAC,
  verifyHMAC,
  hashTask,
  createTaskChecksum
} = require('./hash');

console.log('=== Тестирование модуля хеширования ===\n');

// 1. Базовое хеширование
console.log('1. Базовое хеширование:');
const data = 'Hello, World!';
const hash1 = hashData(data);
console.log(`   Данные: "${data}"`);
console.log(`   SHA-256: ${hash1}`);
console.log(`   Длина: ${hash1.length} символов\n`);

// 2. Хеширование с солью
console.log('2. Хеширование с солью:');
const salt = generateSalt();
const hash2 = hashWithSalt(data, salt);
console.log(`   Соль: ${salt}`);
console.log(`   Хеш: ${hash2}\n`);

// 3. HMAC подписи
console.log('3. HMAC подписи:');
const secret = 'my-secret-key';
const message = 'Important message';
const signature = createHMAC(message, secret);
const isValid = verifyHMAC(message, signature, secret);
const isInvalid = verifyHMAC('Wrong message', signature, secret);
console.log(`   Сообщение: "${message}"`);
console.log(`   Подпись: ${signature}`);
console.log(`   Проверка (правильное): ${isValid}`);
console.log(`   Проверка (неправильное): ${isInvalid}\n`);

// 4. Хеширование задачи
console.log('4. Хеширование задачи:');
const task = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  title: 'Купить молоко',
  description: 'В магазине на углу',
  date: '2026-03-26',
  time: '10:00',
  priority: 'medium',
  user_id: 'user-123'
};
const taskHash = hashTask(task);
const taskChecksum = createTaskChecksum(task);
console.log(`   Задача: ${task.title}`);
console.log(`   Полный хеш: ${taskHash}`);
console.log(`   Контрольная сумма: ${taskChecksum}\n`);

// 5. Проверка изменения задачи
console.log('5. Проверка изменения задачи:');
const modifiedTask = { ...task, title: 'Купить хлеб' };
const modifiedHash = hashTask(modifiedTask);
const modifiedChecksum = createTaskChecksum(modifiedTask);
console.log(`   Оригинальная задача: "${task.title}"`);
console.log(`   Оригинальный хеш: ${taskHash}`);
console.log(`   Измененная задача: "${modifiedTask.title}"`);
console.log(`   Измененный хеш: ${modifiedHash}`);
console.log(`   Хеши совпадают: ${taskHash === modifiedHash}`);
console.log(`   Контрольные суммы совпадают: ${taskChecksum === modifiedChecksum}\n`);

// 6. Производительность
console.log('6. Тест производительности:');
const iterations = 10000;
console.log(`   Хеширование ${iterations} задач...`);
const startTime = Date.now();
for (let i = 0; i < iterations; i++) {
  hashTask({ ...task, id: `task-${i}` });
}
const endTime = Date.now();
const duration = endTime - startTime;
const perSecond = Math.round(iterations / (duration / 1000));
console.log(`   Время: ${duration}ms`);
console.log(`   Скорость: ${perSecond} хешей/сек\n`);

console.log('=== Тестирование завершено ===');
console.log('\nПримечание: Хеширование паролей не включено, так как');
console.log('используется Supabase Auth для аутентификации.');
