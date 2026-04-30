import { requireAuth, getAccessToken, logout } from './auth.js';

const API_URL = 'http://localhost:3000/api';

let currentSession = null;
let tasks = [];
let currentDate = new Date();
let notifiedTasks = new Set();

// Инициализация приложения
async function init() {
  currentSession = await requireAuth();
  if (!currentSession) return;

  document.getElementById('userEmail').textContent = currentSession.user.email;
  
  setupEventListeners();
  await loadTasks();
  renderCalendar();
  requestNotificationPermission();
  startNotificationCheck();
}

// Настройка обработчиков событий
function setupEventListeners() {
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('addTaskBtn').addEventListener('click', () => openTaskModal());
  document.getElementById('searchInput').addEventListener('input', debounce(handleSearch, 300));
  document.getElementById('filterStatus').addEventListener('change', handleFilters);
  document.getElementById('filterPriority').addEventListener('change', handleFilters);
  document.getElementById('filterDate').addEventListener('change', handleFilters);
  document.getElementById('clearFilters').addEventListener('click', clearFilters);
  document.getElementById('taskForm').addEventListener('submit', handleTaskSubmit);
  document.getElementById('cancelBtn').addEventListener('click', closeTaskModal);
  document.querySelector('.close').addEventListener('click', closeTaskModal);
  
  window.addEventListener('click', (e) => {
    const modal = document.getElementById('taskModal');
    if (e.target === modal) closeTaskModal();
  });
}

// Запросы к API
async function apiCall(endpoint, options = {}) {
  const token = await getAccessToken();
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }

  if (response.status === 204) return null;
  return response.json();
}

// Загрузка задач с сервера
async function loadTasks(filters = {}) {
  try {
    const params = new URLSearchParams(filters);
    tasks = await apiCall(`/tasks?${params}`);
    renderTasks();
    renderCalendar();
  } catch (error) {
    console.error('Failed to load tasks:', error);
    alert('Failed to load tasks');
  }
}

// Создание новой задачи
async function createTask(taskData) {
  return await apiCall('/tasks', {
    method: 'POST',
    body: JSON.stringify(taskData)
  });
}

// Обновление задачи
async function updateTask(id, taskData) {
  return await apiCall(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(taskData)
  });
}

// Удаление задачи
async function deleteTask(id) {
  return await apiCall(`/tasks/${id}`, {
    method: 'DELETE'
  });
}

// Изменение статуса задачи
async function toggleTaskStatus(id, status) {
  return await apiCall(`/tasks/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}

// Модальное окно задачи
function openTaskModal(task = null) {
  const modal = document.getElementById('taskModal');
  const form = document.getElementById('taskForm');
  
  form.reset();
  
  if (task) {
    document.getElementById('modalTitle').textContent = 'Edit Task';
    document.getElementById('taskId').value = task.id;
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDescription').value = task.description || '';
    document.getElementById('taskDate').value = task.date;
    document.getElementById('taskTime').value = task.time;
    document.getElementById('taskPriority').value = task.priority;
    document.getElementById('taskStatus').value = task.status;
  } else {
    document.getElementById('modalTitle').textContent = 'Add Task';
    document.getElementById('taskId').value = '';
    document.getElementById('taskDate').value = new Date().toISOString().split('T')[0];
  }
  
  modal.classList.add('active');
}

// Закрытие модального окна
function closeTaskModal() {
  document.getElementById('taskModal').classList.remove('active');
}

async function handleTaskSubmit(e) {
  e.preventDefault();
  
  const taskId = document.getElementById('taskId').value;
  const taskData = {
    title: document.getElementById('taskTitle').value,
    description: document.getElementById('taskDescription').value,
    date: document.getElementById('taskDate').value,
    time: document.getElementById('taskTime').value,
    priority: document.getElementById('taskPriority').value,
    status: document.getElementById('taskStatus').value
  };

  try {
    if (taskId) {
      await updateTask(taskId, taskData);
    } else {
      await createTask(taskData);
    }
    
    closeTaskModal();
    await loadTasks();
  } catch (error) {
    console.error('Failed to save task:', error);
    alert('Failed to save task: ' + error.message);
  }
}

// Удаление задачи с подтверждением
async function handleDeleteTask(id) {
  if (!confirm('Are you sure you want to delete this task?')) return;
  
  try {
    await deleteTask(id);
    await loadTasks();
  } catch (error) {
    console.error('Failed to delete task:', error);
    alert('Failed to delete task');
  }
}

// Переключение статуса задачи
async function handleToggleStatus(id, currentStatus) {
  const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
  
  try {
    await toggleTaskStatus(id, newStatus);
    await loadTasks();
  } catch (error) {
    console.error('Failed to update status:', error);
    alert('Failed to update status');
  }
}

// Отрисовка списка задач
function renderTasks() {
  const container = document.getElementById('tasksList');
  
  if (tasks.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 2rem;">No tasks found</p>';
    return;
  }
  
  container.innerHTML = tasks.map(task => `
    <div class="task-card priority-${task.priority} ${task.status}">
      <div class="task-header">
        <h3 class="task-title">${escapeHtml(task.title)}</h3>
        <div class="task-actions">
          <button class="btn btn-secondary" onclick="window.handleToggleStatus('${task.id}', '${task.status}')">
            ${task.status === 'completed' ? 'Undo' : 'Complete'}
          </button>
          <button class="btn btn-primary" onclick="window.handleEditTask('${task.id}')">Edit</button>
          <button class="btn btn-secondary" onclick="window.handleDeleteTask('${task.id}')">Delete</button>
        </div>
      </div>
      ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}
      <div class="task-meta">
        <span class="task-meta-item">
          <img src="icons/calendar.svg" alt="Date" class="icon"> ${formatDate(task.date)}
        </span>
        <span class="task-meta-item">
          <img src="icons/clock.svg" alt="Time" class="icon"> ${formatTime(task.time)}
        </span>
        <span class="priority-badge ${task.priority}">${task.priority}</span>
      </div>
    </div>
  `).join('');
}

window.handleEditTask = (id) => {
  const task = tasks.find(t => t.id === id);
  if (task) openTaskModal(task);
};

window.handleDeleteTask = handleDeleteTask;
window.handleToggleStatus = handleToggleStatus;

// Отрисовка календаря
function renderCalendar() {
  const calendar = document.getElementById('calendar');
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const prevLastDay = new Date(year, month, 0);
  
  const firstDayOfWeek = firstDay.getDay();
  const lastDateOfMonth = lastDay.getDate();
  const prevLastDate = prevLastDay.getDate();
  
  // Группируем задачи по датам
  const tasksByDate = {};
  tasks.forEach(task => {
    if (!tasksByDate[task.date]) {
      tasksByDate[task.date] = [];
    }
    tasksByDate[task.date].push(task);
  });
  
  let calendarHTML = `
    <div class="calendar-header">
      <h3>${firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
      <div class="calendar-nav">
        <button class="btn btn-secondary" onclick="window.prevMonth()">‹</button>
        <button class="btn btn-secondary" onclick="window.nextMonth()">›</button>
      </div>
    </div>
    <div class="calendar-grid">
      <div class="calendar-day-header">Sun</div>
      <div class="calendar-day-header">Mon</div>
      <div class="calendar-day-header">Tue</div>
      <div class="calendar-day-header">Wed</div>
      <div class="calendar-day-header">Thu</div>
      <div class="calendar-day-header">Fri</div>
      <div class="calendar-day-header">Sat</div>
  `;
  
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const date = prevLastDate - i;
    calendarHTML += `<div class="calendar-day other-month">${date}</div>`;
  }
  
  const today = new Date().toISOString().split('T')[0];
  
  for (let date = 1; date <= lastDateOfMonth; date++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
    const isToday = dateStr === today;
    const hasTasks = tasksByDate[dateStr] && tasksByDate[dateStr].length > 0;
    
    calendarHTML += `
      <div class="calendar-day ${isToday ? 'today' : ''} ${hasTasks ? 'has-tasks' : ''}" 
           onclick="window.filterByDate('${dateStr}')">
        ${date}
      </div>
    `;
  }
  
  const remainingDays = 42 - (firstDayOfWeek + lastDateOfMonth);
  for (let i = 1; i <= remainingDays; i++) {
    calendarHTML += `<div class="calendar-day other-month">${i}</div>`;
  }
  
  calendarHTML += '</div>';
  calendar.innerHTML = calendarHTML;
}

window.prevMonth = () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
};

window.nextMonth = () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
};

window.filterByDate = (date) => {
  document.getElementById('filterDate').value = date;
  handleFilters();
};

// Filters and search
function handleSearch(e) {
  const search = e.target.value;
  const filters = getActiveFilters();
  if (search) filters.search = search;
  loadTasks(filters);
}

function handleFilters() {
  const filters = getActiveFilters();
  loadTasks(filters);
}

function getActiveFilters() {
  const filters = {};
  
  const status = document.getElementById('filterStatus').value;
  const priority = document.getElementById('filterPriority').value;
  const date = document.getElementById('filterDate').value;
  const search = document.getElementById('searchInput').value;
  
  if (status) filters.status = status;
  if (priority) filters.priority = priority;
  if (date) filters.date = date;
  if (search) filters.search = search;
  
  return filters;
}

function clearFilters() {
  document.getElementById('filterStatus').value = '';
  document.getElementById('filterPriority').value = '';
  document.getElementById('filterDate').value = '';
  document.getElementById('searchInput').value = '';
  loadTasks();
}

// Уведомления
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function startNotificationCheck() {
  checkUpcomingTasks();
  setInterval(checkUpcomingTasks, 60000); // Проверяем каждую минуту
}

function checkUpcomingTasks() {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const now = new Date();
  const tenMinutesLater = new Date(now.getTime() + 10 * 60000);

  tasks.forEach(task => {
    if (task.status === 'completed') return;
    if (notifiedTasks.has(task.id)) return;

    const taskDateTime = new Date(`${task.date}T${task.time}`);
    
    if (taskDateTime > now && taskDateTime <= tenMinutesLater) {
      showNotification(task);
      notifiedTasks.add(task.id);
    }
  });
}

function showNotification(task) {
  const notification = new Notification('Task Reminder', {
    body: `${task.title} is starting in 10 minutes`,
    icon: '/favicon.ico',
    tag: task.id
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}

// Вспомогательные функции
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

function formatTime(timeStr) {
  const [hours, minutes] = timeStr.split(':');
  return `${hours.padStart(2, '0')}:${minutes}`;
}

// Запускаем приложение
init();
