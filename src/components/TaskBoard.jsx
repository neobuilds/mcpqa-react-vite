import React, { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { loadTasks, deleteTask, saveTasks } from '../lib/storage.js'
import { STATUSES, PRIORITIES, sortTasks } from '../lib/taskModel.js'
import { FILTER_DEFAULTS, normalizeFilterValue } from '../lib/filters.js'

export default function TaskBoard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [version, setVersion] = useState(0)
  const tasks = useMemo(() => loadTasks(), [version])

  const query = normalizeFilterValue('query', searchParams.get('q') ?? '')
  const status = normalizeFilterValue('status', searchParams.get('status') ?? FILTER_DEFAULTS.status)
  const priority = normalizeFilterValue('priority', searchParams.get('priority') ?? FILTER_DEFAULTS.priority)

  function setParam(key, value) {
    const params = new URLSearchParams(searchParams)
    const trimmed = value.trim()
    if (trimmed) params.set(key, trimmed)
    else params.delete(key)
    setSearchParams(params, { replace: true })
  }

  const filtered = useMemo(() => tasks.filter((t) => {
    if (status !== FILTER_DEFAULTS.status && t.status !== status) return false
    if (priority !== FILTER_DEFAULTS.priority && t.priority !== priority) return false
    if (query) {
      const hay = `${t.title} ${t.description}`.toLowerCase()
      if (!hay.includes(query.toLowerCase())) return false
    }
    return true
  }), [tasks, query, status, priority])

  const sorted = useMemo(() => sortTasks(filtered), [filtered])

  function handleDelete(id) {
    deleteTask(id)
    setVersion((v) => v + 1)
  }

  return (
    <section aria-labelledby="board-title">
      <div className="board-header">
        <h1 id="board-title">Task board</h1>
        <div className="board-header-actions">
          <Link className="button button-primary" to="/tasks/new">Add task</Link>
        </div>
      </div>

      <form className="filter-bar" onSubmit={(e) => e.preventDefault()} role="search" aria-label="Filter tasks">
        <div className="field">
          <label htmlFor="filter-q">Search</label>
          <input
            id="filter-q"
            type="search"
            value={query}
            placeholder="Type to filter…"
            onChange={(e) => setParam('q', e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="field">
          <label htmlFor="filter-status">Status</label>
          <select
            id="filter-status"
            value={status}
            onChange={(e) => setParam('status', e.target.value)}
          >
            <option value={FILTER_DEFAULTS.status}>Any status</option>
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="filter-priority">Priority</label>
          <select
            id="filter-priority"
            value={priority}
            onChange={(e) => setParam('priority', e.target.value)}
          >
            <option value={FILTER_DEFAULTS.priority}>Any priority</option>
            {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </form>

      <p className="count" aria-live="polite" data-testid="task-count">
        {filtered.length} task{filtered.length === 1 ? '' : 's'}
        {filtered.length > 0 && tasks.length > filtered.length ? ` (of ${tasks.length})` : ''}
      </p>

      {sorted.length === 0 ? (
        <div className="empty-state" data-testid="empty-state">
          <h2>No tasks found</h2>
          <p>
            {tasks.length === 0
              ? 'No tasks yet. Add your first task below.'
              : 'No tasks match the current filters. Clear filters or change your search.'}
          </p>
          <Link className="button button-primary" to="/tasks/new">Add a task</Link>
        </div>
      ) : (
        <TaskList tasks={sorted} onDelete={handleDelete} />
      )}
    </section>
  )
}

function TaskList({ tasks, onDelete }) {
  return (
    <ul className="task-list" data-testid="task-list">
      {tasks.map((task) => <TaskItem key={task.id} task={task} onDelete={onDelete} />)}
    </ul>
  )
}

function TaskItem({ task, onDelete }) {
  const [confirming, setConfirming] = useState(false)
  return (
    <li className={`task-item task-${task.status}`} aria-label={task.title}>
      <div className="task-item-main">
        <h2 className="task-title">
          <Link to={`/tasks/${task.id}`}>{task.title}</Link>
        </h2>
        <p className="task-meta">
          <span className="badge badge-status">{statusLabel(task.status)}</span>
          <span className="badge badge-priority">{priorityLabel(task.priority)}</span>
          <span className="task-updated">Updated {formatDate(task.updatedAt)}</span>
        </p>
        {task.description ? <p className="task-description">{task.description}</p> : null}
      </div>
      <div className="task-item-actions">
        <Link className="button button-small" to={`/tasks/${task.id}`}>Edit</Link>
        {confirming ? (
          <>
            <span className="confirm-text">Delete this task?</span>
            <button
              type="button"
              className="button button-small button-danger"
              onClick={() => { onDelete(task.id); setConfirming(false) }}
            >
              Yes, delete
            </button>
            <button type="button" className="button button-small" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            className="button button-small button-danger"
            aria-label={`Delete ${task.title}`}
            onClick={() => setConfirming(true)}
          >
            Delete
          </button>
        )}
      </div>
    </li>
  )
}

function statusLabel(value) {
  return STATUSES.find((s) => s.value === value)?.label ?? value
}

function priorityLabel(value) {
  return PRIORITIES.find((p) => p.value === value)?.label ?? value
}

function formatDate(iso) {
  if (!iso) return 'n/a'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'n/a'
  return d.toISOString().slice(0, 16).replace('T', ' ')
}