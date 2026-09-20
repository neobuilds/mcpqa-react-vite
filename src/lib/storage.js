import { filterTasks, makeTask, applyChanges } from './taskModel.js'

const STORAGE_KEY = 'react-taskboard.tasks.v1'
const STORAGE_ERROR_KEY = 'react-taskboard.storage-error'

export function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description || '',
      status: t.status,
      priority: t.priority,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }))
  } catch {
    return []
  }
}

export function saveTasks(tasks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
    return { ok: true }
  } catch {
    const message = 'Could not save to localStorage (browser-only storage). Your changes may not persist.'
    try {
      localStorage.setItem(STORAGE_ERROR_KEY, message)
    } catch {}
    return { ok: false, message }
  }
}

export function storageError() {
  try {
    return localStorage.getItem(STORAGE_ERROR_KEY) || null
  } catch {
    return null
  }
}

export function clearStorageError() {
  try {
    localStorage.removeItem(STORAGE_ERROR_KEY)
  } catch {}
}

export function createTask(input) {
  const task = makeTask(input)
  const tasks = [...loadTasks(), task]
  const result = saveTasks(tasks)
  return { task, tasks, result }
}

export function updateTask(id, input) {
  const tasks = loadTasks()
  const next = tasks.map((t) => (t.id === id ? applyChanges(t, input) : t))
  const result = saveTasks(next)
  return { tasks: next, result }
}

export function deleteTask(id) {
  const next = loadTasks().filter((t) => t.id !== id)
  const result = saveTasks(next)
  return { tasks: next, result }
}

export function queryTasks({ query, status, priority }) {
  return filterTasks(loadTasks(), { query, status, priority })
}

export function countByStatus() {
  const counts = { todo: 0, in_progress: 0, done: 0 }
  for (const t of loadTasks()) {
    if (counts[t.status] !== undefined) counts[t.status] += 1
  }
  return counts
}

export function subscribeStore(listener) {
  window.addEventListener('storage', listener)
  return () => window.removeEventListener('storage', listener)
}