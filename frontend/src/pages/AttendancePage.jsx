import { useState, useRef, useEffect } from 'react';
import { FiCamera, FiSquare } from 'react-icons/fi';
import api from '../services/api';

const AttendancePage = () => {

  const [cameraActive, setCameraActive] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [processing, setProcessing] = useState(false);
  const [attendanceType, setAttendanceType] = useState('check-in');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
        setStatus({ type: '', message: 'Camera đang hoạt động. Nhấn nút để chấm công.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Không thể truy cập camera. Vui lòng cấp quyền.' });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Capture frame from camera and send to backend for verification
  const captureFace = async () => {
    if (!videoRef.current || processing) return;
    setProcessing(true);
    setStatus({ type: '', message: 'Đang xác thực khuôn mặt...' });

    try {
      const video = videoRef.current;
      if (!video.videoWidth || !video.videoHeight) {
        setStatus({ type: 'error', message: 'Camera chưa sẵn sàng. Vui lòng đợi.' });
        setProcessing(false);
        return;
      }

      // Capture frame from video
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      const base64Image = canvas.toDataURL('image/jpeg', 0.85);

      // Send to backend — DeepFace handles face detection + anti-spoofing + verification
      const endpoint = attendanceType === 'check-in' ? '/attendance/check-in' : '/attendance/check-out';
      const res = await api.post(endpoint, { method: 'face', image: base64Image });
      
      let finalMsg = res.data.message;
      if (res.data.attendance) {
        const att = res.data.attendance;
        if (att.emotion || att.age || att.gender) {
          const emotionMap = {
            happy: '😀 Vui vẻ', neutral: '😐 Bình tĩnh', sad: '😢 Buồn',
            angry: '😠 Tức giận', surprise: '😲 Bất ngờ', fear: '😨 Căng thẳng',
            disgust: '🤢 Khó chịu'
          };
          const genderMap = { Man: 'Nam 👨', Woman: 'Nữ 👩' };
          
          const eStr = att.emotion ? emotionMap[att.emotion] || att.emotion : '';
          const gStr = att.gender ? genderMap[att.gender] || att.gender : '';
          const aStr = att.age ? `Tuổi sinh học: ${att.age}` : '';
          
          finalMsg += `\n\n📊 Trạng thái hôm nay: ${eStr} | ${gStr} | ${aStr}`;
        }
      }
      
      setStatus({ type: 'success', message: finalMsg });
    } catch (err) {
      setStatus({ 
        type: 'error', 
        message: err.response?.data?.message || 'Có sự cố khi kết nối tới server. Vui lòng thử lại.' 
      });
    } finally {
      setProcessing(false);
    }
  };



  return (
    <div>
      {/* Attendance Type Toggle */}
      <div className="attendance-tabs" style={{ maxWidth: 300, marginBottom: 16 }}>
        <button
          className={`attendance-tab ${attendanceType === 'check-in' ? 'active' : ''}`}
          onClick={() => setAttendanceType('check-in')}
        >
          ✅ Check-in
        </button>
        <button
          className={`attendance-tab ${attendanceType === 'check-out' ? 'active' : ''}`}
          onClick={() => setAttendanceType('check-out')}
        >
          🔴 Check-out
        </button>
      </div>



      <div className="card">
        <div>
          <div className="camera-container">
            <video ref={videoRef} autoPlay playsInline muted />
            {cameraActive && (
              <div className="camera-overlay">
                <div className="face-guide"></div>
              </div>
            )}
            {!cameraActive && (
              <div style={{ 
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', 
                justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'white' 
              }}>
                <FiCamera size={48} style={{ opacity: 0.5 }} />
                <p>Nhấn nút bên dưới để bật camera</p>
              </div>
            )}
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          <div style={{ textAlign: 'center', marginTop: 16, display: 'flex', gap: 12, justifyContent: 'center' }}>
            {!cameraActive ? (
              <button className="btn btn-primary" onClick={startCamera}>
                <FiCamera /> Bật Camera
              </button>
            ) : (
              <>
                <button 
                  className="btn btn-success" 
                  onClick={captureFace} 
                  disabled={processing}
                >
                  {processing ? 'Đang xử lý...' : `📸 ${attendanceType === 'check-in' ? 'Check-in' : 'Check-out'}`}
                </button>
                <button className="btn btn-secondary" onClick={stopCamera}>
                  <FiSquare /> Tắt Camera
                </button>
              </>
            )}
          </div>
        </div>

        {/* Status */}
        {status.message && (
          <div className={`camera-status ${status.type}`} style={{ marginTop: 16 }}>
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendancePage;
