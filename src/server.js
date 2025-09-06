// server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { connectDB } from './config/db.js';

dotenv.config();
const app = express();

/** --------- CORS CONFIG --------- **/
const allowList = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Cho phép nhiều origin, và cả request không có Origin (Postman/cURL)
const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowList.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked: ${origin}`), false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // bật nếu dùng cookie/session
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

app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

/** --------- ROUTES --------- **/
import authRoutes from './routes/auth.routes.js';
import productRoutes from './routes/product.routes.js';
import cartRoutes from './routes/cart.routes.js';
import orderRoutes from './routes/order.routes.js';
import categoryRoutes from './routes/category.routes.js';
import brandRoutes from './routes/brand.routes.js';
import couponRoutes from './routes/coupon.routes.js';
import reviewRoutes from './routes/review.routes.js';

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/reviews', reviewRoutes);

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
