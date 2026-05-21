import { useState, useEffect } from 'react';
import { FiDollarSign, FiPlay, FiCheck, FiCreditCard, FiEdit3, FiX } from 'react-icons/fi';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
};

const formatHours = (value) => {
  const numericValue = Number(value || 0);
  if (!Number.isFinite(numericValue)) return '0';
  return Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(2).replace(/\.?0+$/, '');
};

const SalaryManagement = () => {
  const { user } = useAuth();
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [approvingAll, setApprovingAll] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [bonusInput, setBonusInput] = useState(0);
  const [statusInput, setStatusInput] = useState('pending');

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  // Permission helpers
  const isAdmin = user?.role === 'admin';
  const hasManageSalaryPermission = user?.permissions?.includes('manage_salary');
  
  const canCalculate = hasManageSalaryPermission;     // Manage Salary Permission
  const canEditBonus = hasManageSalaryPermission;      // Manage Salary Permission
  const canApprove = isAdmin;                    // Only Admin

  useEffect(() => {
    fetchSalaries();
  }, [month, year]);

  const fetchSalaries = async () => {
    try {
      setLoading(true);
      const res = await api.get('/salary', { params: { month, year } });
      setSalaries(res.data);
    } catch (err) {
      console.error('Error fetching salaries:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateAll = async () => {
    if (!window.confirm(`Tính lương toàn bộ nhân viên cho tháng ${month}/${year}?`)) return;
    setCalculating(true);
    try {
      const res = await api.post('/salary/calculate-all', { month, year });
      alert(res.data.message);
      fetchSalaries();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi tính lương!');
    } finally {
      setCalculating(false);
    }
  };

  const handleApproveAll = async () => {
    if (!window.confirm(`Duyệt nhanh tất cả phiếu lương đang chờ duyệt của tháng ${month}/${year}?`)) return;
    setApprovingAll(true);
    try {
      const res = await api.patch('/salary/approve-all', { month, year });
      alert(res.data.message);
      fetchSalaries();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi duyệt nhanh tất cả!');
    } finally {
      setApprovingAll(false);
    }
  };

  const openEditModal = (salary) => {
    setEditModal(salary);
    setBonusInput(salary.bonus || 0);
    setStatusInput(salary.status);
  };

  const handleSaveBonus = async () => {
    try {
      await api.patch(`/salary/${editModal._id}/bonus`, {
        bonus: Number(bonusInput),
      });
      setEditModal(null);
      fetchSalaries();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi cập nhật thưởng!');
    }
  };

  const handleSaveStatus = async () => {
    try {
      await api.patch(`/salary/${editModal._id}/status`, {
        status: statusInput,
      });
      setEditModal(null);
      fetchSalaries();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi cập nhật trạng thái!');
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      pending: { label: 'Chờ duyệt', className: 'badge badge-warning' },
      approved: { label: 'Đã duyệt', className: 'badge badge-info' },
      paid: { label: 'Đã trả', className: 'badge badge-success' },
    };
    const s = map[status] || map.pending;
    return <span className={s.className}>{s.label}</span>;
  };

  const getSubtitle = () => {
    if (hasManageSalaryPermission) return 'Tính toán, thưởng phạt lương nhân viên toàn công ty';
    if (isAdmin) return 'Xem và duyệt bảng lương nhân viên';
    return 'Xem bảng lương phòng ban';
  };

  return (
    <div>
      {/* Header */}
      <div className="card" style={{ marginBottom: 20, background: 'var(--gradient-primary)', border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ color: 'white' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
            💰 Quản lý Bảng lương
          </h2>
          <p style={{ opacity: 0.9, fontSize: 14 }}>
            {getSubtitle()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select className="form-select" style={{ width: 80, background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1} style={{ color: '#333' }}>T{i + 1}</option>
            ))}
          </select>
          <select className="form-select" style={{ width: 100, background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }} value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y} style={{ color: '#333' }}>{y}</option>
            ))}
          </select>
          {canCalculate && (
            <button className="btn btn-secondary" style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white' }} onClick={handleCalculateAll} disabled={calculating}>
              <FiPlay /> {calculating ? 'Đang tính...' : 'Tính lương tất cả'}
            </button>
          )}
          {canApprove && (
            <button
              className="btn btn-secondary"
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white' }}
              onClick={handleApproveAll}
              disabled={approvingAll}
            >
              <FiCheck /> {approvingAll ? 'Đang duyệt...' : 'Duyệt nhanh tất cả'}
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-card-icon blue"><FiDollarSign /></div>
          <div>
            <div className="stat-card-value">{salaries.length}</div>
            <div className="stat-card-label">Phiếu lương</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon green"><FiCheck /></div>
          <div>
            <div className="stat-card-value">{salaries.filter(s => s.status === 'approved').length}</div>
            <div className="stat-card-label">Đã duyệt</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon purple"><FiCreditCard /></div>
          <div>
            <div className="stat-card-value">{salaries.filter(s => s.status === 'paid').length}</div>
            <div className="stat-card-label">Đã trả</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon orange"><FiDollarSign /></div>
          <div>
            <div className="stat-card-value" style={{ fontSize: 16 }}>{formatCurrency(salaries.reduce((sum, s) => sum + s.finalSalary, 0))}</div>
            <div className="stat-card-label">Tổng chi lương</div>
          </div>
        </div>
      </div>

      {/* Salary Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📊 Bảng lương tháng {month}/{year}</h3>
        </div>

        {loading ? (
          <div className="loading-spinner"><div className="spinner"></div></div>
        ) : salaries.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Nhân viên</th>
                  <th>Phòng ban</th>
                  <th>Lương CB</th>
                  <th>Ngày công</th>
                  <th>Đi muộn</th>
                  <th>OT (giờ)</th>
                  <th>Phụ cấp</th>
                  <th>Thưởng</th>
                  <th>Khấu trừ</th>
                  <th>Phạt</th>
                  <th>Thực lãnh</th>
                  <th>Trạng thái</th>
                  {(canEditBonus || canApprove) && <th>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {salaries.map((s) => (
                  <tr key={s._id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{s.userId?.name || '—'}</div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>{s.userId?.position || ''}</div>
                    </td>
                    <td>{s.userId?.department || '—'}</td>
                    <td>{formatCurrency(s.basicSalary)}</td>
                    <td>{s.actualDays}/{s.workDays}</td>
                    <td style={{ color: s.lateDays > 0 ? 'var(--danger)' : 'inherit' }}>{s.lateDays}</td>
                    <td style={{ color: s.overtimeHours > 0 ? 'var(--success)' : 'inherit' }}>{formatHours(s.overtimeHours)}</td>
                    <td>{formatCurrency(s.allowance)}</td>
                    <td style={{ color: s.bonus > 0 ? 'var(--success)' : 'inherit' }}>{formatCurrency(s.bonus)}</td>
                    <td style={{ color: 'var(--danger)' }}>{formatCurrency(s.taxAndInsurance || 0)}</td>
                    <td style={{ color: s.penalty > 0 ? 'var(--danger)' : 'inherit' }}>{formatCurrency(s.penalty)}</td>
                    <td style={{ fontWeight: 700 }}>{formatCurrency(s.finalSalary)}</td>
                    <td>{getStatusBadge(s.status)}</td>
                    {(canEditBonus || canApprove) && (
                      <td>
                        <button className="btn-icon" title="Chỉnh sửa" onClick={() => openEditModal(s)}>
                          <FiEdit3 />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', opacity: 0.6 }}>
            <p>Chưa có dữ liệu lương cho tháng {month}/{year}.</p>
            {canCalculate && <p style={{ fontSize: 14, marginTop: 8 }}>Nhấn "Tính lương tất cả" để bắt đầu.</p>}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {canEditBonus ? 'Chỉnh sửa thưởng' : 'Duyệt trạng thái'}
              </h3>
              <button className="btn-icon" onClick={() => setEditModal(null)}><FiX /></button>
            </div>
            <div style={{ padding: '0 20px' }}>
              <p style={{ marginBottom: 16, opacity: 0.7 }}>
                Nhân viên: <strong>{editModal.userId?.name}</strong> — {editModal.userId?.department}
              </p>

              {/* Accounting Manager: edit bonus */}
              {canEditBonus && (
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Tiền thưởng (VNĐ)</label>
                  <input className="form-input" type="number" min="0" step="50000" value={bonusInput} onChange={(e) => setBonusInput(e.target.value)} />
                </div>
              )}

              {/* Admin: change status */}
              {canApprove && (
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Trạng thái</label>
                  <select className="form-select" value={statusInput} onChange={(e) => setStatusInput(e.target.value)}>
                    <option value="pending">Chờ duyệt</option>
                    <option value="approved">Đã duyệt</option>
                    <option value="paid">Đã trả lương</option>
                  </select>
                </div>
              )}

              {/* Salary breakdown summary */}
              <div style={{ padding: '12px 0', borderTop: '1px solid var(--border)', marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Lương cơ bản:</span>
                  <span>{formatCurrency(editModal.basicSalary)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Lương theo ngày công ({editModal.actualDays} ngày):</span>
                  <span>{formatCurrency(editModal.totalSalary)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Phụ cấp:</span>
                  <span style={{ color: 'var(--info)' }}>+{formatCurrency(editModal.allowance)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>OT ({formatHours(editModal.overtimeHours)}h):</span>
                  <span style={{ color: 'var(--success)' }}>+{formatCurrency(editModal.overtimeSalary)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Khấu trừ thuế/BHXH:</span>
                  <span style={{ color: 'var(--danger)' }}>-{formatCurrency(editModal.taxAndInsurance || 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Phạt đi muộn ({editModal.lateDays} ngày):</span>
                  <span style={{ color: 'var(--danger)' }}>-{formatCurrency(editModal.penalty)}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setEditModal(null)}>Hủy</button>
              {canEditBonus && (
                <button type="button" className="btn btn-primary" onClick={handleSaveBonus}>Lưu thưởng</button>
              )}
              {canApprove && (
                <button type="button" className="btn btn-primary" onClick={handleSaveStatus}>Cập nhật trạng thái</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryManagement;
