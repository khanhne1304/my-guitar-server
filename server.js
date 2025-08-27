// src/server.js
require('dotenv').config(); // phải đứng trước khi đọc process.env

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const PORT = process.env.PORT || 5000;

// Routes
const productsRouter = require('./src/routes/products');
const authRouter = require('./src/routes/auth');

app.get('/', (_, res) => res.json({ ok: true }));
app.use('/api/products', productsRouter);
app.use('/api/auth', authRouter);

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
