import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Brand from '../models/Brand.js';
import slugify from 'slugify';

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

// Lấy danh sách brand theo slug category
export async function listBrandsByCategorySlug(slug) {
  const category = await Category.findOne({ slug });

  // Lấy sản phẩm; nếu chưa tạo category trong DB, vẫn lọc theo slug đã populate
  const baseQuery = { isActive: true };
  const products = await Product.find(
    category ? { ...baseQuery, category: category._id } : baseQuery,
  )
    .select('name brand category')
    .populate('brand', 'name slug')
    .populate('category', 'slug');

  // Thu thập brand theo hai nguồn: ref Brand hoặc suy từ name sản phẩm
  const slugToBrand = new Map();
  for (const p of products) {
    // Nếu không có category _id (n/a) thì lọc theo slug từ populate
    const cat = p?.category;
    const catSlug = typeof cat === 'string' ? cat : cat?.slug;
    if (catSlug && catSlug !== slug) continue;
    // 1) Có brand ref
    const b = p?.brand;
    if (b && (b.name || b.slug)) {
      const n = b.name || '';
      const s = b.slug || (n ? slugify(n, { lower: true }) : '');
      if (s && !slugToBrand.has(s)) slugToBrand.set(s, { name: n || s, slug: s });
      continue;
    }
    // 2) Không có brand ref → suy từ tên sản phẩm (từ đầu đến khoảng trắng đầu tiên)
    const maybe = (p?.name || '').split(' ')[0] || '';
    if (!maybe) continue;
    const s = slugify(maybe, { lower: true });
    const n = maybe.toUpperCase();
    if (!slugToBrand.has(s)) slugToBrand.set(s, { name: n, slug: s });
  }

  return Array.from(slugToBrand.values()).sort((a, b) => a.name.localeCompare(b.name));
}
