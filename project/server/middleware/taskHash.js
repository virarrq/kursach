const { createTaskChecksum, hashTask } = require('../utils/hash');

/**
 * Middleware для добавления хеша и контрольной суммы к задачам
 */
const addTaskHash = (req, res, next) => {
  // Сохраняем оригинальный метод res.json
  const originalJson = res.json.bind(res);
  
  // Переопределяем res.json для добавления хешей
  res.json = function(data) {
    if (data && typeof data === 'object') {
      // Если это массив задач
      if (Array.isArray(data)) {
        data = data.map(task => addHashToTask(task));
      }
      // Если это одна задача
      else if (data.id && data.title) {
        data = addHashToTask(data);
      }
    }
    
    return originalJson(data);
  };
  
  next();
};

/**
 * Добавляет хеш и контрольную сумму к задаче
 */
function addHashToTask(task) {
  if (!task || !task.id) return task;
  
  return {
    ...task,
    checksum: createTaskChecksum(task),
    hash: hashTask(task)
  };
}

module.exports = addTaskHash;
