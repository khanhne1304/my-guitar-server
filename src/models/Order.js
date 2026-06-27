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
    // Thông tin giao dịch VNPay (chỉ dùng khi paymentMethod = 'vnpay')
    vnp: {
      txnRef: { type: String, index: true }, // mã tham chiếu gửi sang VNPay (duy nhất)
      transactionNo: String, // mã giao dịch tại VNPay
      bankCode: String,
      amount: Number, // số tiền (VND, chưa nhân 100)
      payDate: String, // vnp_PayDate (yyyyMMddHHmmss)
      responseCode: String, // vnp_ResponseCode ('00' = thành công)
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'shipped', 'delivered', 'completed', 'cancelled'],
      default: 'pending',
    },
    total: Number,
    coupon: {
      code: { type: String, trim: true, uppercase: true },
      discount: { type: Number, default: 0 },
      couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
    },
    subtotal: { type: Number }, // Tổng tiền trước khi giảm giá
    shipFee: { type: Number, default: 0 },
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
