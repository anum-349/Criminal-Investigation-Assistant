import { useState } from 'react'
import './App.css'
import { Routes, Route, HashRouter } from 'react-router-dom'
import FirstPage from './pages/FirstPage'
import Dashboard from './pages/Dashboard'

function App() {
  // Show main application if authenticated
  return (
    <div className="min-h-screen bg-gray-100">
      <HashRouter>
          <Routes>
            <Route path="/" element={<FirstPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
      </HashRouter>
    </div>
  )
}

export default App
