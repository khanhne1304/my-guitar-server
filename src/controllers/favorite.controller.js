import {
  getUserFavorites,
  addToFavorites,
  removeFromFavorites,
  isProductFavorited,
  getFavoriteStatus,
} from '../services/favorite.service.js';

export async function getMyFavorites(req, res, next) {
  try {
    const favorites = await getUserFavorites(req.user.id);
    res.json({
      success: true,
      data: favorites,
    });
  } catch (error) {
    next(error);
  }
}

export async function addFavorite(req, res, next) {
  try {
    const { productId } = req.params;
    const favorite = await addToFavorites(req.user.id, productId);
    res.status(201).json({
      success: true,
      data: favorite,
      message: 'Đã thêm vào danh sách yêu thích',
    });
  } catch (error) {
    if (error.message === 'INVALID_PRODUCT') {
      return res.status(400).json({
        success: false,
        message: 'Sản phẩm không tồn tại hoặc đã bị vô hiệu hóa',
      });
    }
    if (error.message === 'ALREADY_FAVORITED') {
      return res.status(400).json({
        success: false,
        message: 'Sản phẩm đã có trong danh sách yêu thích',
      });
    }
    next(error);
  }
}

export async function removeFavorite(req, res, next) {
  try {
    const { productId } = req.params;
    await removeFromFavorites(req.user.id, productId);
    res.json({
      success: true,
      message: 'Đã xóa khỏi danh sách yêu thích',
    });
  } catch (error) {
    if (error.message === 'FAVORITE_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Sản phẩm không có trong danh sách yêu thích',
      });
    }
    next(error);
  }
}

export async function toggleFavorite(req, res, next) {
  try {
    const { productId } = req.params;
    const isFavorited = await isProductFavorited(req.user.id, productId);
    
    if (isFavorited) {
      await removeFromFavorites(req.user.id, productId);
      res.json({
        success: true,
        isFavorited: false,
        message: 'Đã xóa khỏi danh sách yêu thích',
      });
    } else {
      const favorite = await addToFavorites(req.user.id, productId);
      res.json({
        success: true,
        isFavorited: true,
        data: favorite,
        message: 'Đã thêm vào danh sách yêu thích',
      });
    }
  } catch (error) {
    if (error.message === 'INVALID_PRODUCT') {
      return res.status(400).json({
        success: false,
        message: 'Sản phẩm không tồn tại hoặc đã bị vô hiệu hóa',
      });
    }
    next(error);
  }
}

export async function checkFavoriteStatus(req, res, next) {
  try {
    const { productIds } = req.body;
    const status = await getFavoriteStatus(req.user.id, productIds);
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
}
