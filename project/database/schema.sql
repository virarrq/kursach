-- Включаем расширение для работы с UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Создаем таблицу задач
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  time TIME NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем индексы для быстрого поиска
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_date ON tasks(date);
CREATE INDEX idx_tasks_user_date ON tasks(user_id, date);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);

-- Включаем защиту на уровне строк
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Настраиваем правила доступа
-- Пользователи видят только свои задачи
CREATE POLICY "Users can view own tasks"
  ON tasks
  FOR SELECT
  USING (auth.uid() = user_id);

-- Пользователи создают только свои задачи
CREATE POLICY "Users can insert own tasks"
  ON tasks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Пользователи редактируют только свои задачи
CREATE POLICY "Users can update own tasks"
  ON tasks
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Пользователи удаляют только свои задачи
CREATE POLICY "Users can delete own tasks"
  ON tasks
  FOR DELETE
  USING (auth.uid() = user_id);
