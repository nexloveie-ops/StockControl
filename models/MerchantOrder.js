const mongoose = require('mongoose');

/**
 * 批发商订单模型
 * 记录批发商从仓库订货的订单
 */
const merchantOrderSchema = new mongoose.Schema({
  // 订单号
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  
  // 批发商ID
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
  
  // 订单项目
  items: [{
    warehouseProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product3C',
      required: true
    },
    productName: String,
    category: String,
    productType: String,
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  
  // 订单总额
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // 订单状态
  status: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
    default: 'PENDING'
  },
  
  // 订单日期
  orderDate: {
    type: Date,
    default: Date.now
  },
  
  // 确认日期
  confirmedDate: Date,
  
  // 发货日期
  shippedDate: Date,
  
  // 送达日期
  deliveredDate: Date,
  
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
merchantOrderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 生成订单号
merchantOrderSchema.statics.generateOrderNumber = function() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `MO${year}${month}${day}${random}`;
};

module.exports = mongoose.model('MerchantOrder', merchantOrderSchema);
