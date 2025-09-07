import { validationResult } from 'express-validator';
import {
  listCategories,
  createCategory,
  getCategoryBySlug,
  updateCategory,
  deleteCategory,
} from '../services/category.service.js';

export async function list(req, res, next) {
  try {
    const categories = await listCategories();
    res.json(categories);
  } catch (e) {
    next(e);
  }
}

export async function create(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const category = await createCategory(req.body);
    res.status(201).json(category);
  } catch (e) {
    next(e);
  }
}

export async function getBySlug(req, res, next) {
  try {
    const category = await getCategoryBySlug(req.params.slug);
    if (!category) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json(category);
  } catch (e) {
    next(e);
  }
}

export async function update(req, res, next) {
  try {
    const category = await updateCategory(req.params.id, req.body);
    if (!category) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json(category);
  } catch (e) {
    next(e);
  }
}

export async function remove(req, res, next) {
  try {
    const category = await deleteCategory(req.params.id);
    if (!category) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json({ message: 'Đã xoá' });
  } catch (e) {
    next(e);
  }
}
