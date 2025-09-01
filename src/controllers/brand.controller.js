import { body, validationResult } from 'express-validator';
import Brand from '../models/Brand.js';

export const validateCreate = [
  body('name').notEmpty().withMessage('name required'),
];

export async function list(req, res, next) {
  try {
    res.json(await Brand.find().sort('name'));
  } catch (e) {
    next(e);
  }
}

export async function create(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });
    const b = await Brand.create({
      name: req.body.name,
      country: req.body.country || '',
    });
    res.status(201).json(b);
  } catch (e) {
    next(e);
  }
}

export async function getBySlug(req, res, next) {
  try {
    const b = await Brand.findOne({ slug: req.params.slug });
    if (!b) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json(b);
  } catch (e) {
    next(e);
  }
}

export async function update(req, res, next) {
  try {
    const b = await Brand.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!b) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json(b);
  } catch (e) {
    next(e);
  }
}

export async function remove(req, res, next) {
  try {
    const b = await Brand.findByIdAndDelete(req.params.id);
    if (!b) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json({ message: 'Đã xoá' });
  } catch (e) {
    next(e);
  }
}
