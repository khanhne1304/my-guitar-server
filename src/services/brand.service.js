import Brand from '../models/Brand.js';
import Category from '../models/Category.js';

export async function listBrands() {
  return await Brand.find().sort('name');
}

export async function createBrand({ name, country }) {
  return await Brand.create({ name, country: country || '' });
}

export async function getBrandBySlug(slug) {
  return await Brand.findOne({ slug });
}

export async function updateBrand(id, data) {
  return await Brand.findByIdAndUpdate(id, data, { new: true });
}

export async function deleteBrand(id) {
  return await Brand.findByIdAndDelete(id);
}

// Lấy danh sách Brand theo slug của Category (categories trên Brand là ObjectId[])
export async function listBrandsByCategorySlug(categorySlug) {
  const category = await Category.findOne({ slug: categorySlug });
  if (!category) return [];
  return await Brand.find({ categories: category._id }).sort('name');
}
