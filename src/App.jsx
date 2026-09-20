import React, { useEffect } from 'react'
import { Routes, Route, NavLink, Link, useLocation } from 'react-router-dom'
import TaskBoard from './components/TaskBoard.jsx'
import TaskForm from './components/TaskForm.jsx'
import { storageError, clearStorageError } from './lib/storage.js'

const BUILD = import.meta.env.VITE_BUILD || 'local'

function Layout({ children }) {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <div className="site-title">
          <Link to="/" aria-label="React Taskboard home">React Taskboard</Link>
        </div>
        <nav aria-label="Primary">
          <NavLink to="/" end>Board</NavLink>
          <NavLink to="/tasks/new">New task</NavLink>
        </nav>
      </header>
      {children}
      <footer className="site-footer">
        <span className="storage-label">Storage: browser-only localStorage</span>
        <span className="build-marker" data-testid="build-marker">build: {BUILD}</span>
      </footer>
    </>
  )
}

function StorageErrorNotice() {
  const [message, setMessage] = React.useState(() => storageError())
  if (!message) return null
  return (
    <div className="notice notice-error" role="alert">
      <span>{message}</span>
      <button
        type="button"
        className="link-button"
        onClick={() => {
          clearStorageError()
          setMessage(null)
        }}
      >
        Dismiss
      </button>
    </div>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.getElementById('main')?.focus()
  }, [pathname])
  return null
}

export default function App() {
  return (
    <Layout>
      <ScrollToTop />
      <StorageErrorNotice />
      <main id="main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<TaskBoard />} />
          <Route path="/tasks/new" element={<TaskForm key="new" />} />
          <Route path="/tasks/:id" element={<TaskForm key="edit" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </Layout>
  )
}

function NotFound() {
  return (
    <section className="empty-state">
      <h1>Page not found</h1>
      <p>The requested page does not exist.</p>
      <Link className="button" to="/">Back to board</Link>
    </section>
  )
}