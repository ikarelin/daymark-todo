import {
  clearCompleted, createTask, deleteTask, filterTasks, getStats,
  readTasks, toggleTask, writeTasks,
} from './tasks.mjs';

const $ = (selector) => document.querySelector(selector);
const elements = {
  form: $('#task-form'),
  input: $('#task-input'),
  list: $('#task-list'),
  empty: $('#empty-state'),
  taskCount: $('#task-count'),
  statTotal: $('#stat-total'),
  statRemaining: $('#stat-remaining'),
  statCompleted: $('#stat-completed'),
  progressBar: $('#progress-bar'),
  progressLabel: $('#progress-label'),
  clear: $('#clear-completed'),
  filters: [...document.querySelectorAll('[data-filter]')],
  live: $('#live-region'),
  today: $('#today'),
  greeting: $('#greeting'),
};

let tasks = readTasks(window.localStorage);
let activeFilter = 'all';

const today = new Date();
elements.today.textContent = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(today);
const hour = today.getHours();
elements.greeting.textContent = hour < 12 ? 'Доброе утро!' : hour < 18 ? 'Добрый день!' : 'Добрый вечер!';

function announce(message) {
  elements.live.textContent = message;
}

function persist() {
  if (!writeTasks(window.localStorage, tasks)) {
    announce('Не удалось сохранить данные. Проверьте настройки браузера.');
  }
}

function makeTaskNode(task) {
  const li = document.createElement('li');
  li.className = `task-item${task.completed ? ' task-item--done' : ''}`;
  li.dataset.id = task.id;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'task-check';
  toggle.dataset.action = 'toggle';
  toggle.setAttribute('aria-label', task.completed ? `Вернуть в работу: ${task.title}` : `Отметить выполненной: ${task.title}`);
  toggle.setAttribute('aria-pressed', String(task.completed));
  toggle.textContent = task.completed ? '✓' : '';

  const body = document.createElement('div');
  body.className = 'task-body';
  const title = document.createElement('span');
  title.className = 'task-title';
  title.textContent = task.title;
  const meta = document.createElement('span');
  meta.className = 'task-meta';
  meta.textContent = task.completed ? 'Готово' : 'В работе';
  body.append(title, meta);

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'task-remove';
  remove.dataset.action = 'delete';
  remove.setAttribute('aria-label', `Удалить: ${task.title}`);
  remove.title = 'Удалить задачу';
  remove.textContent = '×';

  li.append(toggle, body, remove);
  return li;
}

function render() {
  const stats = getStats(tasks);
  elements.statTotal.textContent = stats.total;
  elements.statRemaining.textContent = stats.remaining;
  elements.statCompleted.textContent = stats.completed;
  elements.progressBar.style.width = `${stats.percent}%`;
  elements.progressBar.parentElement.setAttribute('aria-valuenow', String(stats.percent));
  elements.progressLabel.textContent = `${stats.percent}% выполнено`;

  const visible = filterTasks(tasks, activeFilter);
  elements.taskCount.textContent = `${visible.length} ${pluralTasks(visible.length)}`;
  elements.list.replaceChildren(...visible.map(makeTaskNode));
  elements.empty.hidden = visible.length !== 0;
  const emptyTitle = $('#empty-title');
  const emptyDesc = $('#empty-description');
  if (activeFilter === 'completed') {
    emptyTitle.textContent = 'Пока ничего не завершено';
    emptyDesc.textContent = 'Отмечайте готовые задачи — они появятся здесь.';
  } else if (activeFilter === 'active') {
    emptyTitle.textContent = 'Все задачи выполнены!';
    emptyDesc.textContent = 'Можно немного отдохнуть или добавить новую цель.';
  } else {
    emptyTitle.textContent = 'Планы начинаются здесь';
    emptyDesc.textContent = 'Добавьте первую задачу и сделайте день продуктивнее.';
  }
  elements.clear.hidden = stats.completed === 0;
  for (const button of elements.filters) {
    const active = button.dataset.filter === activeFilter;
    button.classList.toggle('filter--active', active);
    button.setAttribute('aria-pressed', String(active));
  }
}

function pluralTasks(number) {
  const mod100 = number % 100;
  const mod10 = number % 10;
  if (mod100 >= 11 && mod100 <= 14) return 'задач';
  if (mod10 === 1) return 'задача';
  if (mod10 >= 2 && mod10 <= 4) return 'задачи';
  return 'задач';
}

elements.form.addEventListener('submit', (event) => {
  event.preventDefault();
  const result = createTask(tasks, elements.input.value);
  if (result.error) {
    elements.input.setCustomValidity(result.error);
    elements.input.reportValidity();
    return;
  }
  tasks = result.tasks;
  elements.input.value = '';
  elements.input.setCustomValidity('');
  activeFilter = 'all';
  persist();
  render();
  announce('Задача добавлена');
  elements.input.focus();
});

elements.input.addEventListener('input', () => elements.input.setCustomValidity(''));

elements.list.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const taskId = button.closest('li[data-id]')?.dataset.id;
  if (!taskId) return;
  if (button.dataset.action === 'toggle') {
    tasks = toggleTask(tasks, taskId);
    announce('Статус задачи обновлён');
  } else {
    tasks = deleteTask(tasks, taskId);
    announce('Задача удалена');
  }
  persist();
  render();
});

for (const button of elements.filters) {
  button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    render();
  });
}

elements.clear.addEventListener('click', () => {
  tasks = clearCompleted(tasks);
  persist();
  render();
  announce('Выполненные задачи удалены');
});

window.addEventListener('storage', (event) => {
  if (event.key !== null && event.key !== 'daymark.tasks.v1') return;
  tasks = readTasks(window.localStorage);
  render();
});

render();
