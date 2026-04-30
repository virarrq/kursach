const jwt = require('jsonwebtoken');
const supabase = require('../supabaseClient');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Проверяем наличие токена в заголовке
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];

    // Проверяем токен через Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Добавляем пользователя в запрос
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

module.exports = authMiddleware;
