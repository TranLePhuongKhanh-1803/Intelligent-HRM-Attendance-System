import { useState, useEffect } from 'react';
import { FiDollarSign, FiCalendar, FiClock, FiX } from 'react-icons/fi';
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

const EmployeeSalary = () => {
  const { user } = useAuth();
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailModal, setDetailModal] = useState(null);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());

  useEffect(() => {
    fetchMySalaries();
  }, [year]);

  const fetchMySalaries = async () => {
    try {
      setLoading(true);
      const res = await api.get('/salary/me', { params: { year } });
      setSalaries(res.data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
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

  const totalReceived = salaries.filter(s => s.status === 'paid').reduce((sum, s) => sum + s.finalSalary, 0);

  return (
    <div>
      {/* Header */}
      <div className="card" style={{ marginBottom: 20, background: 'var(--gradient-primary)', border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ color: 'white' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
            💰 Phiếu lương của tôi
          </h2>
          <p style={{ opacity: 0.9, fontSize: 14 }}>
            Xin chào, {user?.name} — {user?.department} / {user?.position || 'Nhân viên'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select className="form-select" style={{ width: 100, background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }} value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y} style={{ color: '#333' }}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary */}
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-card-icon blue"><FiCalendar /></div>
          <div>
            <div className="stat-card-value">{salaries.length}</div>
            <div className="stat-card-label">Phiếu lương năm {year}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon green"><FiDollarSign /></div>
          <div>
            <div className="stat-card-value" style={{ fontSize: 16 }}>{formatCurrency(totalReceived)}</div>
            <div className="stat-card-label">Tổng đã nhận</div>
          </div>
        </div>
      </div>

      {/* Salary List */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📋 Lịch sử lương năm {year}</h3>
        </div>

        {loading ? (
          <div className="loading-spinner"><div className="spinner"></div></div>
        ) : salaries.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Tháng</th>
                  <th>Lương cơ bản</th>
                  <th>Ngày công</th>
                  <th>OT</th>
                  <th>Phụ cấp</th>
                  <th>Phạt</th>
                  <th>Thưởng</th>
                  <th>Khấu trừ</th>
                  <th>Thực lãnh</th>
                  <th>Trạng thái</th>
                  <th>Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {salaries.map((s) => (
                  <tr key={s._id}>
                    <td style={{ fontWeight: 600 }}>Tháng {s.month}</td>
                    <td>{formatCurrency(s.basicSalary)}</td>
                    <td>{s.actualDays}/{s.workDays}</td>
                    <td>{formatHours(s.overtimeHours)}h</td>
                    <td>{formatCurrency(s.allowance)}</td>
                    <td style={{ color: s.penalty > 0 ? 'var(--danger)' : 'inherit' }}>{formatCurrency(s.penalty)}</td>
                    <td style={{ color: s.bonus > 0 ? 'var(--success)' : 'inherit' }}>{formatCurrency(s.bonus)}</td>
                    <td style={{ color: 'var(--danger)' }}>{formatCurrency(s.taxAndInsurance || 0)}</td>
                    <td style={{ fontWeight: 700 }}>{formatCurrency(s.finalSalary)}</td>
                    <td>{getStatusBadge(s.status)}</td>
                    <td>
                      <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => setDetailModal(s)}>
                        Xem
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', opacity: 0.6 }}>
            <p>Chưa có dữ liệu lương năm {year}.</p>
          </div>
        )}
      </div>

      {/* Salary Detail Modal */}
      {detailModal && (
        <div className="modal-overlay" onClick={() => setDetailModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h3 className="modal-title">Chi tiết lương tháng {detailModal.month}/{detailModal.year}</h3>
              <button className="btn-icon" onClick={() => setDetailModal(null)}><FiX /></button>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span>Lương cơ bản:</span>
                <strong>{formatCurrency(detailModal.basicSalary)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span>Lương / ngày:</span>
                <span>{formatCurrency(detailModal.salaryPerDay)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span>Ngày công thực tế:</span>
                <span>{detailModal.actualDays} / {detailModal.workDays} ngày</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span>Lương theo ngày công:</span>
                <span>{formatCurrency(detailModal.totalSalary)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span>Phụ cấp chức vụ:</span>
                <span style={{ color: 'var(--info)' }}>+{formatCurrency(detailModal.allowance)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span>Tăng ca ({formatHours(detailModal.overtimeHours)} giờ × 50,000đ):</span>
                <span style={{ color: 'var(--success)' }}>+{formatCurrency(detailModal.overtimeSalary)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span>Tiền thưởng:</span>
                <span style={{ color: 'var(--success)' }}>+{formatCurrency(detailModal.bonus)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span>Khấu trừ thuế/BHXH:</span>
                <span style={{ color: 'var(--danger)' }}>-{formatCurrency(detailModal.taxAndInsurance || 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span>Phạt đi muộn ({detailModal.lateDays} ngày):</span>
                <span style={{ color: 'var(--danger)' }}>-{formatCurrency(detailModal.penalty)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', marginTop: 8, fontWeight: 700, fontSize: 18, borderTop: '2px solid var(--border)' }}>
                <span>💵 Thực lãnh:</span>
                <span style={{ color: 'var(--success)' }}>{formatCurrency(detailModal.finalSalary)}</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDetailModal(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeSalary;
