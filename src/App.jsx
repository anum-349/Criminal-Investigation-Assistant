import { BrowserRouter, HashRouter } from 'react-router-dom'
import AppRoutes from './routes/page'
import { AuthProvider } from './context/AuthContext'

function App() {
  // Show main application if authenticated
  return (
    <div className="min-h-screen bg-gray-100">
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </div>
  )
}

export default App
