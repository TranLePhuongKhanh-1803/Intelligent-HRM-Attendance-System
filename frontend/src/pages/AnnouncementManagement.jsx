import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiBell, FiEye, FiEyeOff } from 'react-icons/fi';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const AnnouncementManagement = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '', type: 'info', isActive: true, department: 'All' });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await api.get('/announcements');
      setAnnouncements(res.data);
    } catch (err) {
      alert('Không thể tải danh sách thông báo.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingId(item._id);
      setFormData({
        title: item.title,
        content: item.content,
        type: item.type,
        isActive: item.isActive,
        department: item.department || 'All'
      });
    } else {
      setEditingId(null);
      setFormData({ title: '', content: '', type: 'info', isActive: true, department: 'All' });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/announcements/${editingId}`, formData);
      } else {
        await api.post('/announcements', formData);
      }
      setShowModal(false);
      fetchAnnouncements();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi lưu thông báo!');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa thông báo này?')) return;
    try {
      await api.delete(`/announcements/${id}`);
      fetchAnnouncements();
    } catch (err) {
      alert('Lỗi xóa thông báo!');
    }
  };

  const handleToggleActive = async (item) => {
    try {
      await api.put(`/announcements/${item._id}`, { isActive: !item.isActive });
      fetchAnnouncements();
    } catch (err) {
      alert('Lỗi đổi trạng thái!');
    }
  };

  const getBadgeClass = (type) => {
    switch(type) {
      case 'info': return 'badge-info';
      case 'warning': return 'badge-warning';
      case 'success': return 'badge-success';
      case 'danger': return 'badge-danger';
      default: return 'badge-info';
    }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 20, background: 'var(--gradient-primary)', border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: 'white' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}><FiBell /> Bảng Tin Nội Bộ</h2>
          <p style={{ opacity: 0.9, fontSize: 14 }}>Quản lý các thông báo hiển thị trên màn hình trang chủ của nhân sự</p>
        </div>
        <button className="btn btn-secondary" style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white' }} onClick={() => handleOpenModal()}>
          <FiPlus /> Đăng Tin Mới
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-spinner"><div className="spinner"></div></div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Tiêu đề</th>
                  <th>Phạm vi</th>
                  <th>Phân loại</th>
                  <th>Người đăng</th>
                  <th>Ngày đăng</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {announcements.map(item => (
                  <tr key={item._id}>
                    <td style={{ fontWeight: 600 }}>{item.title}</td>
                    <td>{item.department === 'All' ? 'Toàn công ty' : item.department}</td>
                    <td><span className={`badge ${getBadgeClass(item.type)}`}>{item.type.toUpperCase()}</span></td>
                    <td>{item.author?.name}</td>
                    <td>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td>
                      <button 
                        onClick={() => handleToggleActive(item)} 
                        className={`badge ${item.isActive ? 'badge-success' : 'badge-danger'}`} 
                        style={{cursor: 'pointer', border: 'none'}}
                      >
                        {item.isActive ? <><FiEye /> Đang hiện</> : <><FiEyeOff /> Đã ẩn</>}
                      </button>
                    </td>
                    <td>
                      <button className="btn-icon" onClick={() => handleOpenModal(item)} title="Sửa"><FiEdit2 /></button>
                      <button className="btn-icon" onClick={() => handleDelete(item._id)} title="Xóa" style={{color: 'var(--danger)'}}><FiTrash2 /></button>
                    </td>
                  </tr>
                ))}
                {announcements.length === 0 && (
                  <tr><td colSpan="7" style={{textAlign: 'center', opacity: 0.6}}>Chưa có thông báo nào</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth: 600}}>
            <h3 className="modal-title">{editingId ? 'Sửa thông báo' : 'Tạo thông báo mới'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Tiêu đề</label>
                <input required className="form-input" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="VD: Thông báo họp toàn công ty" />
              </div>
              <div className="form-group">
                <label className="form-label">Nội dung</label>
                <textarea required className="form-input" rows="5" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} placeholder="Nội dung chi tiết..." />
              </div>
              <div className="form-row" style={{display: 'flex', gap: 16}}>
                <div className="form-group" style={{flex: 1}}>
                  <label className="form-label">Loại thông báo</label>
                  <select className="form-select" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="info">Thông tin (Info)</option>
                    <option value="success">Tin vui (Success)</option>
                    <option value="warning">Chú ý (Warning)</option>
                    <option value="danger">Khẩn cấp (Danger)</option>
                  </select>
                </div>
                <div className="form-group" style={{flex: 1}}>
                  <label className="form-label">Trạng thái</label>
                  <select className="form-select" value={formData.isActive ? 'true' : 'false'} onChange={e => setFormData({...formData, isActive: e.target.value === 'true'})}>
                    <option value="true">Hiển thị ngay</option>
                    <option value="false">Lưu nháp (Ẩn)</option>
                  </select>
                </div>
              </div>
              {user?.role === 'admin' && (
                <div className="form-group">
                  <label className="form-label">Phạm vi hiển thị</label>
                  <select className="form-select" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>
                    <option value="All">Toàn công ty</option>
                    <option value="IT">Phòng IT</option>
                    <option value="HR">Phòng HR</option>
                    <option value="Accounting">Phòng Kế toán</option>
                  </select>
                </div>
              )}
              {user?.role === 'manager' && (
                <div className="form-group">
                  <label className="form-label">Phạm vi hiển thị</label>
                  <input className="form-input" value={`Phòng ${user.department} (Mặc định)`} disabled />
                </div>
              )}
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Cập nhật' : 'Đăng tin'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementManagement;
