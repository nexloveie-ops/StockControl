const mongoose = require('mongoose');

// AdminInventory 模型 - 用于管理员/仓库库存
// 这是一个简化的库存模型，专门用于配件产品的变体管理
const adminInventorySchema = new mongoose.Schema({
  // 产品信息
  productName: {
    type: String,
    required: true,
    index: true
  },
  brand: {
    type: String,
    default: ''
  },
  model: {
    type: String,
    default: '',
    index: true
  },
  color: {
    type: String,
    default: '',
    index: true
  },
  category: {
    type: String,
    required: true,
    index: true
  },
  
  // 税务分类
  taxClassification: {
    type: String,
    default: 'VAT_23'
  },
  
  // 库存数量
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  
  // 价格信息（含税）
  costPrice: {
    type: Number,
    required: true,
    min: 0
  },
  wholesalePrice: {
    type: Number,
    required: true,
    min: 0
  },
  retailPrice: {
    type: Number,
    required: true,
    min: 0
  },
  
  // 产品标识
  barcode: {
    type: String,
    default: '',
    sparse: true
  },
  serialNumber: {
    type: String,
    default: '',
    sparse: true
  },
  
  // 产品状态
  condition: {
    type: String,
    default: 'BRAND_NEW'
  },
  
  // 供货商信息
  supplier: {
    type: String,
    default: ''
  },
  
  // 位置信息
  location: {
    type: String,
    default: ''
  },
  
  // 订单号
  invoiceNumber: {
    type: String,
    default: ''
  },
  
  // 来源信息
  source: {
    type: String,
    enum: ['manual', 'invoice', 'transfer', 'batch'],
    default: 'manual'
  },
  
  // 库存状态
  status: {
    type: String,
    enum: ['AVAILABLE', 'RESERVED', 'SOLD', 'TRANSFERRED', 'DAMAGED'],
    default: 'AVAILABLE'
  },
  
  // 销售状态
  salesStatus: {
    type: String,
    enum: ['UNSOLD', 'SOLD'],
    default: 'UNSOLD'
  },
  
  // 备注
  notes: {
    type: String,
    default: ''
  },
  
  // 是否激活
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// 创建复合索引
adminInventorySchema.index({ productName: 1, model: 1, color: 1 });
adminInventorySchema.index({ category: 1, status: 1 });
adminInventorySchema.index({ status: 1, salesStatus: 1 });
adminInventorySchema.index({ invoiceNumber: 1 });
adminInventorySchema.index({ supplier: 1 });

// 虚拟字段：库存价值
adminInventorySchema.virtual('inventoryValue').get(function() {
  return this.quantity * this.costPrice;
});

// 虚拟字段：潜在利润
adminInventorySchema.virtual('potentialProfit').get(function() {
  return this.quantity * (this.retailPrice - this.costPrice);
});

module.exports = mongoose.model('AdminInventory', adminInventorySchema);
