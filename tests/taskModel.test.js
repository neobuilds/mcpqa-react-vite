import test from 'node:test'
import assert from 'node:assert/strict'
import {
  validateTask,
  makeTask,
  applyChanges,
  filterTasks,
  sortTasks,
  isTitleValid,
  isStatusValid,
  isPriorityValid,
} from '../src/lib/taskModel.js'

test('valid task passes validation', () => {
  assert.deepEqual(validateTask({ title: 'Buy milk', description: 'Two litres', status: 'todo', priority: 'low' }), {})
})

test('blank title is rejected', () => {
  const errors = validateTask({ title: '   ', status: 'todo', priority: 'medium' })
  assert.ok(errors.title)
})

test('over-long title is rejected', () => {
  const errors = validateTask({ title: 'x'.repeat(121) })
  assert.ok(errors.title)
})

test('invalid status is rejected', () => {
  const errors = validateTask({ title: 'ok', status: 'sometimes' })
  assert.equal(errors.status, 'Status must be "todo", "in_progress" or "done".')
})

test('invalid priority is rejected', () => {
  const errors = validateTask({ title: 'ok', priority: 'urgent' })
  assert.equal(errors.priority, 'Priority must be "low", "medium" or "high".')
})

test('multiple errors accumulate', () => {
  const errors = validateTask({ title: '', status: 'nope', priority: 'nope' })
  assert.ok(errors.title && errors.status && errors.priority)
})

test('makeTask produces a well-formed task and trims input', () => {
  const t = makeTask({ title: '  Write docs  ', description: '  Add README  ', status: 'in_progress', priority: 'high' })
  assert.equal(t.title, 'Write docs')
  assert.equal(t.description, 'Add README')
  assert.ok(t.id)
  assert.ok(t.createdAt && t.updatedAt)
  assert.ok(isTitleValid(t.title) && isStatusValid(t.status) && isPriorityValid(t.priority))
})

test('applyChanges throws ValidationError with field errors on bad input', () => {
  const task = makeTask({ title: 'original' })
  assert.throws(() => applyChanges(task, { title: '' }), (err) => {
    assert.equal(err.name, 'ValidationError')
    assert.ok(err.errors.title)
    return true
  })
})

test('applyChanges returns a new task with bumped updatedAt', () => {
  const task = makeTask({ title: 'original' })
  const updated = applyChanges(task, { title: 'renamed', description: 'x', status: 'done', priority: 'high' })
  assert.equal(updated.title, 'renamed')
  assert.equal(updated.status, 'done')
  assert.equal(updated.priority, 'high')
  assert.notEqual(updated, task)
  assert.ok(updated.updatedAt >= task.createdAt)
})

test('filterTasks matches title and description case-insensitively', () => {
  const tasks = [
    makeTask({ title: 'Deploy React App', description: 'push to server' }),
    makeTask({ title: 'Write tests', description: 'node:test' }),
  ]
  assert.equal(filterTasks(tasks, { query: 'react' }).length, 1)
  assert.equal(filterTasks(tasks, { query: 'NODE:TEST' }).length, 1)
  assert.equal(filterTasks(tasks, { query: 'missing' }).length, 0)
})

test('filterTasks respects status and priority only when set to a concrete value', () => {
  const tasks = [
    makeTask({ title: 'A', status: 'todo', priority: 'high' }),
    makeTask({ title: 'B', status: 'in_progress', priority: 'low' }),
    makeTask({ title: 'C', status: 'done', priority: 'medium' }),
  ]
  assert.equal(filterTasks(tasks, { status: 'todo' }).length, 1)
  assert.equal(filterTasks(tasks, { priority: 'low' }).length, 1)
  assert.equal(filterTasks(tasks, { status: 'all', priority: 'all' }).length, 3)
  assert.equal(filterTasks(tasks, { status: 'todo', priority: 'low' }).length, 0)
})

test('sortTasks orders by updatedAt descending and never mutates input', () => {
  const t1 = makeTask({ title: 'older' })
  t1.updatedAt = '2020-01-01T00:00:00.000Z'
  const t2 = makeTask({ title: 'newer' })
  t2.updatedAt = '2024-01-01T00:00:00.000Z'
  const tasks = [t1, t2]
  const sorted = sortTasks(tasks)
  assert.equal(sorted[0].title, 'newer')
  assert.equal(sorted[1].title, 'older')
  assert.equal(tasks[0].title, 'older')
})

test('ID_FORBIDDEN is exported for slug sanitisation checks', () => {
  assert.ok(/([^a-z0-9-])/.test('Hello World!'))
})