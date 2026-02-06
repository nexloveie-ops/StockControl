const mongoose = require('mongoose');

const merchantInventorySchema = new mongoose.Schema({
  // 商户信息
  merchantId: {
    type: String,
    required: true,
    index: true
  },
  merchantName: {
    type: String,
    required: true
  },
  // 店面组和店面
  storeGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StoreGroup'
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store'
  },
  
  // 产品信息
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductNew'
  },
  productName: {
    type: String,
    required: true
  },
  brand: {
    type: String,
    default: ''
  },
  model: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    required: true
  },
  
  // 税务分类 - 继承自产品分类的默认税率
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
  
  // 价格信息
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
    default: ''
  },
  serialNumber: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: ''
  },
  condition: {
    type: String,
    default: 'BRAND_NEW'
  },
  
  // 位置信息
  location: {
    type: String,
    default: ''
  },
  
  // 来源信息
  source: {
    type: String,
    enum: ['warehouse', 'manual', 'transfer'],
    default: 'manual'
  },
  sourceOrderId: {
    type: mongoose.Schema.Types.ObjectId
  },
  sourceTransferId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryTransfer'
  },
  
  // 状态
  status: {
    type: String,
    enum: ['active', 'sold', 'transferred', 'damaged'],
    default: 'active'
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

// 创建索引
merchantInventorySchema.index({ merchantId: 1, status: 1 });
merchantInventorySchema.index({ storeGroup: 1, isActive: 1 });
merchantInventorySchema.index({ store: 1, isActive: 1 });
merchantInventorySchema.index({ category: 1 });
merchantInventorySchema.index({ barcode: 1 });
merchantInventorySchema.index({ serialNumber: 1 });

// 虚拟字段：库存价值
merchantInventorySchema.virtual('inventoryValue').get(function() {
  return this.quantity * this.costPrice;
});

// 虚拟字段：潜在利润
merchantInventorySchema.virtual('potentialProfit').get(function() {
  return this.quantity * (this.retailPrice - this.costPrice);
});

module.exports = mongoose.model('MerchantInventory', merchantInventorySchema);
