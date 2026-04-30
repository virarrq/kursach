import { formatDate, formatTime, escapeHtml, getLocalDateStr } from './utils.js';
import { t } from './i18n.js';

// Проверка, просрочена ли задача
function checkIfOverdue(task) {
  if (task.status === 'completed') return false;
  
  const now = new Date();
  const taskDateTime = new Date(`${task.date}T${task.time}`);
  
  return taskDateTime < now;
}

// Отрисовка списка задач
export function renderTasks(tasks, handlers) {
  const container = document.getElementById('tasksContainer');
  
  if (tasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
        <h3 class="empty-state-title">${t('noTasksFound')}</h3>
        <p class="empty-state-description">${t('createFirstTask')}</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="tasks-grid">
      ${tasks.map(task => createTaskCard(task)).join('')}
    </div>
  `;
  
  // Add event listeners after rendering
  addTaskEventListeners(container);
}

// Добавляем обработчики событий для карточек задач
function addTaskEventListeners(container) {
  // Обработчики чекбоксов
  container.querySelectorAll('.task-card-checkbox').forEach(checkbox => {
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
      const taskId = checkbox.dataset.taskId;
      const status = checkbox.dataset.status;
      window.dispatchEvent(new CustomEvent('taskToggle', { detail: { id: taskId, status } }));
    });
  });
  
  // Обработчики кнопок редактирования
  container.querySelectorAll('.task-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const taskId = btn.dataset.taskId;
      window.dispatchEvent(new CustomEvent('taskEdit', { detail: { id: taskId } }));
    });
  });
  
  // Обработчики кнопок удаления
  container.querySelectorAll('.task-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const taskId = btn.dataset.taskId;
      window.dispatchEvent(new CustomEvent('taskDelete', { detail: { id: taskId } }));
    });
  });
}

// Создание HTML карточки задачи
function createTaskCard(task) {
  const isCompleted = task.status === 'completed';
  const isOverdue = checkIfOverdue(task);
  
  return `
    <div class="task-card priority-${task.priority} ${isCompleted ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}" data-task-id="${task.id}">
      ${isOverdue ? '<div class="overdue-badge">' + t('overdue') + '</div>' : ''}
      <div class="task-card-header">
        <div class="task-card-checkbox ${isCompleted ? 'checked' : ''}" data-task-id="${task.id}" data-status="${task.status}">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <div style="flex: 1;">
          <h3 class="task-card-title">${escapeHtml(task.title)}</h3>
        </div>
      </div>
      
      ${task.description ? `<p class="task-card-description">${escapeHtml(task.description)}</p>` : ''}
      
      <div class="task-card-meta">
        <div class="task-card-meta-item">
          <img src="icons/calendar.svg" alt="Date" class="icon-sm">
          ${formatDate(task.date)}
        </div>
        <div class="task-card-meta-item">
          <img src="icons/clock.svg" alt="Time" class="icon-sm">
          ${formatTime(task.time)}
        </div>
      </div>
      
      <div class="task-card-footer">
        <span class="badge badge-${task.priority}">${task.priority}</span>
        <div class="task-card-actions">
          <button class="btn btn-ghost btn-icon btn-sm task-edit-btn" data-task-id="${task.id}" title="Edit" type="button">
            <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          <button class="btn btn-ghost btn-icon btn-sm task-delete-btn" data-task-id="${task.id}" title="Delete" type="button">
            <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

// Отрисовка календаря
export function renderCalendar(date, tasks, onDateClick) {
  const year = date.getFullYear();
  const month = date.getMonth();
  
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
  
  // Обновляем заголовок календаря
  const lang = localStorage.getItem('language') || 'en';
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';
  document.getElementById('calendarTitle').textContent = 
    firstDay.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  
  const dayHeaders = lang === 'ru'
    ? ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Строим сетку календаря
  let calendarHTML = dayHeaders.map(d => `<div class="calendar-day-header">${d}</div>`).join('');
  
  // Дни предыдущего месяца
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const date = prevLastDate - i;
    calendarHTML += `<div class="calendar-day other-month">${date}</div>`;
  }
  
  // Дни текущего месяца
  const today = getLocalDateStr();
  
  for (let date = 1; date <= lastDateOfMonth; date++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
    const isToday = dateStr === today;
    const hasTasks = tasksByDate[dateStr] && tasksByDate[dateStr].length > 0;
    
    calendarHTML += `
      <div class="calendar-day ${isToday ? 'today' : ''} ${hasTasks ? 'has-tasks' : ''}" 
           data-date="${dateStr}">
        ${date}
      </div>
    `;
  }
  
  // Дни следующего месяца
  const remainingDays = 42 - (firstDayOfWeek + lastDateOfMonth);
  for (let i = 1; i <= remainingDays; i++) {
    calendarHTML += `<div class="calendar-day other-month">${i}</div>`;
  }
  
  document.getElementById('calendarGrid').innerHTML = calendarHTML;
  
  // Добавляем обработчики кликов на дни календаря
  document.querySelectorAll('.calendar-day:not(.other-month)').forEach(day => {
    day.addEventListener('click', () => {
      const dateStr = day.dataset.date;
      if (dateStr) {
        window.dispatchEvent(new CustomEvent('dateClick', { detail: { date: dateStr } }));
      }
    });
  });
}

// Глобальные обработчики для событий
window.handleToggleStatus = function(id, status) {
  const event = new CustomEvent('taskToggle', { detail: { id, status } });
  window.dispatchEvent(event);
};

window.handleEditTask = function(id) {
  const event = new CustomEvent('taskEdit', { detail: { id } });
  window.dispatchEvent(event);
};

window.handleDeleteTask = function(id) {
  const event = new CustomEvent('taskDelete', { detail: { id } });
  window.dispatchEvent(event);
};

window.handleDateClick = function(date) {
  const event = new CustomEvent('dateClick', { detail: { date } });
  window.dispatchEvent(event);
};

// Слушаем пользовательские события
window.addEventListener('taskToggle', (e) => {
  const handlers = window.taskHandlers;
  if (handlers?.onToggle) handlers.onToggle(e.detail.id, e.detail.status);
});

window.addEventListener('taskEdit', (e) => {
  const handlers = window.taskHandlers;
  if (handlers?.onEdit) handlers.onEdit(e.detail.id);
});

window.addEventListener('taskDelete', (e) => {
  const handlers = window.taskHandlers;
  if (handlers?.onDelete) handlers.onDelete(e.detail.id);
});

window.addEventListener('dateClick', (e) => {
  const handler = window.dateClickHandler;
  if (handler) handler(e.detail.date);
});
