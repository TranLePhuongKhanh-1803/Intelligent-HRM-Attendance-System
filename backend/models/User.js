const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Vui lòng nhập tên'],
    trim: true,
    validate: {
      validator: function (v) {
        return /^[a-zA-ZÀ-ỹ\s]+$/.test(v);
      },
      message: 'Tên chỉ được chứa chữ cái và khoảng trắng',
    },
  },
  email: {
    type: String,
    required: [true, 'Vui lòng nhập email'],
    unique: true,
    lowercase: true,
    match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Địa chỉ Email không hợp lệ'],
  },
  password: {
    type: String,
    required: [true, 'Vui lòng nhập mật khẩu'],
    minlength: 6,
    select: false,
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'employee'],
    default: 'employee',
  },
  employeeCode: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true,
  },
  department: {
    type: String,
    enum: ['IT', 'HR', 'Accounting'],
    default: 'IT',
  },
  position: {
    type: String,
    default: '',
  },
  phone: {
    type: String,
    default: '',
    validate: {
      validator: function (v) {
        return v === '' || /^(0[3|5|7|8|9])[0-9]{8}$/.test(v);
      },
      message: 'Số điện thoại phải chứa 10 chữ số (VD: 0912345678)',
    },
  },
  address: {
    type: String,
    default: '',
  },
  basicSalary: {
    type: Number,
    default: 8000000, // Defautl basic salary 8M for regular employee
  },
  leaveQuota: {
    type: Number,
    default: 15,
  },
  avatar: {
    type: String,
    default: '',
  },
  faceEmbedding: {
    type: [Number],
    default: [],
  },
  qrCode: {
    type: String,
    default: '',
  },
  qrToken: {
    type: String,
    unique: true,
    sparse: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  permissions: {
    type: [String],
    default: [],
  },
}, {
  timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
