export const STORAGE_KEY = 'daymark.tasks.v1';
export const MAX_TITLE_LENGTH = 160;

export function normalizeTitle(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, MAX_TITLE_LENGTH) : '';
}

export function sanitizeTasks(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value
    .filter((task) => task && typeof task === 'object')
    .map((task) => ({
      id: typeof task.id === 'string' ? task.id : '',
      title: normalizeTitle(task.title),
      completed: task.completed === true,
      createdAt: Number.isFinite(task.createdAt) ? task.createdAt : Date.now(),
    }))
    .filter((task) => {
      if (!task.id || !task.title || seen.has(task.id)) return false;
      seen.add(task.id);
      return true;
    });
}

export function createTask(tasks, input, options = {}) {
  const title = normalizeTitle(input);
  if (!title) return { tasks, error: 'Введите название задачи' };
  const now = options.now ?? Date.now();
  const id = options.id ?? (globalThis.crypto?.randomUUID?.() ?? `${now}-${Math.random().toString(36).slice(2)}`);
  return { tasks: [{ id, title, completed: false, createdAt: now }, ...tasks], error: null };
}

export function toggleTask(tasks, id) {
  return tasks.map((task) => task.id === id ? { ...task, completed: !task.completed } : task);
}

export function deleteTask(tasks, id) {
  return tasks.filter((task) => task.id !== id);
}

export function clearCompleted(tasks) {
  return tasks.filter((task) => !task.completed);
}

export function filterTasks(tasks, filter) {
  if (filter === 'active') return tasks.filter((task) => !task.completed);
  if (filter === 'completed') return tasks.filter((task) => task.completed);
  return tasks;
}

export function getStats(tasks) {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  return { total, completed, remaining: total - completed, percent: total ? Math.round((completed / total) * 100) : 0 };
}

export function readTasks(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? sanitizeTasks(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function writeTasks(storage, tasks) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch {
    return false;
  }
}
