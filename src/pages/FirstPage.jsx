import { useState } from 'react'
import LoginPage from '../components/LoginPage'
import FIRUploadModal from '../components/FIRUploadModal'

function FirstPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleLogin = (loginData) => {
    console.log('Login Data:', loginData)
    // In a real app, you would validate credentials here
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
  }

  const handleOpenModal = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const handleSubmit = (formData) => {
    console.log('FIR Data Submitted:', formData)
    // Handle form submission here
    alert('Case created successfully!')
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />
  }

  // Show main application if authenticated
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Criminal Investigation Assistant
            </h1>
            <p className="text-gray-600">
              Manage and process First Information Reports (FIR) with AI-powered extraction
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
          >
            Logout
          </button>
        </header>

        <div className="bg-white rounded-lg shadow-md p-6">
          <button
            onClick={handleOpenModal}
            className="px-6 py-3 rounded-md bg-[#14374E] text-white hover:bg-[#021624] transition-colors font-medium shadow-sm hover:shadow-md"
          >
            + Upload FIR / Add FIR Detail
          </button>
        </div>

        <FIRUploadModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  )
}

export default FirstPage
