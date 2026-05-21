import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  FiMail, 
  FiPhone, 
  FiMapPin, 
  FiBriefcase, 
  FiCamera, 
  FiCheckCircle, 
  FiDollarSign,
  FiLock,
  FiEdit,
  FiX
} from 'react-icons/fi';
import api from '../services/api';
import './ProfilePage.css';

const isFilled = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return Boolean(value);
};

const PROFILE_COMPLETION_FIELDS = [
  { key: 'name', weight: 15 },
  { key: 'email', weight: 15 },
  { key: 'phone', weight: 15 },
  { key: 'address', weight: 15 },
  { key: 'department', weight: 10 },
  { key: 'position', weight: 10 },
  { key: 'avatar', weight: 10 },
  { key: 'hasFaceData', weight: 10 },
];

const calculateProfileCompletion = (user) => {
  if (!user) return 0;

  const totalWeight = PROFILE_COMPLETION_FIELDS.reduce((sum, item) => sum + item.weight, 0);
  if (!totalWeight) return 0;

  const completedWeight = PROFILE_COMPLETION_FIELDS.reduce((sum, item) => {
    if (isFilled(user[item.key])) return sum + item.weight;
    return sum;
  }, 0);

  return Math.round((completedWeight / totalWeight) * 100);
};

const ProfilePage = () => {
  const { user, refreshUser } = useAuth();
  const profileCompletion = calculateProfileCompletion(user);
  
  // Update Profile Modal States
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState({ name: '', email: '', phone: '', address: '' });
  const [profileUpdating, setProfileUpdating] = useState(false);

  // Avatar Modal States
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarData, setAvatarData] = useState({ avatar: '' });
  const [avatarUpdating, setAvatarUpdating] = useState(false);

  // Change Password Modal States
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordUpdating, setPasswordUpdating] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({ 
        name: user.name || '', 
        email: user.email || '', 
        phone: user.phone || '', 
        address: user.address || '' 
      });
      setAvatarData({ avatar: user.avatar || '' });
    }
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileUpdating(true);
    try {
      await api.put('/auth/me', profileData);
      await refreshUser();
      setShowProfileModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi cập nhật thông tin.');
    } finally {
      setProfileUpdating(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return alert('Mật khẩu mới không khớp!');
    }
    setPasswordUpdating(true);
    try {
      await api.put('/auth/me', { password: passwordData.newPassword, currentPassword: passwordData.currentPassword });
      alert('Đổi mật khẩu thành công!');
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi đổi mật khẩu.');
    } finally {
      setPasswordUpdating(false);
    }
  };

  const handleUpdateAvatar = async (e) => {
    e.preventDefault();
    if (!avatarData.avatar) return alert('Vui lòng chọn ảnh!');
    setAvatarUpdating(true);
    try {
      await api.put('/auth/me', { avatar: avatarData.avatar });
      await refreshUser();
      setShowAvatarModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi đổi ảnh đại diện.');
    } finally {
      setAvatarUpdating(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image(); /* Use global Image */
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // nén 80% chất lượng
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setAvatarData({ avatar: dataUrl });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Helper formats
  const renderEmployeeId = (employeeCode) => employeeCode || 'GEN-0000-0000';

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Chưa xác định';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return 'Chưa xác định';
    return `${('0' + (d.getMonth() + 1)).slice(-2)}/${d.getFullYear()}`;
  };

  if (!user) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div style={{ paddingTop: '10px' }}>
      <div className="profile-breadcrumb">
        Hệ thống &rsaquo; <span>Thông tin cá nhân</span>
      </div>

      <div className="profile-header">
        <h2 className="profile-header-title">Hồ sơ nhân viên</h2>
        <span className="badge badge-success" style={{ fontSize: '13px', padding: '6px 16px', letterSpacing: '0.5px' }}>
          ĐANG HOẠT ĐỘNG
        </span>
      </div>

      <div className="profile-page-container">
        {/* Support Widget */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Main Card acts as the primary profile display */}
        </div>

        <div className="profile-main-card">
          {/* Left Column - Avatar & Core Info */}
          <div className="profile-left-col">
            <div className="profile-avatar-wrapper">
              {user.avatar ? (
                <img src={user.avatar} alt="Avatar" className="profile-avatar" />
              ) : (
                <div className="profile-avatar">
                  {user.name?.charAt(0)?.toUpperCase()}
                </div>
              )}
              <div className="profile-avatar-edit" onClick={() => setShowAvatarModal(true)}>
                <FiCamera size={18} />
              </div>
            </div>

            <h3 className="profile-name">{user.name}</h3>
            <div className="profile-role">
              {user.position || (user.role === 'admin' ? 'Quản Trị Viên' : 'Nhân Viên')}
            </div>

            <div className="profile-stats-row">
              <div className="profile-stat-box">
                <div className="profile-stat-box-label">Mã NV</div>
                <div className="profile-stat-box-value">{renderEmployeeId(user.employeeCode)}</div>
              </div>
              <div className="profile-stat-box">
                <div className="profile-stat-box-label">Tham gia</div>
                <div className="profile-stat-box-value">{formatDate(user.createdAt)}</div>
              </div>
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="profile-right-col">
            <div className="profile-info-grid">
              <div className="profile-info-row">
                <div className="profile-info-label">
                  <FiMail /> Họ tên
                </div>
                <div className="profile-info-value">{user.name}</div>
              </div>
              
              <div className="profile-info-row">
                <div className="profile-info-label">
                  <FiMail /> Email
                </div>
                <div className="profile-info-value">{user.email}</div>
              </div>

              <div className="profile-info-row">
                <div className="profile-info-label">
                  <FiPhone /> Số điện thoại
                </div>
                <div className="profile-info-value">{user.phone || 'Chưa cập nhật'}</div>
              </div>

              <div className="profile-info-row">
                <div className="profile-info-label">
                  <FiMapPin /> Địa chỉ
                </div>
                <div className="profile-info-value">{user.address || 'Chưa cập nhật'}</div>
              </div>

              <div className="profile-info-row">
                <div className="profile-info-label">
                  <FiBriefcase /> Phòng ban
                </div>
                <div className="profile-info-value">
                  {user.department === 'IT' ? 'Phát triển phần mềm (IT)' : user.department}
                </div>
              </div>
            </div>

            {/* Bottom Cards */}
            <div className="profile-cards-bottom">
              <div className="profile-bottom-card orange">
                <div className="profile-bc-icon"><FiDollarSign /></div>
                <div className="profile-bc-content">
                  <div className="profile-bc-label">Bậc lương hiện tại</div>
                  <div className="profile-bc-value">Bậc {Math.floor((user.basicSalary || 8000000)/2000000)} / Senior</div>
                </div>
              </div>
              <div className="profile-bottom-card blue">
                <div className="profile-bc-icon"><FiCheckCircle /></div>
                <div className="profile-bc-content">
                  <div className="profile-bc-label">Xác thực hồ sơ</div>
                  <div className="profile-bc-value">Hoàn tất {profileCompletion}%</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="profile-actions">
              <button className="profile-btn profile-btn-outline" onClick={() => setShowPasswordModal(true)}>
                <FiLock /> Đổi mật khẩu
              </button>
              <button className="profile-btn profile-btn-primary" onClick={() => setShowProfileModal(true)}>
                <FiEdit /> Chỉnh sửa thông tin
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h3 className="modal-title">Cập nhật thông tin cá nhân</h3>
              <button className="btn-icon" onClick={() => setShowProfileModal(false)}><FiX /></button>
            </div>
            <form onSubmit={handleUpdateProfile}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Họ Tên</label>
                <input 
                  className="form-input" 
                  value={profileData.name} 
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} 
                  pattern="^[a-zA-ZÀ-ỹ\s]+$" 
                  title="Tên chỉ được chứa chữ cái và khoảng trắng" 
                  required 
                />
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Email</label>
                <input 
                  className="form-input" 
                  type="email" 
                  value={profileData.email} 
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })} 
                  required 
                />
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Số điện thoại</label>
                <input 
                  className="form-input" 
                  type="tel" 
                  value={profileData.phone} 
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })} 
                  pattern="^(0[3|5|7|8|9])[0-9]{8}$" 
                  title="Số điện thoại phải chứa 10 chữ số và bắt đầu bằng 03, 05, 07, 08 hoặc 09" 
                />
              </div>
              <div className="form-group" style={{ marginBottom: 24 }}>
                <label className="form-label">Địa chỉ</label>
                <input 
                  className="form-input" 
                  type="text" 
                  value={profileData.address} 
                  onChange={(e) => setProfileData({ ...profileData, address: e.target.value })} 
                />
              </div>
              <div className="modal-footer" style={{ marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowProfileModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={profileUpdating}>
                  {profileUpdating ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3 className="modal-title">Đổi mật khẩu</h3>
              <button className="btn-icon" onClick={() => setShowPasswordModal(false)}><FiX /></button>
            </div>
            <form onSubmit={handleUpdatePassword}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Mật khẩu hiện tại *</label>
                <input 
                  className="form-input" 
                  type="password" 
                  value={passwordData.currentPassword} 
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })} 
                  minLength={6}
                  required 
                />
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Mật khẩu mới *</label>
                <input 
                  className="form-input" 
                  type="password" 
                  value={passwordData.newPassword} 
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} 
                  minLength={6}
                  required 
                />
              </div>
              <div className="form-group" style={{ marginBottom: 24 }}>
                <label className="form-label">Xác nhận mật khẩu mới</label>
                <input 
                  className="form-input" 
                  type="password" 
                  value={passwordData.confirmPassword} 
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} 
                  minLength={6}
                  required 
                />
              </div>
              <div className="modal-footer" style={{ marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPasswordModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={passwordUpdating}>
                  {passwordUpdating ? 'Đang lưu...' : 'Đổi mật khẩu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Avatar Modal */}
      {showAvatarModal && (
        <div className="modal-overlay" onClick={() => setShowAvatarModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3 className="modal-title">Cập nhật ảnh đại diện</h3>
              <button className="btn-icon" onClick={() => setShowAvatarModal(false)}><FiX /></button>
            </div>
            <form onSubmit={handleUpdateAvatar}>
              <div className="form-group" style={{ marginBottom: 24, textAlign: 'center' }}>
                <p style={{ fontSize: '14px', marginBottom: '16px', color: 'var(--text-secondary)' }}>
                  Hãy chọn một tấm ảnh rõ nét từ thiết bị hoặc sử dụng camera để chụp trực tiếp.
                </p>
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '16px' }}>
                  <input 
                    type="file" 
                    accept="image/*" 
                    id="upload-avatar" 
                    style={{ display: 'none' }} 
                    onChange={handleFileSelect} 
                  />
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="user" 
                    id="capture-avatar" 
                    style={{ display: 'none' }} 
                    onChange={handleFileSelect} 
                  />
                  
                  <label htmlFor="upload-avatar" className="profile-btn profile-btn-outline" style={{ cursor: 'pointer', padding: '8px 16px', fontSize: '13px' }}>
                    Tải ảnh lên
                  </label>
                  <label htmlFor="capture-avatar" className="profile-btn profile-btn-outline" style={{ cursor: 'pointer', padding: '8px 16px', fontSize: '13px' }}>
                    Chụp ảnh
                  </label>
                </div>

                {avatarData.avatar && (
                  <div style={{ marginTop: '24px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Bản xem trước:</p>
                    <img 
                      src={avatarData.avatar} 
                      alt="Preview" 
                      style={{ 
                        width: '120px', 
                        height: '120px', 
                        borderRadius: '50%', 
                        objectFit: 'cover', 
                        border: '3px solid var(--accent-primary)',
                        margin: '0 auto'
                      }} 
                    />
                  </div>
                )}
              </div>
              <div className="modal-footer" style={{ marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAvatarModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={avatarUpdating}>
                  {avatarUpdating ? 'Đang lưu...' : 'Lưu ảnh'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
