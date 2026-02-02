const mongoose = require('mongoose');

const storeInventorySchema = new mongoose.Schema({
  // 产品
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductNew',
    required: true
  },
  // 店面
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  // 当前库存数量
  currentStock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  // 预留库存（已下单但未发货）
  reservedStock: {
    type: Number,
    default: 0,
    min: 0
  },
  // 可用库存
  availableStock: {
    type: Number,
    default: 0,
    min: 0
  },
  // 最小库存警告线
  minStockLevel: {
    type: Number,
    default: 5,
    min: 0
  },
  // 最大库存容量
  maxStockLevel: {
    type: Number,
    default: 100,
    min: 0
  },
  // 库存位置
  location: {
    // 货架号
    shelf: String,
    // 区域
    zone: String,
    // 具体位置描述
    position: String
  },
  // 库存成本（加权平均）
  averageCost: {
    type: Number,
    default: 0,
    min: 0
  },
  // 总库存价值
  totalValue: {
    type: Number,
    default: 0,
    min: 0
  },
  // 库存状态
  status: {
    type: String,
    enum: ['normal', 'low_stock', 'out_of_stock', 'overstock', 'discontinued'],
    default: 'normal'
  },
  // 最后盘点日期
  lastCountDate: Date,
  // 最后盘点数量
  lastCountQuantity: Number,
  // 盘点差异
  countVariance: {
    type: Number,
    default: 0
  },
  // 库存移动记录（最近的几次）
  recentMovements: [{
    type: {
      type: String,
      enum: ['in', 'out', 'transfer', 'adjustment', 'count']
    },
    quantity: Number,
    date: {
      type: Date,
      default: Date.now
    },
    reference: String,
    reason: String
  }],
  // 统计信息
  statistics: {
    // 总入库数量
    totalReceived: {
      type: Number,
      default: 0
    },
    // 总出库数量
    totalSold: {
      type: Number,
      default: 0
    },
    // 平均日销量
    averageDailySales: {
      type: Number,
      default: 0
    },
    // 库存周转率
    turnoverRate: {
      type: Number,
      default: 0
    },
    // 最后销售日期
    lastSaleDate: Date,
    // 最后进货日期
    lastReceiveDate: Date
  },
  // 是否启用自动补货
  autoReorderEnabled: {
    type: Boolean,
    default: false
  },
  // 自动补货点
  reorderPoint: {
    type: Number,
    default: 0
  },
  // 自动补货数量
  reorderQuantity: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// 创建复合索引
storeInventorySchema.index({ product: 1, store: 1 }, { unique: true });
storeInventorySchema.index({ store: 1, status: 1 });
storeInventorySchema.index({ product: 1, currentStock: 1 });
storeInventorySchema.index({ status: 1, minStockLevel: 1 });

// 中间件：更新可用库存
storeInventorySchema.pre('save', function() {
  this.availableStock = Math.max(0, this.currentStock - this.reservedStock);
  this.totalValue = this.currentStock * this.averageCost;
  
  // 更新库存状态
  if (this.currentStock === 0) {
    this.status = 'out_of_stock';
  } else if (this.currentStock <= this.minStockLevel) {
    this.status = 'low_stock';
  } else if (this.currentStock >= this.maxStockLevel) {
    this.status = 'overstock';
  } else {
    this.status = 'normal';
  }
});

// 虚拟字段：库存健康度
storeInventorySchema.virtual('stockHealth').get(function() {
  if (this.currentStock === 0) return 'critical';
  if (this.currentStock <= this.minStockLevel) return 'low';
  if (this.currentStock >= this.maxStockLevel) return 'high';
  return 'normal';
});

// 虚拟字段：预计可销售天数
storeInventorySchema.virtual('daysOfStock').get(function() {
  if (this.statistics.averageDailySales === 0) return Infinity;
  return Math.floor(this.availableStock / this.statistics.averageDailySales);
});

// 方法：添加库存移动记录
storeInventorySchema.methods.addMovement = function(type, quantity, reference, reason) {
  this.recentMovements.unshift({
    type,
    quantity,
    reference,
    reason,
    date: new Date()
  });
  
  // 只保留最近20条记录
  if (this.recentMovements.length > 20) {
    this.recentMovements = this.recentMovements.slice(0, 20);
  }
};

// 方法：调整库存
storeInventorySchema.methods.adjustStock = function(newQuantity, reason, reference) {
  const oldQuantity = this.currentStock;
  const difference = newQuantity - oldQuantity;
  
  this.currentStock = newQuantity;
  this.addMovement('adjustment', difference, reference, reason);
  
  return difference;
};

module.exports = mongoose.model('StoreInventory', storeInventorySchema);