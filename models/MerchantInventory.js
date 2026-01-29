const mongoose = require('mongoose');

/**
 * 批发商库存模型
 * 每个批发商有自己独立的库存
 */
const merchantInventorySchema = new mongoose.Schema({
  // 批发商ID（关联用户）
  merchantId: {
    type: String,
    required: true,
    index: true
  },
  
  // 批发商名称
  merchantName: {
    type: String,
    required: true
  },
  
  // 产品信息
  productName: {
    type: String,
    required: true
  },
  
  // 产品类别
  category: {
    type: String,
    enum: ['NEW_DEVICE', 'USED_DEVICE', 'ACCESSORY'],
    required: true
  },
  
  // 产品类型（手机、笔记本、平板等）
  productType: {
    type: String,
    required: true
  },
  
  // 品牌
  brand: String,
  
  // 型号
  model: String,
  
  // 库存数量
  quantity: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  
  // 采购成本价（从仓库采购的价格）
  costPrice: {
    type: Number,
    required: true,
    min: 0
  },
  
  // 零售价
  retailPrice: {
    type: Number,
    required: true,
    min: 0
  },
  
  // 税务分类
  taxClassification: {
    type: String,
    enum: ['VAT_23', 'MARGIN_VAT_0', 'SERVICE_VAT_13_5'],
    required: true
  },
  
  // 仓库产品ID（关联仓库产品）
  warehouseProductId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product3C'
  },
  
  // 状态
  status: {
    type: String,
    enum: ['ACTIVE', 'LOW_STOCK', 'OUT_OF_STOCK'],
    default: 'ACTIVE'
  },
  
  // 最小库存警告
  minStockLevel: {
    type: Number,
    default: 5
  },
  
  // 备注
  notes: String,
  
  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  // 更新时间
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 更新时间中间件
merchantInventorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // 根据库存数量自动更新状态
  if (this.quantity === 0) {
    this.status = 'OUT_OF_STOCK';
  } else if (this.quantity <= this.minStockLevel) {
    this.status = 'LOW_STOCK';
  } else {
    this.status = 'ACTIVE';
  }
  
  next();
});

// 索引
merchantInventorySchema.index({ merchantId: 1, productName: 1 });
merchantInventorySchema.index({ merchantId: 1, category: 1 });
merchantInventorySchema.index({ merchantId: 1, status: 1 });

module.exports = mongoose.model('MerchantInventory', merchantInventorySchema);
