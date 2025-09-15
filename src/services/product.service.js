import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Brand from '../models/Brand.js';

/**
 * Lấy danh sách sản phẩm với filter nâng cao + search theo q
 */
export async function listProductsService(query) {
  const { q, page = 1, limit = 12, sort = '-createdAt', ...filters } = query;

  const pipeline = [
    { $match: { isActive: true } },

    // Join Category
    {
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: '_id',
        as: 'category',
      },
    },
    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },

    // Join Brand
    {
      $lookup: {
        from: 'brands',
        localField: 'brand',
        foreignField: '_id',
        as: 'brand',
      },
    },
    { $unwind: { path: '$brand', preserveNullAndEmptyArrays: true } },
  ];

  // Search theo q
  if (q) {
    const regex = new RegExp(q.trim(), 'i');
    pipeline.push({
      $match: {
        $or: [
          { name: regex },
          { description: regex },
          { slug: regex },
          { 'category.name': regex },
          { 'brand.name': regex },
        ],
      },
    });
  }

  // Filter nâng cao (price, stock, ...)
  if (filters.price) {
    const priceFilter = {};
    if (filters.price.gte) priceFilter.$gte = Number(filters.price.gte);
    if (filters.price.lte) priceFilter.$lte = Number(filters.price.lte);
    if (Object.keys(priceFilter).length) {
      pipeline.push({ $match: { price: priceFilter } });
    }
  }

  // Sort
  const sortObj = {};
  sort.split(',').forEach((field) => {
    sortObj[field.replace('-', '')] = field.startsWith('-') ? -1 : 1;
  });
  pipeline.push({ $sort: sortObj });

  // Pagination
  const pageNum = Number(page) || 1;
  const limitNum = Math.min(Number(limit) || 12, 100);
  const skip = (pageNum - 1) * limitNum;
  pipeline.push({ $skip: skip }, { $limit: limitNum });

  return await Product.aggregate(pipeline);
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

export async function listProductsByCategoryService(categorySlug) {
  const category = await Category.findOne({ slug: categorySlug }).select('_id');
  if (!category) return [];
  return await Product.find({ category: category._id, isActive: true }).populate(
    'brand category',
    'name slug'
  );
}

export async function listProductsByCategoryAndBrandService(
  categorySlug,
  brandSlug
) {
  const category = await Category.findOne({ slug: categorySlug }).select('_id');
  const brand = await Brand.findOne({ slug: brandSlug }).select('_id');
  if (!category || !brand) return [];
  return await Product.find({
    category: category._id,
    brand: brand._id,
    isActive: true,
  }).populate('brand category', 'name slug');
}
