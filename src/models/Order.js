import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: String,
    price: Number,
    qty: Number,
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [orderItemSchema],
    shippingAddress: {
      fullName: String,
      phone: String,
      address: String,
      city: String,
      district: String,
    },
    paymentMethod: {
      type: String,
      enum: ['cod', 'vnpay'],
      default: 'cod',
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'shipped', 'delivered', 'completed', 'cancelled'],
      default: 'pending',
    },
    total: Number,
    paidAt: Date,
    cancelReason: {
      type: String,
      trim: true,
    },
    cancelledAt: Date,
  },
  { timestamps: true },
);

export default mongoose.model('Order', orderSchema);
