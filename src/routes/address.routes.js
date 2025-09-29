import express from 'express';
import { protect } from '../middlewares/auth.js';
import {
  getUserAddresses,
  getAddressById,
  getDefaultAddress,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} from '../controllers/address.controller.js';
import {
  createAddressValidator,
  updateAddressValidator
} from '../validators/address.validator.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// GET /api/addresses - Get user's addresses
router.get('/', getUserAddresses);

// GET /api/addresses/default - Get default address
router.get('/default', getDefaultAddress);

// GET /api/addresses/:id - Get specific address
router.get('/:id', getAddressById);

// POST /api/addresses - Create new address
router.post('/', createAddressValidator, createAddress);

// PUT /api/addresses/:id - Update address
router.put('/:id', updateAddressValidator, updateAddress);

// DELETE /api/addresses/:id - Delete address
router.delete('/:id', deleteAddress);

// POST /api/addresses/:id/default - Set as default address
router.post('/:id/default', setDefaultAddress);

export default router;
