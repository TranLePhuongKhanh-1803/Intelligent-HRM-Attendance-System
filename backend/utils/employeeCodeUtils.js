const DEPARTMENT_CODE_MAP = {
  IT: 'IT',
  HR: 'HR',
  Accounting: 'ACC',
};

const padSequence = (value, length = 4) => String(value).padStart(length, '0');

const getDepartmentCode = (department) => {
  return DEPARTMENT_CODE_MAP[department] || 'GEN';
};

const buildEmployeeCode = ({ department, year, sequence }) => {
  const deptCode = getDepartmentCode(department);
  return `${deptCode}-${year}-${padSequence(sequence)}`;
};

const buildFallbackEmployeeCode = (user) => {
  const createdYear = user?.createdAt ? new Date(user.createdAt).getFullYear() : new Date().getFullYear();
  const suffix = user?._id ? String(user._id).slice(-4).toUpperCase() : '0000';
  const deptCode = getDepartmentCode(user?.department);
  return `${deptCode}-${createdYear}-${suffix}`;
};

const generateNextEmployeeCode = async ({ User, department, createdAt }) => {
  const year = createdAt ? new Date(createdAt).getFullYear() : new Date().getFullYear();
  const deptCode = getDepartmentCode(department);
  const prefix = `${deptCode}-${year}-`;

  let sequence = 1;
  const lastByCode = await User.findOne({
    employeeCode: { $regex: `^${prefix}\\d{4}$` },
  })
    .select('employeeCode')
    .sort({ employeeCode: -1 })
    .lean();

  if (lastByCode?.employeeCode) {
    const lastPart = Number(lastByCode.employeeCode.split('-').pop());
    if (!Number.isNaN(lastPart)) {
      sequence = lastPart + 1;
    }
  }

  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = buildEmployeeCode({ department, year, sequence: sequence + attempt });
    const exists = await User.exists({ employeeCode: candidate });
    if (!exists) return candidate;
  }

  throw new Error('Không thể tạo mã nhân viên mới. Vui lòng thử lại.');
};

module.exports = {
  getDepartmentCode,
  buildEmployeeCode,
  buildFallbackEmployeeCode,
  generateNextEmployeeCode,
};
