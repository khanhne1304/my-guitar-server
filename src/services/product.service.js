import Product from '../models/Product.js';
import APIFeatures from '../utils/apiFeatures.js';

export async function listProductsService(query) {
  const features = new APIFeatures(
    Product.find({ isActive: true }).populate('brand category', 'name slug'),
    query
  )
    .filter()
    .search()
    .sort()
    .limitFields()
    .paginate();

  return await features.query;
}

export async function getProductBySlugService(slug) {
  return await Product.findOne({ slug, isActive: true }).populate(
    'brand category',
    'name slug'
  );
}

export async function createProductService(data) {
  return await Product.create(data);
}

export async function updateProductService(id, data) {
  return await Product.findByIdAndUpdate(id, data, { new: true });
}

export async function deleteProductService(id) {
  return await Product.findByIdAndUpdate(id, { isActive: false }, { new: true });
}
