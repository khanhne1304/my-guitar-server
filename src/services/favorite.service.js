import Favorite from '../models/Favorite.js';
import Product from '../models/Product.js';

// services/favorite.service.js
export async function getUserFavorites(userId) {
  const favorites = await Favorite.find({ user: userId })
    .populate('product', 'name slug images price stock brand')
    .sort({ createdAt: -1 });

  return favorites.map(fav => ({
    _id: fav._id,           // id của bản ghi favorite
    product: fav.product,   // dữ liệu sản phẩm
  }));
}


export async function addToFavorites(userId, productId) {
  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    throw new Error('INVALID_PRODUCT');
  }

  // Check if already favorited
  const existing = await Favorite.findOne({ user: userId, product: productId });
  if (existing) {
    throw new Error('ALREADY_FAVORITED');
  }

  const favorite = await Favorite.create({ user: userId, product: productId });
  return await favorite.populate('product', 'name slug images price stock isActive');
}

export async function removeFromFavorites(userId, productId) {
  const favorite = await Favorite.findOneAndDelete({ user: userId, product: productId });
  if (!favorite) {
    throw new Error('FAVORITE_NOT_FOUND');
  }
  return favorite;
}

export async function isProductFavorited(userId, productId) {
  const favorite = await Favorite.findOne({ user: userId, product: productId });
  return !!favorite;
}

export async function getFavoriteStatus(userId, productIds) {
  if (!Array.isArray(productIds) || productIds.length === 0) {
    return {};
  }

  const favorites = await Favorite.find({ 
    user: userId, 
    product: { $in: productIds } 
  });
  
  const statusMap = {};
  favorites.forEach(fav => {
    statusMap[fav.product.toString()] = true;
  });
  
  return statusMap;
}
