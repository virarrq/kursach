import { requireAuth, logout, supabase } from './auth.js';
import { taskAPI } from './api.js';
import { renderTasks, renderCalendar } from './ui.js';
import { debounce, formatDate, formatTime, getLocalDateStr } from './utils.js';
import { t, setLanguage, getCurrentLanguage } from './i18n.js';

let currentSession = null;
let tasks = [];
let currentView = 'all';
let currentFilters = {};
let currentDate = new Date();
let notifiedTasks = new Set();

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Generic Date Picker Factory ───────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function makeDatePicker({ wrapperId, inputId, triggerId, textId, popupId, placeholder, onChange }) {
  const wrapper  = document.getElementById(wrapperId);
  const input    = document.getElementById(inputId);
  const trigger  = document.getElementById(triggerId);
  const textEl   = document.getElementById(textId);
  const popup    = document.getElementById(popupId);
  let   month    = new Date();

  function open() {
    closeAllPickers(popupId);
    month = input.value ? new Date(input.value + 'T00:00:00') : new Date();
    render();
    // сбросить позицию перед расчётом
    popup.style.left = '';
    popup.style.right = '';
    popup.classList.add('active');
    // выровнять по правому краю если выходит за экран
    requestAnimationFrame(() => {
      const rect = popup.getBoundingClientRect();
      if (rect.right > window.innerWidth - 8) {
        popup.style.left = 'auto';
        popup.style.right = '0';
      }
    });
  }
  function close() { popup.classList.remove('active'); }
  function toggle() { popup.classList.contains('active') ? close() : open(); }

  function render() {
    const lang    = getCurrentLanguage();
    const locale  = lang === 'ru' ? 'ru-RU' : 'en-US';
    const year    = month.getFullYear();
    const mon     = month.getMonth();
    const firstDay     = new Date(year, mon, 1);
    const lastDate     = new Date(year, mon + 1, 0).getDate();
    const prevLastDate = new Date(year, mon, 0).getDate();
    const firstDow     = firstDay.getDay();
    const today        = getLocalDateStr();
    const selected     = input.value;
    const monthTitle   = firstDay.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    const dayHdrs = lang === 'ru'
      ? ['Вс','Пн','Вт','Ср','Чт','Пт','Сб']
      : ['Su','Mo','Tu','We','Th','Fr','Sa'];

    let html = `
      <div class="dp-header">
        <button type="button" class="dp-nav-btn" data-dp-nav="-1">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <span class="dp-month-title">${monthTitle}</span>
        <button type="button" class="dp-nav-btn" data-dp-nav="1">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
      <div class="dp-grid">
        ${dayHdrs.map(d => `<div class="dp-weekday">${d}</div>`).join('')}
    `;

    for (let i = firstDow - 1; i >= 0; i--)
      html += `<div class="dp-day dp-other">${prevLastDate - i}</div>`;

    for (let d = 1; d <= lastDate; d++) {
      const ds = `${year}-${String(mon + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const cls = ['dp-day', ds === today ? 'dp-today' : '', ds === selected ? 'dp-selected' : '']
        .filter(Boolean).join(' ');
      html += `<div class="${cls}" data-date="${ds}">${d}</div>`;
    }

    const tail = (firstDow + lastDate) % 7;
    for (let i = 1; i <= (tail ? 7 - tail : 0); i++)
      html += `<div class="dp-day dp-other">${i}</div>`;

    html += `</div>`;
    popup.innerHTML = html;

    popup.querySelectorAll('[data-dp-nav]').forEach(btn =>
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        month.setMonth(month.getMonth() + Number(btn.dataset.dpNav));
        render();
      })
    );

    popup.querySelectorAll('.dp-day:not(.dp-other)').forEach(day =>
      day.addEventListener('click', (e) => {
        e.stopPropagation();
        setValue(day.dataset.date);
        close();
      })
    );
  }

  function setValue(dateStr) {
    input.value = dateStr;
    const lang   = getCurrentLanguage();
    const locale = lang === 'ru' ? 'ru-RU' : 'en-US';
    if (dateStr) {
      const d = new Date(dateStr + 'T00:00:00');
      textEl.textContent = d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
      textEl.classList.remove('dp-placeholder');
    } else {
      textEl.textContent = placeholder
        || (lang === 'ru' ? 'Выберите дату' : 'Select date');
      textEl.classList.add('dp-placeholder');
    }
    if (onChange) onChange(dateStr);
  }

  trigger.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
  });
  document.addEventListener('click', (e) => { if (!wrapper.contains(e.target)) close(); });

  return { setValue, getValue: () => input.value, close };
}

// ─── Generic Time Picker Factory ───────────────────────────────────────────────
const TP_ITEM_H = 36; // px — высота одного элемента
const TP_PAD    = 2;  // spacer-элементов сверху и снизу

function makeTimePicker({ wrapperId, inputId, triggerId, textId, popupId, onChange }) {
  const wrapper  = document.getElementById(wrapperId);
  const input    = document.getElementById(inputId);
  const trigger  = document.getElementById(triggerId);
  const textEl   = document.getElementById(textId);
  const popup    = document.getElementById(popupId);

  function parseTime(str) {
    const [h, m] = (str || '09:00').split(':').map(Number);
    return [isNaN(h) ? 9 : h, isNaN(m) ? 0 : m];
  }

  function open() {
    closeAllPickers(popupId);
    render();
    popup.classList.add('active');
    const [h, m] = parseTime(input.value);
    requestAnimationFrame(() => {
      const hCol = popup.querySelector('.tp-h-col');
      const mCol = popup.querySelector('.tp-m-col');
      if (hCol) hCol.scrollTop = h * TP_ITEM_H;
      if (mCol) mCol.scrollTop = m * TP_ITEM_H;
    });
  }
  function close() { popup.classList.remove('active'); }
  function toggle() { popup.classList.contains('active') ? close() : open(); }

  function render() {
    const spacers = `<div class="tp-spacer"></div>`.repeat(TP_PAD);
    const hours   = Array.from({length: 24}, (_, i) => String(i).padStart(2, '0'));
    const minutes = Array.from({length: 60}, (_, i) => String(i).padStart(2, '0'));
    const mkItems = arr => spacers + arr.map(v => `<div class="tp-item">${v}</div>`).join('') + spacers;

    popup.innerHTML = `
      <div class="tp-inner">
        <div class="tp-select-bar"></div>
        <div class="tp-cols">
          <div class="tp-col tp-h-col">${mkItems(hours)}</div>
          <div class="tp-colon">:</div>
          <div class="tp-col tp-m-col">${mkItems(minutes)}</div>
        </div>
      </div>
    `;

    attachScrollSnap(popup.querySelector('.tp-h-col'), 23);
    attachScrollSnap(popup.querySelector('.tp-m-col'), 59);
  }

  function attachScrollSnap(col, max) {
    let snapTimer;
    col.addEventListener('scroll', () => {
      clearTimeout(snapTimer);
      snapTimer = setTimeout(() => {
        const idx = Math.min(max, Math.max(0, Math.round(col.scrollTop / TP_ITEM_H)));
        col.scrollTo({ top: idx * TP_ITEM_H, behavior: 'smooth' });
        readAndUpdate();
      }, 120);
    });
  }

  function readAndUpdate() {
    const hCol = popup.querySelector('.tp-h-col');
    const mCol = popup.querySelector('.tp-m-col');
    if (!hCol || !mCol) return;
    const h = Math.min(23, Math.max(0, Math.round(hCol.scrollTop / TP_ITEM_H)));
    const m = Math.min(59, Math.max(0, Math.round(mCol.scrollTop / TP_ITEM_H)));
    const str = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    input.value   = str;
    textEl.textContent = str;
    if (onChange) onChange(str);
  }

  function setValue(timeStr) {
    if (!timeStr) return;
    const clean = timeStr.slice(0, 5); // "HH:MM"
    input.value = clean;
    textEl.textContent = clean;
  }

  trigger.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
  });
  document.addEventListener('click', (e) => { if (!wrapper.contains(e.target)) close(); });

  return { setValue, getValue: () => input.value, close };
}

// Закрывает все попапы кроме указанного
function closeAllPickers(exceptId) {
  document.querySelectorAll('.date-picker-popup.active, .time-picker-popup.active').forEach(p => {
    if (p.id !== exceptId) p.classList.remove('active');
  });
}

// Инстансы пикеров (инициализируются в setupEventListeners)
let taskDatePicker, taskTimePicker, filterDatePicker;
// ═══════════════════════════════════════════════════════════════════════════════

// Инициализация приложения
async function init() {
  currentSession = await requireAuth();
  if (!currentSession) return;

  setupUI();
  setupEventListeners();
  await loadTasks();
  requestNotificationPermission();
  startNotificationCheck();
  updateFilterStyles();
}

// Настройка интерфейса
function setupUI() {
  const email = currentSession.user.email;
  const displayName = currentSession.user.user_metadata?.display_name;
  const avatarUrl = currentSession.user.user_metadata?.avatar_url;
  const userName = displayName || email.split('@')[0];
  const userInitial = userName[0].toUpperCase();
  
  // Устанавливаем email пользователя
  document.getElementById('userEmail').textContent = email;
  document.getElementById('userName').textContent = userName;
  
  // Устанавливаем аватар
  if (avatarUrl) {
    document.getElementById('userAvatar').style.backgroundImage = `url(${avatarUrl})`;
    document.getElementById('userAvatar').style.backgroundSize = 'cover';
    document.getElementById('userAvatar').style.backgroundPosition = 'center';
    document.getElementById('userAvatar').textContent = '';
  } else {
    document.getElementById('userAvatar').textContent = userInitial;
  }
  
  // Модальное окно профиля
  document.getElementById('profileNameDisplay').textContent = userName;
  if (avatarUrl) {
    document.getElementById('profileAvatarLarge').style.backgroundImage = `url(${avatarUrl})`;
    document.getElementById('profileAvatarLarge').style.backgroundSize = 'cover';
    document.getElementById('profileAvatarLarge').style.backgroundPosition = 'center';
    document.getElementById('profileAvatarLarge').textContent = '';
  } else {
    document.getElementById('profileAvatarLarge').textContent = userInitial;
  }
  
  // Устанавливаем язык интерфейса
  const currentLang = getCurrentLanguage();
  const currentFlagEl = document.getElementById('currentFlag');
  const currentTextEl = document.getElementById('currentLanguageText');
  
  if (currentFlagEl && currentTextEl) {
    if (currentLang === 'ru') {
      currentFlagEl.src = 'icons/ru.svg';
      currentFlagEl.alt = 'ru';
      currentTextEl.textContent = 'Русский';
    } else {
      currentFlagEl.src = 'icons/gb.svg';
      currentFlagEl.alt = 'en';
      currentTextEl.textContent = 'English';
    }
  }
  
  document.querySelectorAll('.lang-option').forEach(option => {
    option.classList.toggle('active', option.dataset.lang === currentLang);
  });
}

// Настройка обработчиков событий
function setupEventListeners() {
  // ── Pickers ──────────────────────────────────────────────────────────────
  taskDatePicker = makeDatePicker({
    wrapperId: 'taskDateWrapper', inputId: 'taskDate',
    triggerId: 'taskDateTrigger', textId: 'taskDateText', popupId: 'taskDatePopup',
  });

  taskTimePicker = makeTimePicker({
    wrapperId: 'taskTimeWrapper', inputId: 'taskTime',
    triggerId: 'taskTimeTrigger', textId: 'taskTimeText', popupId: 'taskTimePopup',
  });

  filterDatePicker = makeDatePicker({
    wrapperId: 'filterDateWrapper', inputId: 'filterDate',
    triggerId: 'filterDateTrigger', textId: 'filterDateText', popupId: 'filterDatePopup',
    placeholder: t('date') || 'Date',
    onChange: () => { currentFilters = getActiveFilters(); loadTasks(currentFilters); updateFilterStyles(); },
  });
  filterDatePicker.setValue('');

  // Боковая панель
  document.getElementById('sidebarToggle')?.addEventListener('click', toggleSidebar);
  document.getElementById('mobileSidebarToggle').addEventListener('click', toggleMobileSidebar);
  document.getElementById('sidebarCloseBtn')?.addEventListener('click', closeMobileSidebar);
  document.getElementById('sidebarOverlay')?.addEventListener('click', closeMobileSidebar);
  
  // Закрываем боковую панель при клике вне её на мобильных
  document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const mobileSidebarToggle = document.getElementById('mobileSidebarToggle');
    
    if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
      if (!sidebar.contains(e.target) && !mobileSidebarToggle.contains(e.target)) {
        closeMobileSidebar();
      }
    }
  });
  
  // Навигация по разделам
  document.querySelectorAll('.sidebar-item[data-view]').forEach(item => {
    item.addEventListener('click', () => handleViewChange(item.dataset.view));
  });
  
  document.querySelectorAll('.sidebar-item[data-filter]').forEach(item => {
    item.addEventListener('click', () => {
      const filter = item.dataset.filter;
      const value = item.dataset.value;
      handleQuickFilter(filter, value);
    });
  });
  
  // Меню пользователя
  document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent opening profile modal
    logout();
  });
  document.querySelector('.sidebar-user').addEventListener('click', openProfileModal);
  
  // Панель инструментов
  document.getElementById('addTaskBtn').addEventListener('click', () => openTaskModal());
  document.getElementById('searchInput').addEventListener('input', debounce(handleSearch, 300));
  // Мобильный поиск — синхронизируем с основным инпутом
  document.getElementById('searchInputMobile')?.addEventListener('input', debounce((e) => {
    document.getElementById('searchInput').value = e.target.value;
    handleSearch(e);
  }, 300));
  document.getElementById('filterStatus').addEventListener('change', handleFilters);
  document.getElementById('filterPriority').addEventListener('change', handleFilters);
  document.getElementById('clearFilters').addEventListener('click', clearFilters);
  
  // Модальное окно задачи
  document.getElementById('taskForm').addEventListener('submit', handleTaskSubmit);
  document.getElementById('cancelBtn').addEventListener('click', closeTaskModal);
  document.getElementById('modalClose').addEventListener('click', closeTaskModal);
  
  // Модальное окно подтверждения удаления
  document.getElementById('cancelDeleteBtn').addEventListener('click', closeConfirmDeleteModal);
  document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);
  
  // Навигация по календарю
  document.getElementById('prevMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar(currentDate, tasks, handleDateClick);
  });
  
  document.getElementById('nextMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar(currentDate, tasks, handleDateClick);
  });
  
  // Close modal on backdrop click
  document.getElementById('taskModal').addEventListener('click', (e) => {
    if (e.target.id === 'taskModal') closeTaskModal();
  });
  
  document.getElementById('confirmDeleteModal').addEventListener('click', (e) => {
    if (e.target.id === 'confirmDeleteModal') closeConfirmDeleteModal();
  });
  
  // Profile modal
  document.getElementById('profileModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'profileModal') closeProfileModal();
  });
  
  document.getElementById('profileClose')?.addEventListener('click', closeProfileModal);
  document.getElementById('editNameBtn')?.addEventListener('click', showNameEditForm);
  document.getElementById('cancelNameBtn')?.addEventListener('click', hideNameEditForm);
  document.getElementById('profileNameForm')?.addEventListener('submit', updateDisplayName);
  document.getElementById('uploadAvatarBtn')?.addEventListener('click', () => {
    document.getElementById('avatarInput').click();
  });
  document.getElementById('avatarInput')?.addEventListener('change', uploadAvatar);
  
  // Language selector
  document.getElementById('languageSelectorBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleLanguageDropdown();
  });
  document.querySelectorAll('.lang-option').forEach(option => {
    option.addEventListener('click', (e) => {
      const lang = e.currentTarget.dataset.lang;
      setLanguage(lang);
      closeLangDropdown();
      loadTasks(getActiveFilters());
    });
  });
  
  // Close language dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const languageSwitcher = document.querySelector('.language-switcher');
    if (languageSwitcher && !languageSwitcher.contains(e.target)) {
      closeLangDropdown();
    }
  });
  
  // Initialize language on load
  setLanguage(getCurrentLanguage());
}

// Sidebar toggle
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('collapsed');
}

function toggleMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('active');
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.remove('open');
  overlay.classList.remove('active');
}

// View management
function handleViewChange(view) {
  currentView = view;
  
  // Update active state
  document.querySelectorAll('.sidebar-item[data-view]').forEach(item => {
    item.classList.toggle('active', item.dataset.view === view);
  });
  
  // Update page title
  const titles = {
    all: t('all'),
    today: t('today'),
    upcoming: t('upcoming'),
    calendar: t('calendar')
  };
  const pageTitleEl = document.getElementById('pageTitle');
  pageTitleEl.textContent = titles[view];
  pageTitleEl.dataset.view = view;
  
  // Show/hide containers
  const tasksContainer = document.getElementById('tasksContainer');
  const calendarContainer = document.getElementById('calendarContainer');
  const toolbar = document.querySelector('.toolbar');
  const filterDateWrapper = document.getElementById('filterDateWrapper');

  if (view === 'calendar') {
    tasksContainer.style.display = 'none';
    calendarContainer.style.display = 'block';
    toolbar.style.display = 'none';
    renderCalendar(currentDate, tasks, handleDateClick);
  } else {
    tasksContainer.style.display = 'block';
    calendarContainer.style.display = 'none';
    toolbar.style.display = 'flex';

    if (view === 'today' || view === 'upcoming') {
      if (filterDateWrapper) filterDateWrapper.style.display = 'none';
      delete currentFilters.date;
      filterDatePicker.setValue('');
      updateFilterStyles();
    } else {
      if (filterDateWrapper) filterDateWrapper.style.display = '';
    }

    applyViewFilter();
  }
  
  // Close mobile sidebar after selection
  if (window.innerWidth <= 768) {
    closeMobileSidebar();
  }
}

function applyViewFilter() {
  const today = getLocalDateStr();
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = getLocalDateStr(tomorrowDate);
  
  // Start with all tasks
  let filteredTasks = [...tasks];
  
  // Apply view-specific date filtering
  switch (currentView) {
    case 'today':
      filteredTasks = filteredTasks.filter(t => t.date === today);
      break;
    case 'upcoming':
      filteredTasks = filteredTasks.filter(t => t.date >= tomorrowStr);
      break;
    case 'all':
      // For 'all' view, apply manual filters from currentFilters
      // This allows date filtering in 'all' view
      break;
  }
  
  // Apply additional filters (status, priority, search) but NOT date for today/upcoming
  if (currentFilters.status) {
    filteredTasks = filteredTasks.filter(t => t.status === currentFilters.status);
  }
  
  if (currentFilters.priority) {
    filteredTasks = filteredTasks.filter(t => t.priority === currentFilters.priority);
  }
  
  if (currentFilters.search) {
    const searchLower = currentFilters.search.toLowerCase();
    filteredTasks = filteredTasks.filter(t => 
      t.title.toLowerCase().includes(searchLower) || 
      (t.description && t.description.toLowerCase().includes(searchLower))
    );
  }
  
  renderTasks(filteredTasks);
  
  // Set up global handlers for UI events
  window.taskHandlers = {
    onToggle: handleToggleStatus,
    onEdit: handleEditTask,
    onDelete: handleDeleteTask
  };
  window.dateClickHandler = handleDateClick;
}

function handleQuickFilter(filter, value) {
  currentFilters = { [filter]: value };
  document.getElementById(`filter${filter.charAt(0).toUpperCase() + filter.slice(1)}`).value = value;
  loadTasks(currentFilters);
  
  // Close mobile sidebar after selection
  if (window.innerWidth <= 768) {
    closeMobileSidebar();
  }
}

// User menu
function handleUserMenu(e) {
  // Removed - logout button now has its own handler
}

// Load tasks
async function loadTasks(filters = {}) {
  try {
    // For today/upcoming views, don't pass date filter to API
    // We'll filter on the client side
    const apiFilters = { ...filters };
    if (currentView === 'today' || currentView === 'upcoming') {
      delete apiFilters.date;
    }
    
    tasks = await taskAPI.getAll(apiFilters);
    
    if (currentView === 'calendar') {
      renderCalendar(currentDate, tasks, handleDateClick);
    } else {
      applyViewFilter();
    }
    
    // Set up global handlers after loading tasks
    window.taskHandlers = {
      onToggle: handleToggleStatus,
      onEdit: handleEditTask,
      onDelete: handleDeleteTask
    };
    window.dateClickHandler = handleDateClick;
  } catch (error) {
    console.error('Failed to load tasks:', error);
    showError(t('failedToLoadTasks'));
  }
}

// Search and filters
function handleSearch(e) {
  const search = e.target.value;
  currentFilters = getActiveFilters();
  if (search) currentFilters.search = search;
  loadTasks(currentFilters);
  updateFilterStyles();
}

function handleFilters() {
  currentFilters = getActiveFilters();
  loadTasks(currentFilters);
  updateFilterStyles();
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
  filterDatePicker.setValue('');
  document.getElementById('searchInput').value = '';
  const mob = document.getElementById('searchInputMobile');
  if (mob) mob.value = '';
  currentFilters = {};
  loadTasks();
  updateFilterStyles();
}

function updateFilterStyles() {
  const statusSelect = document.getElementById('filterStatus');
  const prioritySelect = document.getElementById('filterPriority');
  const dateInput = document.getElementById('filterDate');
  const filterTrigger = document.getElementById('filterDateTrigger');

  statusSelect.classList.toggle('has-value', statusSelect.value !== '');
  prioritySelect.classList.toggle('has-value', prioritySelect.value !== '');
  if (filterTrigger) filterTrigger.classList.toggle('has-value', dateInput.value !== '');
}

// Calendar
function handleDateClick(date) {
  filterDatePicker.setValue(date);
  currentView = 'all';
  handleViewChange('all');
  handleFilters();
}

// Task modal
function openTaskModal(task = null) {
  const modal = document.getElementById('taskModal');
  const form = document.getElementById('taskForm');
  
  form.reset();
  
  // Update modal labels
  document.querySelectorAll('#taskModal .form-label')[0].innerHTML = `${t('title')}<span style="color: var(--danger); margin-left: 0.25rem;">*</span>`;
  document.querySelectorAll('#taskModal .form-label')[1].textContent = t('description');
  document.querySelectorAll('#taskModal .form-label')[2].innerHTML = `${t('date')}<span style="color: var(--danger); margin-left: 0.25rem;">*</span>`;
  document.querySelectorAll('#taskModal .form-label')[3].innerHTML = `${t('time')}<span style="color: var(--danger); margin-left: 0.25rem;">*</span>`;
  document.querySelectorAll('#taskModal .form-label')[4].textContent = t('priority');
  document.querySelectorAll('#taskModal .form-label')[5].textContent = t('status');
  
  // Update placeholders
  document.getElementById('taskTitle').placeholder = t('titlePlaceholder');
  document.getElementById('taskDescription').placeholder = t('descriptionPlaceholder');
  
  // Update select options
  const prioritySelect = document.getElementById('taskPriority');
  prioritySelect.options[0].text = t('low');
  prioritySelect.options[1].text = t('medium');
  prioritySelect.options[2].text = t('high');
  
  const statusSelect = document.getElementById('taskStatus');
  statusSelect.options[0].text = t('pending');
  statusSelect.options[1].text = t('completed');
  
  // Update buttons
  document.getElementById('cancelBtn').textContent = t('cancel');
  document.querySelector('#taskForm button[type="submit"]').textContent = t('saveTask');
  
  if (task) {
    document.getElementById('modalTitle').textContent = t('editTaskTitle');
    document.getElementById('taskId').value = task.id;
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDescription').value = task.description || '';
    taskDatePicker.setValue(task.date);
    taskTimePicker.setValue(task.time.slice(0, 5));
    document.getElementById('taskPriority').value = task.priority;
    document.getElementById('taskStatus').value = task.status;
  } else {
    document.getElementById('modalTitle').textContent = t('newTaskTitle');
    document.getElementById('taskId').value = '';
    taskDatePicker.setValue(getLocalDateStr());
    taskTimePicker.setValue('09:00');
  }
  
  modal.classList.add('active');
}

function closeTaskModal() {
  document.getElementById('taskModal').classList.remove('active');
}

async function handleTaskSubmit(e) {
  e.preventDefault();

  const dateVal = document.getElementById('taskDate').value;
  if (!dateVal) {
    const trigger = document.getElementById('taskDateTrigger');
    trigger.classList.add('dp-error');
    setTimeout(() => trigger.classList.remove('dp-error'), 1500);
    showError(t('dateRequired') || 'Date is required');
    return;
  }

  const taskId = document.getElementById('taskId').value;
  const taskData = {
    title: document.getElementById('taskTitle').value,
    description: document.getElementById('taskDescription').value,
    date: dateVal,
    time: document.getElementById('taskTime').value,
    priority: document.getElementById('taskPriority').value,
    status: document.getElementById('taskStatus').value
  };

  try {
    if (taskId) {
      await taskAPI.update(taskId, taskData);
    } else {
      await taskAPI.create(taskData);
    }
    
    closeTaskModal();
    await loadTasks(currentFilters);
    showSuccess(taskId ? t('taskUpdated') : t('taskCreated'));
  } catch (error) {
    console.error('Failed to save task:', error);
    showError(t('failedToSaveTask') + ': ' + error.message);
  }
}

// Task actions
async function handleToggleStatus(id, currentStatus) {
  const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
  
  try {
    await taskAPI.updateStatus(id, newStatus);
    await loadTasks(currentFilters);
  } catch (error) {
    console.error('Failed to update status:', error);
    showError(t('failedToUpdateStatus'));
  }
}

function handleEditTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) openTaskModal(task);
}

let taskToDelete = null;

async function handleDeleteTask(id) {
  taskToDelete = id;
  
  // Update delete modal text
  document.getElementById('deleteModalTitle').textContent = t('deleteTask');
  document.getElementById('deleteModalDescription').textContent = t('deleteConfirmation');
  document.getElementById('cancelDeleteBtn').textContent = t('cancel');
  document.getElementById('confirmDeleteBtn').textContent = t('delete');
  
  document.getElementById('confirmDeleteModal').classList.add('active');
}

function closeConfirmDeleteModal() {
  document.getElementById('confirmDeleteModal').classList.remove('active');
  taskToDelete = null;
}

async function confirmDelete() {
  if (!taskToDelete) return;
  
  try {
    await taskAPI.delete(taskToDelete);
    closeConfirmDeleteModal();
    await loadTasks(currentFilters);
    showSuccess(t('taskDeleted'));
  } catch (error) {
    console.error('Failed to delete task:', error);
    showError(t('failedToDeleteTask'));
  }
}

// Profile modal
function openProfileModal() {
  const modal = document.getElementById('profileModal');
  const user = currentSession.user;
  const displayName = user.user_metadata?.display_name;
  const userName = displayName || user.email.split('@')[0];
  
  // Update modal title
  document.querySelector('#profileModal .modal-title').textContent = t('profile');
  
  // Update labels
  document.querySelectorAll('#profileModal .profile-info-label')[0].textContent = t('email');
  document.querySelectorAll('#profileModal .profile-info-label')[1].textContent = t('userId');
  document.querySelectorAll('#profileModal .profile-info-label')[2].textContent = t('memberSince');
  
  // Update button text
  document.getElementById('editNameBtn').innerHTML = `
    <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
    </svg>
    ${t('editName')}
  `;
  
  // Update form labels
  document.querySelector('label[for="profileNameInput"]').textContent = t('displayName');
  document.getElementById('cancelNameBtn').textContent = t('cancel');
  document.querySelector('#profileNameForm button[type="submit"]').textContent = t('save');
  
  document.getElementById('profileNameDisplay').textContent = userName;
  document.getElementById('profileEmail').textContent = user.email;
  document.getElementById('profileUserId').textContent = user.id;
  document.getElementById('profileCreated').textContent = new Date(user.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Reset form
  document.getElementById('profileNameForm').style.display = 'none';
  document.querySelector('.profile-section h3').style.display = 'block';
  document.getElementById('editNameBtn').style.display = 'inline-flex';
  
  modal.classList.add('active');
}

function closeProfileModal() {
  document.getElementById('profileModal').classList.remove('active');
}

function showNameEditForm() {
  const displayName = currentSession.user.user_metadata?.display_name;
  const currentName = displayName || currentSession.user.email.split('@')[0];
  
  document.getElementById('profileNameInput').value = currentName;
  document.getElementById('profileNameForm').style.display = 'block';
  document.querySelector('.profile-section h3').style.display = 'none';
  document.getElementById('editNameBtn').style.display = 'none';
  document.getElementById('profileNameInput').focus();
}

function hideNameEditForm() {
  document.getElementById('profileNameForm').style.display = 'none';
  document.querySelector('.profile-section h3').style.display = 'block';
  document.getElementById('editNameBtn').style.display = 'inline-flex';
}

async function updateDisplayName(e) {
  e.preventDefault();
  
  const newName = document.getElementById('profileNameInput').value.trim();
  
  if (!newName) {
    showError(t('nameCannotBeEmpty'));
    return;
  }
  
  try {
    // Update user metadata in Supabase
    const { data: authData } = await supabase.auth.getSession();
    
    const { data, error } = await supabase.auth.updateUser({
      data: { display_name: newName }
    });
    
    if (error) throw error;
    
    // Update current session
    currentSession = await supabase.auth.getSession();
    currentSession = currentSession.data.session;
    
    // Update UI
    const userInitial = newName[0].toUpperCase();
    document.getElementById('userName').textContent = newName;
    
    // Only update avatar text if no image
    const avatarUrl = currentSession.user.user_metadata?.avatar_url;
    if (!avatarUrl) {
      document.getElementById('userAvatar').textContent = userInitial;
      document.getElementById('profileAvatarLarge').textContent = userInitial;
    }
    
    document.getElementById('profileNameDisplay').textContent = newName;
    
    hideNameEditForm();
    showSuccess(t('nameUpdated'));
  } catch (error) {
    console.error('Failed to update name:', error);
    showError(t('failedToUpdateName') + ': ' + error.message);
  }
}

async function uploadAvatar(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  // Validate file
  if (!file.type.startsWith('image/')) {
    showError(t('invalidFileType'));
    return;
  }
  
  if (file.size > 2 * 1024 * 1024) { // 2MB
    showError(t('fileTooLarge'));
    return;
  }
  
  try {
    const userId = currentSession.user.id;
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}.${fileExt}`;
    const filePath = `avatars/${fileName}`;
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });
    
    if (uploadError) throw uploadError;
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);
    
    const avatarUrl = urlData.publicUrl;
    
    // Update user metadata
    const { error: updateError } = await supabase.auth.updateUser({
      data: { avatar_url: avatarUrl }
    });
    
    if (updateError) throw updateError;
    
    // Update current session
    currentSession = await supabase.auth.getSession();
    currentSession = currentSession.data.session;
    
    // Update UI
    document.getElementById('userAvatar').style.backgroundImage = `url(${avatarUrl})`;
    document.getElementById('userAvatar').style.backgroundSize = 'cover';
    document.getElementById('userAvatar').style.backgroundPosition = 'center';
    document.getElementById('userAvatar').textContent = '';
    
    document.getElementById('profileAvatarLarge').style.backgroundImage = `url(${avatarUrl})`;
    document.getElementById('profileAvatarLarge').style.backgroundSize = 'cover';
    document.getElementById('profileAvatarLarge').style.backgroundPosition = 'center';
    document.getElementById('profileAvatarLarge').textContent = '';
    
    showSuccess(t('avatarUpdated'));
  } catch (error) {
    console.error('Failed to upload avatar:', error);
    showError(t('failedToUploadAvatar') + ': ' + error.message);
  }
}

// Language dropdown
function toggleLanguageDropdown() {
  const dropdown = document.getElementById('languageDropdown');
  const arrow = document.querySelector('.lang-arrow');
  dropdown.classList.toggle('active');
  
  // Rotate arrow
  if (dropdown.classList.contains('active')) {
    arrow.style.transform = 'rotate(180deg)';
  } else {
    arrow.style.transform = 'rotate(0deg)';
  }
}

function closeLangDropdown() {
  const dropdown = document.getElementById('languageDropdown');
  const arrow = document.querySelector('.lang-arrow');
  dropdown.classList.remove('active');
  arrow.style.transform = 'rotate(0deg)';
}

// Notifications
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

let lastOverdueCount = -1;

function startNotificationCheck() {
  checkUpcomingTasks();
  checkOverdueTasks();
  setInterval(() => {
    checkUpcomingTasks();
    checkOverdueTasks();
  }, 30000); // каждые 30 секунд
}

// Обновляет карточки задач когда срок истёк (без перезагрузки страницы)
function checkOverdueTasks() {
  if (currentView === 'calendar') return;
  const now = new Date();
  const overdueCount = tasks.filter(task =>
    task.status !== 'completed' &&
    new Date(`${task.date}T${task.time}`) < now
  ).length;

  if (overdueCount !== lastOverdueCount) {
    lastOverdueCount = overdueCount;
    applyViewFilter();
  }
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
    handleEditTask(task.id);
    notification.close();
  };
}

// Toast notifications
function showSuccess(message) {
  showToast(message, 'success');
}

function showError(message) {
  showToast(message, 'error');
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    padding: 1rem 1.5rem;
    background: ${type === 'success' ? 'var(--success)' : 'var(--danger)'};
    color: white;
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    z-index: 9999;
    animation: slideInRight 0.3s ease;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Initialize
init();
