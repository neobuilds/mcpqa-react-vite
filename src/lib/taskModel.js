export const STATUSES = [
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
]

export const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

export const STATUS_VALUES = new Set(STATUSES.map((s) => s.value))
export const PRIORITY_VALUES = new Set(PRIORITIES.map((p) => p.value))
export const ID_FORBIDDEN = /[^a-z0-9-]/g

export const LIMITS = {
  title: 120,
  description: 5000,
}

export function isTitleValid(title) {
  return typeof title === 'string' && title.trim().length > 0 && title.trim().length <= LIMITS.title
}

export function isDescriptionValid(description) {
  return description === '' || (typeof description === 'string' && description.length <= LIMITS.description)
}

export function isStatusValid(status) {
  return STATUS_VALUES.has(status)
}

export function isPriorityValid(priority) {
  return PRIORITY_VALUES.has(priority)
}

export function generateId() {
  const raw = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return raw.toLowerCase()
}

export function makeTask({ title, description = '', status = 'todo', priority = 'medium' }) {
  const now = new Date().toISOString()
  return {
    id: generateId(),
    title: title.trim(),
    description: description.trim(),
    status,
    priority,
    createdAt: now,
    updatedAt: now,
  }
}

export function validateTask(input) {
  const errors = {}
  const title = typeof input.title === 'string' ? input.title : ''
  const description = typeof input.description === 'string' ? input.description : ''
  const status = typeof input.status === 'string' ? input.status : 'todo'
  const priority = typeof input.priority === 'string' ? input.priority : 'medium'

  if (!isTitleValid(title)) {
    errors.title = title.trim().length === 0
      ? 'Title is required.'
      : `Title must be at most ${LIMITS.title} characters.`
  }
  if (!isDescriptionValid(description)) {
    errors.description = `Description must be at most ${LIMITS.description} characters.`
  }
  if (!isStatusValid(status)) {
    errors.status = 'Status must be "todo", "in_progress" or "done".'
  }
  if (!isPriorityValid(priority)) {
    errors.priority = 'Priority must be "low", "medium" or "high".'
  }
  return errors
}

export function applyChanges(task, input) {
  const errors = validateTask(input)
  if (Object.keys(errors).length > 0) {
    const err = new Error('Invalid task input.')
    err.name = 'ValidationError'
    err.errors = errors
    throw err
  }
  return {
    ...task,
    title: (typeof input.title === 'string' ? input.title : '').trim(),
    description: (typeof input.description === 'string' ? input.description : '').trim(),
    status: input.status,
    priority: input.priority,
    updatedAt: new Date().toISOString(),
  }
}

export function filterTasks(tasks, { query = '', status = 'all', priority = 'all' }) {
  const q = query.trim().toLowerCase()
  return tasks.filter((task) => {
    if (status !== 'all' && task.status !== status) return false
    if (priority !== 'all' && task.priority !== priority) return false
    if (!q) return true
    return `${task.title} ${task.description}`.toLowerCase().includes(q)
  })
}

export function sortTasks(tasks, key = 'updatedAt') {
  return [...tasks].sort((a, b) => {
    const av = a[key] || ''
    const bv = b[key] || ''
    if (av === bv) return a.id < b.id ? -1 : 1
    return av > bv ? -1 : 1
  })
}