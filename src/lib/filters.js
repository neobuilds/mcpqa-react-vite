import { STATUS_VALUES, PRIORITY_VALUES } from './taskModel.js'

export const FILTER_DEFAULTS = { query: '', status: 'all', priority: 'all' }

export function normalizeFilterValue(field, value) {
  if (field === 'status') return STATUS_VALUES.has(value) ? value : FILTER_DEFAULTS.status
  if (field === 'priority') return PRIORITY_VALUES.has(value) ? value : FILTER_DEFAULTS.priority
  return typeof value === 'string' ? value : FILTER_DEFAULTS.query
}