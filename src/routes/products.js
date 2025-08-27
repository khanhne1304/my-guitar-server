const express = require('express');
const router = express.Router();

// Mock data for products (in a real app, this would come from a database)
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
  },
  {
    _id: '4',
    name: 'Piano Acoustic Kawai GL-10',
    slug: 'piano-acoustic-kawai-gl10',
    sku: 'KA-GL10',
    images: [
      { url: 'https://via.placeholder.com/300x200?text=Kawai+GL-10' }
    ],
    brand: { name: 'KAWAI' },
    category: { name: 'Piano', slug: 'piano' },
    price: {
      base: 80000000,
      sale: 0
    }
  }
];

// GET /api/products - List all products with filtering
router.get('/', (req, res) => {
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

// GET /api/products/:slug - Get product by slug
router.get('/:slug', (req, res) => {
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

module.exports = router;
