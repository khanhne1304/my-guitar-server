import Cart from '../models/Cart.js';
import Product from '../models/Product.js';

export async function getUserCart(userId) {
  const cart = await Cart.findOne({ user: userId }).populate(
    'items.product',
    'name slug images price stock'
  );
  return cart || { user: userId, items: [] };
}

export async function addItemToCart(userId, productId, qty = 1) {
  const product = await Product.findById(productId);
  if (!product || !product.isActive) throw new Error('INVALID_PRODUCT');
  if (product.stock < qty) throw new Error('OUT_OF_STOCK');

  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = await Cart.create({ user: userId, items: [] });

  const idx = cart.items.findIndex((i) => i.product.toString() === productId);
  if (idx >= 0) {
    cart.items[idx].qty += qty;
  } else {
    cart.items.push({ product: productId, qty });
  }
  await cart.save();

  return await cart.populate('items.product', 'name slug images price stock');
}

export async function updateCartItemQty(userId, productId, qty) {
  if (!Number.isInteger(qty) || qty < 1) throw new Error('INVALID_QTY');

  const product = await Product.findById(productId);
  if (!product || !product.isActive) throw new Error('INVALID_PRODUCT');
  if (product.stock < qty) throw new Error('OUT_OF_STOCK');

  const cart = await Cart.findOne({ user: userId });
  if (!cart) throw new Error('CART_NOT_FOUND');

  const idx = cart.items.findIndex((i) => i.product.toString() === productId);
  if (idx < 0) throw new Error('ITEM_NOT_FOUND');

  cart.items[idx].qty = qty;
  await cart.save();

  return await cart.populate('items.product', 'name slug images price stock');
}

export async function removeCartItemById(userId, productId) {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) throw new Error('CART_NOT_FOUND');

  cart.items = cart.items.filter((i) => i.product.toString() !== productId);
  await cart.save();

  return await cart.populate('items.product', 'name slug images price stock');
}

export async function clearUserCart(userId) {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) return { user: userId, items: [] };

  cart.items = [];
  await cart.save();
  return { user: userId, items: [] };
}
