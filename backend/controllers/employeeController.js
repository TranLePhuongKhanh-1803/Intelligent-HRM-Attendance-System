const User = require('../models/User');

const { generateNextEmployeeCode, buildFallbackEmployeeCode } = require('../utils/employeeCodeUtils');

// @desc    Get all employees
// @route   GET /api/employees
const getEmployees = async (req, res) => {
  try {
    const { search, role, department, page = 1, limit = 20 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (role) query.role = role;
    
    // Enforce manager department boundary
    if (req.user.role === 'manager') {
      query.department = req.user.department;
    } else if (department) {
      query.department = department;
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Map to add hasFaceData flag and remove the heavy embedding array from memory transfer
    const employees = users.map(user => {
      const u = user.toObject();
      u.employeeCode = u.employeeCode || buildFallbackEmployeeCode(u);
      u.hasFaceData = u.faceEmbedding && u.faceEmbedding.length > 0;
      delete u.faceEmbedding;
      return u;
    });

    res.json({
      employees,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Get single employee
// @route   GET /api/employees/:id
const getEmployee = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy nhân viên.' });
    }
    const employee = user.toObject();
    employee.employeeCode = employee.employeeCode || buildFallbackEmployeeCode(employee);
    employee.hasFaceData = employee.faceEmbedding && employee.faceEmbedding.length > 0;
    delete employee.faceEmbedding;
    
    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Create employee
// @route   POST /api/employees
const createEmployee = async (req, res) => {
  try {
    const { name, email, password, role, department, position, phone, basicSalary, permissions } = req.body;

    let finalDepartment = department;
    let finalRole = role || 'employee';

    // Enforce manager limitations
    if (req.user.role === 'manager') {
      finalDepartment = req.user.department; // Force same department
      if (finalRole === 'admin' || finalRole === 'manager') {
        return res.status(403).json({ message: 'Quản lý không có quyền tạo chức vụ bằng hoặc cao hơn.' });
      }
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email đã tồn tại trong hệ thống.' });
    }

    const employeeCode = await generateNextEmployeeCode({ User, department: finalDepartment, createdAt: new Date() });

    const employee = await User.create({
      name,
      email,
      password: password || 'default123',
      employeeCode,
      role: finalRole,
      department: finalDepartment,
      position,
      phone,
      basicSalary: basicSalary || 8000000,
      permissions: req.user.role === 'admin' ? (permissions || []) : [],
    });

    res.status(201).json({
      _id: employee._id,
      employeeCode: employee.employeeCode,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      department: employee.department,
      position: employee.position,
      phone: employee.phone,
      basicSalary: employee.basicSalary,
      permissions: employee.permissions,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Update employee
// @route   PUT /api/employees/:id
const updateEmployee = async (req, res) => {
  try {
    const { name, email, role, department, position, phone, isActive, basicSalary, permissions } = req.body;
    const employee = await User.findById(req.params.id).select('+password');

    if (!employee) {
      return res.status(404).json({ message: 'Không tìm thấy nhân viên.' });
    }

    // Manager constraints
    if (req.user.role === 'manager') {
      if (employee.department !== req.user.department) {
        return res.status(403).json({ message: 'Không thể sửa nhân viên ngoài phòng ban.' });
      }
      if (employee.role === 'admin' || employee.role === 'manager') {
        if (employee._id.toString() !== req.user._id.toString()) {
          return res.status(403).json({ message: 'Không được sửa thông tin của Quản lý khác hoặc Admin.' });
        }
      }
      if (role === 'admin' || role === 'manager') {
        if (employee._id.toString() !== req.user._id.toString()) {
          return res.status(403).json({ message: 'Không có quyền thăng cấp lên Admin hoặc Manager.' });
        }
      }
    }

    if (email && email !== employee.email) {
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(400).json({ message: 'Email đã tồn tại.' });
      }
    }

    employee.name = name || employee.name;
    employee.email = email || employee.email;
    employee.role = role || employee.role;
    employee.department = req.user.role === 'manager' ? employee.department : (department !== undefined ? department : employee.department);
    employee.position = position !== undefined ? position : employee.position;
    employee.phone = phone !== undefined ? phone : employee.phone;
    employee.isActive = isActive !== undefined ? isActive : employee.isActive;
    employee.basicSalary = basicSalary !== undefined ? basicSalary : employee.basicSalary;
    
    // Only admin can update permissions
    if (req.user.role === 'admin' && permissions !== undefined) {
      employee.permissions = permissions;
    }

    await employee.save();

    res.json({
      _id: employee._id,
      employeeCode: employee.employeeCode || buildFallbackEmployeeCode(employee),
      name: employee.name,
      email: employee.email,
      role: employee.role,
      department: employee.department,
      position: employee.position,
      phone: employee.phone,
      basicSalary: employee.basicSalary,
      isActive: employee.isActive,
      permissions: employee.permissions,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Delete employee
// @route   DELETE /api/employees/:id
const deleteEmployee = async (req, res) => {
  try {
    const employee = await User.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Không tìm thấy nhân viên.' });
    }

    // Manager constraints
    if (req.user.role === 'manager') {
      if (employee.department !== req.user.department) {
        return res.status(403).json({ message: 'Không được xóa nhân viên ngoài phòng ban.' });
      }
      if (employee.role === 'admin' || employee.role === 'manager') {
        return res.status(403).json({ message: 'Không được xóa tài khoản Quản lý hoặc Admin.' });
      }
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xóa nhân viên thành công.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Update face embedding for employee (supports multi-sample)
// @route   PUT /api/employees/:id/face
const updateFaceEmbedding = async (req, res) => {
  try {
    const { embedding, embeddings } = req.body;
    
    let flatEmbedding = [];
    let sampleList = [];
    
    if (embeddings && Array.isArray(embeddings) && embeddings.length > 0) {
      for (const emb of embeddings) {
        if (!Array.isArray(emb) || emb.length !== 128) {
          return res.status(400).json({ message: 'Mỗi mẫu khuôn mặt phải có đúng 128 chiều.' });
        }
        flatEmbedding.push(...emb);
        sampleList.push(emb);
      }
    } else if (embedding && Array.isArray(embedding)) {
      flatEmbedding = embedding;
      sampleList.push(embedding.slice(0, 128));
    } else {
      return res.status(400).json({ message: 'Dữ liệu khuôn mặt không hợp lệ.' });
    }

    const employee = await User.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Không tìm thấy nhân viên.' });
    }

    // Check for duplicate face
    const { checkDuplicateFace } = require('../utils/faceUtils');
    const allUsers = await User.find({ isActive: true, faceEmbedding: { $exists: true, $ne: [] } });
    
    for (const sample of sampleList) {
      const duplicate = checkDuplicateFace(sample, allUsers, req.params.id);
      if (duplicate) {
        return res.status(400).json({ 
          message: `Khuôn mặt này đã tồn tại trong hệ thống. Mỗi khuôn mặt chỉ được đăng ký cho một tài khoản.` 
        });
      }
    }

    employee.faceEmbedding = flatEmbedding;
    await employee.save();

    const sampleCount = flatEmbedding.length / 128;
    res.json({ message: `Đã lưu ${sampleCount} mẫu khuôn mặt thành công.` });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Delete face embedding for employee
// @route   DELETE /api/employees/:id/face
const deleteFaceEmbedding = async (req, res) => {
  try {
    const employee = await User.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Không tìm thấy nhân viên.' });
    }

    employee.faceEmbedding = [];
    await employee.save();

    res.json({ message: `Đã xóa dữ liệu khuôn mặt của ${employee.name} thành công.` });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

module.exports = {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  updateFaceEmbedding,
  deleteFaceEmbedding,
};
