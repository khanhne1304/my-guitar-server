import Brand from '../models/Brand.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';

const categoryPopulate = { path: 'categories', select: 'name slug' };

export async function listBrands() {
  return await Brand.find().populate(categoryPopulate).sort('name');
}

export async function createBrand({ name, country, categories }) {
  const payload = { name, country: country || '' };
  if (Array.isArray(categories) && categories.length > 0) {
    payload.categories = categories;
  } else {
    const guitarCategory = await Category.findOne({ slug: 'guitar' });
    if (guitarCategory) payload.categories = [guitarCategory._id];
  }
  const brand = await Brand.create(payload);
  return brand.populate(categoryPopulate);
}

export async function getBrandBySlug(slug) {
  return await Brand.findOne({ slug }).populate(categoryPopulate);
}

export async function updateBrand(id, data) {
  const brand = await Brand.findById(id);
  if (!brand) return null;

  if (data.name !== undefined) brand.name = data.name;
  if (data.country !== undefined) brand.country = data.country;
  if (data.categories !== undefined) brand.categories = data.categories;

  await brand.save();
  return brand.populate(categoryPopulate);
}

export async function deleteBrand(id) {
  const productCount = await Product.countDocuments({ brand: id });
  if (productCount > 0) {
    const error = new Error('BRAND_IN_USE');
    error.productCount = productCount;
    throw error;
  }
  return await Brand.findByIdAndDelete(id);
}

// Lấy danh sách Brand theo slug của Category (categories trên Brand là ObjectId[])
export async function listBrandsByCategorySlug(categorySlug) {
  if (categorySlug === 'guitar') {
    return await Brand.find().sort('name');
  }
  const category = await Category.findOne({ slug: categorySlug });
  if (!category) return [];
  return await Brand.find({ categories: category._id }).sort('name');
}
