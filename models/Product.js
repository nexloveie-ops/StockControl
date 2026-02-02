const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  brand: {
    type: String,
    required: true,
    trim: true
  },
  model: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  specifications: {
    type: Map,
    of: String
  },
  images: [{
    url: String,
    alt: String
  }],
  purchasePrice: {
    type: Number,
    required: true,
    min: 0
  },
  sellingPrice: {
    type: Number,
    required: true,
    min: 0
  },
  minStockLevel: {
    type: Number,
    default: 10,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// 创建复合索引
productSchema.index({ brand: 1, model: 1 });
productSchema.index({ category: 1, isActive: 1 });

module.exports = mongoose.model('Product', productSchema);