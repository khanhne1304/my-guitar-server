import Product from '../models/Product.js';
import {
  getCategoryBySlug,
  listBrandsByCategorySlug, // nếu cần reuse
} from './category.service.js';
import Brand from '../models/Brand.js';
import mongoose from 'mongoose';

/**
 * Lấy danh sách sản phẩm với filter nâng cao + search theo q
 */
export async function listProductsService(query) {
  const { q, page = 1, limit = 12, sort = '-createdAt', categorySlug, brandSlug, ...filters } = query;

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

  // Filter categorySlug
  if (categorySlug) {
    const category = await getCategoryBySlug(categorySlug);
    if (category) {
      pipeline.push({ $match: { 'category._id': category._id } });
    } else {
      return []; // slug sai → trả mảng rỗng
    }
  }

  // Filter brandSlug
  if (brandSlug) {
    const brand = await Brand.findOne({ slug: brandSlug }).select('_id');
    if (brand) {
      pipeline.push({ $match: { 'brand._id': brand._id } });
    } else {
      return []; // slug sai → trả mảng rỗng
    }
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
  const payload = { ...data };

  // Map category from slug or string to ObjectId
  if (payload.categorySlug) {
    const cat = await getCategoryBySlug(payload.categorySlug);
    if (cat) payload.category = cat._id;
    delete payload.categorySlug;
  } else if (typeof payload.category === 'string') {
    // If category is provided as string and not a valid ObjectId, try as slug
    if (!mongoose.Types.ObjectId.isValid(payload.category)) {
      const cat = await getCategoryBySlug(payload.category);
      if (cat) payload.category = cat._id;
    }
  }

  // Map brand from slug or string to ObjectId
  if (payload.brandSlug) {
    const br = await Brand.findOne({ slug: payload.brandSlug }).select('_id');
    if (br) payload.brand = br._id;
    delete payload.brandSlug;
  } else if (typeof payload.brand === 'string') {
    if (!mongoose.Types.ObjectId.isValid(payload.brand)) {
      const br = await Brand.findOne({ slug: payload.brand }).select('_id');
      if (br) payload.brand = br._id;
    }
  }

  return await Product.create(payload);
}

export async function updateProductService(id, data) {
  const payload = { ...data };

  // Map category
  if (payload.categorySlug) {
    const cat = await getCategoryBySlug(payload.categorySlug);
    if (cat) payload.category = cat._id;
    delete payload.categorySlug;
  } else if (typeof payload.category === 'string') {
    if (!mongoose.Types.ObjectId.isValid(payload.category)) {
      const cat = await getCategoryBySlug(payload.category);
      if (cat) payload.category = cat._id;
    }
  }

  // Map brand
  if (payload.brandSlug) {
    const br = await Brand.findOne({ slug: payload.brandSlug }).select('_id');
    if (br) payload.brand = br._id;
    delete payload.brandSlug;
  } else if (typeof payload.brand === 'string') {
    if (!mongoose.Types.ObjectId.isValid(payload.brand)) {
      const br = await Brand.findOne({ slug: payload.brand }).select('_id');
      if (br) payload.brand = br._id;
    }
  }

  return await Product.findByIdAndUpdate(id, payload, { new: true });
}

export async function deleteProductService(id) {
  return await Product.findByIdAndUpdate(id, { isActive: false }, { new: true });
}

export async function listProductsByCategoryService(categorySlug) {
  const category = await getCategoryBySlug(categorySlug);
  if (!category) return [];
  return await Product.find({ category: category._id, isActive: true }).populate(
    'brand category',
    'name slug'
  );
}

export async function listProductsByCategoryAndBrandService(categorySlug, brandSlug) {
  const category = await getCategoryBySlug(categorySlug);
  const brand = await Brand.findOne({ slug: brandSlug }).select('_id');

  if (!category || !brand) return [];
  return await Product.find({
    category: category._id,
    brand: brand._id,
    isActive: true,
  }).populate('brand category', 'name slug');
}
