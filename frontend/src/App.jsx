import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import AppLayout from './components/layout/AppLayout'
import LoadingScreen from './components/common/LoadingScreen'

// Lazy-loaded pages
const LoginPage        = lazy(() => import('./pages/auth/LoginPage'))
const RegisterPage     = lazy(() => import('./pages/auth/RegisterPage'))
const Dashboard        = lazy(() => import('./pages/dashboard/Dashboard'))
const AssetList        = lazy(() => import('./pages/assets/AssetList'))
const AssetDetail      = lazy(() => import('./pages/assets/AssetDetail'))
const AssetForm        = lazy(() => import('./pages/assets/AssetForm'))
const EmployeeList     = lazy(() => import('./pages/employees/EmployeeList'))
const EmployeeDetail   = lazy(() => import('./pages/employees/EmployeeDetail'))
const EmployeeForm     = lazy(() => import('./pages/employees/EmployeeForm'))
const DepartmentList   = lazy(() => import('./pages/departments/DepartmentList'))
const AllocationList   = lazy(() => import('./pages/allocations/AllocationList'))
const AllocationDetail = lazy(() => import('./pages/allocations/AllocationDetail'))
const AllocationForm   = lazy(() => import('./pages/allocations/AllocationForm'))
const ReturnList       = lazy(() => import('./pages/returns/ReturnList'))
const ReturnForm       = lazy(() => import('./pages/returns/ReturnForm'))
const TransferList     = lazy(() => import('./pages/transfers/TransferList'))
const TransferForm     = lazy(() => import('./pages/transfers/TransferForm'))
const MaintenanceList  = lazy(() => import('./pages/maintenance/MaintenanceList'))
const ComplaintList    = lazy(() => import('./pages/complaints/ComplaintList'))
const ComplaintDetail  = lazy(() => import('./pages/complaints/ComplaintDetail'))
const VendorList       = lazy(() => import('./pages/vendors/VendorList'))
const VendorDetail     = lazy(() => import('./pages/vendors/VendorDetail'))
const VendorForm       = lazy(() => import('./pages/vendors/VendorForm'))
const PurchaseList     = lazy(() => import('./pages/purchases/PurchaseList'))
const PurchaseForm     = lazy(() => import('./pages/purchases/PurchaseForm'))
const PurchaseDetail   = lazy(() => import('./pages/purchases/PurchaseDetail'))
const ReportsHub       = lazy(() => import('./pages/reports/ReportsHub'))
const SearchResults    = lazy(() => import('./pages/search/SearchResults'))
const AuditLogs        = lazy(() => import('./pages/audit/AuditLogs'))
const Settings         = lazy(() => import('./pages/settings/Settings'))
const CapitalSanctionList = lazy(() => import('./pages/capital_sanctions/CapitalSanctionList'))
const CapitalSanctionForm = lazy(() => import('./pages/capital_sanctions/CapitalSanctionForm'))
const ApprovalMemberList  = lazy(() => import('./pages/approval_members/ApprovalMemberList'))
const ApprovalsNotification = lazy(() => import('./pages/admin/ApprovalsNotification'))
const Inbox               = lazy(() => import('./pages/approval_members/Inbox'))
const NotFound            = lazy(() => import('./pages/NotFound'))

// Route guard
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return <LoadingScreen />

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" replace />} />
        <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/" replace />} />

        {/* Protected */}
        <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          <Route index element={<Navigate to={user?.role?.name === 'approval_member' ? '/inbox' : '/dashboard'} replace />} />
          <Route path="dashboard"              element={<Dashboard />} />
          
          <Route path="inbox"                  element={<Inbox />} />
          <Route path="admin/pending-approvals" element={<ApprovalsNotification />} />

          <Route path="assets"                 element={<AssetList />} />
          <Route path="assets/new"             element={<AssetForm />} />
          <Route path="assets/:id"             element={<AssetDetail />} />
          <Route path="assets/:id/edit"        element={<AssetForm />} />

          <Route path="employees"              element={<EmployeeList />} />
          <Route path="employees/new"          element={<EmployeeForm />} />
          <Route path="employees/:id"          element={<EmployeeDetail />} />
          <Route path="employees/:id/edit"     element={<EmployeeForm />} />

          <Route path="departments"            element={<DepartmentList />} />

          <Route path="allocations"            element={<AllocationList />} />
          <Route path="allocations/new"        element={<AllocationForm />} />
          <Route path="allocations/:id"        element={<AllocationDetail />} />

          <Route path="returns"                element={<ReturnList />} />
          <Route path="returns/new"            element={<ReturnForm />} />
          <Route path="transfers"              element={<TransferList />} />
          <Route path="transfers/new"          element={<TransferForm />} />

          <Route path="maintenance"            element={<MaintenanceList />} />

          <Route path="complaints"             element={<ComplaintList />} />
          <Route path="complaints/:id"         element={<ComplaintDetail />} />

          <Route path="vendors"                element={<VendorList />} />
          <Route path="vendors/new"            element={<VendorForm />} />
          <Route path="vendors/:id"            element={<VendorDetail />} />
          <Route path="vendors/:id/edit"       element={<VendorForm />} />

          <Route path="purchases"              element={<PurchaseList />} />
          <Route path="purchases/new"          element={<PurchaseForm />} />
          <Route path="purchases/:id"          element={<PurchaseDetail />} />

          <Route path="capital-sanctions"          element={<CapitalSanctionList />} />
          <Route path="capital-sanctions/new"      element={<CapitalSanctionForm />} />
          <Route path="capital-sanctions/:id/edit" element={<CapitalSanctionForm />} />

          <Route path="approval-members"           element={<ApprovalMemberList />} />

          <Route path="reports"                element={<ReportsHub />} />
          <Route path="search"                 element={<SearchResults />} />
          <Route path="audit"                  element={<AuditLogs />} />
          <Route path="settings"               element={<Settings />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
