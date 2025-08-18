const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Kết nối MongoDB (dùng biến môi trường MONGO_URI trong file .env)
mongoose.connect(process.env.MONGO_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
})
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.log(err));

// Route test
app.get('/', (req, res) => {
  res.send('Hello from ExpressJS backend 🚀');
});

// Lắng nghe cổng 5000
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
