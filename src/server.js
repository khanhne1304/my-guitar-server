// server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { connectDB } from './config/db.js';
import favoriteRoutes from './routes/favorite.routes.js';
import userRoutes from './routes/user.routes.js';
dotenv.config();
const app = express();

/** --------- CORS CONFIG --------- **/
const allowList = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Cho phép nhiều origin, và cả request không có Origin (Postman/cURL)
const DEV_DEFAULTS = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'];
const effectiveAllowList = allowList.length ? allowList : DEV_DEFAULTS;
const isDev = process.env.NODE_ENV !== 'production';

const corsOptions = {
  origin(origin, callback) {
    if (isDev) return callback(null, true);
    if (!origin) return callback(null, true); // Postman/cURL
    if (effectiveAllowList.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked: ${origin}`), false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma'],
  credentials: true,
  optionsSuccessStatus: 204,
};

// security & utils
app.use(
  helmet({
    // đề phòng chặn tài nguyên cross-origin (không bắt buộc, nhưng an toàn cho API thuần JSON)
    crossOriginResourcePolicy: false,
  }),
);
app.use(cors(corsOptions));
// xử lý preflight cho mọi route
app.options('*', cors(corsOptions));
app.use('/api/favorites', favoriteRoutes); 
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());
app.use('/api/users', userRoutes)
// Tắt ETag để tránh 304 Not Modified và luôn trả body
app.disable('etag');
// Ép no-store cho toàn bộ API JSON
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

/** --------- ROUTES --------- **/
import authRoutes from './routes/auth.routes.js';
import productRoutes from './routes/product.routes.js';
import cartRoutes from './routes/cart.routes.js';
import orderRoutes from './routes/order.routes.js';
import categoryRoutes from './routes/category.routes.js';
import brandRoutes from './routes/brand.routes.js';
import couponRoutes from './routes/coupon.routes.js';
import reviewRoutes from './routes/review.routes.js';
import songRoutes from './routes/song.routes.js';
import addressRoutes from './routes/address.routes.js';
import statisticsRoutes from './routes/statistics.routes.js';
import adminUserRoutes from './routes/adminUser.routes.js';
import adminCouponRoutes from './routes/adminCoupon.routes.js';
import adminReviewRoutes from './routes/adminReview.routes.js';
import adminNotificationRoutes from './routes/adminNotification.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import legatoRoutes from './routes/legato.routes.js';
import aiRoutes from './routes/ai.routes.js';
import chatRoutes from './routes/chat.routes.js';

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/admin/statistics', statisticsRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/coupons', adminCouponRoutes);
app.use('/api/admin/reviews', adminReviewRoutes);
app.use('/api/admin/notifications', adminNotificationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/legato', legatoRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/chat', chatRoutes);
app.get('/api/health', (_, res) => res.json({ ok: true }));

/** --------- ERRORS --------- **/
import { notFound, errorHandler } from './middlewares/error.js';
app.use(notFound);
app.use(errorHandler);

/** --------- START --------- **/
const PORT = process.env.PORT || 4000;
connectDB(process.env.MONGO_URI)
  .then(() => app.listen(PORT, () => console.log('🚀 API on :' + PORT)))
  .catch((err) => {
    console.error('DB connect error', err);
    process.exit(1);
  });
