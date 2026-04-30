const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authMiddleware = require('./middleware/auth');
const tasksRouter = require('./routes/tasks');

const app = express();
const PORT = process.env.PORT || 3000;

// Подключаем middleware
app.use(cors());
app.use(express.json());

// Проверка работоспособности сервера
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Защищенные маршруты для работы с задачами
app.use('/api/tasks', authMiddleware, tasksRouter);

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Обработка несуществующих маршрутов
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
