// src/controllers/category.controller.js
import { body, validationResult } from 'express-validator';
import Category from '../models/Category.js';

export const validateCreate = [
  body('name').notEmpty().withMessage('name required'),
];
export async function list(req, res, next) {
  try {
    res.json(await Category.find().sort('name'));
  } catch (e) {
    next(e);
  }
}
export async function create(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });
    const c = await Category.create({ name: req.body.name });
    res.status(201).json(c);
  } catch (e) {
    next(e);
  }
}
export async function getBySlug(req, res, next) {
  try {
    const c = await Category.findOne({ slug: req.params.slug });
    if (!c) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json(c);
  } catch (e) {
    next(e);
  }
}
export async function update(req, res, next) {
  try {
    const c = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!c) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json(c);
  } catch (e) {
    next(e);
  }
}
export async function remove(req, res, next) {
  try {
    const c = await Category.findByIdAndDelete(req.params.id);
    if (!c) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json({ message: 'Đã xoá' });
  } catch (e) {
    next(e);
  }
}
