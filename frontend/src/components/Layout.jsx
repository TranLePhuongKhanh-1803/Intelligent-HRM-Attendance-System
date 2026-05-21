import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { FiGrid, FiUsers, FiCamera, FiClock, FiLogOut, FiSun, FiMoon, FiDollarSign, FiUser, FiCalendar, FiBell, FiCheck, FiFileText, FiClipboard } from 'react-icons/fi';
import api from '../services/api';

const Layout = ({ children }) => {
  const { user, logout, theme, toggleTheme } = useAuth();
  const { notifications, setNotifications, addInitialNotifications } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  useEffect(() => {
    if (user) {
      api.get('/notifications').then(res => addInitialNotifications(res.data)).catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  const adminLinks = [
    {
      title: 'Hệ Thống',
      items: [
        { path: '/admin', label: 'Dashboard', icon: <FiGrid /> },
      ]
    },
    {
      title: 'Quản Lý Cấp Cao',
      items: [
        { path: '/admin/employees', label: 'Quản lý Nhân sự', icon: <FiUsers /> },
        { path: '/admin/history', label: 'Dữ liệu Chấm công', icon: <FiClock /> },
        { path: '/leave', label: 'Đơn từ & Nghỉ phép', icon: <FiFileText /> },
        { path: '/admin/salary', label: 'Quản lý Bảng lương', icon: <FiDollarSign /> },
        { path: '/admin/announcements', label: 'Bảng tin Nội bộ', icon: <FiBell /> },
      ]
    },
    {
      title: 'Cá Nhân',
      items: [
        { path: '/employee', label: 'Trang cá nhân', icon: <FiUser /> },
        { path: '/attendance', label: 'Chấm công Face ID', icon: <FiCamera /> },
        { path: '/calendar', label: 'Lịch làm việc', icon: <FiCalendar /> },
        { path: '/profile', label: 'Hồ sơ của tôi', icon: <FiClipboard /> },
      ]
    }
  ];

  const managerLinks = [
    {
      title: 'Hệ Thống',
      items: [
        { path: '/admin', label: 'Dashboard Quản lý', icon: <FiGrid /> },
      ]
    },
    {
      title: 'Quản Lý Bộ Phận',
      items: [
        { path: '/admin/employees', label: 'Nhân viên Bộ phận', icon: <FiUsers /> },
        { path: '/admin/history', label: 'Dữ liệu Chấm công', icon: <FiClock /> },
        { path: '/leave', label: 'Duyệt Nghỉ phép', icon: <FiFileText /> },
        ...( (user?.permissions?.includes('manage_salary') || user?.department === 'Accounting') ? [{ path: '/admin/salary', label: 'Quản lý Bảng lương', icon: <FiDollarSign /> }] : []),
        { path: '/admin/announcements', label: 'Bảng tin Nội bộ', icon: <FiBell /> },
      ]
    },
    {
      title: 'Cá Nhân',
      items: [
        { path: '/employee', label: 'Trang cá nhân', icon: <FiUser /> },
        { path: '/attendance', label: 'Chấm công Face ID', icon: <FiCamera /> },
        { path: '/calendar', label: 'Lịch làm việc', icon: <FiCalendar /> },
        { path: '/profile', label: 'Hồ sơ của tôi', icon: <FiClipboard /> },
      ]
    }
  ];

  const employeeLinks = [
    {
      title: 'Cá Nhân',
      items: [
        { path: '/employee', label: 'Dashboard', icon: <FiGrid /> },
        { path: '/attendance', label: 'Chấm công Face ID', icon: <FiCamera /> },
        { path: '/calendar', label: 'Lịch làm việc', icon: <FiCalendar /> },
        { path: '/leave', label: 'Xin nghỉ phép', icon: <FiFileText /> },
        { path: '/employee/salary', label: 'Xem Bảng lương', icon: <FiDollarSign /> },
        { path: '/profile', label: 'Hồ sơ của tôi', icon: <FiUser /> },
      ]
    }
  ];

  let menuGroups = employeeLinks;
  if (user?.role === 'admin') menuGroups = adminLinks;
  else if (user?.role === 'manager') menuGroups = managerLinks;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getPageTitle = () => {
    let current;
    for (const group of menuGroups) {
      current = group.items.find(l => l.path === location.pathname);
      if (current) break;
    }
    return current ? current.label : 'HRM System';
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🏢</div>
          <div>
            <h2>HRM System<span>Attendance Platform</span></h2>
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuGroups.map((group, index) => (
            <div key={index} style={{ marginBottom: '1.5rem' }}>
              <div className="sidebar-section-title" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem', paddingLeft: '1rem', fontWeight: 600 }}>
                {group.title}
              </div>
              {group.items.map((link) => (
                <button
                  key={link.path}
                  className={`sidebar-link ${location.pathname === link.path ? 'active' : ''}`}
                  onClick={() => navigate(link.path)}
                >
                  <span className="icon">{link.icon}</span>
                  {link.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name}</div>
            <div className="sidebar-user-role">
              {user?.role === 'admin' ? 'Sếp / Admin' : (user?.role === 'manager' ? 'Quản lý' : 'Nhân viên')}
            </div>
          </div>
        </div>
      </aside>

      {/* Header */}
      <header className="header">
        <h1 className="header-title">{getPageTitle()}</h1>
        <div className="header-actions">
          <div className="notification-wrapper" ref={notificationRef} style={{ position: 'relative' }}>
            <button 
              className="btn-icon" 
              onClick={() => setShowNotifications(!showNotifications)}
              style={{ position: 'relative' }}
            >
              <FiBell />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: 0, right: 0, background: 'var(--danger)', color: 'white',
                  borderRadius: '10px', fontSize: '10px', padding: '2px 5px', fontWeight: 'bold'
                }}>
                  {unreadCount}
                </span>
              )}
            </button>
            
            {showNotifications && (
              <div className="notification-dropdown" style={{
                position: 'absolute', top: '100%', right: 0, width: 350, background: 'var(--bg-secondary)',
                boxShadow: '0 16px 36px rgba(0,0,0,0.35)', borderRadius: 12, zIndex: 1000,
                border: '1px solid var(--border-color)', overflow: 'hidden', marginTop: 8
              }}>
                <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: 16 }}>Thông báo</h4>
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FiCheck /> Đọc tất cả
                    </button>
                  )}
                </div>
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Không có thông báo nào</div>
                  ) : (
                    notifications.map(notif => (
                      <div 
                        key={notif._id} 
                        onClick={() => !notif.isRead && markAsRead(notif._id)}
                        style={{ 
                          padding: '12px 16px', borderBottom: '1px solid var(--border-color)', 
                          background: notif.isRead ? 'transparent' : 'var(--bg-tertiary)',
                          cursor: notif.isRead ? 'default' : 'pointer', transition: 'background 0.2s'
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>{notif.title}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{notif.message}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                          {new Date(notif.createdAt).toLocaleString('vi-VN')}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button className="btn-icon" onClick={toggleTheme} title="Chuyển đổi giao diện">
            {theme === 'dark' ? <FiSun /> : <FiMoon />}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
            <FiLogOut /> Đăng xuất
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <div className="page-enter">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
