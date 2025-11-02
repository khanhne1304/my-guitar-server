import {
  listUsersService,
  createUserService,
  updateUserService,
  deleteUserService
} from '../services/adminUser.service.js';

export async function listUsers(req, res, next) {
  try {
    const { page = 1, limit = 10, search, role } = req.query;
    const result = await listUsersService({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      role
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createUser(req, res, next) {
  try {
    const { username, email, password, fullName, address, phone, role } = req.body;
    
    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email và password là bắt buộc' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }
    
    const user = await createUserService({
      username,
      email,
      password,
      fullName,
      address,
      phone,
      role
    });
    
    res.status(201).json(user);
  } catch (error) {
    if (error.message === 'DUPLICATE_USERNAME') {
      return res.status(400).json({ message: 'Tên tài khoản đã tồn tại' });
    }
    if (error.message === 'DUPLICATE_EMAIL') {
      return res.status(400).json({ message: 'Email đã tồn tại' });
    }
    if (error.message === 'DUPLICATE_PHONE') {
      return res.status(400).json({ message: 'Số điện thoại đã tồn tại' });
    }
    next(error);
  }
}

export async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const userData = req.body;
    
    const user = await updateUserService(id, userData);
    res.json(user);
  } catch (error) {
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
    if (error.message === 'DUPLICATE_USERNAME') {
      return res.status(400).json({ message: 'Tên tài khoản đã tồn tại' });
    }
    if (error.message === 'DUPLICATE_EMAIL') {
      return res.status(400).json({ message: 'Email đã tồn tại' });
    }
    if (error.message === 'DUPLICATE_PHONE') {
      return res.status(400).json({ message: 'Số điện thoại đã tồn tại' });
    }
    next(error);
  }
}

export async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    const result = await deleteUserService(id);
    res.json(result);
  } catch (error) {
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
    next(error);
  }
}

