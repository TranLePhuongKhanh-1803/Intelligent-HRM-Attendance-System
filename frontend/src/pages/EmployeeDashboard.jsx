import { useState, useEffect, useRef } from 'react';
import { FiCalendar, FiClock, FiCheckCircle, FiCamera, FiX } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const createFaceCropBase64 = (videoElement, detection, quality = 0.9) => {
  const box = detection?.detection?.box || detection?.box;
  if (!box || !videoElement?.videoWidth || !videoElement?.videoHeight) {
    return null;
  }

  const paddingX = box.width * 0.35;
  const paddingY = box.height * 0.45;
  const sourceX = Math.max(0, box.x - paddingX);
  const sourceY = Math.max(0, box.y - paddingY);
  const sourceWidth = Math.min(videoElement.videoWidth - sourceX, box.width + paddingX * 2);
  const sourceHeight = Math.min(videoElement.videoHeight - sourceY, box.height + paddingY * 2);

  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 320;

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(videoElement, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/jpeg', quality);
};

const EmployeeDashboard = () => {
  const { user, refreshUser } = useAuth();
  const [myAttendance, setMyAttendance] = useState([]);
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  
  // Face Registration States
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [processingFace, setProcessingFace] = useState(false);
  const [faceStatus, setFaceStatus] = useState('');
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  

  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    fetchMyAttendance();
    fetchActiveAnnouncements();
    return () => {
      stopCamera();
    };
  }, [month]);

  const fetchActiveAnnouncements = async () => {
    try {
      const res = await api.get('/announcements/active');
      setAnnouncements(res.data);
    } catch (err) {
      console.error('Lỗi tải thông báo', err);
    }
  };

  const loadFaceModels = async () => {
    try {
      setFaceStatus('Đang tải mô hình AI...');
      const faceapi = await import('face-api.js');
      const MODEL_URL = '/models';
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      setModelsLoaded(true);
      setFaceStatus('Mô hình đã sẵn sàng. Hãy nhìn thẳng vào camera.');
      return faceapi;
    } catch (err) {
      console.error(err);
      setFaceStatus('Lỗi: Không thể tải mô hình khuôn mặt.');
      return null;
    }
  };

  const startCamera = async () => {
    try {
      setFaceStatus('Đang khởi động camera...');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
      }
      if (!modelsLoaded) await loadFaceModels();
      else setFaceStatus('Hãy nhìn thẳng vào camera và nhấn Lưu dữ liệu');
    } catch (err) {
      setFaceStatus('Lỗi: Không thể truy cập camera. Vui lòng cấp quyền.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const captureMyFace = async () => {
    if (!videoRef.current || processingFace) return;
    setProcessingFace(true);

    const TOTAL_SAMPLES = 3;
    const collectedImages = [];

    try {
      const faceapi = await import('face-api.js');

      for (let i = 0; i < TOTAL_SAMPLES; i++) {
        setFaceStatus(`Đang chụp mẫu ${i + 1}/${TOTAL_SAMPLES}... Hãy nhìn thẳng vào camera.`);
        
        // Small delay between captures for variation (head micro-movements)
        if (i > 0) {
          setFaceStatus(`Xin hãy xoay nhẹ đầu sang ${i === 1 ? 'trái' : 'phải'}... (${i + 1}/${TOTAL_SAMPLES})`);
          await new Promise(r => setTimeout(r, 1500));
        }

        // Liveness Pre-check using face-api.js (fast bounding box check)
        const detection = await faceapi.detectSingleFace(videoRef.current).withFaceLandmarks();

        if (!detection) {
          setFaceStatus(`Không tìm thấy khuôn mặt ở mẫu ${i + 1}. Vui lòng nhìn thẳng camera và thử lại.`);
          setProcessingFace(false);
          return;
        }

        const faceBox = detection.detection.box;
        const frameArea = videoRef.current.videoWidth * videoRef.current.videoHeight;
        const faceArea = faceBox.width * faceBox.height;
        if (!frameArea || faceArea / frameArea < 0.05) {
          setFaceStatus(`Khuôn mặt ở mẫu ${i + 1} còn quá xa camera. Vui lòng tiến gần hơn.`);
          setProcessingFace(false);
          return;
        }

        const base64Image = createFaceCropBase64(videoRef.current, detection, 0.9);
        if (!base64Image) {
          setFaceStatus(`Không thể xử lý ảnh ở mẫu ${i + 1}. Vui lòng thử lại.`);
          setProcessingFace(false);
          return;
        }
        
        collectedImages.push(base64Image);
      }

      setFaceStatus('Đang gửi dữ liệu AI lên hệ thống (DeepFace)... Vui lòng chờ.');
      await api.put('/auth/me/face', { images: collectedImages });

      setFaceStatus(`✅ Đã lưu ${TOTAL_SAMPLES} mẫu khuôn mặt thành công bằng AI System!`);
        await refreshUser();
        setShowFaceModal(false);
        stopCamera();
    } catch (err) {
      setFaceStatus(err.response?.data?.message || 'Có lỗi xảy ra khi lưu.');
    } finally {
      setProcessingFace(false);
    }
  };

  const fetchMyAttendance = async () => {
    try {
      setLoading(true);
      const [year, mon] = month.split('-');
      const startDate = `${year}-${mon}-01`;
      const lastDay = new Date(year, mon, 0).getDate();
      const endDate = `${year}-${mon}-${String(lastDay).padStart(2, '0')}`;

      const res = await api.get('/attendance/my', {
        params: { startDate, endDate, limit: 50 },
      });

      setMyAttendance(res.data.records);

      // Check today's record
      const today = new Date().toISOString().split('T')[0];
      const todayRec = res.data.records.find(r => r.date === today);
      setTodayRecord(todayRec || null);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
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

  const presentDays = myAttendance.filter(r => r.status === 'present').length;
  const lateDays = myAttendance.filter(r => r.status === 'late').length;
  const totalDays = myAttendance.length;

  if (loading) {
    return <div className="loading-spinner"><div className="spinner"></div></div>;
  }

  return (
    <div>
      {/* Welcome Banner */}
      <div className="card" style={{ marginBottom: 20, background: 'var(--gradient-primary)', border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: 'white' }}>
          {user?.avatar ? (
            <img src={user.avatar} alt="Avatar" style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.5)' }} />
          ) : (
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 'bold', border: '2px solid rgba(255,255,255,0.5)' }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          )}
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 4 }}>
              Xin chào, {user?.name}! 👋
            </h2>
            <p style={{ opacity: 0.9, fontSize: 14, margin: 0 }}>
              {user?.department} - {user?.position || 'Nhân viên'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white' }} onClick={() => setShowFaceModal(true)}>
            <FiCamera /> {user?.hasFaceData ? 'Cập nhật khuôn mặt' : 'Đăng ký khuôn mặt'}
          </button>
          {user?.hasFaceData && (
            <button className="btn btn-secondary" style={{ background: 'rgba(220,53,69,0.7)', border: 'none', color: 'white' }} onClick={async () => {
              if (!window.confirm('Bạn có chắc muốn xóa dữ liệu khuôn mặt? Bạn sẽ không thể chấm công bằng Face ID cho đến khi đăng ký lại.')) return;
              try {
                await api.delete('/auth/me/face');
                alert('Đã xóa dữ liệu khuôn mặt thành công!');
                await refreshUser();
              } catch (err) {
                alert(err.response?.data?.message || 'Lỗi khi xóa!');
              }
            }}>
              🗑️ Xóa Face ID
            </button>
          )}
        </div>
      </div>

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

      {/* Today Status */}
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-card-icon green"><FiCheckCircle /></div>
          <div>
            <div className="stat-card-value" style={{ fontSize: 20 }}>
              {todayRecord ? 'Đã chấm công' : 'Chưa chấm công'}
            </div>
            <div className="stat-card-label">Hôm nay</div>
          </div>
        </div>
        {todayRecord && (
          <>
            <div className="stat-card">
              <div className="stat-card-icon blue"><FiClock /></div>
              <div>
                <div className="stat-card-value" style={{ fontSize: 20 }}>
                  {formatTime(todayRecord.checkIn)}
                </div>
                <div className="stat-card-label">Giờ vào</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon orange"><FiClock /></div>
              <div>
                <div className="stat-card-value" style={{ fontSize: 20 }}>
                  {formatTime(todayRecord.checkOut)}
                </div>
                <div className="stat-card-label">Giờ ra</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Monthly Stats */}
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-card-icon purple"><FiCalendar /></div>
          <div>
            <div className="stat-card-value">{totalDays}</div>
            <div className="stat-card-label">Tổng ngày chấm công</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon green"><FiCheckCircle /></div>
          <div>
            <div className="stat-card-value">{presentDays}</div>
            <div className="stat-card-label">Đúng giờ</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon orange"><FiClock /></div>
          <div>
            <div className="stat-card-value">{lateDays}</div>
            <div className="stat-card-label">Đi muộn</div>
          </div>
        </div>
      </div>

      {/* Attendance History */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📋 Lịch sử chấm công</h3>
          <input
            type="month"
            className="form-input"
            style={{ width: 180 }}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>

        {myAttendance.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Giờ vào</th>
                  <th>Giờ ra</th>
                  <th>Phương thức</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {myAttendance.map((record) => (
                  <tr key={record._id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {formatDate(record.date)}
                    </td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3>Chưa có dữ liệu</h3>
            <p>Không có dữ liệu chấm công trong tháng này</p>
          </div>
        )}
      </div>

      {/* Face Registration Modal */}
      {showFaceModal && (
        <div className="modal-overlay" onClick={() => { setShowFaceModal(false); stopCamera(); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 className="modal-title">Đăng ký khuôn mặt</h3>
              <button className="btn-icon" onClick={() => { setShowFaceModal(false); stopCamera(); }}><FiX /></button>
            </div>
            <div style={{ padding: '0 0 20px 0' }}>
              <div className="camera-container" style={{ minHeight: 300, background: '#000', borderRadius: 'var(--radius-lg)', overflow: 'hidden', position: 'relative' }}>
                <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {!cameraActive && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexDirection: 'column', gap: 10 }}>
                    <FiCamera size={40} style={{ opacity: 0.5 }} />
                    <p style={{ fontSize: 14 }}>Nhấn "Bật Camera" để cấu hình</p>
                  </div>
                )}
              </div>
              
              {faceStatus && (
                <div style={{ marginTop: 16, padding: 12, textAlign: 'center', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', fontSize: 14 }}>
                  {faceStatus}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 20 }}>
                {!cameraActive ? (
                  <button className="btn btn-primary" onClick={startCamera}>
                    <FiCamera /> Bật Camera
                  </button>
                ) : (
                  <>
                    <button className="btn btn-success" onClick={captureMyFace} disabled={processingFace}>
                      {processingFace ? 'Đang lưu...' : '📸 Lưu dữ liệu'}
                    </button>
                    <button className="btn btn-secondary" onClick={stopCamera}>
                      Tắt Camera
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;
