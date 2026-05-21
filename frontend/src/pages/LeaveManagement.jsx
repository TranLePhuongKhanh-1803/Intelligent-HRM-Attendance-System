import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { FiCalendar, FiCheck, FiX, FiInfo, FiPlus, FiSend } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../services/api';
import './LeaveManagement.css';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const LeaveManagement = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form states for employee
  const [stats, setStats] = useState({ total: 15, used: 0, remaining: 15, pending: 0 });
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    leaveType: 'Nghỉ phép năm',
    isPaid: true,
    reason: '',
  });

  // Modal states for manager
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [reviewComment, setReviewComment] = useState('');

  useEffect(() => {
    fetchLeaves();
  }, [user]);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      let endpoint = '/leaves'; // admin by default
      if (user.role === 'employee') {
        endpoint = '/leaves/my';
      } else if (user.role === 'manager') {
        endpoint = '/leaves/department';
      }
      
      const res = await api.get(endpoint);
      if (user.role === 'employee') {
        setLeaves(res.data.leaves || []);
        if (res.data.stats) setStats(res.data.stats);
      } else {
        setLeaves(res.data);
      }
    } catch (err) {
      setError('Không thể tải dữ liệu nghỉ phép');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLeave = async (e) => {
    e.preventDefault();
    try {
      await api.post('/leaves/my', formData);
      alert('Tạo đơn xin nghỉ phép thành công!');
      setFormData({ startDate: '', endDate: '', leaveType: 'Nghỉ phép năm', isPaid: true, reason: '' });
      fetchLeaves();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi tạo đơn xin nghỉ phép');
    }
  };

  const handleReviewLeave = async (status) => {
    if (!selectedLeave) return;
    try {
      await api.put(`/leaves/${selectedLeave._id}/status`, {
        status,
        comment: reviewComment
      });
      alert(`Đã ${status === 'approved' ? 'duyệt' : 'từ chối'} đơn nghỉ phép`);
      setShowReviewModal(false);
      setSelectedLeave(null);
      setReviewComment('');
      fetchLeaves();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi xử lý đơn nghỉ phép');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  const renderStatusDot = (status) => {
    switch(status) {
      case 'approved': return <span className="leave-status status-approved"><div className="leave-status-dot"></div>Đã duyệt</span>;
      case 'rejected': return <span className="leave-status status-rejected"><div className="leave-status-dot"></div>Từ chối</span>;
      default: return <span className="leave-status status-pending"><div className="leave-status-dot"></div>Đang chờ</span>;
    }
  };

  // Data mapping for charts
  const departmentData = useMemo(() => {
    if (!leaves || leaves.length === 0) return [];
    const counts = {};
    leaves.forEach(l => {
      const dep = l.department || 'Khác';
      counts[dep] = (counts[dep] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ name: key, count: counts[key] }));
  }, [leaves]);

  const leaveTypeData = useMemo(() => {
    if (!leaves || leaves.length === 0) return [];
    const counts = {};
    leaves.forEach(l => {
      const type = l.leaveType || 'Nghỉ phép năm';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [leaves]);

  const statusData = useMemo(() => {
    if (!leaves || leaves.length === 0) return [];
    const counts = { 'Chờ duyệt': 0, 'Đã duyệt': 0, 'Từ chối': 0 };
    leaves.forEach(l => {
      if (l.status === 'approved') counts['Đã duyệt']++;
      else if (l.status === 'rejected') counts['Từ chối']++;
      else counts['Chờ duyệt']++;
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] })).filter(k => k.value > 0);
  }, [leaves]);

  if (loading) {
    return <div className="loading-spinner"><div className="spinner"></div></div>;
  }

  // Admin View: Dashboard overview
  if (user.role === 'admin') {
    return (
      <div className="leave-mgmt-container">
        <div className="leave-mgmt-header">
          <h2>Quản Lý Nghỉ Phép (Toàn bộ)</h2>
          <p>Trang tổng hợp và phân tích dữ liệu nghỉ phép của tất cả nhân viên</p>
        </div>
        
        {error && <div className="error-message" style={{marginBottom: 20}}>{error}</div>}

        <div className="leave-stats-row">
          <div className="leave-stat-card">
            <div className="leave-stat-title">Tổng đơn</div>
            <div className="leave-stat-value leave-stat-val-primary">{String(leaves.length).padStart(2, '0')}</div>
            <div className="leave-stat-line"><div className="leave-stat-line-inner line-bg-primary" style={{width: '100%'}}></div></div>
          </div>
          <div className="leave-stat-card">
            <div className="leave-stat-title">Đang chờ duyệt</div>
            <div className="leave-stat-value leave-stat-val-neutral">{String(leaves.filter(l => l.status === 'pending').length).padStart(2, '0')}</div>
            <div className="leave-stat-line"><div className="leave-stat-line-inner line-bg-pending" style={{width: '100%'}}></div></div>
          </div>
          <div className="leave-stat-card">
            <div className="leave-stat-title">Đã duyệt</div>
            <div className="leave-stat-value leave-stat-val-success">{String(leaves.filter(l => l.status === 'approved').length).padStart(2, '0')}</div>
            <div className="leave-stat-line"><div className="leave-stat-line-inner line-bg-success" style={{width: '100%'}}></div></div>
          </div>
          <div className="leave-stat-card">
            <div className="leave-stat-title">Từ chối</div>
            <div className="leave-stat-value leave-stat-val-danger">{String(leaves.filter(l => l.status === 'rejected').length).padStart(2, '0')}</div>
            <div className="leave-stat-line"><div className="leave-stat-line-inner line-bg-danger" style={{width: '100%'}}></div></div>
          </div>
        </div>

        <div className="leave-charts-row">
          <div className="leave-chart-card">
            <div className="leave-chart-title">Thống kê đơn theo Phòng ban</div>
            <div className="leave-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentData}>
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{fill: '#f3f4f6'}} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="leave-chart-card">
            <div className="leave-chart-title">Cơ cấu Loại nghỉ phép</div>
            <div className="leave-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={leaveTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {leaveTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="leave-table-col" style={{marginBottom: 40}}>
          <div className="leave-table-header">
            <h3 className="leave-table-title">Danh sách tất cả đơn xin nghỉ phép</h3>
          </div>
          <div className="leave-table-wrapper">
            <table className="leave-table">
              <thead>
                <tr>
                  <th>Nhân viên</th>
                  <th>Phòng ban</th>
                  <th>Loại nghỉ</th>
                  <th>Thời gian</th>
                  <th>Từ ngày</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((leave) => (
                  <tr key={leave._id}>
                    <td>
                      <div style={{fontWeight: 500, color: 'var(--text-primary)'}}>{leave.user?.name}</div>
                    </td>
                    <td>{leave.department}</td>
                    <td>
                      <span className="leave-type-badge">{leave.leaveType || 'Khác'}</span>
                      <div style={{fontSize: 11, color: leave.isPaid ? 'var(--success)' : 'var(--danger)', marginTop: 4}}>
                        {leave.isPaid ? 'Có lương' : 'Không lương'}
                      </div>
                    </td>
                    <td>{leave.days ? `${leave.days} ngày` : '--'}</td>
                    <td>{formatDate(leave.startDate)}</td>
                    <td>{renderStatusDot(leave.status)}</td>
                    <td>
                      {leave.status === 'pending' ? (
                        <button 
                          className="leave-type-badge" 
                          style={{cursor: 'pointer', border: 'none', background: '#3b82f6', color: '#fff'}}
                          onClick={() => { setSelectedLeave(leave); setShowReviewModal(true); }}
                        >
                          Xử lý
                        </button>
                      ) : (
                        <span style={{fontSize: 12, color: 'var(--text-muted)'}}>--</span>
                      )}
                    </td>
                  </tr>
                ))}
                {leaves.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0'}}>Không có dữ liệu</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Admin Review Modal */}
        {showReviewModal && selectedLeave && (
          <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
              <div className="modal-header">
                <h3 className="modal-title">Xử lý đơn nghỉ phép</h3>
                <button className="btn-icon" onClick={() => setShowReviewModal(false)}><FiX /></button>
              </div>
              <div style={{ marginBottom: 16 }}>
                <p><strong>Nhân viên:</strong> {selectedLeave.user?.name}</p>
                <p><strong>Phòng ban:</strong> {selectedLeave.department}</p>
                <p><strong>Loại nghỉ:</strong> {selectedLeave.leaveType} ({selectedLeave.isPaid ? 'Có lương' : 'Không lương'}) - {selectedLeave.days} ngày</p>
                <p><strong>Từ ngày:</strong> {formatDate(selectedLeave.startDate)} - <strong>Đến:</strong> {formatDate(selectedLeave.endDate)}</p>
                <p style={{marginTop: 8, padding: 12, background: 'var(--bg-input)', borderRadius: 8}}><strong>Lý do:</strong> {selectedLeave.reason}</p>
              </div>
              <div style={{ marginBottom: 24 }}>
                <label className="leave-label">Ghi chú / Phản hồi (Tùy chọn)</label>
                <textarea 
                  className="leave-textarea"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Nhập lý do từ chối hoặc lời dặn..."
                />
              </div>
              <div className="modal-footer" style={{display: 'flex', gap: 12, justifyContent: 'flex-end'}}>
                <button type="button" className="leave-btn-submit" style={{width: 'auto', padding: '8px 16px', background: '#ef4444'}} onClick={() => handleReviewLeave('rejected')}>Từ chối</button>
                <button type="button" className="leave-btn-submit" style={{width: 'auto', padding: '8px 16px', background: '#22c55e'}} onClick={() => handleReviewLeave('approved')}>Duyệt</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Manager View
  if (user.role === 'manager') {
    return (
      <div className="leave-mgmt-container">
        <div className="leave-mgmt-header">
          <h2>Đơn Nghỉ phép Phòng: {user.department}</h2>
          <p>Xem xét và duyệt đơn nghỉ phép của nhân viên trong phòng</p>
        </div>

        {error && <div className="error-message" style={{marginBottom: 20}}>{error}</div>}

        <div className="leave-stats-row">
          <div className="leave-stat-card">
            <div className="leave-stat-title">Đơn trong phòng</div>
            <div className="leave-stat-value leave-stat-val-primary">{String(leaves.length).padStart(2, '0')}</div>
            <div className="leave-stat-line"><div className="leave-stat-line-inner line-bg-primary" style={{width: '100%'}}></div></div>
          </div>
          <div className="leave-stat-card">
            <div className="leave-stat-title">Đang chờ xử lý</div>
            <div className="leave-stat-value leave-stat-val-warning">{String(leaves.filter(l => l.status === 'pending').length).padStart(2, '0')}</div>
            <div className="leave-stat-line"><div className="leave-stat-line-inner line-bg-warning" style={{width: '100%'}}></div></div>
          </div>
          <div className="leave-stat-card">
            <div className="leave-stat-title">Đã duyệt</div>
            <div className="leave-stat-value leave-stat-val-success">{String(leaves.filter(l => l.status === 'approved').length).padStart(2, '0')}</div>
            <div className="leave-stat-line"><div className="leave-stat-line-inner line-bg-success" style={{width: '100%'}}></div></div>
          </div>
        </div>

        <div className="leave-charts-row">
          <div className="leave-chart-card">
            <div className="leave-chart-title">Tỷ lệ Trạng thái duyệt đơn</div>
            <div className="leave-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} label>
                    {statusData.map((entry, index) => {
                      let color = '#6b7280';
                      if (entry.name === 'Đã duyệt') color = '#22c55e';
                      if (entry.name === 'Từ chối') color = '#ef4444';
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="leave-chart-card" style={{flex: 2}}>
             <div className="leave-chart-title">Lịch Sử Duyệt Đơn</div>
             <div className="leave-table-wrapper" style={{maxHeight: 250, overflowY: 'auto'}}>
               <table className="leave-table">
                 <thead>
                   <tr>
                     <th>Nhân viên</th>
                     <th>Loại nghỉ</th>
                     <th>Thời gian</th>
                     <th>Trạng thái</th>
                     <th>Hành động</th>
                   </tr>
                 </thead>
                 <tbody>
                   {leaves.map((leave) => (
                     <tr key={leave._id}>
                       <td style={{fontWeight: 500}}>{leave.user?.name}</td>
                       <td>
                         <span className="leave-type-badge">{leave.leaveType || 'Khác'}</span>
                         <div style={{fontSize: 11, color: leave.isPaid ? 'var(--success)' : 'var(--danger)', marginTop: 4}}>
                           {leave.isPaid ? 'Có lương' : 'Không lương'}
                         </div>
                       </td>
                       <td>{leave.days ? `${leave.days} ngày` : '--'}</td>
                       <td>{renderStatusDot(leave.status)}</td>
                       <td>
                         {leave.status === 'pending' ? (
                           <button 
                             className="leave-type-badge" 
                             style={{cursor: 'pointer', border: 'none', background: '#3b82f6', color: '#fff'}}
                             onClick={() => { setSelectedLeave(leave); setShowReviewModal(true); }}
                           >
                             Xử lý
                           </button>
                         ) : (
                           <span style={{fontSize: 12, color: '#9ca3af'}}>--</span>
                         )}
                       </td>
                     </tr>
                   ))}
                   {leaves.length === 0 && (
                     <tr>
                       <td colSpan="5" style={{textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0'}}>Chưa có dữ liệu</td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
          </div>
        </div>

        {/* Manager Review Modal */}
        {showReviewModal && selectedLeave && (
          <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
              <div className="modal-header">
                <h3 className="modal-title">Xử lý đơn nghỉ phép</h3>
                <button className="btn-icon" onClick={() => setShowReviewModal(false)}><FiX /></button>
              </div>
              <div style={{ marginBottom: 16 }}>
                <p><strong>Nhân viên:</strong> {selectedLeave.user?.name}</p>
                <p><strong>Loại nghỉ:</strong> {selectedLeave.leaveType} ({selectedLeave.isPaid ? 'Có lương' : 'Không lương'}) - {selectedLeave.days} ngày</p>
                <p><strong>Từ ngày:</strong> {formatDate(selectedLeave.startDate)} - <strong>Đến:</strong> {formatDate(selectedLeave.endDate)}</p>
                <p style={{marginTop: 8, padding: 12, background: 'var(--bg-input)', borderRadius: 8}}><strong>Lý do:</strong> {selectedLeave.reason}</p>
              </div>
              <div style={{ marginBottom: 24 }}>
                <label className="leave-label">Ghi chú / Phản hồi (Tùy chọn)</label>
                <textarea 
                  className="leave-textarea"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Nhập lý do từ chối hoặc lời dặn..."
                />
              </div>
              <div className="modal-footer" style={{display: 'flex', gap: 12, justifyContent: 'flex-end'}}>
                <button type="button" className="leave-btn-submit" style={{width: 'auto', padding: '8px 16px', background: '#ef4444'}} onClick={() => handleReviewLeave('rejected')}>Từ chối</button>
                <button type="button" className="leave-btn-submit" style={{width: 'auto', padding: '8px 16px', background: '#22c55e'}} onClick={() => handleReviewLeave('approved')}>Duyệt</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Employee View
  return (
    <div className="leave-mgmt-container">
      <div className="leave-mgmt-header">
        <h2>Quản Lý Nghỉ Phép</h2>
        <p>Theo dõi quỹ phép và gửi yêu cầu nghỉ trực tuyến.</p>
      </div>

      {error && <div className="error-message" style={{marginBottom: 20}}>{error}</div>}

      <div className="leave-stats-row">
        <div className="leave-stat-card">
          <div className="leave-stat-title">Tổng quỹ phép (năm)</div>
          <div className="leave-stat-value leave-stat-val-primary">{String(stats.total).padStart(2, '0')}</div>
          <div className="leave-stat-line"><div className="leave-stat-line-inner line-bg-primary" style={{width: '100%'}}></div></div>
        </div>
        <div className="leave-stat-card">
          <div className="leave-stat-title">Đã sử dụng</div>
          <div className="leave-stat-value leave-stat-val-warning">{String(stats.used).padStart(2, '0')}</div>
          <div className="leave-stat-line"><div className="leave-stat-line-inner line-bg-warning" style={{width: `${(stats.used / stats.total) * 100}%`}}></div></div>
        </div>
        <div className="leave-stat-card">
          <div className="leave-stat-title">Còn lại</div>
          <div className="leave-stat-value leave-stat-val-primary">{String(stats.remaining).padStart(2, '0')}</div>
          <div className="leave-stat-line"><div className="leave-stat-line-inner line-bg-primary" style={{width: `${(stats.remaining / stats.total) * 100}%`}}></div></div>
        </div>
        <div className="leave-stat-card">
          <div className="leave-stat-title">Đang chờ duyệt</div>
          <div className="leave-stat-value leave-stat-val-neutral">{String(stats.pending).padStart(2, '0')}</div>
          <div className="leave-stat-line"><div className="leave-stat-line-inner line-bg-neutral" style={{width: '100%', background: 'transparent'}}></div></div>
        </div>
      </div>

      <div className="leave-main-layout">
        <div className="leave-form-col">
          <div className="leave-form-title">
            <FiPlus /> Tạo Đơn Nghỉ Phép
          </div>
          <form onSubmit={handleCreateLeave}>
            <div className="leave-form-row">
              <div className="leave-form-group">
                <label className="leave-label">Ngày bắt đầu</label>
                <input type="date" className="leave-input" required value={formData.startDate} onChange={(e) => setFormData({...formData, startDate: e.target.value})} />
              </div>
              <div className="leave-form-group">
                <label className="leave-label">Ngày kết thúc</label>
                <input type="date" className="leave-input" required value={formData.endDate} onChange={(e) => setFormData({...formData, endDate: e.target.value})} />
              </div>
            </div>
            
            <div className="leave-form-row">
              <div className="leave-form-group">
                <label className="leave-label">Loại nghỉ phép</label>
                <select className="leave-select" value={formData.leaveType} onChange={(e) => setFormData({...formData, leaveType: e.target.value})}>
                  <option value="Nghỉ phép năm">Nghỉ phép năm</option>
                  <option value="Nghỉ việc riêng">Nghỉ việc riêng</option>
                  <option value="Nghỉ ốm">Nghỉ ốm</option>
                  <option value="Nghỉ không lương">Nghỉ không lương</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
              <div className="leave-form-group">
                <label className="leave-label">Tính lương</label>
                <select className="leave-select" value={formData.isPaid} onChange={(e) => setFormData({...formData, isPaid: e.target.value === 'true'})}>
                  <option value="true">Có được trả lương (Sử dụng Quỹ Phép)</option>
                  <option value="false">Không được trả lương</option>
                </select>
              </div>
            </div>

            <div className="leave-form-group">
              <label className="leave-label">Lý do nghỉ</label>
              <textarea className="leave-textarea" required placeholder="Nhập lý do chi tiết..." value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})}></textarea>
            </div>

            <button type="submit" className="leave-btn-submit">
              <FiSend /> Gửi đơn xin nghỉ
            </button>
            <div className="leave-form-note">Thông tin sẽ được gửi trực tiếp đến quản lý trực tiếp và phòng HR.</div>
          </form>
        </div>

        <div className="leave-table-col">
          <div className="leave-table-header">
            <h3 className="leave-table-title">Lịch Sử Đơn Gửi</h3>
          </div>
          <div className="leave-table-wrapper">
            <table className="leave-table">
              <thead>
                <tr>
                  <th>Ngày gửi</th>
                  <th>Loại nghỉ</th>
                  <th>Thời gian</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((leave) => (
                  <tr key={leave._id}>
                    <td style={{fontWeight: 500}}>{formatDate(leave.createdAt)}</td>
                    <td>
                      <span className="leave-type-badge">{leave.leaveType || 'Nghỉ phép năm'}</span>
                      <div style={{fontSize: 11, color: leave.isPaid ? 'var(--success)' : 'var(--danger)', marginTop: 4}}>
                        {leave.isPaid ? 'Có lương' : 'Không lương'}
                      </div>
                    </td>
                    <td>{leave.days ? `${leave.days} ngày` : '--'}</td>
                    <td>{renderStatusDot(leave.status)}</td>
                  </tr>
                ))}
                {leaves.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0'}}>Chưa có đơn xin nghỉ phép nào</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveManagement;
