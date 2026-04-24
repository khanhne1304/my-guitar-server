import { validationResult } from 'express-validator';
import {
  listProductsService,
  getProductBySlugService,
  createProductService,
  updateProductService,
  deleteProductService,
  listProductsByCategoryService,
  listProductsByCategoryAndBrandService,
} from '../services/product.service.js';
import { invalidateProductIndex } from '../services/rag.service.js';

export async function listProducts(req, res, next) {
  try {
    const products = await listProductsService(req.query);
    res.json(products);
  } catch (e) {
    next(e);
  }
}

export async function getProductBySlug(req, res, next) {
  try {
    const product = await getProductBySlugService(req.params.slug);
    if (!product)
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    res.json(product);
  } catch (e) {
    next(e);
  }
}

export async function createProduct(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const created = await createProductService(req.body);
    // invalidate RAG index so next chat uses latest data
    try { invalidateProductIndex(); } catch {}
    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const updated = await updateProductService(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: 'Không tìm thấy' });
    try { invalidateProductIndex(); } catch {}
    res.json(updated);
  } catch (e) {
    next(e);
  }
}

export async function deleteProduct(req, res, next) {
  try {
    const removed = await deleteProductService(req.params.id);
    if (!removed) return res.status(404).json({ message: 'Không tìm thấy' });
    try { invalidateProductIndex(); } catch {}
    res.json({ message: 'Đã vô hiệu hoá', product: removed });
  } catch (e) {
    next(e);
  }
}

// Lấy sản phẩm theo category
export async function listByCategory(req, res, next) {
  try {
    const products = await listProductsByCategoryService(req.params.slug);
    res.json(products);
  } catch (e) {
    next(e);
  }
}

// Lấy sản phẩm theo category + brand
export async function listByCategoryAndBrand(req, res, next) {
  try {
    const products = await listProductsByCategoryAndBrandService(
      req.params.categorySlug,
      req.params.brandSlug
    );
    res.json(products);
  } catch (e) {
    next(e);
  }
}
