import Category from '../models/Category.js';

export async function listCategories() {
  return await Category.find().sort('name');
}

export async function createCategory(data) {
  return await Category.create({ name: data.name });
}

export async function getCategoryBySlug(slug) {
  return await Category.findOne({ slug });
}

export async function updateCategory(id, data) {
  return await Category.findByIdAndUpdate(id, data, { new: true });
}

export async function deleteCategory(id) {
  return await Category.findByIdAndDelete(id);
}
