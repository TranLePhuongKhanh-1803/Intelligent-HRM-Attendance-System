import { useState, useEffect } from 'react';
import { FiUsers, FiUserCheck, FiClock, FiUserX, FiActivity, FiDollarSign, FiCalendar } from 'react-icons/fi';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../services/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const AdminDashboard = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [overview, setOverview] = useState({});
  const [trendData, setTrendData] = useState([]);
  const [deptData, setDeptData] = useState([]);
  const [todayStatusData, setTodayStatusData] = useState([]);

  const buildStatusData = (ov) => {
    const onTime = ov.todayOnTime || 0;
    const late = ov.todayLate || 0;
    const absent = ov.todayAbsent || 0;
    const total = onTime + late + absent;
    if (total === 0) {
      setTodayStatusData([]);
      return;
    }
    const data = [];
    if (onTime > 0) data.push({ name: '\u0110\u00fang gi\u1edd', value: onTime, color: '#10b981' });
    if (late > 0) data.push({ name: '\u0110i mu\u1ed9n', value: late, color: '#f59e0b' });
    if (absent > 0) data.push({ name: 'V\u1eafng m\u1eb7t', value: absent, color: '#ef4444' });
    setTodayStatusData(data);
  };
  const [salaryData, setSalaryData] = useState([]);
  const [todayRecords, setTodayRecords] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const { realtimeAttendance } = useSocket();

  useEffect(() => {
    fetchAllStats();
  }, []);

  // Update when realtime events come in
  useEffect(() => {
    if (realtimeAttendance.length > 0) {
      api.get('/stats/overview').then(res => {
        setOverview(res.data);
        buildStatusData(res.data);
      }).catch(console.error);
      api.get('/attendance/today').then(res => setTodayRecords(res.data.records)).catch(console.error);
    }
  }, [realtimeAttendance]);

  const fetchAllStats = async () => {
    try {
      setLoading(true);
      const [overviewRes, trendRes, deptRes, salaryRes, todayRes, announcementsRes] = await Promise.all([
        api.get('/stats/overview'),
        api.get('/stats/attendance-trend'),
        api.get('/stats/department'),
        api.get('/stats/salary'),
        api.get('/attendance/today'),
        api.get('/announcements/active')
      ]);
      setOverview(overviewRes.data);
      setTrendData(trendRes.data);
      setDeptData(deptRes.data);
      setSalaryData(salaryRes.data);
      setTodayRecords(todayRes.data.records);
      setAnnouncements(announcementsRes.data);
      buildStatusData(overviewRes.data);


    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return <div className="loading-spinner"><div className="spinner"></div></div>;
  }

  return (
    <div>
      {/* Announcements Section */}
      {announcements.length > 0 && (
        <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {announcements.map(item => (
            <div key={item._id} style={{ 
              padding: '16px 20px', 
              borderRadius: 12, 
              background: item.type === 'danger' ? '#fee2e2' : item.type === 'warning' ? '#fef3c7' : item.type === 'success' ? '#dcfce7' : '#e0f2fe',
              borderLeft: `5px solid ${item.type === 'danger' ? '#ef4444' : item.type === 'warning' ? '#f59e0b' : item.type === 'success' ? '#22c55e' : '#0ea5e9'}`,
              display: 'flex', alignItems: 'flex-start', gap: 16,
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)'
            }}>
              <div style={{ fontSize: 26, background: 'rgba(255,255,255,0.5)', padding: 8, borderRadius: '50%' }}>
                {item.type === 'danger' ? '🚨' : item.type === 'warning' ? '⚠️' : item.type === 'success' ? '🎉' : '📢'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#1e293b', marginBottom: 6 }}>{item.title}</div>
                <div style={{ fontSize: 14, color: '#334155', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{item.content}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 10, display: 'flex', gap: 16, alignItems: 'center' }}>
                  <span>✍️ {item.author?.name}</span>
                  <span>🕒 {new Date(item.createdAt).toLocaleDateString('vi-VN')}</span>
                  <span style={{ background: 'rgba(0,0,0,0.05)', padding: '2px 8px', borderRadius: 4, fontWeight: 500 }}>
                    🏢 {item.department === 'All' ? 'Toàn công ty' : `Phòng ${item.department}`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Overview Cards */}
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-card-icon blue"><FiUsers /></div>
          <div>
            <div className="stat-card-value">{overview.totalEmployees}</div>
            <div className="stat-card-label">Tổng nhân viên</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon green"><FiUserCheck /></div>
          <div>
            <div className="stat-card-value">{overview.todayCheckedIn}</div>
            <div className="stat-card-label">Đã chấm hôm nay ({overview.attendanceRate}%)</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon orange"><FiClock /></div>
          <div>
            <div className="stat-card-value">{overview.todayLate}</div>
            <div className="stat-card-label">Đi muộn</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon red"><FiUserX /></div>
          <div>
            <div className="stat-card-value">{overview.todayAbsent}</div>
            <div className="stat-card-label">Vắng mặt</div>
          </div>
        </div>
        <div className="stat-card" style={!isAdmin ? { gridColumn: 'span 2' } : {}}>
          <div className="stat-card-icon blue"><FiCalendar /></div>
          <div>
            <div className="stat-card-value">{overview.pendingLeaves}</div>
            <div className="stat-card-label">Đơn nghỉ chờ duyệt</div>
          </div>
        </div>
        {isAdmin && (
          <div className="stat-card">
            <div className="stat-card-icon green"><FiDollarSign /></div>
            <div>
              <div className="stat-card-value" style={{ fontSize: 16 }}>{formatCurrency(overview.totalSalaryFund)}</div>
              <div className="stat-card-label">Quỹ lương tháng này</div>
            </div>
          </div>
        )}
      </div>

      <div className="dashboard-grid">
        {/* Realtime Attendance Feed */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><FiActivity style={{ marginRight: 8 }} />Realtime (Live)</h3>
          </div>
          {realtimeAttendance.length > 0 ? (
            <div className="realtime-feed">
              {realtimeAttendance.slice(0, 8).map((item, idx) => (
                <div className="feed-item" key={idx}>
                  <div className="feed-item-avatar">
                    {item.attendance?.userId?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="feed-item-info">
                    <div className="feed-item-name">{item.attendance?.userId?.name}</div>
                    <div className="feed-item-detail">
                      {item.type === 'check-in' ? '✅ Check-in' : '🔴 Check-out'} {item.attendance?.method === 'face' ? '🤖' : '📱'}
                    </div>
                  </div>
                  <div className="feed-item-time">
                    {formatTime(item.type === 'check-in' ? item.attendance?.checkIn : item.attendance?.checkOut)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📡</div>
              <h3>Đang nghe tín hiệu</h3>
              <p>Chưa có lượt chấm công mới nào kể từ lúc bạn mở trang...</p>
            </div>
          )}
        </div>

        {/* Today Attendance Status Donut */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📊 Tình trạng hôm nay</h3>
          </div>
          <div style={{ height: 220, width: '100%' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={todayStatusData.length > 0 ? todayStatusData : [{ name: 'Chưa có dữ liệu', value: 1, color: '#334155' }]}
                  dataKey="value"
                  nameKey="name"
                  cx="50%" cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {(todayStatusData.length > 0 ? todayStatusData : [{ color: '#334155' }]).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value} người`, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Face registration progress */}
          <div style={{ marginTop: 8, padding: '0 8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
              <span>🤖 Đăng ký Face ID</span>
              <span><strong style={{ color: 'var(--success)' }}>{overview.faceRegistered}</strong> / {(overview.faceRegistered || 0) + (overview.faceNotRegistered || 0)}</span>
            </div>
            <div style={{ background: 'var(--border)', borderRadius: 999, height: 7, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${((overview.faceRegistered || 0) / Math.max(1, (overview.faceRegistered || 0) + (overview.faceNotRegistered || 0))) * 100}%`,
                background: 'linear-gradient(90deg, #10b981, #3b82f6)',
                borderRadius: 999,
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>
        </div>

        {/* Attendance Trend Chart */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <h3 className="card-title">📉 Xu hướng chấm công (30 ngày)</h3>
          </div>
          <div style={{ height: 300, width: '100%', marginTop: 20 }}>
            <ResponsiveContainer>
              <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="label" tick={{fontSize: 12}} />
                <YAxis allowDecimals={false} tick={{fontSize: 12}} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" name="Tổng" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="onTime" name="Đúng giờ" stroke="#10b981" />
                <Line type="monotone" dataKey="late" name="Đi muộn" stroke="#f59e0b" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Stats Bar Chart - Admin Only */}
        {isAdmin && (
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <div className="card-header">
              <h3 className="card-title">🏢 Chấm công theo phòng ban (Hôm nay)</h3>
            </div>
            <div style={{ height: 250, width: '100%', marginTop: 20 }}>
              <ResponsiveContainer>
                <BarChart data={deptData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="department" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="checkedIn" name="Đã chấm" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="late" name="Đi muộn" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="absent" name="Vắng mặt" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
};

export default AdminDashboard;
