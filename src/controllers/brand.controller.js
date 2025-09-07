import { validationResult } from 'express-validator';
import {
  listBrands,
  createBrand,
  getBrandBySlug,
  updateBrand,
  deleteBrand,
} from '../services/brand.service.js';

export async function list(req, res, next) {
  try {
    const brands = await listBrands();
    res.json(brands);
  } catch (e) {
    next(e);
  }
}

export async function create(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const brand = await createBrand(req.body);
    res.status(201).json(brand);
  } catch (e) {
    next(e);
  }
}

export async function getBySlug(req, res, next) {
  try {
    const brand = await getBrandBySlug(req.params.slug);
    if (!brand) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json(brand);
  } catch (e) {
    next(e);
  }
}

export async function update(req, res, next) {
  try {
    const brand = await updateBrand(req.params.id, req.body);
    if (!brand) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json(brand);
  } catch (e) {
    next(e);
  }
}

export async function remove(req, res, next) {
  try {
    const brand = await deleteBrand(req.params.id);
    if (!brand) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json({ message: 'Đã xoá' });
  } catch (e) {
    next(e);
  }
}
