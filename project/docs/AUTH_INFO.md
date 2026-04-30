# Аутентификация в проекте

## Используемая система

Проект использует **Supabase Auth** для управления пользователями и аутентификацией.

## Что обрабатывает Supabase Auth

✅ **Регистрация пользователей**
- Хеширование паролей (bcrypt)
- Валидация email
- Отправка подтверждающих писем

✅ **Вход в систему**
- Проверка учетных данных
- Генерация JWT токенов
- Управление сессиями

✅ **Безопасность**
- Безопасное хранение паролей (bcrypt с солью)
- Защита от brute-force атак
- Автоматическое обновление токенов

✅ **Дополнительные возможности**
- Сброс пароля
- Изменение email
- OAuth провайдеры (Google, GitHub и др.)
- Magic Links

## Архитектура аутентификации

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │
       │ 1. Login/Register
       ▼
┌─────────────────┐
│  Supabase Auth  │ ◄── Хеширование паролей (bcrypt)
│   (Cloud)       │ ◄── Генерация JWT токенов
└────────┬────────┘
         │
         │ 2. JWT Token
         ▼
┌─────────────────┐
│  Your Server    │
│  (Express API)  │ ◄── Проверка JWT токена
└─────────────────┘
```

## Как это работает в проекте

### 1. Регистрация (client/js/auth.js)

```javascript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securePassword123'
});
```

Supabase автоматически:
- Хеширует пароль с bcrypt
- Сохраняет в защищенной базе данных
- Отправляет письмо подтверждения

### 2. Вход (client/js/auth.js)

```javascript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'securePassword123'
});
```

Supabase:
- Проверяет пароль против хеша
- Генерирует JWT токен
- Возвращает токен клиенту

### 3. Защищенные запросы (server/middleware/auth.js)

```javascript
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization.split(' ')[1];
  
  // Проверяем токен через Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  req.user = user;
  next();
};
```

## Почему не нужно хешировать пароли вручную

❌ **НЕ НУЖНО:**
```javascript
// Это избыточно и небезопасно
const hashedPassword = hashPassword(password);
await supabase.auth.signUp({
  email,
  password: hashedPassword  // ❌ Неправильно!
});
```

✅ **ПРАВИЛЬНО:**
```javascript
// Supabase сам хеширует пароль
await supabase.auth.signUp({
  email,
  password  // ✅ Передаем как есть
});
```

## Модуль хеширования в проекте

Модуль `server/utils/hash.js` используется **только для хеширования задач**, не паролей:

```javascript
const { hashTask, createTaskChecksum } = require('./utils/hash');

// Хеширование задачи для проверки целостности
const task = { id: '123', title: 'Купить молоко', ... };
const hash = hashTask(task);
const checksum = createTaskChecksum(task);
```

## Преимущества Supabase Auth

1. **Безопасность из коробки** - проверенные алгоритмы и практики
2. **Масштабируемость** - обрабатывает миллионы пользователей
3. **Меньше кода** - не нужно писать логику аутентификации
4. **Обновления** - автоматические патчи безопасности
5. **Дополнительные функции** - OAuth, Magic Links, MFA

## Дополнительная информация

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [JWT Tokens](https://jwt.io/)
- [bcrypt Algorithm](https://en.wikipedia.org/wiki/Bcrypt)

## Резюме

- ✅ Supabase Auth хеширует пароли (bcrypt)
- ✅ Модуль hash.js хеширует задачи (SHA-256)
- ❌ Не нужно хешировать пароли вручную
- ✅ Передавайте пароли в Supabase как есть
