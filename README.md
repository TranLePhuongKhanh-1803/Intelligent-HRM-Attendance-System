# Intelligent HRM Attendance System

Hệ thống Quản lý Nhân sự (HRM) hiện đại, tích hợp chấm công thông minh bằng Nhận diện Khuôn mặt và QR Code.

## 🚀 Công nghệ sử dụng

| Component | Technology |
|-----------|-----------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT (JSON Web Token) |
| Realtime | Socket.IO |
| AI | face-api.js (TensorFlow.js) |
| QR Code | qrcode + html5-qrcode |

## 📁 Cấu trúc Project

```
intelligent-hrm-attendance/
├── backend/
│   ├── config/db.js           # MongoDB connection
│   ├── controllers/           # Business logic
│   ├── middleware/             # Auth middleware
│   ├── models/                # Mongoose schemas
│   ├── routes/                # API endpoints
│   ├── utils/                 # Face & QR utilities
│   ├── server.js              # Entry point
│   └── seed.js                # Admin seed script
├── frontend/
│   ├── public/models/         # face-api.js AI models
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── context/           # Auth & Socket context
│   │   ├── pages/             # Route pages
│   │   ├── services/          # API service
│   │   ├── App.jsx
│   │   └── index.css          # Design system
│   └── vite.config.js
└── README.md
```

## ⚙️ Cài đặt & Chạy

### 1. Yêu cầu
- Node.js >= 18
- MongoDB (local hoặc Atlas)

### 2. Backend

```bash
cd backend
npm install
# Cấu hình file .env
# Tạo admin user
node seed.js
# Chạy server
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Truy cập
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

### 5. Đăng nhập
- Email: `admin@hrm.com`
- Password: `admin123`

## 🔑 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Đăng nhập |
| POST | `/api/auth/register` | Đăng ký (Admin) |
| GET | `/api/auth/me` | Thông tin user |

### Employees
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/employees` | Danh sách nhân viên |
| POST | `/api/employees` | Thêm nhân viên |
| PUT | `/api/employees/:id` | Cập nhật nhân viên |
| DELETE | `/api/employees/:id` | Xóa nhân viên |
| PUT | `/api/employees/:id/face` | Upload face embedding |

### Attendance
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/attendance/check-in` | Chấm công vào |
| POST | `/api/attendance/check-out` | Chấm công ra |
| GET | `/api/attendance` | Lịch sử chấm công |
| GET | `/api/attendance/my` | Chấm công cá nhân |
| GET | `/api/attendance/today` | Hôm nay (Admin) |
| GET | `/api/attendance/export` | Xuất CSV |

## 🔐 Bảo mật
- Mật khẩu hash bằng bcryptjs (12 rounds)
- JWT token với thời hạn cấu hình
- Role-based access control (Admin/Employee)
- Input validation
- CORS configured

## 🌙 Tính năng
- ✅ Dark/Light mode
- ✅ Responsive design
- ✅ Realtime attendance via Socket.IO
- ✅ Face recognition (face-api.js)
- ✅ QR Code check-in/out
- ✅ CSV export
- ✅ Duplicate attendance prevention
