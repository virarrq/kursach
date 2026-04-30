// Переводы интерфейса
const translations = {
  en: {
    // Sidebar
    allTasks: 'All Tasks',
    all: 'All Tasks',
    today: 'Today',
    upcoming: 'Upcoming',
    calendar: 'Calendar',
    highPriority: 'High Priority',
    mediumPriority: 'Medium Priority',
    lowPriority: 'Low Priority',
    
    // Header
    searchPlaceholder: 'Search tasks...',
    newTask: 'New Task',
    
    // Filters
    status: 'Status',
    priority: 'Priority',
    pending: 'Pending',
    completed: 'Completed',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    
    // Task Modal
    newTaskTitle: 'New Task',
    editTaskTitle: 'Edit Task',
    title: 'Title',
    description: 'Description',
    date: 'Date',
    time: 'Time',
    cancel: 'Cancel',
    saveTask: 'Save Task',
    titlePlaceholder: 'Enter task title',
    descriptionPlaceholder: 'Add description (optional)',
    
    // Empty State
    noTasksFound: 'No tasks found',
    createFirstTask: 'Create your first task to get started',
    
    // Profile
    profile: 'Profile',
    editName: 'Edit Name',
    displayName: 'Display Name',
    email: 'Email',
    userId: 'User ID',
    memberSince: 'Member Since',
    save: 'Save',
    
    // Delete Confirmation
    deleteTask: 'Delete Task?',
    deleteConfirmation: 'This action cannot be undone. The task will be permanently deleted.',
    delete: 'Delete',
    
    // Messages
    taskCreated: 'Task created!',
    taskUpdated: 'Task updated!',
    taskDeleted: 'Task deleted!',
    nameUpdated: 'Name updated successfully!',
    avatarUpdated: 'Avatar updated successfully!',
    failedToLoadTasks: 'Failed to load tasks',
    failedToSaveTask: 'Failed to save task',
    failedToDeleteTask: 'Failed to delete task',
    failedToUpdateStatus: 'Failed to update status',
    failedToUpdateName: 'Failed to update name',
    failedToUploadAvatar: 'Failed to upload avatar',
    nameCannotBeEmpty: 'Name cannot be empty',
    fileTooLarge: 'File is too large. Maximum size is 2MB',
    invalidFileType: 'Invalid file type. Please upload an image',
    overdue: 'OVERDUE'
  },
  ru: {
    // Sidebar
    allTasks: 'Все задачи',
    all: 'Все задачи',
    today: 'Сегодня',
    upcoming: 'Предстоящие',
    calendar: 'Календарь',
    highPriority: 'Высокий приоритет',
    mediumPriority: 'Средний приоритет',
    lowPriority: 'Низкий приоритет',
    
    // Header
    searchPlaceholder: 'Поиск задач...',
    newTask: 'Новая задача',
    
    // Filters
    status: 'Статус',
    priority: 'Приоритет',
    pending: 'В ожидании',
    completed: 'Завершено',
    low: 'Низкий',
    medium: 'Средний',
    high: 'Высокий',
    
    // Task Modal
    newTaskTitle: 'Новая задача',
    editTaskTitle: 'Редактировать задачу',
    title: 'Название',
    description: 'Описание',
    date: 'Дата',
    time: 'Время',
    cancel: 'Отмена',
    saveTask: 'Сохранить',
    titlePlaceholder: 'Введите название задачи',
    descriptionPlaceholder: 'Добавьте описание (необязательно)',
    
    // Empty State
    noTasksFound: 'Задачи не найдены',
    createFirstTask: 'Создайте первую задачу для начала работы',
    
    // Profile
    profile: 'Профиль',
    editName: 'Изменить имя',
    displayName: 'Отображаемое имя',
    email: 'Email',
    userId: 'ID пользователя',
    memberSince: 'Участник с',
    save: 'Сохранить',
    
    // Delete Confirmation
    deleteTask: 'Удалить задачу?',
    deleteConfirmation: 'Это действие нельзя отменить. Задача будет удалена навсегда.',
    delete: 'Удалить',
    
    // Messages
    taskCreated: 'Задача создана!',
    taskUpdated: 'Задача обновлена!',
    taskDeleted: 'Задача удалена!',
    nameUpdated: 'Имя успешно обновлено!',
    avatarUpdated: 'Аватар успешно обновлен!',
    failedToLoadTasks: 'Не удалось загрузить задачи',
    failedToSaveTask: 'Не удалось сохранить задачу',
    failedToDeleteTask: 'Не удалось удалить задачу',
    failedToUpdateStatus: 'Не удалось обновить статус',
    failedToUpdateName: 'Не удалось обновить имя',
    failedToUploadAvatar: 'Не удалось загрузить аватар',
    nameCannotBeEmpty: 'Имя не может быть пустым',
    fileTooLarge: 'Файл слишком большой. Максимальный размер 2МБ',
    invalidFileType: 'Неверный тип файла. Пожалуйста, загрузите изображение',
    overdue: 'ПРОСРОЧЕНО'
  }
};

let currentLanguage = localStorage.getItem('language') || 'en';

export function t(key) {
  return translations[currentLanguage][key] || key;
}

export function setLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem('language', lang);
  updateUI();
  
  // Update language selector button
  const currentTextEl = document.getElementById('currentLanguageText');
  
  if (currentTextEl) {
    currentTextEl.textContent = lang.toUpperCase();
  }
  
  // Update active state in dropdown
  document.querySelectorAll('.lang-option').forEach(option => {
    option.classList.toggle('active', option.dataset.lang === lang);
  });
}

export function getCurrentLanguage() {
  return currentLanguage;
}

function updateUI() {
  // Update all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      element.placeholder = t(key);
    } else {
      element.textContent = t(key);
    }
  });
  
  // Update dynamic content
  updateDynamicTranslations();
}

function updateDynamicTranslations() {
  // Update page title based on current view
  const pageTitle = document.getElementById('pageTitle');
  if (pageTitle) {
    const currentView = pageTitle.dataset.view || 'all';
    const titles = {
      all: t('all'),
      today: t('today'),
      upcoming: t('upcoming'),
      calendar: t('calendar')
    };
    pageTitle.textContent = titles[currentView] || t('all');
  }
  
  // Update button texts
  const addTaskBtn = document.getElementById('addTaskBtn');
  if (addTaskBtn) {
    const btnText = addTaskBtn.querySelector('.btn-text');
    if (btnText) {
      btnText.textContent = t('newTask');
    }
  }
  
  // Update search placeholder (десктоп и мобильный)
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.placeholder = t('searchPlaceholder');
  const searchInputMobile = document.getElementById('searchInputMobile');
  if (searchInputMobile) searchInputMobile.placeholder = t('searchPlaceholder');
  
  // Update empty state if visible
  const emptyState = document.querySelector('.empty-state');
  if (emptyState) {
    const title = emptyState.querySelector('.empty-state-title');
    const description = emptyState.querySelector('.empty-state-description');
    if (title) title.textContent = t('noTasksFound');
    if (description) description.textContent = t('createFirstTask');
  }
  
  // Update filter options
  updateFilterTranslations();
  
  // Update sidebar items
  updateSidebarTranslations();
}


function updateFilterTranslations() {
  // Status filter
  const statusFilter = document.getElementById('filterStatus');
  if (statusFilter) {
    statusFilter.options[0].text = t('status');
    statusFilter.options[1].text = t('pending');
    statusFilter.options[2].text = t('completed');
  }
  
  // Priority filter
  const priorityFilter = document.getElementById('filterPriority');
  if (priorityFilter) {
    priorityFilter.options[0].text = t('priority');
    priorityFilter.options[1].text = t('low');
    priorityFilter.options[2].text = t('medium');
    priorityFilter.options[3].text = t('high');
  }
}

function updateSidebarTranslations() {
  // Main section
  const sidebarItems = document.querySelectorAll('.sidebar-item[data-view]');
  sidebarItems.forEach(item => {
    const view = item.dataset.view;
    const textElement = item.querySelector('.sidebar-item-text');
    if (textElement) {
      // Use 'all' key for 'all' view, otherwise use view name directly
      const key = view === 'all' ? 'all' : view;
      textElement.textContent = t(key);
    }
  });
  
  // Priority section
  const priorityItems = document.querySelectorAll('.sidebar-item[data-filter="priority"]');
  priorityItems.forEach(item => {
    const value = item.dataset.value;
    const textElement = item.querySelector('.sidebar-item-text');
    if (textElement) {
      textElement.textContent = t(value + 'Priority');
    }
  });
}
