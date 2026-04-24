import Brand from '../models/Brand.js';

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

// 🔥 Lấy danh sách Brand theo slug của Category
export async function listBrandsByCategorySlug(categorySlug) {
  return await Brand.find({ categories: categorySlug }).sort('name');
}
