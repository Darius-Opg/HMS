
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import { useAuth } from './context/AuthContext';
import Login from "./pages/Login";
import Dashboard from './pages/Dashboard';
import RoomPage from './pages/RoomPage';
import { StaffLayoutWrapper } from './layout/StaffLayout';
import { AdminLayoutWrapper } from './layout/AdminLayout';
import ReservationPage from './pages/ReservationsPage';

function AppRoutes() {
  const { user } = useAuth();
  const Layout = user?.role === 'ADMIN' ? AdminLayoutWrapper : StaffLayoutWrapper;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/roompage" element={<RoomPage />} />
        <Route path="/reservations" element={<ReservationPage />} />
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