const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const addTaskHash = require('../middleware/taskHash');
const { createTaskChecksum, hashTask, verifyHMAC, createHMAC } = require('../utils/hash');

// Применяем middleware для добавления хешей ко всем ответам
router.use(addTaskHash);

// Проверка данных задачи
const validateTask = (task) => {
  const errors = [];
  
  if (!task.title || task.title.trim() === '') {
    errors.push('Title is required');
  }
  
  if (!task.date) {
    errors.push('Date is required');
  }
  
  if (!task.time) {
    errors.push('Time is required');
  }
  
  if (task.priority && !['low', 'medium', 'high'].includes(task.priority)) {
    errors.push('Invalid priority value');
  }
  
  if (task.status && !['pending', 'completed'].includes(task.status)) {
    errors.push('Invalid status value');
  }
  
  return errors;
};

// Получить все задачи пользователя
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { date, priority, status, search } = req.query;

    console.log('Fetching tasks for user:', userId);

    let query = supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (date) {
      query = query.eq('date', date);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch tasks', details: error.message });
    }

    console.log('Tasks fetched:', data?.length || 0);
    res.json(data);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Создать новую задачу
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, date, time, priority, status } = req.body;

    const taskData = {
      title,
      description: description || null,
      date,
      time,
      priority: priority || 'medium',
      status: status || 'pending'
    };

    const errors = validateTask(taskData);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(', ') });
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert([{ ...taskData, user_id: userId }])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to create task' });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Обновить задачу
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const taskId = req.params.id;
    const { title, description, date, time, priority, status } = req.body;

    const taskData = {
      title,
      description: description || null,
      date,
      time,
      priority: priority || 'medium',
      status: status || 'pending'
    };

    const errors = validateTask(taskData);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(', ') });
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(taskData)
      .eq('id', taskId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to update task' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Изменить статус задачи
router.patch('/:id/status', async (req, res) => {
  try {
    const userId = req.user.id;
    const taskId = req.params.id;
    const { status } = req.body;

    if (!status || !['pending', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const { data, error } = await supabase
      .from('tasks')
      .update({ status })
      .eq('id', taskId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to update task status' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Удалить задачу
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const taskId = req.params.id;

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', userId);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to delete task' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Проверить целостность задачи
router.post('/:id/verify', async (req, res) => {
  try {
    const userId = req.user.id;
    const taskId = req.params.id;
    const { checksum, hash } = req.body;

    // Получаем задачу из базы
    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', userId)
      .single();

    if (error || !task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Вычисляем текущие хеши
    const currentChecksum = createTaskChecksum(task);
    const currentHash = hashTask(task);

    // Проверяем целостность
    const checksumValid = checksum === currentChecksum;
    const hashValid = hash === currentHash;

    res.json({
      valid: checksumValid && hashValid,
      checksumValid,
      hashValid,
      currentChecksum,
      currentHash,
      message: checksumValid && hashValid 
        ? 'Task integrity verified' 
        : 'Task has been modified'
    });
  } catch (error) {
    console.error('Verify task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Получить хеш-статистику для всех задач пользователя
router.get('/stats/hashes', async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch tasks' });
    }

    // Создаем статистику
    const stats = {
      totalTasks: tasks.length,
      tasks: tasks.map(task => ({
        id: task.id,
        title: task.title,
        checksum: createTaskChecksum(task),
        hash: hashTask(task),
        created_at: task.created_at
      }))
    };

    res.json(stats);
  } catch (error) {
    console.error('Get hash stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
