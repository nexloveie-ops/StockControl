const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  // 基本信息
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
  // 所属大类
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductCategory',
    required: true
  },
  // 产品类型（用于快速分类，冗余字段）
  productType: {
    type: String,
    // 不使用枚举限制，允许动态分类
    required: true
  },
  // 产品图片
  images: [{
    url: String,
    alt: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  // 产品描述
  description: {
    type: String,
    trim: true
  },
  // 详细规格
  specifications: {
    type: Map,
    of: String
  },
  // 成本（含税）
  costPrice: {
    type: Number,
    required: true,
    min: 0
  },
  // 批发价
  wholesalePrice: {
    type: Number,
    required: false,
    min: 0,
    default: 0
  },
  // 建议零售价
  retailPrice: {
    type: Number,
    required: true,
    min: 0
  },
  // 成色
  condition: {
    type: String,
    // 不使用枚举限制，允许动态成色
    required: true
  },
  // 税务分类（可以覆盖大类的默认设置）
  vatRate: {
    type: String,
    enum: ['VAT 23%', 'VAT 13.5%', 'VAT 0%'],
    required: true
  },
  // 库存数量
  stockQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  // 最低库存警告
  minStockLevel: {
    type: Number,
    default: 5,
    min: 0
  },
  // 关联的进货发票
  purchaseInvoices: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseInvoice'
  }],
  // 品牌
  brand: {
    type: String,
    trim: true
  },
  // 型号
  model: {
    type: String,
    trim: true
  },
  // 颜色
  color: {
    type: String,
    trim: true,
    default: ''
  },
  // 条形码
  barcode: {
    type: String,
    unique: true,
    sparse: true // 允许多个null/undefined值
  },
  // 序列号（对于单个设备）
  serialNumbers: [{
    serialNumber: String,
    color: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['available', 'sold', 'reserved', 'damaged'],
      default: 'available'
    },
    purchaseInvoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseInvoice'
    }
  }],
  // 产品状态
  status: {
    type: String,
    enum: ['available', 'reserved', 'damaged', 'repair', 'discontinued'],
    default: 'available'
  },
  // 存储位置
  location: {
    area: {
      type: String,
      default: ''
    },
    shelf: {
      type: String,
      default: ''
    },
    position: {
      type: String,
      default: ''
    },
    fullLocation: {
      type: String,
      default: ''
    }
  },
  // 状态
  isActive: {
    type: Boolean,
    default: true
  },
  // 创建者
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // 最后更新者
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// 创建索引
productSchema.index({ sku: 1 });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ condition: 1 });
productSchema.index({ vatRate: 1 });
productSchema.index({ barcode: 1 });
productSchema.index({ 'serialNumbers.serialNumber': 1 });
productSchema.index({ stockQuantity: 1 });

// 虚拟字段：计算总成本
productSchema.virtual('totalCostValue').get(function() {
  return this.costPrice * this.stockQuantity;
});

// 虚拟字段：计算总批发价值
productSchema.virtual('totalWholesaleValue').get(function() {
  return this.wholesalePrice * this.stockQuantity;
});

// 虚拟字段：计算总零售价值
productSchema.virtual('totalRetailValue').get(function() {
  return this.retailPrice * this.stockQuantity;
});

// 虚拟字段：批发利润率
productSchema.virtual('wholesaleProfitMargin').get(function() {
  if (this.costPrice === 0) return 0;
  return ((this.wholesalePrice - this.costPrice) / this.costPrice * 100).toFixed(2);
});

// 虚拟字段：零售利润率
productSchema.virtual('retailProfitMargin').get(function() {
  if (this.costPrice === 0) return 0;
  return ((this.retailPrice - this.costPrice) / this.costPrice * 100).toFixed(2);
});

module.exports = mongoose.model('ProductNew', productSchema);