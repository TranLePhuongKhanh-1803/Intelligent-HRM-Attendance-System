import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import EmployeeManagement from './pages/EmployeeManagement';
import AttendancePage from './pages/AttendancePage';
import AttendanceHistory from './pages/AttendanceHistory';
import EmployeeDashboard from './pages/EmployeeDashboard';
import SalaryManagement from './pages/SalaryManagement';
import EmployeeSalary from './pages/EmployeeSalary';
import ProfilePage from './pages/ProfilePage';
import LeaveManagement from './pages/LeaveManagement';
import WorkCalendar from './pages/WorkCalendar';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';

import AnnouncementManagement from './pages/AnnouncementManagement';

const ProtectedRoute = ({ children, adminOrManager = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;
  if (adminOrManager && user.role !== 'admin' && user.role !== 'manager') return <Navigate to="/employee" />;
  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={user ? <Navigate to={(user.role === 'admin' || user.role === 'manager') ? '/admin' : '/employee'} /> : <LoginPage />} />
      
      {/* Admin/Manager Routes */}
      <Route path="/admin" element={<ProtectedRoute adminOrManager><Layout><AdminDashboard /></Layout></ProtectedRoute>} />
      <Route path="/admin/employees" element={<ProtectedRoute adminOrManager><Layout><EmployeeManagement /></Layout></ProtectedRoute>} />
      <Route path="/admin/attendance" element={<ProtectedRoute adminOrManager><Navigate to="/attendance" replace /></ProtectedRoute>} />
      <Route path="/admin/history" element={<ProtectedRoute adminOrManager><Layout><AttendanceHistory /></Layout></ProtectedRoute>} />
      <Route path="/admin/salary" element={<ProtectedRoute adminOrManager><Layout><SalaryManagement /></Layout></ProtectedRoute>} />
      <Route path="/admin/announcements" element={<ProtectedRoute adminOrManager><Layout><AnnouncementManagement /></Layout></ProtectedRoute>} />
      
      {/* Employee Routes */}
      <Route path="/employee" element={<ProtectedRoute><Layout><EmployeeDashboard /></Layout></ProtectedRoute>} />
      <Route path="/attendance" element={<ProtectedRoute><Layout><AttendancePage /></Layout></ProtectedRoute>} />
      <Route path="/employee/salary" element={<ProtectedRoute><Layout><EmployeeSalary /></Layout></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>} />
      <Route path="/leave" element={<ProtectedRoute><Layout><LeaveManagement /></Layout></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><Layout><WorkCalendar /></Layout></ProtectedRoute>} />
      
      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <AppRoutes />
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
