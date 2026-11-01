
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import Login from "./pages/Login";
import Dashboard from './pages/Dashboard';
import Account from './pages/Account';
import RoomPage from './pages/RoomPage';
import { StaffLayoutWrapper } from './layout/StaffLayout';
import { AdminLayoutWrapper } from './layout/AdminLayout';
import { AuthenticatedLayoutWrapper } from './layout/AuthenticatedLayout';
import ReservationPage from './pages/ReservationsPage';
import UsersPage from './pages/UsersPage';
import GuestPage from './pages/GuestPage';
import StaffGuestPage from './pages/StaffGuestPage';
import HouseKeeping from './pages/HouseKeeping';
import ResetPassword from './pages/ResetPassword';
import ReportsPage from './pages/ReportsPage';
import AuditLogPage from './pages/AuditLogPage';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<AuthenticatedLayoutWrapper />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/account" element={<Account />} />
        <Route path="/reservations" element={<ReservationPage />} />
      </Route>

      <Route element={<StaffLayoutWrapper />}>
        <Route path="/roompage" element={<RoomPage />} />
        <Route path="/staff/guests" element={<StaffGuestPage />} />
      </Route>

      <Route element={<AdminLayoutWrapper />}>
        <Route path='/staff' element={<UsersPage />} />
        <Route path='/guests' element={<GuestPage />} />
        <Route path='/housekeeping' element={<HouseKeeping />} />
        <Route path='/reports' element={<ReportsPage />} />
        <Route path='/audit-log' element={<AuditLogPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
