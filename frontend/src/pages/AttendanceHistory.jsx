import { useState, useEffect } from 'react';
import { FiSearch, FiDownload, FiCalendar, FiEdit2, FiX } from 'react-icons/fi';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const AttendanceHistory = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editingRecord, setEditingRecord] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({ checkIn: null, checkOut: null, status: 'present' });
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    method: '',
  });

  useEffect(() => {
    fetchRecords();
  }, [page, filters]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 15, ...filters };
      // Remove empty params
      Object.keys(params).forEach(key => !params[key] && delete params[key]);
      
      const res = await api.get('/attendance', { params });
      setRecords(res.data.records);
      setTotal(res.data.total);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = { ...filters };
      Object.keys(params).forEach(key => !params[key] && delete params[key]);
      
      const res = await api.get('/attendance/export', { 
        params, 
        responseType: 'blob' 
      });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance-report-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Lỗi khi xuất báo cáo!');
    }
  };

  const handleEditClick = (record) => {
    setEditingRecord(record);
    
    // Convert to local datetime-local format string
    const toDatetimeLocal = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      // Ensure the timezone offset is handled, but an easier way is:
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().slice(0,16);
    };

    setEditData({
      checkIn: toDatetimeLocal(record.checkIn),
      checkOut: toDatetimeLocal(record.checkOut),
      status: record.status || 'present'
    });
    setShowEditModal(true);
  };

  const handleUpdateRecord = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/attendance/${editingRecord._id}`, {
        checkIn: editData.checkIn || null,
        checkOut: editData.checkOut || null,
        status: editData.status
      });
      setShowEditModal(false);
      setEditingRecord(null);
      fetchRecords(); // Refresh the list
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật.');
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const totalPages = Math.ceil(total / 15);

  return (
    <div>
      {/* Filters */}
      <div className="search-bar">
        <div className="form-group" style={{ margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiCalendar style={{ color: 'var(--text-muted)' }} />
            <input
              type="date"
              className="form-input"
              style={{ width: 160 }}
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
            <span style={{ color: 'var(--text-muted)' }}>đến</span>
            <input
              type="date"
              className="form-input"
              style={{ width: 160 }}
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>
        </div>
        <select
          className="form-select"
          style={{ width: 160 }}
          value={filters.method}
          onChange={(e) => setFilters({ ...filters, method: e.target.value })}
        >
          <option value="">Tất cả phương thức</option>
          <option value="face">Khuôn mặt (Face ID)</option>
        </select>
        <button className="btn btn-success" onClick={handleExport}>
          <FiDownload /> Xuất CSV
        </button>
      </div>

      {/* Records Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📋 Lịch sử chấm công</h3>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{total} bản ghi</span>
        </div>

        {loading ? (
          <div className="loading-spinner"><div className="spinner"></div></div>
        ) : records.length > 0 ? (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nhân viên</th>
                    <th>Phòng ban</th>
                    <th>Ngày</th>
                    <th>Giờ vào</th>
                    <th>Giờ ra</th>
                    <th>Phương thức</th>
                    <th>Trạng thái</th>
                    {(user?.role === 'admin' || user?.role === 'manager') && <th>Thao tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="feed-item-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                            {record.userId?.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {record.userId?.name}
                          </span>
                        </div>
                      </td>
                      <td>{record.userId?.department || '—'}</td>
                      <td>{formatDate(record.date)}</td>
                      <td>{formatTime(record.checkIn)}</td>
                      <td>{formatTime(record.checkOut)}</td>
                      <td>
                        <span className="badge badge-purple">
                          🤖 Face ID
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          record.status === 'present' ? 'badge-success' : 
                          record.status === 'late' ? 'badge-warning' : 'badge-danger'
                        }`}>
                          {record.status === 'present' ? 'Đúng giờ' : record.status === 'late' ? 'Muộn' : 'Vắng'}
                        </span>
                      </td>
                      {(user?.role === 'admin' || user?.role === 'manager') && (
                        <td>
                          <button className="btn-icon" onClick={() => handleEditClick(record)} title="Chỉnh sửa tay">
                            <FiEdit2 />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>Trước</button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const p = page <= 3 ? i + 1 : page + i - 2;
                  if (p < 1 || p > totalPages) return null;
                  return (
                    <button key={p} className={p === page ? 'active' : ''} onClick={() => setPage(p)}>
                      {p}
                    </button>
                  );
                })}
                <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>Sau</button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3>Chưa có dữ liệu</h3>
            <p>Không tìm thấy bản ghi chấm công nào</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Chỉnh sửa chấm công - {editingRecord?.userId?.name}</h3>
              <button className="btn-icon" onClick={() => setShowEditModal(false)}><FiX /></button>
            </div>
            <form onSubmit={handleUpdateRecord}>
              <div className="form-group">
                <label className="form-label">Giờ vào (Check-in)</label>
                <input 
                  type="datetime-local" 
                  className="form-input" 
                  value={editData.checkIn} 
                  onChange={e => setEditData(prev => ({...prev, checkIn: e.target.value}))} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Giờ ra (Check-out)</label>
                <input 
                  type="datetime-local" 
                  className="form-input" 
                  value={editData.checkOut} 
                  onChange={e => setEditData(prev => ({...prev, checkOut: e.target.value}))} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Trạng thái</label>
                <select 
                  className="form-select" 
                  value={editData.status} 
                  onChange={e => setEditData(prev => ({...prev, status: e.target.value}))}
                >
                  <option value="present">Đúng giờ</option>
                  <option value="late">Đi muộn</option>
                  <option value="absent">Vắng mặt</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu thay đổi</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceHistory;
