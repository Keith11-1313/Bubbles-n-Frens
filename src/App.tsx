import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Layout } from './components/layout/Layout'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { ErrorBoundary } from './components/ErrorBoundary'
import Login from './pages/Login'
import ManagerDashboard from './pages/manager/Dashboard'
import ManagerAccounts from './pages/manager/Accounts'
import ManagerInventory from './pages/manager/Inventory'
import ManagerReports from './pages/manager/Reports'
import StaffRecentSales from './pages/staff/Dashboard'
import StaffSales from './pages/staff/Sales'
import StaffInventory from './pages/staff/Inventory'

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />

          <Route
            path="/manager"
            element={
              <ProtectedRoute requiredRole="manager">
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" />} />
            <Route path="dashboard" element={<ManagerDashboard />} />
            <Route path="accounts" element={<ManagerAccounts />} />
            <Route path="inventory" element={<ManagerInventory />} />
            <Route path="reports" element={<ManagerReports />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Route>

          <Route
            path="/staff"
            element={
              <ProtectedRoute requiredRole="staff">
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="sales" />} />
            <Route path="sales" element={<StaffSales />} />
            <Route path="inventory" element={<StaffInventory />} />
            <Route path="recent-sales" element={<StaffRecentSales />} />
            <Route path="*" element={<Navigate to="sales" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0f2235',
            color: '#fdf5aa',
            border: '1px solid #749bc2',
            borderRadius: '10px',
          },
        }}
      />
    </ErrorBoundary>
  )
}

export default App
