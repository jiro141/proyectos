import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../features/auth/store/useAuthStore'

export default function AuthLayout({ children }) {
  const { isAuthenticated } = useAuthStore()
  if (isAuthenticated) return <Navigate to="/" replace />

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      {children}
    </div>
  )
}
