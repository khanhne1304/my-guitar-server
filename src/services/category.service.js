// services/category.service.js
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Brand from '../models/Brand.js';
import slugify from 'slugify';

// Lấy toàn bộ category
export async function listCategories() {
  return await Category.find().sort('name');
}

// Tạo mới category
export async function createCategory(data) {
  // Tự động tạo slug từ name nếu chưa có
  const slug = slugify(data.name, { lower: true, strict: true });
  return await Category.create({ name: data.name, slug });
}

// Tìm category theo slug
export async function getCategoryBySlug(slug) {
  return await Category.findOne({ slug });
}

// Cập nhật category
export async function updateCategory(id, data) {
  if (data.name && !data.slug) {
    data.slug = slugify(data.name, { lower: true, strict: true });
  }
  return await Category.findByIdAndUpdate(id, data, { new: true });
}

// Xóa category
export async function deleteCategory(id) {
  return await Category.findByIdAndDelete(id);
}

// Lấy danh sách brand theo slug category
export async function listBrandsByCategorySlug(slug) {
  // 1. Tìm category
  const category = await Category.findOne({ slug });
  if (!category) return [];

  // 2. Lấy tất cả sản phẩm thuộc category đó, chỉ lấy brand
  const products = await Product.find({ category: category._id, isActive: true })
    .select('brand')
    .populate('brand', 'name slug');

  // 3. Gom các brand duy nhất
  const slugToBrand = new Map();
  for (const p of products) {
    const b = p?.brand;
    if (!b) continue;

    const name = b.name?.trim();
    const s = b.slug || (name ? slugify(name, { lower: true }) : '');
    if (s && !slugToBrand.has(s)) {
      slugToBrand.set(s, { name, slug: s });
    }
  }

  // 4. Trả về danh sách brand sắp xếp theo tên
  return Array.from(slugToBrand.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

// Lấy sản phẩm theo slug category + slug brand
export async function listProductsByCategoryAndBrand({ categorySlug, brandSlug }) {
  const query = { isActive: true };

  // Map categorySlug -> _id
  if (categorySlug) {
    const cat = await Category.findOne({ slug: categorySlug });
    if (cat) query.category = cat._id;
  }

  // Map brandSlug -> _id
  if (brandSlug) {
    const br = await Brand.findOne({ slug: brandSlug });
    if (br) query.brand = br._id;
  }

  // Query sản phẩm
  return await Product.find(query)
    .populate('category', 'name slug')
    .populate('brand', 'name slug');
}
