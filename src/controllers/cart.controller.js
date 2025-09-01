import { body, validationResult } from 'express-validator';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';

export const validateAddToCart = [
  body('productId').notEmpty().withMessage('productId required'),
  body('qty').optional().isInt({ min: 1 }).withMessage('qty >= 1'),
];

// GET /api/cart
export async function getCart(req, res, next) {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate(
      'items.product',
      'name slug images price stock',
    );
    res.json(cart || { user: req.user.id, items: [] });
  } catch (e) {
    next(e);
  }
}

// POST /api/cart/items
export async function addToCart(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { productId, qty = 1 } = req.body;
    const product = await Product.findById(productId);
    if (!product || !product.isActive)
      return res.status(400).json({ message: 'Sản phẩm không hợp lệ' });
    if (product.stock < qty)
      return res
        .status(400)
        .json({ message: 'Hết hàng hoặc không đủ tồn kho' });

    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) cart = await Cart.create({ user: req.user.id, items: [] });

    const idx = cart.items.findIndex((i) => i.product.toString() === productId);
    if (idx >= 0) {
      cart.items[idx].qty += qty;
    } else {
      cart.items.push({ product: productId, qty });
    }
    await cart.save();

    const populated = await cart.populate(
      'items.product',
      'name slug images price stock',
    );
    res.status(201).json(populated);
  } catch (e) {
    next(e);
  }
}

// PATCH /api/cart/items/:productId  body: { qty }
export async function updateCartItem(req, res, next) {
  try {
    const { qty } = req.body;
    if (!Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({ message: 'qty phải là số nguyên >= 1' });
    }
    const productId = req.params.productId;
    const product = await Product.findById(productId);
    if (!product || !product.isActive)
      return res.status(400).json({ message: 'Sản phẩm không hợp lệ' });
    if (product.stock < qty)
      return res.status(400).json({ message: 'Không đủ tồn kho' });

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ message: 'Chưa có giỏ hàng' });

    const idx = cart.items.findIndex((i) => i.product.toString() === productId);
    if (idx < 0)
      return res.status(404).json({ message: 'Mục không tồn tại trong giỏ' });

    cart.items[idx].qty = qty;
    await cart.save();

    const populated = await cart.populate(
      'items.product',
      'name slug images price stock',
    );
    res.json(populated);
  } catch (e) {
    next(e);
  }
}

// DELETE /api/cart/items/:productId
export async function   removeCartItem(req, res, next) {
  try {
    const productId = req.params.productId;
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ message: 'Chưa có giỏ hàng' });

    cart.items = cart.items.filter((i) => i.product.toString() !== productId);
    await cart.save();
    const populated = await cart.populate(
      'items.product',
      'name slug images price stock',
    );
    res.json(populated);
  } catch (e) {
    next(e);
  }
}

// DELETE /api/cart (clear all)
export async function clearCart(req, res, next) {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.json({ user: req.user.id, items: [] });
    cart.items = [];
    await cart.save();
    res.json({ user: req.user.id, items: [] });
  } catch (e) {
    next(e);
  }
}
