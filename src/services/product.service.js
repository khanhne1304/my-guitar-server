import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Brand from '../models/Brand.js';
import APIFeatures from '../utils/apiFeatures.js';

export async function listProductsService(query) {
  const q = { ...query };

  // Hỗ trợ filter theo slug tiện cho client
  if (q.categorySlug) {
    const cat = await Category.findOne({ slug: q.categorySlug }).select('_id');
    if (cat) q.category = cat._id;
    delete q.categorySlug;
  }
  if (q.brandSlug) {
    const br = await Brand.findOne({ slug: q.brandSlug }).select('_id');
    if (br) q.brand = br._id;
    delete q.brandSlug;
  }

  const features = new APIFeatures(
    Product.find({ isActive: true }).populate('brand category', 'name slug'),
    q
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
