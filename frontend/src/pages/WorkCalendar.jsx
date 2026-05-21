import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FiCalendar, FiChevronLeft, FiChevronRight, FiPlus, FiX, FiInfo } from 'react-icons/fi';
import api from '../services/api';
import './WorkCalendar.css';

const WorkCalendar = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    target: 'All'
  });

  const MONTH_NAMES = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];

  const WEEK_DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  useEffect(() => {
    fetchEvents();
  }, [currentDate, user]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const endpoint = user.role === 'admin' ? '/events/all' : '/events';
      const res = await api.get(endpoint);
      setEvents(res.data);
    } catch (err) {
      console.error('Error fetching events', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/events', formData);
      alert('Tạo sự kiện thành công!');
      setShowCreateModal(false);
      setFormData({ title: '', description: '', date: '', target: 'All' });
      fetchEvents();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi tạo sự kiện');
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa sự kiện này?')) return;
    try {
      await api.delete(`/events/${id}`);
      setSelectedEvent(null);
      fetchEvents();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi xóa sự kiện');
    }
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const renderCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = getDaysInMonth(year, month);
    
    // To fill the grid (min 35 cells)
    const totalCells = Math.ceil((firstDayIndex + daysInMonth) / 7) * 7;
    
    const cells = [];
    const today = new Date();

    for (let i = 0; i < totalCells; i++) {
      if (i < firstDayIndex || i >= firstDayIndex + daysInMonth) {
        // Empty cells for alignment
        cells.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
      } else {
        const dateNum = i - firstDayIndex + 1;
        const currentCellDate = new Date(year, month, dateNum);
        const isToday = 
          dateNum === today.getDate() && 
          month === today.getMonth() && 
          year === today.getFullYear();

        // Find events on this date
        const dayEvents = events.filter(e => {
          const eDate = new Date(e.date);
          return eDate.getDate() === dateNum && 
                 eDate.getMonth() === month && 
                 eDate.getFullYear() === year;
        });

        cells.push(
          <div 
            key={`day-${dateNum}`} 
            className={`calendar-day ${dayEvents.length > 0 ? 'not-empty' : ''}`}
          >
            <div className={`calendar-date-number ${isToday ? 'today' : ''}`}>{dateNum}</div>
            <div className="calendar-events-list">
              {dayEvents.map(evt => (
                <div 
                  key={evt._id} 
                  className={`calendar-event-badge ${evt.target === 'All' ? 'event-target-all' : 'event-target-dept'}`}
                  onClick={() => setSelectedEvent(evt)}
                >
                  <div className="calendar-status-dot" style={{
                    width: 6, height: 6, borderRadius: '50%', 
                    background: evt.target === 'All' ? '#3b82f6' : '#a21caf'
                  }}></div>
                  {evt.title}
                </div>
              ))}
            </div>
          </div>
        );
      }
    }

    return cells;
  };

  const formatDateString = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  return (
    <div className="page-container" style={{maxWidth: 1200, margin: '0 auto'}}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2><FiCalendar /> Lịch Làm Việc</h2>
          <p>Xem các sự kiện và thông báo quan trọng của công ty.</p>
        </div>
        {user.role === 'admin' && (
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <FiPlus /> Tạo Sự Kiện
          </button>
        )}
      </div>

      <div className="calendar-container">
        <div className="calendar-header">
          <div className="calendar-title-group">
            <h2>{MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
            <p>Hiển thị các sự kiện dành cho: <strong style={{color: '#3b82f6'}}>{user.role === 'admin' ? 'Tất cả (Admin View)' : (user.department || 'Tôi')}</strong></p>
          </div>
          <div className="calendar-nav">
            <button className="calendar-nav-btn" onClick={handlePrevMonth}><FiChevronLeft size={20}/></button>
            <div className="calendar-month-label">
              Tháng {currentDate.getMonth() + 1} / {currentDate.getFullYear()}
            </div>
            <button className="calendar-nav-btn" onClick={handleNextMonth}><FiChevronRight size={20}/></button>
          </div>
        </div>

        <div className="calendar-grid">
          <div className="calendar-weekdays">
            {WEEK_DAYS.map(day => (
              <div key={day} className="calendar-weekday">{day}</div>
            ))}
          </div>
          {loading ? (
            <div style={{padding: 60, textAlign: 'center'}}><div className="spinner"></div></div>
          ) : (
            <div className="calendar-days">
              {renderCalendarDays()}
            </div>
          )}
        </div>
      </div>

      {/* CREATE EVENT MODAL */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 className="modal-title">Tạo sự kiện mới</h3>
              <button className="btn-icon" onClick={() => setShowCreateModal(false)}><FiX /></button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Tiêu đề sự kiện</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required 
                  placeholder="Ví dụ: Họp toàn công ty tháng..."
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Ngày diễn ra</label>
                <input 
                  type="date" 
                  className="form-input" 
                  required 
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Đối tượng tham gia</label>
                <select 
                  className="form-input" 
                  value={formData.target}
                  onChange={(e) => setFormData({...formData, target: e.target.value})}
                >
                  <option value="All">Toàn công ty</option>
                  <option value="IT">IT</option>
                  <option value="HR">HR</option>
                  <option value="Accounting">Accounting</option>
                </select>
                <small style={{color: '#6b7280', display: 'block', marginTop: 4}}>Chọn 'Toàn công ty' để mọi người đều thấy.</small>
              </div>
              <div className="form-group" style={{ marginBottom: 24 }}>
                <label className="form-label">Mô tả sự kiện</label>
                <textarea 
                  className="form-input" 
                  rows="4" 
                  required
                  placeholder="Nhập nội dung chi tiết..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu sự kiện</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EVENT DETAIL MODAL */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h3 className="modal-title">Chi tiết Sự kiện</h3>
              <button className="btn-icon" onClick={() => setSelectedEvent(null)}><FiX /></button>
            </div>
            
            <div className="event-modal-content">
              <h4 style={{fontSize: 20, color: '#111827', marginBottom: 16}}>{selectedEvent.title}</h4>
              
              <div className="event-detail-row">
                <div className="event-detail-label">Ngày diễn ra:</div>
                <div className="event-detail-value">{formatDateString(selectedEvent.date)}</div>
              </div>
              
              <div className="event-detail-row">
                <div className="event-detail-label">Đối tượng:</div>
                <div className="event-detail-value">
                  {selectedEvent.target === 'All' ? (
                    <span className="badge badge-success">Toàn công ty</span>
                  ) : (
                    <span className="badge badge-warning">Phòng {selectedEvent.target}</span>
                  )}
                </div>
              </div>

              <div className="event-detail-row">
                <div className="event-detail-label">Tạo bởi:</div>
                <div className="event-detail-value">{selectedEvent.createdBy?.name || 'Admin'}</div>
              </div>

              <div className="event-detail-desc">
                {selectedEvent.description}
              </div>
            </div>

            <div className="modal-footer" style={{display: 'flex', justifyContent: user.role === 'admin' ? 'space-between' : 'flex-end'}}>
              {user.role === 'admin' && (
                <button className="btn btn-danger" onClick={() => handleDeleteEvent(selectedEvent._id)}>Xóa sự kiện</button>
              )}
              <button className="btn btn-primary" onClick={() => setSelectedEvent(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkCalendar;
