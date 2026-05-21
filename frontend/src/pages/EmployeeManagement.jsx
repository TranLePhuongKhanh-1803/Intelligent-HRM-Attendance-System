import { useState, useEffect, useRef, useCallback } from 'react';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiCamera, FiX, FiFilter } from 'react-icons/fi';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const EmployeeManagement = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'employee',
    department: 'IT', position: '', phone: '', basicSalary: 8000000,
    permissions: [],
  });

  // Debounce search input 400ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchEmployees();
  }, [page, debouncedSearch, filterDepartment]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const params = { page, search: debouncedSearch, limit: 10 };
      if (filterDepartment) params.department = filterDepartment;
      const res = await api.get('/employees', { params });
      setEmployees(res.data.employees);
      setTotal(res.data.total);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingEmployee(null);
    setFormData({ name: '', email: '', password: '', role: 'employee', department: user?.role === 'manager' ? user.department : 'IT', position: '', phone: '', basicSalary: 8000000, permissions: [] });
    setShowModal(true);
  };

  const handleEdit = (emp) => {
    setEditingEmployee(emp);
    setFormData({
      name: emp.name, email: emp.email, password: '', role: emp.role,
      department: emp.department || 'IT', position: emp.position || '', phone: emp.phone || '',
      basicSalary: emp.basicSalary || 8000000,
      permissions: emp.permissions || [],
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingEmployee) {
        const { password, ...data } = formData;
        await api.put(`/employees/${editingEmployee._id}`, data);
      } else {
        await api.post('/employees', formData);
      }
      setShowModal(false);
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi!');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Bạn có chắc muốn xóa nhân viên "${name}"?`)) return;
    try {
      await api.delete(`/employees/${id}`);
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi xóa!');
    }
  };

  const totalPages = Math.ceil(total / 10);

  return (
    <div>
      {/* Search & Actions */}
      <div className="search-bar">
        <div className="search-input-wrapper">
          <FiSearch className="icon" />
          <input
            type="text"
            className="form-input"
            placeholder="Tìm kiếm nhân viên..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); }}
          />
        </div>
        {user?.role === 'admin' && (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
            <FiFilter style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <select
              className="form-select"
              value={filterDepartment}
              onChange={(e) => { setFilterDepartment(e.target.value); setPage(1); }}
              style={{ minWidth: 160 }}
            >
              <option value="">Tất cả phòng ban</option>
              <option value="IT">IT</option>
              <option value="HR">HR</option>
              <option value="Accounting">Accounting</option>
            </select>
          </div>
        )}
        <button className="btn btn-primary" onClick={handleCreate}>
          <FiPlus /> Thêm nhân viên
        </button>
      </div>

      {/* Employee Table */}
      <div className="card">
        {loading ? (
          <div className="loading-spinner"><div className="spinner"></div></div>
        ) : employees.length > 0 ? (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nhân viên</th>
                    <th>Mã NV</th>
                    <th>Email</th>
                    <th>Phòng ban</th>
                    <th>Chức vụ</th>
                    <th>Vai trò</th>
                    <th>Face Data</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="feed-item-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                            {emp.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{emp.name}</span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{emp.employeeCode || '—'}</td>
                      <td>{emp.email}</td>
                      <td>{emp.department || '—'}</td>
                      <td>{emp.position || '—'}</td>
                      <td>
                        <span className={`badge ${emp.role === 'admin' ? 'badge-purple' : (emp.role === 'manager' ? 'badge-info' : 'badge-primary')}`}>
                          {emp.role}
                        </span>
                      </td>
                      <td>
                        {emp.hasFaceData ? (
                          <span className="badge badge-success" style={{ cursor: 'pointer' }} title="Nhấn để xóa Face ID" onClick={async () => {
                            if (!window.confirm(`Xóa dữ liệu khuôn mặt của "${emp.name}"? Nhân viên sẽ cần đăng ký lại.`)) return;
                            try {
                              await api.delete(`/employees/${emp._id}/face`);
                              alert('Đã xóa Face ID thành công!');
                              fetchEmployees();
                            } catch (err) {
                              alert(err.response?.data?.message || 'Lỗi khi xóa!');
                            }
                          }}>
                            ✅ Có (Xóa)
                          </span>
                        ) : (
                          <span className="badge badge-danger">❌ Chưa</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {!(user?.role === 'manager' && (emp.role === 'admin' || emp.role === 'manager') && emp._id !== user._id) && (
                            <>
                              <button className="btn-icon" onClick={() => handleEdit(emp)} title="Sửa">
                                <FiEdit2 />
                              </button>
                              {!(user?.role === 'manager' && emp._id === user._id) && ( // Prevent manager from deleting themselves as they are manager
                                <button className="btn-icon" style={{ color: 'var(--accent-danger)' }} onClick={() => handleDelete(emp._id, emp.name)} title="Xóa">
                                  <FiTrash2 />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>Trước</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} className={p === page ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>
                ))}
                <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>Sau</button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">👤</div>
            <h3>Chưa có nhân viên</h3>
            <p>Bấm "Thêm nhân viên" để bắt đầu</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingEmployee ? 'Sửa nhân viên' : 'Thêm nhân viên mới'}</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}><FiX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Họ tên *</label>
                <input className="form-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} pattern="^[a-zA-ZÀ-ỹ\s]+$" title="Tên chỉ được chứa chữ cái và khoảng trắng" required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input className="form-input" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} pattern="^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$" title="Nhập địa chỉ email hợp lệ" required />
                </div>
                {!editingEmployee && (
                  <div className="form-group">
                    <label className="form-label">Mật khẩu *</label>
                    <input className="form-input" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required={!editingEmployee} />
                  </div>
                )}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Phòng ban</label>
                  <select className="form-select" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} disabled={user?.role === 'manager'}>
                    <option value="IT">IT</option>
                    <option value="HR">HR</option>
                    <option value="Accounting">Accounting</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Chức vụ</label>
                  <select className="form-select" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })}>
                    <option value="">-- Chọn chức vụ --</option>
                    <option value="Nhân viên">Nhân viên</option>
                    <option value="Trưởng phòng">Trưởng phòng</option>
                    <option value="Phó phòng">Phó phòng</option>
                    <option value="Thực tập sinh">Thực tập sinh</option>
                    <option value="Kế toán">Kế toán</option>
                    <option value="Nhân sự">Nhân sự</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Số điện thoại</label>
                  <input className="form-input" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} pattern="^(0[3|5|7|8|9])[0-9]{8}$" title="Số điện thoại phải chứa 10 chữ số và bắt đầu bằng 03, 05, 07, 08 hoặc 09" />
                </div>
                <div className="form-group">
                  <label className="form-label">Vai trò</label>
                  <select className="form-select" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} disabled={user?.role !== 'admin'}>
                    <option value="employee">employee</option>
                    <option value="manager">manager</option>
                    <option value="admin">admin</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Lương cơ bản (VNĐ)</label>
                <input className="form-input" type="number" min="0" step="100000" value={formData.basicSalary} onChange={(e) => setFormData({ ...formData, basicSalary: Number(e.target.value) })} />
              </div>

              {user?.role === 'admin' && (
                <div className="form-group" style={{ marginTop: 12, marginBottom: 16 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={formData.permissions.includes('manage_salary')}
                      onChange={(e) => {
                        const hasPerm = formData.permissions.includes('manage_salary');
                        let newPerms = [...formData.permissions];
                        if (e.target.checked && !hasPerm) {
                          newPerms.push('manage_salary');
                        } else if (!e.target.checked && hasPerm) {
                          newPerms = newPerms.filter(p => p !== 'manage_salary');
                        }
                        setFormData({ ...formData, permissions: newPerms });
                      }}
                      style={{ width: 18, height: 18 }}
                    />
                    <span style={{ fontWeight: 600 }}>Cấp quyền Quản lý & Tính Lương (manage_salary)</span>
                  </label>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 26px' }}>Cho phép người này tính lương và cập nhật thưởng/phạt cho nhân viên.</p>
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">{editingEmployee ? 'Cập nhật' : 'Tạo mới'}</button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
};

export default EmployeeManagement;
