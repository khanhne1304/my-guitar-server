import { body, validationResult } from 'express-validator';
import Product from '../models/Product.js';
import APIFeatures from '../utils/apiFeatures.js';

export const validateProductCreate = [
  body('name').notEmpty().withMessage('name required'),
  body('price.base').isNumeric().withMessage('price.base must be number'),
  body('stock').optional().isInt({ min: 0 }),
];

export const validateProductUpdate = [
  body('price.base').optional().isNumeric(),
  body('stock').optional().isInt({ min: 0 }),
];

// GET /api/products
export async function listProducts(req, res, next) {
  try {
    const features = new APIFeatures(
      Product.find({ isActive: true }).populate('brand category', 'name slug'),
      req.query,
    )
      .filter()
      .search()
      .sort()
      .limitFields()
      .paginate();

    const items = await features.query;
    res.json(items);
  } catch (e) {
    next(e);
  }
}

// GET /api/products/:slug
export async function getProductBySlug(req, res, next) {
  try {
    const doc = await Product.findOne({
      slug: req.params.slug,
      isActive: true,
    }).populate('brand category', 'name slug');
    if (!doc)
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    res.json(doc);
  } catch (e) {
    next(e);
  }
}

// POST /api/products (admin)
export async function createProduct(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });
    const created = await Product.create(req.body);
    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
}

// PATCH /api/products/:id (admin)
export async function updateProduct(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updated) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json(updated);
  } catch (e) {
    next(e);
  }
}

// DELETE /api/products/:id (admin) — soft delete
export async function deleteProduct(req, res, next) {
  try {
    const removed = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true },
    );
    if (!removed) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json({ message: 'Đã vô hiệu hoá', product: removed });
  } catch (e) {
    next(e);
  }
}
