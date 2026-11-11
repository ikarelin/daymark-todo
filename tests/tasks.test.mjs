import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTask, toggleTask, deleteTask, clearCompleted, filterTasks,
  getStats, readTasks, writeTasks, sanitizeTasks, normalizeTitle, STORAGE_KEY,
} from '../src/tasks.mjs';

test('создаёт задачу с нормализованным названием', () => {
  const result = createTask([], '  Купить   молоко  ', { id: '1', now: 100 });
  assert.deepEqual(result.tasks, [{ id: '1', title: 'Купить молоко', completed: false, createdAt: 100 }]);
});

test('не добавляет пустые задачи', () => {
  const result = createTask([], '   ');
  assert.equal(result.tasks.length, 0);
  assert.equal(result.error, 'Введите название задачи');
});

test('соблюдает ограничение длины названия', () => {
  assert.equal(normalizeTitle('x'.repeat(300)).length, 160);
});

test('переключает статус задачи в обе стороны и не мутирует исходный массив', () => {
  const original = createTask([], 'Задача', { id: 'a' }).tasks;
  const done = toggleTask(original, 'a');
  assert.equal(done[0].completed, true);
  assert.equal(original[0].completed, false);
  assert.equal(toggleTask(done, 'a')[0].completed, false);
});

test('удаляет одну задачу, остальные сохраняет', () => {
  const tasks = [{ id: 'a' }, { id: 'b' }];
  assert.deepEqual(deleteTask(tasks, 'a'), [{ id: 'b' }]);
});

test('очищает только завершённые задачи', () => {
  const tasks = [{ id: 'a', completed: true }, { id: 'b', completed: false }];
  assert.deepEqual(clearCompleted(tasks), [{ id: 'b', completed: false }]);
});

test('фильтры отображают ожидаемые задачи', () => {
  const tasks = [{ completed: false }, { completed: true }];
  assert.equal(filterTasks(tasks, 'all').length, 2);
  assert.equal(filterTasks(tasks, 'active').length, 1);
  assert.equal(filterTasks(tasks, 'completed').length, 1);
});

test('считает статистику и процент', () => {
  const tasks = [{ completed: true }, { completed: false }, { completed: false }];
  assert.deepEqual(getStats(tasks), { total: 3, completed: 1, remaining: 2, percent: 33 });
  assert.deepEqual(getStats([]), { total: 0, completed: 0, remaining: 0, percent: 0 });
});

test('задачи сохраняются и восстанавливаются после перезагрузки', () => {
  const map = new Map();
  const storage = { getItem: (key) => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) };
  const tasks = createTask([], 'Сохранённая задача', { id: '1', now: 123 }).tasks;
  assert.equal(writeTasks(storage, tasks), true);
  assert.equal(map.has(STORAGE_KEY), true);
  assert.deepEqual(readTasks(storage), tasks);
});

test('повреждённые записи localStorage не ломают приложение', () => {
  assert.deepEqual(readTasks({ getItem: () => '{broken json' }), []);
  assert.deepEqual(readTasks({ getItem: () => { throw new Error('denied'); } }), []);
  assert.equal(writeTasks({ setItem: () => { throw new Error('denied'); } }, []), false);
});

test('игнорирует некорректные и дублирующиеся записи из хранилища', () => {
  const result = sanitizeTasks([{ id: 'a', title: 'Задача', completed: true, createdAt: 123 }, { id: 'a', title: 'Дубль' }, { id: '', title: 'Bad' }, { id: 'b', title: '   ' }]);
  assert.deepEqual(result, [{ id: 'a', title: 'Задача', completed: true, createdAt: 123 }]);
});
