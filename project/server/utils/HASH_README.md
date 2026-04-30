# Модуль хеширования задач

Модуль для хеширования и проверки целостности данных задач с использованием встроенного модуля `crypto` Node.js.

## Возможности

- ✅ Хеширование данных с использованием SHA-256
- ✅ Хеширование с солью
- ✅ Генерация случайных солей
- ✅ HMAC подписи для проверки подлинности
- ✅ Хеширование паролей с PBKDF2
- ✅ Создание контрольных сумм для задач
- ✅ Проверка целостности задач

## Использование

### Базовое хеширование

```javascript
const { hashData } = require('./utils/hash');

const hash = hashData('my data');
console.log(hash); // SHA-256 хеш в hex формате
```

### Хеширование с солью

```javascript
const { hashWithSalt, generateSalt } = require('./utils/hash');

const salt = generateSalt(); // Генерируем случайную соль
const hash = hashWithSalt('my data', salt);
```

### Хеширование задачи

```javascript
const { hashTask, createTaskChecksum } = require('./utils/hash');

const task = {
  id: '123',
  title: 'Купить молоко',
  description: 'В магазине',
  date: '2026-03-26',
  time: '10:00',
  priority: 'medium',
  user_id: 'user123'
};

// Полный хеш задачи
const taskHash = hashTask(task);

// Короткая контрольная сумма (8 символов)
const checksum = createTaskChecksum(task);
```

### HMAC подписи

```javascript
const { createHMAC, verifyHMAC } = require('./utils/hash');

const secret = 'my-secret-key';
const data = 'important data';

// Создание подписи
const signature = createHMAC(data, secret);

// Проверка подписи
const isValid = verifyHMAC(data, signature, secret);
console.log(isValid); // true
```

### Хеширование паролей

**Примечание:** Хеширование паролей не включено в этот модуль, так как проект использует Supabase Auth, который обрабатывает хеширование паролей на своей стороне. Supabase использует bcrypt для безопасного хранения паролей.

Если вам нужно хешировать пароли вне Supabase, рекомендуется использовать специализированные библиотеки:
- `bcrypt` - для хеширования паролей
- `argon2` - современная альтернатива bcrypt

## API Endpoints

### Получение задач с хешами

```
GET /api/tasks
```

Все задачи автоматически включают поля `checksum` и `hash`:

```json
{
  "id": "123",
  "title": "Купить молоко",
  "date": "2026-03-26",
  "time": "10:00",
  "checksum": "a1b2c3d4",
  "hash": "full-sha256-hash..."
}
```

### Проверка целостности задачи

```
POST /api/tasks/:id/verify
Content-Type: application/json

{
  "checksum": "a1b2c3d4",
  "hash": "full-sha256-hash..."
}
```

Ответ:

```json
{
  "valid": true,
  "checksumValid": true,
  "hashValid": true,
  "currentChecksum": "a1b2c3d4",
  "currentHash": "full-sha256-hash...",
  "message": "Task integrity verified"
}
```

### Получение статистики хешей

```
GET /api/tasks/stats/hashes
```

Ответ:

```json
{
  "totalTasks": 5,
  "tasks": [
    {
      "id": "123",
      "title": "Купить молоко",
      "checksum": "a1b2c3d4",
      "hash": "full-sha256-hash...",
      "created_at": "2026-03-26T10:00:00Z"
    }
  ]
}
```

## Middleware

Модуль включает middleware `addTaskHash`, который автоматически добавляет хеши ко всем ответам с задачами:

```javascript
const addTaskHash = require('./middleware/taskHash');

// Применяется ко всем маршрутам задач
router.use(addTaskHash);
```

## Безопасность

- **SHA-256**: Криптографически стойкий алгоритм хеширования
- **Timing-safe comparison**: Защита от timing attacks при проверке хешей
- **Случайные соли**: Криптографически безопасная генерация
- **Supabase Auth**: Управление паролями и аутентификацией (bcrypt)

## Примеры использования

### Проверка изменения задачи на клиенте

```javascript
// Сохраняем хеш при загрузке задачи
const originalHash = task.hash;

// Позже проверяем, изменилась ли задача
const response = await fetch(`/api/tasks/${task.id}/verify`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    checksum: task.checksum,
    hash: originalHash
  })
});

const result = await response.json();
if (!result.valid) {
  console.log('Задача была изменена!');
}
```

### Обнаружение конфликтов при редактировании

```javascript
// Перед сохранением изменений проверяем, не изменил ли кто-то задачу
const verifyResponse = await fetch(`/api/tasks/${taskId}/verify`, {
  method: 'POST',
  body: JSON.stringify({ hash: originalHash })
});

const { valid } = await verifyResponse.json();

if (!valid) {
  alert('Задача была изменена другим пользователем!');
  // Предложить перезагрузить или объединить изменения
}
```

## Функции модуля

| Функция | Описание |
|---------|----------|
| `hashData(data)` | Базовое SHA-256 хеширование |
| `hashWithSalt(data, salt)` | Хеширование с солью |
| `generateSalt(length)` | Генерация случайной соли |
| `createHMAC(data, secret)` | Создание HMAC подписи |
| `verifyHMAC(data, signature, secret)` | Проверка HMAC подписи |
| `hashTask(task)` | Хеширование объекта задачи |
| `createTaskChecksum(task)` | Короткая контрольная сумма |

## Примечание об аутентификации

Проект использует **Supabase Auth** для управления пользователями и аутентификации. Supabase автоматически обрабатывает:
- Хеширование паролей (bcrypt)
- Безопасное хранение учетных данных
- Управление сессиями
- Токены доступа (JWT)

Поэтому функции хеширования паролей не включены в этот модуль.

## Зависимости

Модуль использует только встроенный модуль Node.js `crypto`, дополнительные зависимости не требуются.
