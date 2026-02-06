const mongoose = require('mongoose');

const warehouseOrderSchema = new mongoose.Schema({
  // 订单号
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
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
  
  // 订单项目
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductNew',
      required: true
    },
    productName: {
      type: String,
      required: true
    },
    sku: {
      type: String,
      default: ''
    },
    brand: {
      type: String,
      default: ''
    },
    model: {
      type: String,
      default: ''
    },
    color: {
      type: String,
      default: ''
    },
    condition: {
      type: String,
      default: ''
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    wholesalePrice: {
      type: Number,
      required: true,
      min: 0
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    // 税务信息
    taxClassification: {
      type: String,
      default: 'VAT_23'
    },
    taxAmount: {
      type: Number,
      default: 0
    },
    source: {
      type: String,
      default: 'ProductNew'
    }
  }],
  
  // 总金额
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // 税务汇总
  subtotal: {
    type: Number,
    default: 0
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  
  // 配送信息
  deliveryMethod: {
    type: String,
    enum: ['delivery', 'pickup'],
    required: true
  },
  deliveryAddress: {
    type: String,
    default: ''
  },
  pickupLocation: {
    type: String,
    default: ''
  },
  
  // 发货详情（保存发货时选择的序列号等信息）
  shipmentDetails: {
    type: Array,
    default: []
  },
  
  // 状态
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'shipped', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  // 备注
  notes: {
    type: String,
    default: ''
  },
  cancelReason: {
    type: String,
    default: ''
  },
  
  // 时间记录
  orderedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  confirmedAt: {
    type: Date,
    default: null
  },
  shippedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  
  // 处理人员
  confirmedBy: {
    type: String,
    default: ''
  },
  shippedBy: {
    type: String,
    default: ''
  },
  completedBy: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// 创建索引
warehouseOrderSchema.index({ merchantId: 1, status: 1 });
warehouseOrderSchema.index({ orderNumber: 1 });
warehouseOrderSchema.index({ orderedAt: -1 });

// 虚拟字段：订单项目数量
warehouseOrderSchema.virtual('itemCount').get(function() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// 虚拟字段：状态显示名称
warehouseOrderSchema.virtual('statusDisplay').get(function() {
  const statusMap = {
    'pending': '待确认',
    'confirmed': '已确认',
    'shipped': '已发货',
    'completed': '已完成',
    'cancelled': '已取消'
  };
  return statusMap[this.status] || this.status;
});

// 虚拟字段：配送方式显示名称
warehouseOrderSchema.virtual('deliveryMethodDisplay').get(function() {
  return this.deliveryMethod === 'delivery' ? '物流配送' : '到店自取';
});

module.exports = mongoose.model('WarehouseOrder', warehouseOrderSchema);
