# Intelligent HRM & Face Recognition Attendance System

Hệ thống Quản lý Nhân sự (HRM) hiện đại, tích hợp chấm công thông minh bằng **Nhận diện Khuôn mặt (Face Recognition)** với khả năng chống giả mạo (Anti-spoofing) và **Phân tích Cảm xúc (Emotion Analytics)** sử dụng AI.

## 🚀 Công nghệ sử dụng

| Component | Technology |
|-----------|-----------|
| **Frontend** | React 18, Vite, Recharts |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB, Mongoose |
| **Microservice (AI)** | Python, FastAPI |
| **AI Models** | DeepFace, RetinaFace |
| **Realtime** | Socket.IO |
| **Auth** | JWT (JSON Web Token) |

## 📁 Cấu trúc Project

```text
intelligent-hrm-attendance/
├── backend/               # Node.js API Server
│   ├── config/            # Cấu hình CSDL, Holidays
│   ├── controllers/       # Xử lý Logic (Auth, Attendance, Salary, Stats,...)
│   ├── middleware/        # JWT & Role-based Access Control
│   ├── models/            # Mongoose schemas
│   ├── routes/            # REST API endpoints
│   ├── server.js          # Entry point
│   └── seed.js            # Script tạo dữ liệu khởi tạo
├── deepface_service/      # Python AI Microservice
│   ├── main.py            # FastAPI entry point
│   └── requirements.txt   # Các thư viện Python (DeepFace, OpenCV,...)
├── frontend/              # React App
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── context/       # AuthProvider, SocketProvider
│   │   ├── pages/         # Dashboard, Attendance, Salary, Employees...
│   │   ├── services/      # API services (Axios)
│   │   └── App.jsx        # Routing configuration
│   └── index.html
└── README.md
```

## 🌟 Các Tính Năng Nổi Bật

### 1. Ứng dụng Trí tuệ Nhân tạo (AI)
- **Nhận diện khuôn mặt chính xác cao**: Sử dụng thư viện DeepFace để mã hóa khuôn mặt (Face Embedding) và nhận dạng nhân viên siêu tốc.
- **Phân tích Cảm xúc & Nhân khẩu học**: Trích xuất dữ liệu cảm xúc (Vui, Buồn, Căng thẳng...), tuổi và giới tính để tạo báo cáo tổng quan trên Dashboard.
- **Chống giả mạo (Anti-Spoofing)**: Sử dụng mô hình học sâu để phát hiện và ngăn chặn việc dùng ảnh hoặc video qua màn hình để gian lận điểm danh.

### 2. Quản trị Chuyên cần & Bảng Lương (Intelligent HRM)
- **Real-time Dashboard**: Cập nhật lượt check-in/out tức thời sử dụng WebSockets (Socket.IO).
- **Phân quyền đa cấp**: Admin, Manager (Trưởng bộ phận), Kế toán (Accounting), và Employee.
- **Tự động tính lương**: Tự động tính toán lương dựa trên ngày công thực tế, số lần đi muộn, làm ngoài giờ (OT), ngày lễ tết, và thưởng phạt.
- **Cảnh báo Thông minh**: Thống kê và hiển thị danh sách nhân viên đi muộn nhiều nhất trong tháng (Top Late/Absent).
- **Quản lý Nghỉ phép (Leave Management)**: Hệ thống làm đơn và duyệt đơn xin nghỉ phép thông minh.
- **Bảng tin Nội bộ (Announcements)**: Phát thông báo sự kiện, tin tức đến từng phòng ban cụ thể hoặc toàn công ty.

## ⚙️ Cài đặt & Chạy Hệ Thống

### Yêu cầu môi trường
- Node.js >= 18
- Python >= 3.8
- MongoDB (Local hoặc MongoDB Atlas)

### Bước 1: Khởi động AI Microservice (DeepFace)
```bash
cd deepface_service
pip install -r requirements.txt
# Chạy FastAPI service ở port 8000
python main.py
```

### Bước 2: Khởi động Backend
```bash
cd backend
npm install
# Tạo/cập nhật file .env (PORT=5000, MONGO_URI, JWT_SECRET...)
# Chạy script tạo Admin (nếu chưa có)
node seed.js
# Chạy server
npm run dev
```

### Bước 3: Khởi động Frontend
```bash
cd frontend
npm install
# Chạy ứng dụng web
npm run dev
```

### 4. Truy cập Hệ thống
- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000`
- **DeepFace API Docs**: `http://localhost:8000/docs` (Swagger UI)

## 🔐 Tài khoản Khởi tạo
- **Email**: `admin@hrm.com`
- **Password**: `admin123`
