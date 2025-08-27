const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Mock products data
const mockProducts = [
  {
    _id: '1',
    name: 'Guitar Acoustic Yamaha F310',
    slug: 'guitar-acoustic-yamaha-f310',
    sku: 'YA-F310',
    images: [
      { url: 'https://via.placeholder.com/300x200?text=Yamaha+F310' }
    ],
    brand: { name: 'YAMAHA' },
    category: { name: 'Guitar', slug: 'guitar' },
    price: {
      base: 2500000,
      sale: 2200000
    }
  },
  {
    _id: '2',
    name: 'Guitar Electric Fender Stratocaster',
    slug: 'guitar-electric-fender-stratocaster',
    sku: 'FE-STRAT',
    images: [
      { url: 'https://via.placeholder.com/300x200?text=Fender+Stratocaster' }
    ],
    brand: { name: 'FENDER' },
    category: { name: 'Guitar', slug: 'guitar' },
    price: {
      base: 15000000,
      sale: 0
    }
  },
  {
    _id: '3',
    name: 'Piano Digital Roland FP-30X',
    slug: 'piano-digital-roland-fp30x',
    sku: 'RO-FP30X',
    images: [
      { url: 'https://via.placeholder.com/300x200?text=Roland+FP-30X' }
    ],
    brand: { name: 'ROLAND' },
    category: { name: 'Piano', slug: 'piano' },
    price: {
      base: 25000000,
      sale: 22000000
    }
  }
];

// Test endpoint
app.get('/', (req, res) => {
  res.json({ message: 'API is working!', timestamp: new Date().toISOString() });
});

// Products endpoint
app.get('/api/products', (req, res) => {
  try {
    let filteredProducts = [...mockProducts];
    
    // Filter by category
    if (req.query.category) {
      const category = req.query.category.toLowerCase();
      filteredProducts = filteredProducts.filter(p => 
        p.category.slug.toLowerCase() === category
      );
    }
    
    // Filter by brand
    if (req.query.brand) {
      const brand = req.query.brand.toLowerCase();
      filteredProducts = filteredProducts.filter(p => 
        p.brand.name.toLowerCase() === brand
      );
    }
    
    // Filter by search query
    if (req.query.q) {
      const query = req.query.q.toLowerCase();
      filteredProducts = filteredProducts.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.brand.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query)
      );
    }
    
    res.json(filteredProducts);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Product by slug endpoint
app.get('/api/products/:slug', (req, res) => {
  try {
    const product = mockProducts.find(p => p.slug === req.params.slug);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

const PORT = 4000;

app.listen(PORT, () => {
  console.log(`🚀 Test server running at http://localhost:${PORT}`);
  console.log(`📡 API endpoints:`);
  console.log(`   GET /api/products`);
  console.log(`   GET /api/products/:slug`);
  console.log(`   GET / (health check)`);
});
