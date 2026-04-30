# Как проверить, что хеши работают

## Почему хешей нет в базе данных?

**Это правильно!** Хеши **не должны** храниться в базе данных. Они вычисляются динамически при отправке ответа клиенту.

### Архитектура:

```
┌─────────────┐
│  Database   │  ◄── Хранит только данные задачи
│  (Supabase) │      (без хешей)
└──────┬──────┘
       │
       │ SELECT * FROM tasks
       ▼
┌─────────────────┐
│  Express API    │
│  + Middleware   │  ◄── Добавляет checksum и hash
└────────┬────────┘
         │
         │ JSON Response
         ▼
┌─────────────────┐
│     Client      │  ◄── Получает задачу с хешами
│   (Browser)     │
└─────────────────┘
```

## Как проверить, что хеши работают

### Способ 1: DevTools в браузере

1. Откройте приложение в браузере
2. Откройте DevTools (F12)
3. Перейдите на вкладку **Network**
4. Обновите список задач
5. Найдите запрос к `/api/tasks`
6. Посмотрите на **Response**

Вы должны увидеть:

```json
[
  {
    "id": "24291129-bd88-4983-ba7e-ed00b34629ba",
    "title": "test",
    "description": "test",
    "date": "2026-03-26",
    "time": "09:00:00",
    "priority": "medium",
    "status": "pending",
    "checksum": "3a37b0a1",
    "hash": "f7aa4f01dc164ad02d1198a856712954bccc65c5167aedb51c5a320515684fcd"
  }
]
```

### Способ 2: Console в браузере

Откройте Console в DevTools и выполните:

```javascript
// Получить задачи
const response = await fetch('http://localhost:3000/api/tasks', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN_HERE'
  }
});

const tasks = await response.json();
console.log('Задачи с хешами:', tasks);

// Проверить наличие хешей
tasks.forEach(task => {
  console.log(`Задача: ${task.title}`);
  console.log(`  Checksum: ${task.checksum}`);
  console.log(`  Hash: ${task.hash}`);
});
```

### Способ 3: curl команда

```bash
# Замените YOUR_TOKEN на ваш JWT токен
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/tasks | jq
```

Вы должны увидеть поля `checksum` и `hash` в ответе.

### Способ 4: Проверка в коде клиента

Добавьте временный console.log в `client/js/api.js`:

```javascript
async getAll(filters = {}) {
  const queryString = new URLSearchParams(filters).toString();
  const url = `${this.baseURL}${queryString ? '?' + queryString : ''}`;
  
  const response = await fetch(url, {
    headers: await this.getHeaders()
  });

  if (!response.ok) {
    throw new Error('Failed to fetch tasks');
  }

  const tasks = await response.json();
  
  // Временная проверка
  console.log('Задачи с хешами:', tasks);
  tasks.forEach(task => {
    console.log(`${task.title}: checksum=${task.checksum}, hash=${task.hash?.substring(0, 16)}...`);
  });
  
  return tasks;
}
```

## Что делать, если хешей нет?

### 1. Проверьте, что сервер запущен

```bash
cd server
npm start
```

### 2. Проверьте middleware в routes/tasks.js

Должно быть:

```javascript
const addTaskHash = require('../middleware/taskHash');
router.use(addTaskHash);
```

### 3. Проверьте логи сервера

Middleware должен работать без ошибок.

### 4. Перезапустите сервер

```bash
# Остановите сервер (Ctrl+C)
# Запустите снова
npm start
```

## Тестирование хеширования

Запустите тестовый скрипт:

```bash
node test-hash-api.js
```

Вы должны увидеть:

```
=== Тест хеширования задачи из БД ===

Задача из базы данных:
{
  "id": "24291129-bd88-4983-ba7e-ed00b34629ba",
  "title": "test",
  ...
}

--- Вычисляем хеши ---

Checksum: 3a37b0a1
Hash: f7aa4f01dc164ad02d1198a856712954bccc65c5167aedb51c5a320515684fcd

✅ Хеши НЕ хранятся в базе данных
✅ Хеши вычисляются динамически при отправке ответа
✅ Клиент получает задачу с полями checksum и hash
```

## Использование хешей на клиенте

После того как убедитесь, что хеши приходят, можете использовать их:

```javascript
// Сохранить оригинальный хеш
const originalHash = task.hash;

// Позже проверить целостность
const response = await fetch(`/api/tasks/${task.id}/verify`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    checksum: task.checksum,
    hash: originalHash
  })
});

const result = await response.json();
console.log('Задача изменена?', !result.valid);
```

## Резюме

- ✅ **База данных**: хранит только данные задачи
- ✅ **Middleware**: добавляет хеши при отправке
- ✅ **Клиент**: получает задачи с `checksum` и `hash`
- ❌ **НЕ нужно**: добавлять колонки в базу данных для хешей
