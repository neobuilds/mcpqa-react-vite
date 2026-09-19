import React from 'react'

function App() {
  const build = import.meta.env.VITE_BUILD || 'local'

  return (
    <>
      <h1>mcpqa-react-vite OK</h1>
      <p>build: {build}</p>
    </>
  )
}

export default App
