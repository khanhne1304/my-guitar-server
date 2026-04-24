import { validationResult } from 'express-validator';
import {
  getUserCart,
  addItemToCart,
  updateCartItemQty,
  removeCartItemById,
  clearUserCart,
} from '../services/cart.service.js';

export async function getCart(req, res, next) {
  try {
    const cart = await getUserCart(req.user.id);
    res.json(cart);
  } catch (e) {
    next(e);
  }
}

export async function addToCart(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { productId, qty = 1 } = req.body;
    const cart = await addItemToCart(req.user.id, productId, qty);
    res.status(201).json(cart);
  } catch (e) {
    if (e.message === 'INVALID_PRODUCT')
      return res.status(400).json({ message: 'Sản phẩm không hợp lệ' });
    if (e.message === 'OUT_OF_STOCK')
      return res.status(400).json({ message: 'Hết hàng hoặc không đủ tồn kho' });
    next(e);
  }
}

export async function updateCartItem(req, res, next) {
  try {
    const { qty } = req.body;
    const cart = await updateCartItemQty(req.user.id, req.params.productId, qty);
    res.json(cart);
  } catch (e) {
    if (e.message === 'INVALID_QTY')
      return res.status(400).json({ message: 'qty phải là số nguyên >= 1' });
    if (e.message === 'INVALID_PRODUCT')
      return res.status(400).json({ message: 'Sản phẩm không hợp lệ' });
    if (e.message === 'OUT_OF_STOCK')
      return res.status(400).json({ message: 'Không đủ tồn kho' });
    if (e.message === 'CART_NOT_FOUND')
      return res.status(404).json({ message: 'Chưa có giỏ hàng' });
    if (e.message === 'ITEM_NOT_FOUND')
      return res.status(404).json({ message: 'Mục không tồn tại trong giỏ' });
    next(e);
  }
}

export async function removeCartItem(req, res, next) {
  try {
    const cart = await removeCartItemById(req.user.id, req.params.productId);
    res.json(cart);
  } catch (e) {
    if (e.message === 'CART_NOT_FOUND')
      return res.status(404).json({ message: 'Chưa có giỏ hàng' });
    next(e);
  }
}

export async function clearCart(req, res, next) {
  try {
    const cart = await clearUserCart(req.user.id);
    res.json(cart);
  } catch (e) {
    next(e);
  }
}
