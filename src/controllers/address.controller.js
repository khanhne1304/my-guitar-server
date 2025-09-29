import { validationResult } from 'express-validator';
import {
  getUserAddressesService,
  getAddressByIdService,
  getDefaultAddressService,
  createAddressService,
  updateAddressService,
  deleteAddressService,
  setDefaultAddressService
} from '../services/address.service.js';

export async function getUserAddresses(req, res, next) {
  try {
    const addresses = await getUserAddressesService(req.user.id);
    res.json({ addresses });
  } catch (error) {
    next(error);
  }
}

export async function getAddressById(req, res, next) {
  try {
    const address = await getAddressByIdService(req.params.id, req.user.id);
    if (!address) {
      return res.status(404).json({ message: 'Địa chỉ không tồn tại' });
    }
    res.json(address);
  } catch (error) {
    next(error);
  }
}

export async function getDefaultAddress(req, res, next) {
  try {
    const address = await getDefaultAddressService(req.user.id);
    res.json({ address });
  } catch (error) {
    next(error);
  }
}

export async function createAddress(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const address = await createAddressService(req.user.id, req.body);
    res.status(201).json(address);
  } catch (error) {
    // Handle duplicate default address error
    if (error.message === 'Chỉ được có một địa chỉ mặc định') {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
}

export async function updateAddress(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const address = await updateAddressService(req.params.id, req.user.id, req.body);
    if (!address) {
      return res.status(404).json({ message: 'Địa chỉ không tồn tại' });
    }
    res.json(address);
  } catch (error) {
    next(error);
  }
}

export async function deleteAddress(req, res, next) {
  try {
    const address = await deleteAddressService(req.params.id, req.user.id);
    if (!address) {
      return res.status(404).json({ message: 'Địa chỉ không tồn tại' });
    }
    res.json({ message: 'Đã xóa địa chỉ thành công' });
  } catch (error) {
    next(error);
  }
}

export async function setDefaultAddress(req, res, next) {
  try {
    const address = await setDefaultAddressService(req.params.id, req.user.id);
    if (!address) {
      return res.status(404).json({ message: 'Địa chỉ không tồn tại' });
    }
    res.json({ message: 'Đã đặt làm địa chỉ mặc định', address });
  } catch (error) {
    next(error);
  }
}
