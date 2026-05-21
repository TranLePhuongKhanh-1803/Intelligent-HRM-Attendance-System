const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: String, // 'YYYY-MM-DD'
    required: true,
  },
  checkIn: {
    type: Date,
    default: null,
  },
  checkOut: {
    type: Date,
    default: null,
  },
  method: {
    type: String,
    enum: ['face', 'qr'],
    required: true,
  },
  status: {
    type: String,
    enum: ['present', 'late', 'absent'],
    default: 'present',
  },
  note: {
    type: String,
    default: '',
  },
  emotion: {
    type: String,
    default: null,
  },
  age: {
    type: Number,
    default: null,
  },
  gender: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

// Compound index to prevent duplicate attendance
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
