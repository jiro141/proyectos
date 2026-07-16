import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '../features/auth/store/useAuthStore'
import AuthLayout from '../layouts/AuthLayout'
import DashboardLayout from '../layouts/DashboardLayout'
import LoginPage from '../features/auth/pages/LoginPage'
import MenuPage from '../features/menu/pages/MenuPage'
import TablesPage from '../features/tables/pages/TablesPage'
import WaiterOrdersPage from '../features/orders/pages/WaiterOrdersPage'
import KitchenPage from '../features/orders/pages/KitchenPage'
import CashierPage from '../features/billing/pages/CashierPage'

function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  const isAdmin = user?.role === 'admin' || user?.is_superuser
  if (allowedRoles && !isAdmin && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />
  }
  return children
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AuthLayout><LoginPage /></AuthLayout>} />

      <Route path="/" element={<DashboardLayout />}>
        <Route index element={<Navigate to="/mesas" replace />} />
        <Route path="menu" element={
          <ProtectedRoute allowedRoles={['admin']}><MenuPage /></ProtectedRoute>
        } />
        <Route path="mesas" element={
          <ProtectedRoute allowedRoles={['waiter', 'admin']}><TablesPage /></ProtectedRoute>
        } />
        <Route path="pedidos" element={
          <ProtectedRoute allowedRoles={['waiter']}><WaiterOrdersPage /></ProtectedRoute>
        } />
        <Route path="cocina" element={
          <ProtectedRoute allowedRoles={['kitchen']}><KitchenPage /></ProtectedRoute>
        } />
        <Route path="caja" element={
          <ProtectedRoute allowedRoles={['cashier']}><CashierPage /></ProtectedRoute>
        } />
      </Route>
    </Routes>
  )
}
