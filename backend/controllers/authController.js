const jwt = require('jsonwebtoken');
const User = require('../models/User');

const { generateNextEmployeeCode, buildFallbackEmployeeCode } = require('../utils/employeeCodeUtils');

const getDeepFaceErrorMessage = (err, fallbackMessage) => {
  return err.response?.data?.detail || err.response?.data?.message || fallbackMessage;
};

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// @desc    Login user
// @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu.' });
    }

    const emailNormalized = email.toLowerCase().trim();
    const user = await User.findOne({ email: emailNormalized }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });
    }

    const token = generateToken(user._id);
    res.json({
      token,
      user: {
        _id: user._id,
        employeeCode: user.employeeCode || buildFallbackEmployeeCode(user),
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        position: user.position,
        address: user.address,
        avatar: user.avatar,

        hasFaceData: user.faceEmbedding && user.faceEmbedding.length > 0,
        permissions: user.permissions || [],
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Register new user (admin only creates via employee mgmt)
// @route   POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, role, department, position, phone } = req.body;
    const finalDepartment = department || 'IT';

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email đã tồn tại trong hệ thống.' });
    }

    const employeeCode = await generateNextEmployeeCode({ User, department: finalDepartment, createdAt: new Date() });

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'employee',
      employeeCode,
      department: finalDepartment,
      position,
      phone,
    });

    const token = generateToken(user._id);
    res.status(201).json({
      token,
      user: {
        _id: user._id,
        employeeCode: user.employeeCode,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        position: user.position,
        hasFaceData: user.faceEmbedding && user.faceEmbedding.length > 0,
        permissions: user.permissions || [],
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      _id: user._id,
      employeeCode: user.employeeCode || buildFallbackEmployeeCode(user),
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      position: user.position,
      phone: user.phone,
      address: user.address,
      avatar: user.avatar,

      hasFaceData: user.faceEmbedding && user.faceEmbedding.length > 0,
      permissions: user.permissions || [],
      createdAt: user.createdAt,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Update current user's face embedding (supports multi-sample with DeepFace)
// @route   PUT /api/auth/me/face
// Body: { image: "base64..." }          — single sample
//    or: { images: ["base64...", ...] }  — multiple samples (recommended)
const updateMyFace = async (req, res) => {
  try {
    const { image, images } = req.body;
    
    let imagesToProcess = [];
    if (images && Array.isArray(images) && images.length > 0) {
      imagesToProcess = images;
    } else if (image && typeof image === 'string') {
      imagesToProcess = [image];
    } else {
      return res.status(400).json({ message: 'Dữ liệu hình ảnh khuôn mặt không hợp lệ.' });
    }

    const axios = require('axios');
    let flatEmbedding = [];
    let sampleList = []; 

    // Extract embeddings using FastAPI DeepFace service
    for (const imgBase64 of imagesToProcess) {
      try {
        const response = await axios.post('http://127.0.0.1:8000/represent', {
          image_base64: imgBase64
        });
        const embedding = response.data.embedding;
        if (!Array.isArray(embedding) || embedding.length !== 512) {
          return res.status(500).json({ message: 'Lỗi cấu trúc mô hình từ server AI (Yêu cầu 512 chiều).' });
        }
        flatEmbedding.push(...embedding);
        sampleList.push(embedding);
      } catch (err) {
        console.error("[DeepFace] Error extracting face:", err.response?.data || err.message);
        return res.status(400).json({
          message: getDeepFaceErrorMessage(err, 'Không thể nhận diện khuôn mặt trong ảnh cung cấp. Vui lòng thử lại.')
        });
      }
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }

    // Check for duplicate face: ensure this face doesn't belong to another user
    const { checkDuplicateFace } = require('../utils/faceUtils');
    const allUsers = await User.find({ isActive: true, faceEmbedding: { $exists: true, $ne: [] } });
    
    for (const sample of sampleList) {
      const duplicate = checkDuplicateFace(sample, allUsers, req.user._id);
      if (duplicate) {
        return res.status(400).json({ 
          message: `Khuôn mặt này đã tồn tại trong hệ thống. Mỗi khuôn mặt chỉ được đăng ký cho một tài khoản.` 
        });
      }
    }

    user.faceEmbedding = flatEmbedding;
    await user.save();

    res.json({ message: `Đã lưu ${sampleList.length} mẫu khuôn mặt thành công bằng DeepFace.` });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Delete current user's face embedding
// @route   DELETE /api/auth/me/face
const deleteMyFace = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }

    user.faceEmbedding = [];
    await user.save();

    res.json({ message: 'Đã xóa dữ liệu khuôn mặt thành công.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Update current user profile
// @route   PUT /api/auth/me
const updateMe = async (req, res) => {
  try {
    const { name, email, phone, address, avatar, password, currentPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }

    if (email && email !== user.email) {
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(400).json({ message: 'Email đã được sử dụng bởi tài khoản khác.' });
      }
      user.email = email;
    }

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;
    if (avatar !== undefined) user.avatar = avatar;
    if (password) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Vui lòng nhập mật khẩu hiện tại.' });
      }
      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({ message: 'Mật khẩu hiện tại không đúng.' });
      }
      if (password.length < 6) {
        return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
      }
      user.password = password;
    }

    await user.save();

    res.json({
      _id: user._id,
      employeeCode: user.employeeCode || buildFallbackEmployeeCode(user),
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      position: user.position,
      phone: user.phone,
      address: user.address,
      avatar: user.avatar,
      permissions: user.permissions || [],
      createdAt: user.createdAt,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

module.exports = { login, register, getMe, updateMyFace, deleteMyFace, updateMe };
