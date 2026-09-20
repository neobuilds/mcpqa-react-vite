import React, { useEffect, useReducer, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { loadTasks, createTask, updateTask, deleteTask } from '../lib/storage.js'
import { STATUSES, PRIORITIES, validateTask, LIMITS } from '../lib/taskModel.js'

const INITIAL = { title: '', description: '', status: 'todo', priority: 'medium' }

function formReducer(state, action) {
  if (action.type === 'field') return { ...state, [action.field]: action.value }
  if (action.type === 'reset') return { ...INITIAL, ...action.next }
  return state
}

export default function TaskForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [form, dispatch] = useReducer(formReducer, INITIAL, (init) => {
    if (!id) return init
    const task = loadTasks().find((t) => t.id === id)
    return task
      ? { title: task.title, description: task.description, status: task.status, priority: task.priority }
      : init
  })
  const [errors, setErrors] = React.useState({})
  const [saved, setSaved] = React.useState(false)
  const titleRef = useRef(null)

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  const task = id ? loadTasks().find((t) => t.id === id) : null
  const notFound = isEdit && !task

  function setField(field, value) {
    dispatch({ type: 'field', field, value })
    setErrors((prev) => ({ ...prev, [field]: undefined }))
    setSaved(false)
  }

  function handleSubmit(event) {
    event.preventDefault()
    const validationErrors = validateTask(form)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      const first = document.getElementById(
        validationErrors.title ? 'title' : validationErrors.description ? 'description' : undefined,
      )
      first?.focus()
      return
    }

    if (isEdit) {
      const { result } = updateTask(id, form)
      if (!result.ok) window.location.reload()
      else setSaved(true)
    } else {
      const { task: created, result } = createTask(form)
      if (!result.ok) window.location.reload()
      else navigate(`/tasks/${created.id}`, { replace: true })
    }
  }

  function handleDelete() {
    if (!id) return
    deleteTask(id)
    navigate('/')
  }

  if (notFound) {
    return (
      <div className="empty-state">
        <h1>Task not found</h1>
        <p>The task &ldquo;{id}&rdquo; does not exist or was deleted.</p>
        <Link className="button" to="/">Back to board</Link>
      </div>
    )
  }

  return (
    <section aria-labelledby="form-title">
      <h1 id="form-title">{isEdit ? 'Edit task' : 'New task'}</h1>

      {saved && (
        <div className="notice notice-success" role="status" data-testid="saved-notice">
          Task saved.
        </div>
      )}

      <form className="task-form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            ref={titleRef}
            type="text"
            value={form.title}
            maxLength={LIMITS.title}
            required
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'title-error' : undefined}
            onChange={(e) => setField('title', e.target.value)}
          />
          {errors.title ? (
            <p className="field-error" id="title-error" role="alert">{errors.title}</p>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            rows={5}
            value={form.description}
            maxLength={LIMITS.description}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? 'description-error' : undefined}
            onChange={(e) => setField('description', e.target.value)}
          />
          {errors.description ? (
            <p className="field-error" id="description-error" role="alert">{errors.description}</p>
          ) : null}
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={form.status}
              onChange={(e) => setField('status', e.target.value)}
            >
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="priority">Priority</label>
            <select
              id="priority"
              value={form.priority}
              onChange={(e) => setField('priority', e.target.value)}
            >
              {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="button button-primary">
            {isEdit ? 'Save changes' : 'Create task'}
          </button>
          {isEdit ? (
            <button type="button" className="button button-danger" onClick={handleDelete}>
              Delete task
            </button>
          ) : null}
          <Link className="button" to="/">Cancel</Link>
        </div>
      </form>
    </section>
  )
}